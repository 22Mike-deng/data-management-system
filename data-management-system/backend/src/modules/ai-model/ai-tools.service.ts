/**
 * AI工具服务 - 数据库管理工具
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-16
 */
import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { KnowledgeBaseService } from '../knowledge-base';
import { isValidTableName, validateFieldNames } from '../../common/utils/sql-sanitizer.util';

// 工具权限映射
const TOOL_PERMISSION_MAP: Record<string, string> = {
  // 查询类工具 - 需要 ai:tool:view 权限
  list_tables: 'ai:tool:view',
  describe_table: 'ai:tool:view',
  query_data: 'ai:tool:view',
  count_data: 'ai:tool:view',
  aggregate_data: 'ai:tool:view',
  group_by_field: 'ai:tool:view',
  search_field: 'ai:tool:view',
  get_table_stats: 'ai:tool:view',
  // 新增类工具 - 需要 ai:tool:create 权限
  insert_record: 'ai:tool:create',
  // 编辑类工具 - 需要 ai:tool:edit 权限
  update_record: 'ai:tool:edit',
  // 删除类工具 - 需要 ai:tool:delete 权限
  delete_record: 'ai:tool:delete',
  batch_delete_records: 'ai:tool:delete',
  // 知识库工具 - 需要 knowledge:view 权限
  search_knowledge: 'knowledge:view',
};

// 工具参数属性定义
interface ParameterProperty {
  type?: string;
  description?: string;
  enum?: string[];
  items?: ParameterProperty;
  properties?: Record<string, ParameterProperty>;
  oneOf?: ParameterProperty[];
}

// 工具定义接口
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ParameterProperty>;
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
                description: '表名称（不需要带data_前缀）,但是输出的表名称会带上data_前缀',
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
          description: `查询表中的数据，支持分页、排序、筛选和联合查询（JOIN）。

【何时使用联合查询joins】
1. 用户查询涉及多个表的数据（如"查询用户及其订单信息"）
2. 用户提到的字段不在主表中，需要从关联表获取（如用户表查询订单金额）
3. 用户需要展示关联数据（如显示部门名称而非部门ID）

【使用步骤】
1. 先调用describe_table了解主表结构
2. 如果发现需要的字段不在主表，调用search_field搜索该字段在哪个表
3. 使用joins参数关联该表，通过fields参数指定要获取的字段

【示例】查询用户表同时获取其部门名称：
{
  "tableName": "user",
  "fields": ["t0.username", "t1.name as departmentName"],
  "joins": [{"table": "department", "alias": "t1", "on": {"localField": "dept_id", "foreignField": "id"}}]
}`,
          parameters: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '主表名称（不需要带data_前缀）',
              },
              fields: {
                type: 'array',
                description: '要查询的字段列表。单表查询：["字段名"]；联合查询：["t0.字段名", "t1.字段名 as 别名"]。主表别名为t0',
                items: { type: 'string' },
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
              filters: {
                type: 'array',
                description: '筛选条件数组，支持多条件组合。格式：[{field: "字段名", operator: "操作符", value: "值"}]。联合查询时field需带表别名如"t1.status"',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', description: '字段名，联合查询时需带别名如t1.status' },
                    operator: { type: 'string', description: '操作符：eq(等于), ne(不等于), gt(大于), lt(小于), gte(大于等于), lte(小于等于), like(包含), in(在列表中)', enum: ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'like', 'in'] },
                    value: { description: '比较值，in操作时为数组' },
                  },
                },
              },
              joins: {
                type: 'array',
                description: '联合查询配置。当需要查询其他表的关联数据时使用。示例：[{"table": "order", "alias": "t1", "on": {"localField": "id", "foreignField": "user_id"}}] 表示通过主表id关联order表的user_id',
                items: {
                  type: 'object',
                  properties: {
                    table: { type: 'string', description: '关联表名称（不需要data_前缀）' },
                    alias: { type: 'string', description: '关联表别名，建议使用t1, t2, t3...' },
                    on: {
                      type: 'object',
                      description: '关联条件',
                      properties: {
                        localField: { type: 'string', description: '主表关联字段' },
                        foreignField: { type: 'string', description: '关联表字段' },
                      },
                    },
                    type: { type: 'string', description: 'JOIN类型：LEFT(左连接，默认，保留主表所有记录) 或 INNER(内连接，只返回匹配记录)', enum: ['LEFT', 'INNER'] },
                  },
                },
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
      {
        type: 'function',
        function: {
          name: 'insert_record',
          description: '向指定表中插入记录，支持单条或批量插入。在插入前应该先调用describe_table了解表结构，确保提供正确的字段名和必填字段。',
          parameters: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '表名称（不需要带data_前缀）',
              },
              data: {
                description: '要插入的数据。单条插入时为对象：{"name": "张三", "age": 25}；批量插入时为数组：[{"name": "张三"}, {"name": "李四"}]。批量插入最多支持100条。',
                oneOf: [
                  { type: 'object' },
                  { type: 'array', items: { type: 'object' } },
                ],
              },
            },
            required: ['tableName', 'data'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_record',
          description: '更新表中指定条件的记录。在更新前应该先调用describe_table了解表结构，确保提供正确的字段名。',
          parameters: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '表名称（不需要带data_前缀）',
              },
              data: {
                type: 'object',
                description: '要更新的数据，键为字段名，值为新值。例如: {"name": "李四", "age": 30}',
              },
              recordId: {
                type: 'string',
                description: '要更新的记录ID（主键），通常是从查询结果中获取的id字段',
              },
            },
            required: ['tableName', 'data', 'recordId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'search_field',
          description: '智能搜索表和字段：1.在sys_table中搜索匹配的表名或显示名；2.在sys_field中搜索匹配的字段名或显示名；3.返回所有相关表的完整结构。用于在用户提到的字段不存在时，帮助找到正确的表。例如：用户说"年龄"但当前表没有，调用此工具搜索"年龄"或"age"，会返回相关表及其完整字段列表。',
          parameters: {
            type: 'object',
            properties: {
              keyword: {
                type: 'string',
                description: '搜索关键词，可以是表名、表显示名、字段名或字段显示名。例如: "用户", "user", "年龄", "age"',
              },
            },
            required: ['keyword'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'delete_record',
          description: '删除表中指定ID的记录。删除前应该先确认用户意图，并告知删除后无法恢复。',
          parameters: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '表名称（不需要带data_前缀）',
              },
              recordId: {
                type: 'string',
                description: '要删除的记录ID（主键），通常是从查询结果中获取的id字段',
              },
            },
            required: ['tableName', 'recordId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'batch_delete_records',
          description: '批量删除表中指定ID列表的记录。删除前应该先确认用户意图，并告知删除后无法恢复。',
          parameters: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '表名称（不需要带data_前缀）',
              },
              recordIds: {
                type: 'array',
                description: '要删除的记录ID列表',
                items: { type: 'string' },
              },
            },
            required: ['tableName', 'recordIds'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_table_stats',
          description: '获取表的统计信息，包括记录数、字段统计、创建/更新时间等',
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
   * 获取工具所需的权限
   * @param toolName 工具名称
   * @returns 所需权限编码，如果不需要权限则返回 null
   */
  getToolPermission(toolName: string): string | null {
    return TOOL_PERMISSION_MAP[toolName] || null;
  }

  /**
   * 执行工具调用
   * @param toolCall 工具调用参数
   * @param userPermissions 用户拥有的权限列表
   * @param isSuperAdmin 是否为超级管理员
   */
  async executeToolCall(
    toolCall: { id: string; function: { name: string; arguments: string } },
    userPermissions: string[] = [],
    isSuperAdmin: boolean = false,
  ): Promise<ToolCallResult> {
    const { id, function: fn } = toolCall;
    const args = JSON.parse(fn.arguments);

    // 权限检查
    const requiredPermission = this.getToolPermission(fn.name);
    if (requiredPermission && !isSuperAdmin) {
      if (!userPermissions.includes(requiredPermission)) {
        return {
          toolCallId: id,
          name: fn.name,
          success: false,
          result: { 
            error: `权限不足：使用此工具需要 "${requiredPermission}" 权限`,
            requiredPermission,
          },
        };
      }
    }

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
        case 'insert_record':
          result = await this.insertRecord(args.tableName, args.data);
          break;
        case 'update_record':
          result = await this.updateRecord(args.tableName, args.data, args.recordId);
          break;
        case 'search_field':
          result = await this.searchField(args.keyword);
          break;
        case 'delete_record':
          result = await this.deleteRecord(args.tableName, args.recordId);
          break;
        case 'batch_delete_records':
          result = await this.batchDeleteRecords(args.tableName, args.recordIds);
          break;
        case 'get_table_stats':
          result = await this.getTableStats(args.tableName);
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
    // 【安全修复】验证表名格式，防止访问系统表
    if (!isValidTableName(tableName)) {
      throw new Error(`无效的表名: ${tableName}（不允许访问系统表）`);
    }

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
   * 查询数据（支持联合查询）
   */
  private async queryData(args: any): Promise<any> {
    const { tableName, fields, page = 1, pageSize = 10, sortBy, sortOrder = 'DESC', keyword, filters, joins } = args;

    // 【安全修复】验证表名格式，防止访问系统表
    if (!isValidTableName(tableName)) {
      throw new Error(`无效的表名: ${tableName}（不允许访问系统表）`);
    }

    const fullTableName = `data_${tableName}`;
    const offset = (page - 1) * pageSize;
    const limit = Math.min(pageSize, 100);
    const mainAlias = 't0';

    // 检查主表是否存在
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    if (tableExists[0].count === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 收集所有表名用于验证
    const tableAliases: Map<string, string> = new Map();
    tableAliases.set(fullTableName, mainAlias);

    // 验证并收集JOIN表
    const joinClauses: string[] = [];
    if (joins && Array.isArray(joins)) {
      for (let i = 0; i < joins.length; i++) {
        const join = joins[i];

        // 【安全修复】验证关联表名格式
        if (!isValidTableName(join.table)) {
          throw new Error(`无效的关联表名: ${join.table}（不允许访问系统表）`);
        }

        const joinTable = `data_${join.table}`;
        const alias = join.alias || `t${i + 1}`;
        const joinType = join.type === 'INNER' ? 'INNER JOIN' : 'LEFT JOIN';

        // 检查关联表是否存在
        const joinTableExists = await this.dataSource.query(`
          SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        `, [joinTable]);

        if (joinTableExists[0].count === 0) {
          throw new Error(`关联表 ${join.table} 不存在`);
        }

        tableAliases.set(joinTable, alias);
        joinClauses.push(`${joinType} ?? AS ${alias} ON ${mainAlias}.${join.on.localField} = ${alias}.${join.on.foreignField}`);
      }
    }

    // 构建SELECT字段
    let selectFields = '*';
    if (fields && Array.isArray(fields) && fields.length > 0) {
      selectFields = fields.map(f => {
        if (f.includes('.')) {
          return f; // 已经包含表别名
        }
        return `${mainAlias}.${f}`;
      }).join(', ');
    } else if (joins && joins.length > 0) {
      // 联合查询时，默认选择主表所有字段
      selectFields = `${mainAlias}.*`;
    }

    // 构建WHERE条件
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    // 关键词搜索（只在主表搜索）
    if (keyword) {
      const textColumns = await this.dataSource.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? 
        AND DATA_TYPE IN ('varchar', 'text', 'char')
      `, [fullTableName]);

      if (textColumns.length > 0) {
        const likeConditions = textColumns.map((col: any) => `${mainAlias}.${col.COLUMN_NAME} LIKE ?`).join(' OR ');
        whereConditions.push(`(${likeConditions})`);
        textColumns.forEach(() => {
          params.push(`%${keyword}%`);
        });
      }
    }

    // 高级筛选条件
    if (filters && Array.isArray(filters)) {
      for (const filter of filters) {
        const { field, operator, value } = filter;
        const fieldName = field.includes('.') ? field : `${mainAlias}.${field}`;

        switch (operator) {
          case 'eq':
            whereConditions.push(`${fieldName} = ?`);
            params.push(value);
            break;
          case 'ne':
            whereConditions.push(`${fieldName} != ?`);
            params.push(value);
            break;
          case 'gt':
            whereConditions.push(`${fieldName} > ?`);
            params.push(value);
            break;
          case 'lt':
            whereConditions.push(`${fieldName} < ?`);
            params.push(value);
            break;
          case 'gte':
            whereConditions.push(`${fieldName} >= ?`);
            params.push(value);
            break;
          case 'lte':
            whereConditions.push(`${fieldName} <= ?`);
            params.push(value);
            break;
          case 'like':
            whereConditions.push(`${fieldName} LIKE ?`);
            params.push(`%${value}%`);
            break;
          case 'in':
            if (Array.isArray(value) && value.length > 0) {
              const placeholders = value.map(() => '?').join(', ');
              whereConditions.push(`${fieldName} IN (${placeholders})`);
              params.push(...value);
            }
            break;
        }
      }
    }

    const whereClause = whereConditions.join(' AND ');

    // 排序
    let orderClause = `${mainAlias}.created_at DESC`;
    if (sortBy) {
      const orderField = sortBy.includes('.') ? sortBy : `${mainAlias}.${sortBy}`;
      orderClause = `${orderField} ${sortOrder}`;
    }

    // 构建完整SQL（统一使用表别名，避免字段引用问题）
    const joinClause = joinClauses.length > 0 ? joinClauses.join(' ') : '';
    const fromClause = `FROM ?? AS ${mainAlias} ${joinClause}`.trim();

    // 查询总数
    const countSql = joins && joins.length > 0
      ? `SELECT COUNT(DISTINCT ${mainAlias}.id) as total ${fromClause} WHERE ${whereClause}`
      : `SELECT COUNT(*) as total ${fromClause} WHERE ${whereClause}`;

    const countResult = await this.dataSource.query(countSql, [fullTableName, ...params]);
    const total = countResult[0].total;

    // 查询数据
    const dataSql = `SELECT ${selectFields} ${fromClause} WHERE ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`;
    const dataParams = [fullTableName, ...params, limit, offset];

    const list = await this.dataSource.query(dataSql, dataParams);

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
    // 【安全修复】验证表名格式
    if (!isValidTableName(tableName)) {
      throw new Error(`无效的表名: ${tableName}（不允许访问系统表）`);
    }

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

    // 【安全修复】验证表名格式
    if (!isValidTableName(tableName)) {
      throw new Error(`无效的表名: ${tableName}（不允许访问系统表）`);
    }

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

    // 【安全修复】验证表名格式
    if (!isValidTableName(tableName)) {
      throw new Error(`无效的表名: ${tableName}（不允许访问系统表）`);
    }

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

  /**
   * 插入记录（支持批量插入）
   */
  private async insertRecord(tableName: string, data: Record<string, any> | Record<string, any>[]): Promise<any> {
    // 【安全修复】验证表名格式，防止 SQL 注入
    if (!isValidTableName(tableName)) {
      throw new Error(`无效的表名: ${tableName}`);
    }

    const fullTableName = `data_${tableName}`;

    // 检查表是否存在
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    if (tableExists[0].count === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 获取表结构，验证字段
    const columns = await this.dataSource.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [fullTableName]);

    const columnNames = columns.map((c: any) => c.COLUMN_NAME);

    // 检查 id 字段是否需要自动生成
    const idColumn = columns.find((c: any) => c.COLUMN_NAME === 'id');
    const isAutoIncrement = idColumn?.EXTRA?.includes('auto_increment');

    // 检查必填字段（排除自增主键和有默认值的字段）
    const notNullColumns = columns.filter((c: any) => 
      c.IS_NULLABLE === 'NO' && 
      c.COLUMN_DEFAULT === null &&
      !c.EXTRA?.includes('auto_increment') &&
      c.COLUMN_NAME !== 'created_at' &&
      c.COLUMN_NAME !== 'updated_at'
    );

    // 统一转换为数组处理
    const dataArray = Array.isArray(data) ? data : [data];
    const isBatch = Array.isArray(data);

    // 批量插入限制
    if (dataArray.length > 100) {
      throw new Error(`批量插入最多支持100条记录，当前: ${dataArray.length}条`);
    }

    // 验证每条数据
    const processedData: Record<string, any>[] = [];
    for (let i = 0; i < dataArray.length; i++) {
      let record = { ...dataArray[i] };

      // 【安全修复】验证字段名格式
      const recordFields = Object.keys(record);
      const fieldValidation = validateFieldNames(recordFields);
      if (!fieldValidation.valid) {
        throw new Error(`第${i + 1}条记录包含非法字段名: ${fieldValidation.invalidFields.join(', ')}`);
      }

      // 验证字段是否存在
      const invalidFields = recordFields.filter(key => !columnNames.includes(key));
      if (invalidFields.length > 0) {
        throw new Error(`第${i + 1}条记录字段不存在: ${invalidFields.join(', ')}。可用字段: ${columnNames.join(', ')}`);
      }

      // 如果 id 字段不是自增的，且用户没有提供 id，则自动生成 UUID
      if (idColumn && !isAutoIncrement && !record.hasOwnProperty('id')) {
        record = { id: uuidv4(), ...record };
      }

      // 检查必填字段
      const missingFields = notNullColumns
        .filter((c: any) => !record.hasOwnProperty(c.COLUMN_NAME))
        .map((c: any) => c.COLUMN_NAME);
      
      if (missingFields.length > 0) {
        throw new Error(`第${i + 1}条记录缺少必填字段: ${missingFields.join(', ')}`);
      }

      processedData.push(record);
    }

    // 获取所有字段（合并所有记录的字段）
    const allFields = new Set<string>();
    processedData.forEach(record => {
      Object.keys(record).forEach(key => allFields.add(key));
    });
    const fields = Array.from(allFields);

    // 构建批量插入SQL
    const placeholders = processedData.map(() => 
      `(${fields.map(() => '?').join(', ')})`
    ).join(', ');

    const sql = `INSERT INTO ?? (${fields.map(() => '??').join(', ')}) VALUES ${placeholders}`;
    const params = [fullTableName, ...fields];

    // 添加所有记录的值
    processedData.forEach(record => {
      fields.forEach(field => {
        params.push(record.hasOwnProperty(field) ? record[field] : null);
      });
    });

    const result = await this.dataSource.query(sql, params);

    return {
      success: true,
      message: `成功向表 ${tableName} 插入 ${processedData.length} 条记录`,
      insertCount: processedData.length,
      insertIds: processedData.map(r => r.id).filter(Boolean),
      affectedRows: result.affectedRows,
      isBatch,
    };
  }

  /**
   * 更新记录
   */
  private async updateRecord(tableName: string, data: Record<string, any>, recordId: string): Promise<any> {
    // 【安全修复】验证表名格式
    if (!isValidTableName(tableName)) {
      throw new Error(`无效的表名: ${tableName}`);
    }

    const fullTableName = `data_${tableName}`;

    // 检查表是否存在
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    if (tableExists[0].count === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 检查记录是否存在
    const existingRecord = await this.dataSource.query(
      `SELECT id FROM ?? WHERE id = ?`,
      [fullTableName, recordId]
    );

    if (existingRecord.length === 0) {
      throw new Error(`记录不存在: ID = ${recordId}`);
    }

    // 获取表结构，验证字段
    const columns = await this.dataSource.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    const columnNames = columns.map((c: any) => c.COLUMN_NAME);
    
    // 【安全修复】验证字段名格式
    const dataFields = Object.keys(data);
    const fieldValidation = validateFieldNames(dataFields);
    if (!fieldValidation.valid) {
      throw new Error(`包含非法字段名: ${fieldValidation.invalidFields.join(', ')}`);
    }

    const invalidFields = dataFields.filter(key => !columnNames.includes(key));
    
    if (invalidFields.length > 0) {
      throw new Error(`字段不存在: ${invalidFields.join(', ')}。可用字段: ${columnNames.join(', ')}`);
    }

    // 禁止更新的字段
    const protectedFields = ['id', 'created_at'];
    const attemptedProtectedFields = Object.keys(data).filter(key => protectedFields.includes(key));
    
    if (attemptedProtectedFields.length > 0) {
      throw new Error(`禁止更新字段: ${attemptedProtectedFields.join(', ')}`);
    }

    // 构建更新SQL
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(() => '?? = ?').join(', ');
    
    const sql = `UPDATE ?? SET ${setClause} WHERE id = ?`;
    const params = [fullTableName, ...fields.flatMap((field, i) => [field, values[i]]), recordId];

    const result = await this.dataSource.query(sql, params);

    return {
      success: true,
      message: `成功更新表 ${tableName} 中的记录 (ID: ${recordId})`,
      recordId,
      affectedRows: result.affectedRows,
    };
  }

  /**
   * 搜索表和字段
   * 逻辑：先搜索相关表（按表名或显示名），再获取这些表的结构，同时搜索字段
   * 帮助AI找到包含特定字段的正确表
   */
  private async searchField(keyword: string): Promise<any> {
    try {
      console.log(`[search_field] Searching for: ${keyword}`);
      const lowerKeyword = keyword.toLowerCase();

      // 步骤1：在 sys_table 中搜索相关的表（按表名或显示名）
      const matchedTables = await this.dataSource.query(`
        SELECT tableName, displayName
        FROM sys_table
        WHERE LOWER(tableName) LIKE ? 
           OR LOWER(displayName) LIKE ?
        ORDER BY tableName
      `, [`%${lowerKeyword}%`, `%${lowerKeyword}%`]);

      console.log(`[search_field] Found ${matchedTables.length} matching tables`);

      // 步骤2：在 sys_field 中搜索相关的字段
      const matchedFields = await this.dataSource.query(`
        SELECT 
          f.fieldName,
          f.displayName,
          f.fieldType,
          t.tableName,
          t.displayName as tableDisplayName
        FROM sys_field f
        JOIN sys_table t ON f.tableId = t.tableId
        WHERE LOWER(f.fieldName) LIKE ? 
           OR LOWER(f.displayName) LIKE ?
        ORDER BY t.tableName, f.fieldName
      `, [`%${lowerKeyword}%`, `%${lowerKeyword}%`]);

      console.log(`[search_field] Found ${matchedFields.length} matching fields`);

      // 步骤3：合并结果，获取每个匹配表的完整结构
      const tableSet = new Set<string>();
      
      // 添加匹配到的表
      matchedTables.forEach((t: any) => tableSet.add(t.tableName));
      // 添加包含匹配字段的表
      matchedFields.forEach((f: any) => tableSet.add(f.tableName));

      // 如果没有匹配，返回提示
      if (tableSet.size === 0) {
        return {
          keyword,
          found: false,
          message: `未找到与"${keyword}"相关的表或字段。建议使用 list_tables 工具查看所有可用表。`,
          matchedTables: [],
          matchedFields: [],
          tableStructures: [],
        };
      }

      // 步骤4：获取每个匹配表的完整结构
      const tableStructures: any[] = [];
      for (const tableName of Array.from(tableSet)) {
        try {
          const structure = await this.describeTable(tableName);
          // 标记哪些字段匹配了关键词
          const fieldsWithMatch = structure.map((field: any) => ({
            ...field,
            isMatch: field.field.toLowerCase().includes(lowerKeyword) || 
                      (field.displayName?.toLowerCase() || '').includes(lowerKeyword),
          }));
          tableStructures.push({
            tableName,
            tableDisplayName: matchedTables.find((t: any) => t.tableName === tableName)?.displayName || tableName,
            fields: fieldsWithMatch,
            matchedFieldCount: fieldsWithMatch.filter((f: any) => f.isMatch).length,
          });
        } catch (e: any) {
          console.error(`[search_field] Error describing table ${tableName}:`, e.message);
          // 跳过无法获取结构的表，继续处理其他表
        }
      }

      // 按匹配字段数量排序（优先显示包含匹配字段的表）
      tableStructures.sort((a, b) => b.matchedFieldCount - a.matchedFieldCount);

      console.log(`[search_field] Returning ${tableStructures.length} table structures`);

      return {
        keyword,
        found: true,
        summary: {
          matchedTablesCount: matchedTables.length,
          matchedFieldsCount: matchedFields.length,
          totalTablesToCheck: tableStructures.length,
        },
        // 匹配的表列表
        matchedTables: matchedTables.map((t: any) => ({
          tableName: t.tableName,
          displayName: t.displayName,
        })),
        // 匹配的字段列表
        matchedFields: matchedFields.map((f: any) => ({
          tableName: f.tableName,
          tableDisplayName: f.tableDisplayName,
          fieldName: f.fieldName,
          displayName: f.displayName,
          fieldType: f.fieldType,
        })),
        // 完整的表结构（用于AI判断）
        tableStructures,
        message: `找到 ${matchedTables.length} 个匹配的表名，${matchedFields.length} 个匹配的字段。已获取 ${tableStructures.length} 个相关表的完整结构供参考。`,
      };
    } catch (error: any) {
      console.error(`[search_field] Error:`, error);
      return {
        keyword,
        found: false,
        error: error.message,
        message: `搜索过程中发生错误: ${error.message}`,
        matchedTables: [],
        matchedFields: [],
        tableStructures: [],
      };
    }
  }

  /**
   * 删除记录
   */
  private async deleteRecord(tableName: string, recordId: string): Promise<any> {
    // 【安全修复】验证表名格式
    if (!isValidTableName(tableName)) {
      throw new Error(`无效的表名: ${tableName}`);
    }

    const fullTableName = `data_${tableName}`;

    // 检查表是否存在
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    if (tableExists[0].count === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 检查记录是否存在
    const existingRecord = await this.dataSource.query(
      `SELECT * FROM ?? WHERE id = ?`,
      [fullTableName, recordId]
    );

    if (existingRecord.length === 0) {
      throw new Error(`记录不存在: ID = ${recordId}`);
    }

    // 删除记录
    const result = await this.dataSource.query(
      `DELETE FROM ?? WHERE id = ?`,
      [fullTableName, recordId]
    );

    return {
      success: true,
      message: `成功删除表 ${tableName} 中的记录 (ID: ${recordId})`,
      recordId,
      affectedRows: result.affectedRows,
    };
  }

  /**
   * 批量删除记录
   */
  private async batchDeleteRecords(tableName: string, recordIds: string[]): Promise<any> {
    // 【安全修复】验证表名格式
    if (!isValidTableName(tableName)) {
      throw new Error(`无效的表名: ${tableName}`);
    }

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      throw new Error('请提供要删除的记录ID列表');
    }

    // 批量删除限制
    if (recordIds.length > 100) {
      throw new Error('批量删除最多支持100条记录');
    }

    const fullTableName = `data_${tableName}`;

    // 检查表是否存在
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    if (tableExists[0].count === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 构建批量删除SQL
    const placeholders = recordIds.map(() => '?').join(', ');
    const result = await this.dataSource.query(
      `DELETE FROM ?? WHERE id IN (${placeholders})`,
      [fullTableName, ...recordIds]
    );

    return {
      success: true,
      message: `成功删除表 ${tableName} 中的 ${result.affectedRows} 条记录`,
      requestedCount: recordIds.length,
      affectedRows: result.affectedRows,
    };
  }

  /**
   * 获取表统计信息
   */
  private async getTableStats(tableName: string): Promise<any> {
    if (!isValidTableName(tableName)) {
      throw new Error(`无效的表名: ${tableName}`);
    }

    const fullTableName = `data_${tableName}`;

    // 检查表是否存在
    const tableExists = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    if (tableExists[0].count === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // 获取表基本信息
    const tableInfo = await this.dataSource.query(`
      SELECT TABLE_ROWS as rowCount, 
             DATA_LENGTH as dataLength,
             INDEX_LENGTH as indexLength,
             CREATE_TIME as createTime,
             UPDATE_TIME as updateTime,
             TABLE_COMMENT as tableComment
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [fullTableName]);

    // 获取字段统计
    const fieldStats = await this.dataSource.query(`
      SELECT 
        COLUMN_NAME as field,
        DATA_TYPE as type,
        IS_NULLABLE as nullable,
        COUNT(DISTINCT ??) as distinctValues,
        COUNT(*) as totalValues,
        SUM(CASE WHEN ?? IS NULL THEN 1 ELSE 0 END) as nullCount
      FROM INFORMATION_SCHEMA.COLUMNS
      CROSS JOIN ??
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      GROUP BY COLUMN_NAME, DATA_TYPE, IS_NULLABLE
    `, [fullTableName, fullTableName, fullTableName, fullTableName]);

    // 获取创建时间和更新时间范围
    const timeRange = await this.dataSource.query(`
      SELECT 
        MIN(created_at) as earliestRecord,
        MAX(created_at) as latestRecord,
        MIN(updated_at) as earliestUpdate,
        MAX(updated_at) as latestUpdate
      FROM ??
    `, [fullTableName]);

    const info = tableInfo[0] || {};
    const times = timeRange[0] || {};

    return {
      tableName,
      stats: {
        rowCount: info.rowCount || 0,
        dataLength: info.dataLength || 0,
        indexLength: info.indexLength || 0,
        tableComment: info.tableComment,
      },
      timeRange: {
        createTime: info.createTime,
        updateTime: info.updateTime,
        earliestRecord: times.earliestRecord,
        latestRecord: times.latestRecord,
        earliestUpdate: times.earliestUpdate,
        latestUpdate: times.latestUpdate,
      },
      fieldStats: fieldStats.map((f: any) => ({
        field: f.field,
        type: f.type,
        nullable: f.nullable === 'YES',
        distinctValues: f.distinctValues,
        totalValues: f.totalValues,
        nullCount: f.nullCount,
      })),
    };
  }
}
