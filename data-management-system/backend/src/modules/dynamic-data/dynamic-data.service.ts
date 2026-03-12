/**
* 动态数据服务
* 创建者：dzh
* 创建时间：2026-03-11
* 更新时间：2026-03-12
*/
import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TableMetaService } from '../table-meta';
import { FieldDefinition } from '@/database/entities';
import { QueryDataDto, CreateDataDto, UpdateDataDto, BatchDeleteDto } from './dto';

@Injectable()
export class DynamicDataService implements OnModuleInit {
  constructor(
    private dataSource: DataSource,
    private tableMetaService: TableMetaService,
  ) {}

  /**
   * 模块初始化时设置服务引用（解决循环依赖）
   */
  onModuleInit() {
    this.tableMetaService.setDynamicDataService(this);
  }

  /**
   * 根据表定义创建实际数据表或同步表结构
   */
  async createDynamicTable(tableId: string): Promise<void> {
    const table = await this.tableMetaService.findTableById(tableId);
    const tableName = `data_${table.tableName}`;

    // 检查表是否存在
    const tableExists = await this.checkTableExists(tableName);

    if (!tableExists) {
      // 创建新表
      const columnDefinitions = this.generateColumnDefinitions(table.fields);
      const indexDefinitions = this.generateIndexDefinitions(tableName, table.fields);
      const ddl = `
        CREATE TABLE IF NOT EXISTS \`${tableName}\` (
          \`id\` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
          ${columnDefinitions},
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ${indexDefinitions}
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;
      await this.dataSource.query(ddl);

      // 创建外键约束（表创建后单独处理）
      await this.createForeignKeyConstraints(tableName, table.fields);
    } else {
      // 同步表结构 - 添加缺失的列
      await this.syncTableColumns(tableName, table.fields);
      // 同步索引和外键
      await this.syncIndexesAndForeignKeys(tableName, table.fields);
    }
  }

  /**
   * 检查表是否存在
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName],
    );
    return result[0].count > 0;
  }

  /**
   * 同步表结构 - 添加缺失的列，修改已有列的类型
   */
  private async syncTableColumns(tableName: string, fields: FieldDefinition[]): Promise<void> {
    // 获取现有列的详细信息（包括类型）
    const existingColumns = await this.dataSource.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName],
    );
    const existingColumnMap = new Map<string, { type: string; nullable: string; default: string | null; comment: string }>();
    existingColumns.forEach((col: { COLUMN_NAME: string; COLUMN_TYPE: string; IS_NULLABLE: string; COLUMN_DEFAULT: string | null; COLUMN_COMMENT: string }) => {
      existingColumnMap.set(col.COLUMN_NAME.toLowerCase(), {
        type: col.COLUMN_TYPE.toUpperCase(),
        nullable: col.IS_NULLABLE,
        default: col.COLUMN_DEFAULT,
        comment: col.COLUMN_COMMENT,
      });
    });

    // 添加缺失的列或修改已有列的类型
    for (const field of fields) {
      const fieldLower = field.fieldName.toLowerCase();
      const columnType = this.getColumnType(field.fieldType, field.length, field.decimalPlaces);
      const nullable = field.required ? 'NOT NULL' : 'NULL';
      const defaultValue = field.defaultValue ? `DEFAULT '${field.defaultValue}'` : '';
      const autoIncrement = field.isAutoIncrement ? 'AUTO_INCREMENT' : '';
      const unique = field.isUnique && !field.isIndex ? 'UNIQUE' : '';
      const comment = field.comment ? `COMMENT '${field.comment}'` : '';

      if (!existingColumnMap.has(fieldLower)) {
        // 列不存在，添加新列
        await this.dataSource.query(
          `ALTER TABLE \`${tableName}\` ADD COLUMN \`${field.fieldName}\` ${columnType} ${nullable} ${defaultValue} ${autoIncrement} ${unique} ${comment}`,
        );
        console.log(`[表结构同步] 添加列: ${tableName}.${field.fieldName} (${columnType})`);
      } else {
        // 列已存在，检查是否需要修改类型
        const existingCol = existingColumnMap.get(fieldLower)!;
        // 标准化类型进行比较（移除空格、统一大小写）
        const normalizedExisting = existingCol.type.replace(/\s+/g, '').toUpperCase();
        const normalizedNew = columnType.toUpperCase();
        
        // 如果类型不匹配，修改列定义
        if (normalizedExisting !== normalizedNew) {
          try {
            await this.dataSource.query(
              `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${field.fieldName}\` ${columnType} ${nullable} ${defaultValue} ${comment}`,
            );
            console.log(`[表结构同步] 修改列类型: ${tableName}.${field.fieldName} (${existingCol.type} -> ${columnType})`);
          } catch (error: any) {
            console.error(`[表结构同步] 修改列类型失败: ${error.message}`);
          }
        }
      }
    }
  }

  /**
   * 生成字段定义SQL
   */
  private generateColumnDefinitions(fields: FieldDefinition[]): string {
    return fields
      .map((field) => {
        const columnType = this.getColumnType(field.fieldType, field.length, field.decimalPlaces);
        const nullable = field.required ? 'NOT NULL' : 'NULL';
        const defaultValue = field.defaultValue ? `DEFAULT '${field.defaultValue}'` : '';
        const autoIncrement = field.isAutoIncrement ? 'AUTO_INCREMENT' : '';
        const comment = field.comment ? `COMMENT '${field.comment}'` : '';
        const unique = field.isUnique && !field.isIndex ? 'UNIQUE' : '';
        return `\`${field.fieldName}\` ${columnType} ${nullable} ${defaultValue} ${autoIncrement} ${unique} ${comment}`.trim();
      })
      .join(',\n        ');
  }

  /**
   * 生成索引定义SQL
   */
  private generateIndexDefinitions(tableName: string, fields: FieldDefinition[]): string {
    const indexes: string[] = [];
    fields.forEach((field) => {
      if (field.isIndex && !field.isUnique) {
        indexes.push(`INDEX \`idx_${tableName}_${field.fieldName}\` (\`${field.fieldName}\`)`);
      }
      if (field.isUnique && field.isIndex) {
        indexes.push(`UNIQUE INDEX \`uk_${tableName}_${field.fieldName}\` (\`${field.fieldName}\`)`);
      }
    });
    return indexes.length > 0 ? ',' + indexes.join(',\n        ') : '';
  }

  /**
   * 创建外键约束
   */
  private async createForeignKeyConstraints(tableName: string, fields: FieldDefinition[]): Promise<void> {
    for (const field of fields) {
      if (field.isForeignKey && field.foreignKeyTable && field.foreignKeyField) {
        const constraintName = `fk_${tableName}_${field.fieldName}`;
        const refTable = `data_${field.foreignKeyTable}`;
        const onDelete = field.foreignKeyOnDelete || 'RESTRICT';

        try {
          // 检查外键是否已存在
          const existingFK = await this.dataSource.query(`
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'
          `, [tableName, constraintName]);

          if (existingFK && existingFK.length > 0) {
            continue;
          }

          // 检查被引用表是否存在
          const refTableExists = await this.checkTableExists(refTable);
          if (!refTableExists) {
            console.error(`[外键错误] 引用表 ${refTable} 不存在`);
            continue;
          }

          // 获取被引用字段的完整定义（包括字符集和校对规则）
          const refColumnInfo = await this.dataSource.query(`
            SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
          `, [refTable, field.foreignKeyField]);

          if (!refColumnInfo || refColumnInfo.length === 0) {
            console.error(`[外键错误] 引用字段 ${refTable}.${field.foreignKeyField} 不存在`);
            continue;
          }

          const refCol = refColumnInfo[0];

          // 获取当前字段定义
          const currentColumnInfo = await this.dataSource.query(`
            SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
          `, [tableName, field.fieldName]);

          if (!currentColumnInfo || currentColumnInfo.length === 0) {
            console.error(`[外键错误] 字段 ${tableName}.${field.fieldName} 不存在`);
            continue;
          }

          const curCol = currentColumnInfo[0];

          // 检查是否需要修改字段（类型、字符集、校对规则必须完全匹配）
          const needModify =
            curCol.COLUMN_TYPE.toLowerCase() !== refCol.COLUMN_TYPE.toLowerCase() ||
            curCol.CHARACTER_SET_NAME !== refCol.CHARACTER_SET_NAME ||
            curCol.COLLATION_NAME !== refCol.COLLATION_NAME;

          if (needModify) {
            // 构建完整的字段修改语句（包含字符集和校对规则）
            const nullable = refCol.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultVal = refCol.COLUMN_DEFAULT ? `DEFAULT '${refCol.COLUMN_DEFAULT}'` : '';
            const charset = refCol.CHARACTER_SET_NAME ? `CHARACTER SET ${refCol.CHARACTER_SET_NAME}` : '';
            const collate = refCol.COLLATION_NAME ? `COLLATE ${refCol.COLLATION_NAME}` : '';

            await this.dataSource.query(`
              ALTER TABLE \`${tableName}\`
              MODIFY COLUMN \`${field.fieldName}\` ${refCol.COLUMN_TYPE} ${charset} ${collate} ${nullable} ${defaultVal}
            `);
          }

          await this.dataSource.query(`
            ALTER TABLE \`${tableName}\`
            ADD CONSTRAINT \`${constraintName}\`
            FOREIGN KEY (\`${field.fieldName}\`)
            REFERENCES \`${refTable}\`(\`${field.foreignKeyField}\`)
            ON DELETE ${onDelete}
          `);

          console.log(`[外键] ${tableName}.${field.fieldName} -> ${refTable}.${field.foreignKeyField} 创建成功`);
        } catch (error: any) {
          console.error(`[外键错误] ${error.message}`);
        }
      }
    }
  }

  /**
   * 同步索引和外键
   */
  private async syncIndexesAndForeignKeys(tableName: string, fields: FieldDefinition[]): Promise<void> {
    // 获取现有索引
    const existingIndexes = await this.dataSource.query(`
      SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [tableName]);

    const existingIndexMap = new Map<string, { column: string; unique: boolean }>();
    existingIndexes.forEach((idx: { INDEX_NAME: string; COLUMN_NAME: string; NON_UNIQUE: number }) => {
      if (idx.INDEX_NAME !== 'PRIMARY') {
        existingIndexMap.set(idx.INDEX_NAME, {
          column: idx.COLUMN_NAME,
          unique: idx.NON_UNIQUE === 0,
        });
      }
    });

    // 添加缺失的索引
    for (const field of fields) {
      if (field.isIndex || field.isUnique) {
        const indexName = field.isUnique ? `uk_${tableName}_${field.fieldName}` : `idx_${tableName}_${field.fieldName}`;
        if (!existingIndexMap.has(indexName)) {
          const indexType = field.isUnique ? 'UNIQUE INDEX' : 'INDEX';
          try {
            await this.dataSource.query(`
              ALTER TABLE \`${tableName}\` ADD ${indexType} \`${indexName}\` (\`${field.fieldName}\`)
            `);
          } catch (error: any) {
            console.error(`创建索引失败: ${error.message}`);
          }
        }
      }
    }

    // 创建外键约束
    await this.createForeignKeyConstraints(tableName, fields);
  }

  /**
   * 获取字段对应的数据库类型
   */
  private getColumnType(fieldType: string, length?: number, decimalPlaces?: number): string {
    const typeMap: Record<string, string> = {
      text: 'TEXT',
      varchar: length ? `VARCHAR(${length})` : 'VARCHAR(255)',
      int: 'INT',
      bigint: 'BIGINT',
      float: 'FLOAT',
      double: 'DOUBLE',
      decimal: decimalPlaces ? `DECIMAL(${length || 20}, ${decimalPlaces})` : `DECIMAL(${length || 20}, 6)`,
      boolean: 'TINYINT(1)',
      date: 'DATE',
      datetime: 'DATETIME',
      select: length ? `VARCHAR(${length})` : 'VARCHAR(100)',
      multiselect: 'JSON',
      richtext: 'TEXT',
      image: length ? `VARCHAR(${length})` : 'VARCHAR(500)',
      file: length ? `VARCHAR(${length})` : 'VARCHAR(500)',
      relation: 'VARCHAR(36)',
      json: 'JSON',
    };
    return typeMap[fieldType] || 'TEXT';
  }


  /**
   * 查询数据列表
   */
  async findDataList(tableId: string, query: QueryDataDto) {
    const table = await this.tableMetaService.findTableById(tableId);
    const tableName = `data_${table.tableName}`;

    const { page = 1, pageSize = 20, keyword, sortBy, sortOrder, filters } = query;
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereClause = '1=1';
    const params: unknown[] = [];

    // 关键词搜索
    if (keyword) {
      const textFields = table.fields.filter((f) => f.fieldType === 'text' || f.fieldType === 'varchar');
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

    // 筛选条件处理
    if (filters && filters.length > 0) {
      for (const filter of filters) {
        const condition = this.buildFilterCondition(filter);
        if (condition) {
          whereClause += ` AND ${condition.clause}`;
          params.push(...condition.params);
        }
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
   * 构建筛选条件SQL
   */
  private buildFilterCondition(filter: { field: string; operator: string; value: any }): { clause: string; params: unknown[] } | null {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'eq':
        return { clause: `?? = ?`, params: [field, value] };
      case 'ne':
        return { clause: `?? != ?`, params: [field, value] };
      case 'gt':
        return { clause: `?? > ?`, params: [field, value] };
      case 'gte':
        return { clause: `?? >= ?`, params: [field, value] };
      case 'lt':
        return { clause: `?? < ?`, params: [field, value] };
      case 'lte':
        return { clause: `?? <= ?`, params: [field, value] };
      case 'like':
        return { clause: `?? LIKE ?`, params: [field, `%${value}%`] };
      case 'in':
        if (Array.isArray(value) && value.length > 0) {
          const placeholders = value.map(() => '?').join(', ');
          return { clause: `?? IN (${placeholders})`, params: [field, ...value] };
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * 查询单条数据
   */
  async findDataById(tableId: string, dataId: string) {
    const table = await this.tableMetaService.findTableById(tableId);
    const tableName = `data_${table.tableName}`;

    const result = await this.dataSource.query(
      `SELECT * FROM ?? WHERE id = ?`,
      [tableName, dataId],
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
    const placeholders = fields.map(() => '?').join(', ');

    await this.dataSource.query(
      `INSERT INTO ?? (${fields.map(() => '??').join(', ')}) VALUES (${placeholders})`,
      [tableName, ...fields, ...values],
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

    await this.dataSource.query(`DELETE FROM ?? WHERE id = ?`, [tableName, dataId]);
  }

  /**
   * 批量删除
   */
  async batchDelete(tableId: string, dto: BatchDeleteDto) {
    const table = await this.tableMetaService.findTableById(tableId);
    const tableName = `data_${table.tableName}`;

    const placeholders = dto.ids.map(() => '?').join(', ');
    await this.dataSource.query(
      `DELETE FROM ?? WHERE id IN (${placeholders})`,
      [tableName, ...dto.ids],
    );
  }

  /**
   * 验证必填字段
   */
  private validateRequiredFields(fields: FieldDefinition[], data: Record<string, unknown>) {
    const missingFields = fields
      .filter((f) => {
        if (!f.required) return false;
        const value = data[f.fieldName];
        // 检查 undefined、null、空字符串
        return value === undefined || value === null || value === '';
      })
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
      case 'json':
        // 如果是对象/数组，序列化为JSON字符串
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return value;
      case 'date':
      case 'datetime':
        return new Date(value as string);
      case 'int':
      case 'bigint':
        return parseInt(String(value), 10);
      case 'float':
      case 'double':
      case 'decimal':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      default:
        return value;
    }
  }
}
