/**
* 动态数据API
* 创建者：dzh
* 创建时间：2026-03-12
* 更新时间：2026-03-13
*/
import request from '@/utils/request'
import type { ApiResponse, PaginatedResponse } from '@/types'

// 筛选条件类型
export interface FilterCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in'
  value: string | number | string[] | number[]
}

// 聚合统计配置
export interface AggregateConfig {
  type: 'count' | 'sum' | 'avg' | 'max' | 'min'
  field?: string
  alias?: string
}

// 分组配置
export interface GroupByConfig {
  field: string
  timeGranularity?: 'day' | 'week' | 'month' | 'year'
}

// 创建动态数据表
export function createDynamicTable(tableId: string): Promise<ApiResponse<void>> {
  return request.post(`/dynamic-data/${tableId}/create-table`)
}

// 查询数据列表
export function getDataList(tableId: string, params?: QueryDataDto): Promise<ApiResponse<PaginatedResponse<any>>> {
  return request.get(`/dynamic-data/${tableId}`, { params })
}

// 查询单条数据
export function getDataById(tableId: string, dataId: string): Promise<ApiResponse<any>> {
  return request.get(`/dynamic-data/${tableId}/${dataId}`)
}

// 创建数据
export function createData(tableId: string, data: Record<string, any>): Promise<ApiResponse<any>> {
  return request.post(`/dynamic-data/${tableId}`, data)
}

// 更新数据
export function updateData(tableId: string, dataId: string, data: Record<string, any>): Promise<ApiResponse<any>> {
  return request.put(`/dynamic-data/${tableId}/${dataId}`, data)
}

// 删除数据
export function deleteData(tableId: string, dataId: string): Promise<ApiResponse<void>> {
  return request.delete(`/dynamic-data/${tableId}/${dataId}`)
}

// 批量删除
export function batchDeleteData(tableId: string, ids: string[]): Promise<ApiResponse<void>> {
  return request.post(`/dynamic-data/${tableId}/batch-delete`, { ids })
}

// 分组统计查询
export function aggregateQuery(tableId: string, params: AggregateQueryDto): Promise<ApiResponse<{ list: any[], total: number }>> {
  return request.get(`/dynamic-data/${tableId}/aggregate`, { params })
}

// DTO类型定义
export interface QueryDataDto {
  page?: number
  pageSize?: number
  keyword?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  filters?: FilterCondition[]
}

// 分组统计查询DTO
export interface AggregateQueryDto {
  aggregates?: AggregateConfig[]
  groupBy?: GroupByConfig[]
  filters?: FilterCondition[]
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  limit?: number
}
