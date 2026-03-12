/**
* 视图配置API
* 创建者：dzh
* 创建时间：2026-03-12
* 更新时间：2026-03-12
*/
import request from '@/utils/request'

// 筛选条件类型
export interface FilterCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in'
  value: string | number | string[] | number[]
}

// 视图配置类型
export interface ViewConfig {
  viewId: string
  viewName: string
  tableId: string
  chartType: string
  xAxis: string
  yAxis: string
  filters: FilterCondition[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// 创建视图参数
export interface CreateViewParams {
  viewName: string
  tableId: string
  chartType: string
  xAxis?: string
  yAxis?: string
  filters?: FilterCondition[]
  isDefault?: boolean
}

// 更新视图参数
export interface UpdateViewParams {
  viewName?: string
  chartType?: string
  xAxis?: string
  yAxis?: string
  filters?: FilterCondition[]
  isDefault?: boolean
}

/**
 * 获取指定表的所有视图
 */
export function getViewsByTable(tableId: string) {
  return request.get(`/view-config/table/${tableId}`)
}

/**
 * 获取表的默认视图
 */
export function getDefaultView(tableId: string) {
  return request.get(`/view-config/default/${tableId}`)
}

/**
 * 获取视图详情
 */
export function getViewById(viewId: string) {
  return request.get(`/view-config/${viewId}`)
}

/**
 * 创建视图
 */
export function createView(data: CreateViewParams) {
  return request.post('/view-config', data)
}

/**
 * 更新视图
 */
export function updateView(viewId: string, data: UpdateViewParams) {
  return request.put(`/view-config/${viewId}`, data)
}

/**
 * 设置默认视图
 */
export function setDefaultView(viewId: string) {
  return request.put(`/view-config/${viewId}/default`)
}

/**
 * 删除视图
 */
export function deleteView(viewId: string) {
  return request.delete(`/view-config/${viewId}`)
}
