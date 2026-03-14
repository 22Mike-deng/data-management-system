/**
 * 数据导入导出服务
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as csv from 'csv-parser';
import * as xlsx from 'xlsx';
import { TableMetaService } from '../table-meta';
import { AuditLogService } from '../audit-log';
import { AuditAction } from '../../database/entities/audit-log.entity';
import { isValidTableName, validateFieldNames } from '../../common/utils/sql-sanitizer.util';

/**
 * 导入结果
 */
export interface ImportResult {
  success: boolean;
  total: number;
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

/**
 * 导出格式
 */
export type ExportFormat = 'csv' | 'json' | 'xlsx';

@Injectable()
export class DataImportExportService {
  constructor(
    private dataSource: DataSource,
    private tableMetaService: TableMetaService,
    private auditLogService: AuditLogService,
  ) {}

  /**
   * 导入数据
   */
  async importData(
    tableId: string,
    file: Express.Multer.File,
    format: string,
    userId?: string,
    username?: string,
    ipAddress?: string,
  ): Promise<ImportResult> {
    // 获取表结构
    const tableInfo = await this.tableMetaService.findTableById(tableId);
    const tableName = tableInfo.tableName;
    const fullTableName = `data_${tableName}`;

    // 验证表名
    if (!isValidTableName(tableName)) {
      throw new BadRequestException(`无效的表名: ${tableName}`);
    }

    // 解析文件内容
    let records: Record<string, any>[] = [];
    switch (format.toLowerCase()) {
      case 'csv':
        records = await this.parseCsv(file.buffer);
        break;
      case 'json':
        records = this.parseJson(file.buffer);
        break;
      case 'xlsx':
      case 'excel':
        records = this.parseExcel(file.buffer);
        break;
      default:
        throw new BadRequestException(`不支持的格式: ${format}`);
    }

    if (records.length === 0) {
      throw new BadRequestException('文件内容为空');
    }

    // 批量插入限制
    if (records.length > 1000) {
      throw new BadRequestException('单次导入最多支持1000条记录');
    }

    // 获取表字段
    const fields = tableInfo.fields || [];
    const fieldNames = fields.map(f => f.fieldName);

    // 验证并处理每条记录
    const result: ImportResult = {
      success: true,
      total: records.length,
      inserted: 0,
      skipped: 0,
      errors: [],
    };

    const validRecords: Record<string, any>[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // 第1行是表头

      try {
        // 字段名验证
        const recordFields = Object.keys(record);
        const fieldValidation = validateFieldNames(recordFields);
        if (!fieldValidation.valid) {
          result.errors.push({
            row: rowNumber,
            message: `非法字段名: ${fieldValidation.invalidFields.join(', ')}`,
          });
          result.skipped++;
          continue;
        }

        // 检查字段是否存在
        const invalidFields = recordFields.filter(key => !fieldNames.includes(key));
        if (invalidFields.length > 0) {
          result.errors.push({
            row: rowNumber,
            message: `字段不存在: ${invalidFields.join(', ')}`,
          });
          result.skipped++;
          continue;
        }

        // 检查必填字段
        const requiredFields = fields.filter(f => f.required);
        const missingFields = requiredFields.filter(
          f => !record.hasOwnProperty(f.fieldName) || record[f.fieldName] === '' || record[f.fieldName] === null
        );
        if (missingFields.length > 0) {
          result.errors.push({
            row: rowNumber,
            message: `缺少必填字段: ${missingFields.map(f => f.displayName).join(', ')}`,
          });
          result.skipped++;
          continue;
        }

        // 处理数据类型转换
        const processedRecord: Record<string, any> = {};
        for (const field of fields) {
          const value = record[field.fieldName];
          
          // 跳过未提供的字段
          if (!record.hasOwnProperty(field.fieldName)) {
            continue;
          }

          // 类型转换
          processedRecord[field.fieldName] = this.convertValue(value, field.fieldType);
        }

        // 添加ID（如果没有）
        if (!processedRecord.id) {
          processedRecord.id = uuidv4();
        }

        validRecords.push(processedRecord);
      } catch (error: any) {
        result.errors.push({
          row: rowNumber,
          message: error.message || '处理失败',
        });
        result.skipped++;
      }
    }

    // 批量插入有效记录
    if (validRecords.length > 0) {
      try {
        const allFields = new Set<string>();
        validRecords.forEach(record => {
          Object.keys(record).forEach(key => allFields.add(key));
        });
        const insertFields = Array.from(allFields);

        const placeholders = validRecords.map(
          () => `(${insertFields.map(() => '?').join(', ')})`
        ).join(', ');

        const sql = `INSERT INTO ?? (${insertFields.map(() => '??').join(', ')}) VALUES ${placeholders}`;
        const params = [fullTableName, ...insertFields];

        validRecords.forEach(record => {
          insertFields.forEach(field => {
            params.push(record.hasOwnProperty(field) ? record[field] : null);
          });
        });

        await this.dataSource.query(sql, params);
        result.inserted = validRecords.length;
      } catch (error: any) {
        result.success = false;
        result.errors.push({
          row: 0,
          message: `批量插入失败: ${error.message}`,
        });
      }
    }

    // 记录审计日志
    await this.auditLogService.createLog({
      action: AuditAction.IMPORT,
      module: '数据管理',
      description: `导入数据到表 ${tableInfo.displayName || tableName}`,
      userId,
      username,
      tableName,
      newData: {
        format,
        total: result.total,
        inserted: result.inserted,
        skipped: result.skipped,
      },
      ipAddress,
      success: result.success,
      errorMessage: result.errors.length > 0 ? JSON.stringify(result.errors) : undefined,
    });

    return result;
  }

  /**
   * 导出数据
   */
  async exportData(
    tableId: string,
    format: ExportFormat,
    userId?: string,
    username?: string,
    ipAddress?: string,
  ): Promise<{ data: Buffer; filename: string; mimeType: string }> {
    // 获取表结构
    const tableInfo = await this.tableMetaService.findTableById(tableId);
    const tableName = tableInfo.tableName;
    const fullTableName = `data_${tableName}`;

    // 验证表名
    if (!isValidTableName(tableName)) {
      throw new BadRequestException(`无效的表名: ${tableName}`);
    }

    // 检查表是否存在
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    if (tableExists[0].count === 0) {
      throw new BadRequestException(`表 ${tableName} 不存在`);
    }

    // 查询所有数据
    const data = await this.dataSource.query(`SELECT * FROM ??`, [fullTableName]);

    // 获取字段信息
    const fields = tableInfo.fields || [];

    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${tableInfo.displayName || tableName}_${timestamp}`;

    // 根据格式导出
    let buffer: Buffer;
    let mimeType: string;

    switch (format) {
      case 'csv':
        buffer = this.generateCsv(data, fields);
        mimeType = 'text/csv';
        break;
      case 'json':
        buffer = this.generateJson(data);
        mimeType = 'application/json';
        break;
      case 'xlsx':
        buffer = this.generateExcel(data, fields);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      default:
        throw new BadRequestException(`不支持的格式: ${format}`);
    }

    // 记录审计日志
    await this.auditLogService.createLog({
      action: AuditAction.EXPORT,
      module: '数据管理',
      description: `导出表 ${tableInfo.displayName || tableName} 的数据`,
      userId,
      username,
      tableName,
      newData: {
        format,
        count: data.length,
      },
      ipAddress,
    });

    return {
      data: buffer,
      filename: `${filename}.${format}`,
      mimeType,
    };
  }

  /**
   * 解析CSV文件
   */
  private parseCsv(buffer: Buffer): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      const results: Record<string, any>[] = [];
      const stream = require('stream');
      const readable = new stream.Readable();
      readable.push(buffer);
      readable.push(null);

      readable
        .pipe(csv())
        .on('data', (data: Record<string, any>) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error: Error) => reject(error));
    });
  }

  /**
   * 解析JSON文件
   */
  private parseJson(buffer: Buffer): Record<string, any>[] {
    try {
      const content = buffer.toString('utf-8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [data];
    } catch (error: any) {
      throw new BadRequestException(`JSON解析失败: ${error.message}`);
    }
  }

  /**
   * 解析Excel文件
   */
  private parseExcel(buffer: Buffer): Record<string, any>[] {
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return xlsx.utils.sheet_to_json(sheet);
    } catch (error: any) {
      throw new BadRequestException(`Excel解析失败: ${error.message}`);
    }
  }

  /**
   * 生成CSV数据
   */
  private generateCsv(data: any[], fields: any[]): Buffer {
    if (data.length === 0) {
      return Buffer.from('');
    }

    // 表头
    const headers = fields.map(f => f.displayName || f.fieldName);
    
    // 数据行
    const rows = data.map(row =>
      fields.map(f => {
        const value = row[f.fieldName];
        if (value === null || value === undefined) return '';
        const strValue = String(value);
        // 处理包含逗号或引号的值
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    // 添加BOM以支持中文
    return Buffer.from('\ufeff' + csv, 'utf-8');
  }

  /**
   * 生成JSON数据
   */
  private generateJson(data: any[]): Buffer {
    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 生成Excel数据
   */
  private generateExcel(data: any[], fields: any[]): Buffer {
    const workbook = xlsx.utils.book_new();
    
    // 准备数据
    const headers = fields.map(f => f.displayName || f.fieldName);
    const rows = data.map(row =>
      fields.map(f => row[f.fieldName] ?? '')
    );
    
    const sheetData = [headers, ...rows];
    const worksheet = xlsx.utils.aoa_to_sheet(sheetData);
    
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * 值类型转换
   */
  private convertValue(value: any, fieldType: string): any {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    switch (fieldType) {
      case 'int':
      case 'bigint':
        return parseInt(value, 10) || null;
      case 'float':
      case 'double':
      case 'decimal':
        return parseFloat(value) || null;
      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === '是';
        }
        return Boolean(value);
      case 'json':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      case 'date':
      case 'datetime':
        return value; // 保持原格式
      default:
        return value;
    }
  }
}
