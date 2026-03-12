/**
 * 类型定义文件
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
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
  sortOrder: number
  createdAt: string
}

// 字段类型枚举
export type FieldType = 
  | 'text'       // 文本
  | 'number'     // 数字
  | 'boolean'    // 布尔值
  | 'date'       // 日期
  | 'select'     // 单选
  | 'multiselect' // 多选
  | 'richtext'   // 富文本
  | 'image'      // 图片
  | 'file'       // 文件
  | 'relation'   // 关联

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
  createdAt: string
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
}

// API响应类型
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
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
