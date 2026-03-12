/**
 * 数据表元数据API
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-12
 */
import request from '@/utils/request'
import type { TableDefinition, FieldDefinition, ApiResponse } from '@/types'

// 获取所有数据表列表
export function getTableList(): Promise<ApiResponse<TableDefinition[]>> {
  return request.get('/table-meta')
}

// 获取数据表详情
export function getTableById(tableId: string): Promise<ApiResponse<TableDefinition>> {
  return request.get(`/table-meta/${tableId}`)
}

// 创建数据表
export function createTable(data: CreateTableDto): Promise<ApiResponse<TableDefinition>> {
  return request.post('/table-meta', data)
}

// 更新数据表
export function updateTable(tableId: string, data: UpdateTableDto): Promise<ApiResponse<TableDefinition>> {
  return request.put(`/table-meta/${tableId}`, data)
}

// 删除数据表
export function deleteTable(tableId: string): Promise<ApiResponse<void>> {
  return request.delete(`/table-meta/${tableId}`)
}

// 获取表的所有字段
export function getTableFields(tableId: string): Promise<ApiResponse<FieldDefinition[]>> {
  return request.get(`/table-meta/${tableId}/fields`)
}

// 添加字段
export function addField(tableId: string, data: CreateFieldDto): Promise<ApiResponse<FieldDefinition>> {
  return request.post(`/table-meta/${tableId}/fields`, data)
}

// 更新字段
export function updateField(fieldId: string, data: UpdateFieldDto): Promise<ApiResponse<FieldDefinition>> {
  return request.put(`/table-meta/fields/${fieldId}`, data)
}

// 删除字段
export function deleteField(fieldId: string): Promise<ApiResponse<void>> {
  return request.delete(`/table-meta/fields/${fieldId}`)
}

// DTO类型定义
export interface CreateTableDto {
  tableName: string
  displayName: string
  description?: string
}

export interface UpdateTableDto {
  displayName?: string
  description?: string
}

export interface CreateFieldDto {
  fieldName: string
  displayName: string
  fieldType: string
  required?: boolean
  defaultValue?: string
  options?: { label: string; value: string | number }[]
  relationTable?: string
}

export interface UpdateFieldDto {
  displayName?: string
  fieldType?: string
  required?: boolean
  defaultValue?: string
  options?: { label: string; value: string | number }[]
  relationTable?: string
}
