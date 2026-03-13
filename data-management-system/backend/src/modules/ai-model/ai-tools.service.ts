/**
 * AI工具服务 - 数据库管理工具
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-12
 */
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { KnowledgeBaseService } from '../knowledge-base';

// 工具定义接口
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
}

// 工具调用结果
export interface ToolCallResult {
  toolCallId: string;
  name: string;
  success: boolean;
  result: any;
}

@Injectable()
export class AIToolsService {
  constructor(
    private dataSource: DataSource,
    private knowledgeBaseService: KnowledgeBaseService,
  ) {}

  /**
   * 获取所有可用工具定义
   * @param includeKnowledge 是否包含知识库工具
   */
  getToolDefinitions(includeKnowledge: boolean = false): ToolDefinition[] {
    const baseTools: ToolDefinition[] = [
      {
        type: 'function',
        function: {
          name: 'list_tables',
          description: '列出数据库中所有的数据表（不包括系统表sys_开头）',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'describe_table',
          description: '查看指定表的结构，包括字段名、类型、是否必填等信息',
          parameters: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '表名称（不需要带data_前缀）',
              },
            },
            required: ['tableName'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'query_data',
          description: '查询表中的数据，支持分页、排序和简单筛选',
          parameters: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '表名称（不需要带data_前缀）',
              },
              page: {
                type: 'number',
                description: '页码，默认为1',
              },
              pageSize: {
                type: 'number',
                description: '每页数量，默认为10，最大100',
              },
              sortBy: {
                type: 'string',
                description: '排序字段',
              },
              sortOrder: {
                type: 'string',
                description: '排序方向',
                enum: ['ASC', 'DESC'],
              },
              keyword: {
                type: 'string',
                description: '搜索关键词（在文本字段中搜索）',
              },
            },
            required: ['tableName'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'count_data',
          description: '统计表中的数据总数',
          parameters: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '表名称（不需要带data_前缀）',
              },
            },
            required: ['tableName'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'aggregate_data',
          description: '对数值字段进行聚合统计（求和、平均值、最大值、最小值）',
          parameters: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '表名称（不需要带data_前缀）',
              },
              field: {
                type: 'string',
                description: '要统计的数值字段名',
              },
              operation: {
                type: 'string',
                description: '聚合操作类型',
                enum: ['sum', 'avg', 'max', 'min', 'count'],
              },
            },
            required: ['tableName', 'field', 'operation'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'group_by_field',
          description: '按字段分组统计数量',
          parameters: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '表名称（不需要带data_前缀）',
              },
              field: {
                type: 'string',
                description: '要分组的字段名',
              },
              limit: {
                type: 'number',
                description: '返回的分组数量限制，默认为10',
              },
            },
            required: ['tableName', 'field'],
          },
        },
      },
    ];

    // 知识库查询工具（可选）
    const knowledgeTool: ToolDefinition = {
      type: 'function',
      function: {
        name: 'search_knowledge',
        description: '搜索系统知识库，查找与用户问题相关的知识内容。当用户询问业务规则、操作指南、系统说明等问题时，应该先调用此工具查询相关知识。',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索关键词或问题，可以是多个关键词',
            },
            limit: {
              type: 'number',
              description: '返回结果数量限制，默认为3',
            },
          },
          required: ['query'],
        },
      },
    };

    // 只有开启知识库时才添加知识库工具
    if (includeKnowledge) {
      baseTools.push(knowledgeTool);
    }

    return baseTools;
  }

  /**
   * 执行工具调用
   */
  async executeToolCall(toolCall: { id: string; function: { name: string; arguments: string } }): Promise<ToolCallResult> {
    const { id, function: fn } = toolCall;
    const args = JSON.parse(fn.arguments);

    try {
      let result: any;

      switch (fn.name) {
        case 'list_tables':
          result = await this.listTables();
          break;
        case 'describe_table':
          result = await this.describeTable(args.tableName);
          break;
        case 'query_data':
          result = await this.queryData(args);
          break;
        case 'count_data':
          result = await this.countData(args.tableName);
          break;
        case 'aggregate_data':
          result = await this.aggregateData(args);
          break;
        case 'group_by_field':
          result = await this.groupByField(args);
          break;
        case 'search_knowledge':
          result = await this.searchKnowledge(args.query, args.limit);
          break;
        default:
          throw new Error(`未知的工具: ${fn.name}`);
      }

      return {
        toolCallId: id,
        name: fn.name,
        success: true,
        result,
      };
    } catch (error: any) {
      return {
        toolCallId: id,
        name: fn.name,
        success: false,
        result: { error: error.message },
      };
    }
  }

  /**
   * 列出所有数据表
   */
  private async listTables(): Promise<any> {
    const tables = await this.dataSource.query(`
      SELECT TABLE_NAME as tableName, TABLE_COMMENT as tableComment, 
             TABLE_ROWS as rowCount, CREATE_TIME as createTime
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME LIKE 'data_%'
      ORDER BY TABLE_NAME
    `);

    // 同时获取表的显示名称（从元数据表获取）
    const tableMetaList = await this.dataSource.query(`
      SELECT tableName, displayName 
      FROM sys_table
    `);
    const metaMap = new Map(tableMetaList.map((m: any) => [m.tableName, m.displayName]));

    return tables.map((t: any) => ({
      tableName: t.tableName.replace('data_', ''),
      displayName: metaMap.get(t.tableName.replace('data_', '')) || t.tableName.replace('data_', ''),
      rowCount: t.rowCount,
      comment: t.tableComment,
      createTime: t.createTime,
    }));
  }

  /**
   * 查看表结构
   */
  private async describeTable(tableName: string): Promise<any> {
    const fullTableName = `data_${tableName}`;
    
    // 检查表是否存在
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    if (tableExists[0].count === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 获取表结构
    const columns = await this.dataSource.query(`
      SELECT COLUMN_NAME as field, COLUMN_TYPE as type, 
             IS_NULLABLE as nullable, COLUMN_DEFAULT as defaultValue,
             COLUMN_COMMENT as comment
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [fullTableName]);

    // 获取字段元数据
    const fieldMeta = await this.dataSource.query(`
      SELECT f.fieldName, f.displayName, f.fieldType, f.required 
      FROM sys_field f
      JOIN sys_table t ON f.tableId = t.tableId
      WHERE t.tableName = ?
    `, [tableName]);
    const fieldMetaMap = new Map<string, any>(fieldMeta.map((f: any) => [f.fieldName, f]));

    return columns.map((col: any) => {
      const meta = fieldMetaMap.get(col.field);
      return {
        field: col.field,
        displayName: meta?.displayName || col.field,
        type: col.type,
        fieldType: meta?.fieldType || 'unknown',
        nullable: col.nullable === 'YES',
        defaultValue: col.defaultValue,
        comment: col.comment,
      };
    });
  }

  /**
   * 查询数据
   */
  private async queryData(args: any): Promise<any> {
    const { tableName, page = 1, pageSize = 10, sortBy, sortOrder = 'DESC', keyword } = args;
    const fullTableName = `data_${tableName}`;
    const offset = (page - 1) * pageSize;
    const limit = Math.min(pageSize, 100);

    // 检查表是否存在
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    if (tableExists[0].count === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 构建查询
    let whereClause = '1=1';
    const params: any[] = [fullTableName];

    if (keyword) {
      // 获取文本字段用于搜索
      const textColumns = await this.dataSource.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? 
        AND DATA_TYPE IN ('varchar', 'text', 'char')
      `, [fullTableName]);

      if (textColumns.length > 0) {
        const likeConditions = textColumns.map(() => `?? LIKE ?`).join(' OR ');
        whereClause += ` AND (${likeConditions})`;
        textColumns.forEach((col: any) => {
          params.push(col.COLUMN_NAME, `%${keyword}%`);
        });
      }
    }

    // 排序
    let orderClause = 'created_at DESC';
    if (sortBy) {
      orderClause = `?? ${sortOrder}`;
      params.push(sortBy);
    }

    // 查询总数
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM ?? WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 查询数据
    params.push(limit, offset);
    const list = await this.dataSource.query(
      `SELECT * FROM ?? WHERE ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`,
      params
    );

    return {
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
      list,
    };
  }

  /**
   * 统计数据总数
   */
  private async countData(tableName: string): Promise<any> {
    const fullTableName = `data_${tableName}`;

    // 检查表是否存在
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    if (tableExists[0].count === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    const result = await this.dataSource.query(`SELECT COUNT(*) as count FROM ??`, [fullTableName]);
    
    return {
      tableName,
      count: result[0].count,
    };
  }

  /**
   * 聚合统计
   */
  private async aggregateData(args: any): Promise<any> {
    const { tableName, field, operation } = args;
    const fullTableName = `data_${tableName}`;

    // 检查表是否存在
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    if (tableExists[0].count === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 检查字段是否存在且为数值类型
    const fieldInfo = await this.dataSource.query(`
      SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `, [fullTableName, field]);

    if (fieldInfo.length === 0) {
      // 获取可用字段列表
      const availableFields = await this.dataSource.query(`
        SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      `, [fullTableName]);
      const fieldNames = availableFields.map((f: any) => `${f.COLUMN_NAME}(${f.DATA_TYPE})`).join(', ');
      throw new Error(`字段 "${field}" 不存在。可用字段: ${fieldNames}`);
    }

    const numericTypes = ['int', 'bigint', 'float', 'double', 'decimal', 'tinyint', 'smallint', 'mediumint'];
    if (!numericTypes.includes(fieldInfo[0].DATA_TYPE.toLowerCase())) {
      throw new Error(`字段 ${field} 不是数值类型，无法进行聚合统计`);
    }

    const sqlFunctions: Record<string, string> = {
      sum: 'SUM',
      avg: 'AVG',
      max: 'MAX',
      min: 'MIN',
      count: 'COUNT',
    };

    const result = await this.dataSource.query(
      `SELECT ${sqlFunctions[operation]}(??) as value FROM ??`,
      [field, fullTableName]
    );

    return {
      tableName,
      field,
      operation,
      value: result[0].value,
    };
  }

  /**
   * 按字段分组统计
   */
  private async groupByField(args: any): Promise<any> {
    const { tableName, field, limit = 10 } = args;
    const fullTableName = `data_${tableName}`;

    // 检查表是否存在
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    if (tableExists[0].count === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 检查字段是否存在
    const fieldInfo = await this.dataSource.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `, [fullTableName, field]);

    if (fieldInfo.length === 0) {
      // 获取可用字段列表
      const availableFields = await this.dataSource.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      `, [fullTableName]);
      const fieldNames = availableFields.map((f: any) => f.COLUMN_NAME).join(', ');
      throw new Error(`字段 "${field}" 不存在。可用字段: ${fieldNames}`);
    }

    const result = await this.dataSource.query(
      `SELECT ?? as value, COUNT(*) as count FROM ?? GROUP BY ?? ORDER BY count DESC LIMIT ?`,
      [field, fullTableName, field, limit]
    );

    return {
      tableName,
      field,
      groups: result,
    };
  }

  /**
   * 搜索知识库
   */
  private async searchKnowledge(query: string, limit: number = 3): Promise<any> {
    const results = await this.knowledgeBaseService.searchForAI(query, limit);
    
    return {
      query,
      count: results.length,
      results: results.map(r => ({
        title: r.title,
        content: r.content,
        category: r.category,
        tags: r.tags,
        source: r.source,
      })),
    };
  }
}
