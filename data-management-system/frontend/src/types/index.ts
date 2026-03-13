/**
 * 类型定义文件
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */

// 数据表定义
export interface TableDefinition {
  tableId: string
  tableName: string
  displayName: string
  description: string
  createdAt: string
  updatedAt?: string
}

// 字段定义
export interface FieldDefinition {
  fieldId: string
  tableId: string
  fieldName: string
  displayName: string
  fieldType: FieldType
  required: boolean
  defaultValue?: string
  options?: FieldOption[]
  relationTable?: string
  relationTableId?: string
  // 新增字段属性
  length?: number
  decimalPlaces?: number
  isIndex?: boolean
  isUnique?: boolean
  isForeignKey?: boolean
  foreignKeyTable?: string
  foreignKeyField?: string
  foreignKeyOnDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT'
  isAutoIncrement?: boolean
  comment?: string
  sortOrder: number
  createdAt: string
}

// 字段类型枚举
export type FieldType = 
  | 'text'       // 文本
  | 'varchar'    // 定长文本
  | 'int'        // 整数
  | 'bigint'     // 长整数
  | 'float'      // 浮点数
  | 'double'     // 双精度
  | 'decimal'    // 精确小数
  | 'boolean'    // 布尔值
  | 'date'       // 日期
  | 'datetime'   // 日期时间
  | 'select'     // 单选
  | 'multiselect' // 多选
  | 'richtext'   // 富文本
  | 'image'      // 图片
  | 'file'       // 文件
  | 'relation'   // 关联
  | 'json'       // JSON对象

// 字段类型选项（英文+中文显示）
export const FIELD_TYPE_OPTIONS: { label: string; value: FieldType; dbType: string }[] = [
  { label: 'text 文本', value: 'text', dbType: 'TEXT' },
  { label: 'varchar 定长文本', value: 'varchar', dbType: 'VARCHAR' },
  { label: 'int 整数', value: 'int', dbType: 'INT' },
  { label: 'bigint 长整数', value: 'bigint', dbType: 'BIGINT' },
  { label: 'float 浮点数', value: 'float', dbType: 'FLOAT' },
  { label: 'double 双精度', value: 'double', dbType: 'DOUBLE' },
  { label: 'decimal 精确小数', value: 'decimal', dbType: 'DECIMAL' },
  { label: 'boolean 布尔值', value: 'boolean', dbType: 'TINYINT' },
  { label: 'date 日期', value: 'date', dbType: 'DATE' },
  { label: 'datetime 日期时间', value: 'datetime', dbType: 'DATETIME' },
  { label: 'select 单选', value: 'select', dbType: 'VARCHAR' },
  { label: 'multiselect 多选', value: 'multiselect', dbType: 'JSON' },
  { label: 'richtext 富文本', value: 'richtext', dbType: 'TEXT' },
  { label: 'image 图片', value: 'image', dbType: 'VARCHAR' },
  { label: 'file 文件', value: 'file', dbType: 'VARCHAR' },
  { label: 'relation 关联', value: 'relation', dbType: 'VARCHAR' },
  { label: 'json JSON对象', value: 'json', dbType: 'JSON' },
]

// 外键删除行为选项
export const FOREIGN_KEY_ON_DELETE_OPTIONS = [
  { label: 'CASCADE 级联删除', value: 'CASCADE' },
  { label: 'SET NULL 设为空', value: 'SET NULL' },
  { label: 'RESTRICT 限制', value: 'RESTRICT' },
]

// 字段选项
export interface FieldOption {
  label: string
  value: string | number
}

// AI模型配置
export interface AIModelConfig {
  modelId: string
  modelName: string
  modelType: string
  apiEndpoint: string
  apiKey: string
  modelIdentifier: string
  parameters: ModelParameters
  isEnabled: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// 模型参数
export interface ModelParameters {
  temperature?: number
  maxTokens?: number
  topP?: number
}

// AI对话消息
export interface ChatMessage {
  chatId: string
  modelId: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string  // 思考过程（思维链）
  toolCalls?: ToolCall[]
  createdAt: string
}

// 工具调用记录
export interface ToolCall {
  name: string
  arguments: any
  result: any
  success: boolean
}

// Token消耗记录
export interface TokenUsage {
  usageId: string
  modelId: string
  chatId: string
  sessionId: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  createdAt: string
  // 关联模型信息
  model?: {
    modelId: string
    modelName: string
    modelType: string
  }
}

// API响应类型
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// 知识库类型
export interface KnowledgeBase {
  knowledgeId: string
  title: string
  content: string
  category?: string
  tags?: string[]
  source?: string
  priority: number
  isEnabled: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
}

// 分页参数
export interface PaginationParams {
  page: number
  pageSize: number
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 菜单项
export interface MenuItem {
  key: string
  title: string
  icon?: string
  path?: string
  children?: MenuItem[]
}
