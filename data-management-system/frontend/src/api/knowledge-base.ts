/**
 * 知识库管理API
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-12
 */
import request from '@/utils/request'
import type { ApiResponse, KnowledgeBase, PaginatedResponse } from '@/types'

// ==================== 知识库管理 ====================

// 获取知识库列表（分页）
export function getKnowledgeList(params?: {
  page?: number
  pageSize?: number
  keyword?: string
  category?: string
  isEnabled?: boolean
}): Promise<ApiResponse<PaginatedResponse<KnowledgeBase>>> {
  return request.get('/knowledge', { params })
}

// 获取所有启用的知识库
export function getEnabledKnowledge(): Promise<ApiResponse<KnowledgeBase[]>> {
  return request.get('/knowledge/enabled')
}

// 获取知识库详情
export function getKnowledgeById(knowledgeId: string): Promise<ApiResponse<KnowledgeBase>> {
  return request.get(`/knowledge/${knowledgeId}`)
}

// 创建知识库
export function createKnowledge(data: CreateKnowledgeDto): Promise<ApiResponse<KnowledgeBase>> {
  return request.post('/knowledge', data)
}

// 更新知识库
export function updateKnowledge(knowledgeId: string, data: UpdateKnowledgeDto): Promise<ApiResponse<KnowledgeBase>> {
  return request.put(`/knowledge/${knowledgeId}`, data)
}

// 删除知识库
export function deleteKnowledge(knowledgeId: string): Promise<ApiResponse<void>> {
  return request.delete(`/knowledge/${knowledgeId}`)
}

// 切换启用状态
export function toggleKnowledge(knowledgeId: string): Promise<ApiResponse<KnowledgeBase>> {
  return request.post(`/knowledge/${knowledgeId}/toggle`)
}

// 增加查看次数
export function incrementViewCount(knowledgeId: string): Promise<ApiResponse<void>> {
  return request.post(`/knowledge/${knowledgeId}/view`)
}

// 获取知识库分类列表
export function getCategories(): Promise<ApiResponse<string[]>> {
  return request.get('/knowledge/categories/list')
}

// DTO类型定义
export interface CreateKnowledgeDto {
  title: string
  content: string
  category?: string
  tags?: string[]
  source?: string
  priority?: number
  isEnabled?: boolean
}

export interface UpdateKnowledgeDto {
  title?: string
  content?: string
  category?: string
  tags?: string[]
  source?: string
  priority?: number
  isEnabled?: boolean
}
