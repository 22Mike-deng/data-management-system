/**
 * 动态数据服务
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TableMetaService } from '../table-meta';
import { FieldDefinition } from '@/database/entities';
import { QueryDataDto, CreateDataDto, UpdateDataDto, BatchDeleteDto } from './dto';

@Injectable()
export class DynamicDataService {
  constructor(
    private dataSource: DataSource,
    private tableMetaService: TableMetaService,
  ) {}

  /**
   * 根据表定义创建实际数据表
   */
  async createDynamicTable(tableId: string): Promise<void> {
    const table = await this.tableMetaService.findTableById(tableId);
    const tableName = `data_${table.tableName}`;

    // 生成DDL语句
    const columnDefinitions = this.generateColumnDefinitions(table.fields);
    const ddl = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id VARCHAR(36) PRIMARY KEY,
        ${columnDefinitions},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.dataSource.query(ddl);
  }

  /**
   * 生成字段定义SQL
   */
  private generateColumnDefinitions(fields: FieldDefinition[]): string {
    return fields
      .map((field) => {
        const columnType = this.getColumnType(field.fieldType);
        const nullable = field.required ? 'NOT NULL' : 'NULL';
        const defaultValue = field.defaultValue
          ? `DEFAULT '${field.defaultValue}'`
          : '';
        return `\`${field.fieldName}\` ${columnType} ${nullable} ${defaultValue}`;
      })
      .join(',\n        ');
  }

  /**
   * 获取字段对应的数据库类型
   */
  private getColumnType(fieldType: string): string {
    const typeMap: Record<string, string> = {
      text: 'TEXT',
      number: 'DECIMAL(20, 6)',
      boolean: 'BOOLEAN',
      date: 'TIMESTAMP',
      select: 'VARCHAR(100)',
      multiselect: 'JSON',
      richtext: 'TEXT',
      image: 'VARCHAR(500)',
      file: 'VARCHAR(500)',
      relation: 'VARCHAR(36)',
    };
    return typeMap[fieldType] || 'TEXT';
  }

  /**
   * 查询数据列表
   */
  async findDataList(tableId: string, query: QueryDataDto) {
    const table = await this.tableMetaService.findTableById(tableId);
    const tableName = `data_${table.tableName}`;

    const { page = 1, pageSize = 20, keyword, sortBy, sortOrder } = query;
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereClause = '1=1';
    const params: unknown[] = [];

    if (keyword) {
      const textFields = table.fields.filter((f) => f.fieldType === 'text');
      if (textFields.length > 0) {
        const likeConditions = textFields
          .map(() => `?? LIKE ?`)
          .join(' OR ');
        whereClause += ` AND (${likeConditions})`;
        textFields.forEach((f) => {
          params.push(f.fieldName, `%${keyword}%`);
        });
      }
    }

    // 构建排序
    let orderClause = 'created_at DESC';
    if (sortBy) {
      orderClause = `?? ${sortOrder || 'DESC'}`;
      params.push(sortBy);
    }

    // 查询总数
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM ?? WHERE ${whereClause}`,
      [tableName, ...params],
    );
    const total = parseInt(countResult[0].total, 10);

    // 查询数据
    const list = await this.dataSource.query(
      `SELECT * FROM ?? WHERE ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`,
      [tableName, ...params, pageSize, offset],
    );

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 查询单条数据
   */
  async findDataById(tableId: string, dataId: string) {
    const table = await this.tableMetaService.findTableById(tableId);
    const tableName = `data_${table.tableName}`;

    const result = await this.dataSource.query(
      `SELECT * FROM ${tableName} WHERE id = $1`,
      [dataId],
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(`数据 ${dataId} 不存在`);
    }

    return result[0];
  }

  /**
   * 创建数据
   */
  async createData(tableId: string, dto: CreateDataDto) {
    const table = await this.tableMetaService.findTableById(tableId);
    const tableName = `data_${table.tableName}`;

    // 验证必填字段
    this.validateRequiredFields(table.fields, dto);

    const id = uuidv4();
    const fields = ['id', ...table.fields.map((f) => f.fieldName), 'created_at', 'updated_at'];
    const values = [id, ...table.fields.map((f) => this.formatValue(dto[f.fieldName], f.fieldType)), new Date(), new Date()];
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    await this.dataSource.query(
      `INSERT INTO ${tableName} (${fields.map((f) => `"${f}"`).join(', ')}) VALUES (${placeholders})`,
      values,
    );

    return this.findDataById(tableId, id);
  }

  /**
   * 更新数据
   */
  async updateData(tableId: string, dataId: string, dto: UpdateDataDto) {
    const table = await this.tableMetaService.findTableById(tableId);
    const tableName = `data_${table.tableName}`;

    // 检查数据是否存在
    await this.findDataById(tableId, dataId);

    const updateFields: string[] = [];
    const values: unknown[] = [];

    table.fields.forEach((field) => {
      if (dto[field.fieldName] !== undefined) {
        updateFields.push(`?? = ?`);
        values.push(field.fieldName);
        values.push(this.formatValue(dto[field.fieldName], field.fieldType));
      }
    });

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = ?`);
      values.push(new Date());
      values.push(dataId);

      await this.dataSource.query(
        `UPDATE ?? SET ${updateFields.join(', ')} WHERE id = ?`,
        [tableName, ...values],
      );
    }

    return this.findDataById(tableId, dataId);
  }

  /**
   * 删除数据
   */
  async deleteData(tableId: string, dataId: string) {
    const table = await this.tableMetaService.findTableById(tableId);
    const tableName = `data_${table.tableName}`;

    await this.dataSource.query(`DELETE FROM ${tableName} WHERE id = $1`, [dataId]);
  }

  /**
   * 批量删除
   */
  async batchDelete(tableId: string, dto: BatchDeleteDto) {
    const table = await this.tableMetaService.findTableById(tableId);
    const tableName = `data_${table.tableName}`;

    const placeholders = dto.ids.map((_, i) => `$${i + 1}`).join(', ');
    await this.dataSource.query(
      `DELETE FROM ${tableName} WHERE id IN (${placeholders})`,
      dto.ids,
    );
  }

  /**
   * 验证必填字段
   */
  private validateRequiredFields(fields: FieldDefinition[], data: Record<string, unknown>) {
    const missingFields = fields
      .filter((f) => f.required && data[f.fieldName] === undefined)
      .map((f) => f.displayName);

    if (missingFields.length > 0) {
      throw new BadRequestException(`以下字段为必填项: ${missingFields.join(', ')}`);
    }
  }

  /**
   * 格式化字段值
   */
  private formatValue(value: unknown, fieldType: string): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    switch (fieldType) {
      case 'multiselect':
        return JSON.stringify(value);
      case 'date':
        return new Date(value as string);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      default:
        return value;
    }
  }
}
