/**
 * Token统计API
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-12
 */
import request from '@/utils/request'
import type { ApiResponse, PaginatedResponse, TokenUsage } from '@/types'

// 获取统计数据概览
export function getOverview(): Promise<ApiResponse<TokenOverview>> {
  return request.get('/token-usage/overview')
}

// 获取消耗趋势
export function getTrend(days?: number): Promise<ApiResponse<TrendItem[]>> {
  return request.get('/token-usage/trend', { params: { days } })
}

// 获取分模型统计
export function getByModel(): Promise<ApiResponse<ModelStats[]>> {
  return request.get('/token-usage/by-model')
}

// 获取消耗明细列表
export function getUsageList(params?: QueryTokenUsageDto): Promise<ApiResponse<PaginatedResponse<TokenUsage>>> {
  return request.get('/token-usage/list', { params })
}

// 创建定价配置
export function createPricing(data: CreatePricingDto): Promise<ApiResponse<PricingConfig>> {
  return request.post('/token-usage/pricing', data)
}

// 更新定价配置
export function updatePricing(pricingId: string, data: UpdatePricingDto): Promise<ApiResponse<PricingConfig>> {
  return request.put(`/token-usage/pricing/${pricingId}`, data)
}

// 获取模型定价配置
export function getModelPricing(modelId: string): Promise<ApiResponse<PricingConfig>> {
  return request.get(`/token-usage/pricing/${modelId}`)
}

// 类型定义
export interface TokenOverview {
  totalTokens: number
  totalCost: number
  todayTokens: number
  todayCost: number
  monthTokens: number
  monthCost: number
  sessionCount: number
}

export interface TrendItem {
  date: string
  tokens: number
  cost: number
  sessions: number
}

export interface ModelStats {
  modelId: string
  modelName: string
  totalTokens: number
  totalCost: number
  sessionCount: number
}

export interface QueryTokenUsageDto {
  page?: number
  pageSize?: number
  modelId?: string
  startDate?: string
  endDate?: string
}

export interface CreatePricingDto {
  modelId: string
  inputPrice: number
  outputPrice: number
  currency?: string
}

export interface UpdatePricingDto {
  inputPrice?: number
  outputPrice?: number
  currency?: string
}

export interface PricingConfig {
  pricingId: string
  modelId: string
  inputPrice: number
  outputPrice: number
  currency: string
  createdAt: string
  updatedAt: string
}
