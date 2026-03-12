/**
 * AI模型管理API
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-12
 */
import request from '@/utils/request'
import type { ApiResponse, AIModelConfig, ChatMessage } from '@/types'

// ==================== 模型管理 ====================

// 获取所有模型列表
export function getModelList(): Promise<ApiResponse<AIModelConfig[]>> {
  return request.get('/ai/models')
}

// 获取启用的模型列表
export function getEnabledModels(): Promise<ApiResponse<AIModelConfig[]>> {
  return request.get('/ai/models/enabled')
}

// 获取模型详情
export function getModelById(modelId: string): Promise<ApiResponse<AIModelConfig>> {
  return request.get(`/ai/models/${modelId}`)
}

// 创建模型
export function createModel(data: CreateAIModelDto): Promise<ApiResponse<AIModelConfig>> {
  return request.post('/ai/models', data)
}

// 更新模型
export function updateModel(modelId: string, data: UpdateAIModelDto): Promise<ApiResponse<AIModelConfig>> {
  return request.put(`/ai/models/${modelId}`, data)
}

// 删除模型
export function deleteModel(modelId: string): Promise<ApiResponse<void>> {
  return request.delete(`/ai/models/${modelId}`)
}

// 切换启用状态
export function toggleModel(modelId: string): Promise<ApiResponse<AIModelConfig>> {
  return request.post(`/ai/models/${modelId}/toggle`)
}

// 设置为默认模型
export function setDefaultModel(modelId: string): Promise<ApiResponse<AIModelConfig>> {
  return request.post(`/ai/models/${modelId}/set-default`)
}

// 测试模型连接
export function testConnection(data: TestConnectionDto): Promise<ApiResponse<TestConnectionResult>> {
  return request.post('/ai/models/test-connection', data)
}

// ==================== AI对话 ====================

// 发送消息
export function sendMessage(data: SendMessageDto): Promise<ApiResponse<SendMessageResult>> {
  return request.post('/ai/chat/send', data)
}

// 获取对话历史
export function getChatHistory(sessionId?: string): Promise<ApiResponse<{ list: ChatMessage[]; total: number }>> {
  const params = sessionId ? { sessionId } : {}
  return request.get('/ai/chat/history', { params })
}

// 获取会话列表
export function getSessionList(): Promise<ApiResponse<ChatSession[]>> {
  return request.get('/ai/chat/sessions')
}

// 删除会话
export function deleteSession(sessionId: string): Promise<ApiResponse<void>> {
  return request.delete(`/ai/chat/sessions/${sessionId}`)
}

// DTO类型定义
export interface CreateAIModelDto {
  modelName: string
  modelType: string
  apiEndpoint: string
  apiKey: string
  modelIdentifier: string
  parameters?: {
    temperature?: number
    maxTokens?: number
    topP?: number
  }
}

export interface UpdateAIModelDto {
  modelName?: string
  modelType?: string
  apiEndpoint?: string
  apiKey?: string
  modelIdentifier?: string
  parameters?: {
    temperature?: number
    maxTokens?: number
    topP?: number
  }
}

export interface TestConnectionDto {
  modelType: string
  apiEndpoint: string
  apiKey: string
  modelIdentifier: string
}

export interface TestConnectionResult {
  success: boolean
  message: string
  responseTime?: number
}

export interface SendMessageDto {
  modelId?: string
  content: string
  sessionId?: string
}

export interface SendMessageResult {
  reply: string
  sessionId: string
  tokens: {
    input: number
    output: number
  }
  toolCalls?: ToolCallResult[]
}

// 工具调用结果
export interface ToolCallResult {
  toolCallId: string
  name: string
  success: boolean
  result: any
}

export interface ChatSession {
  sessionId: string
  modelId: string
  modelName: string
  lastMessage: string
  createdAt: string
  updatedAt: string
}
