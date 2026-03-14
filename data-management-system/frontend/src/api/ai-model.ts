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

// 通过模型ID测试连接（使用已保存的配置）
export function testConnectionById(modelId: string): Promise<ApiResponse<TestConnectionResult>> {
  return request.post(`/ai/models/${modelId}/test-connection`)
}

// ==================== AI对话 ====================

// 发送消息（AI对话可能涉及多轮工具调用，设置更长超时时间）
// 支持通过 signal 取消请求
export function sendMessage(data: SendMessageDto, signal?: AbortSignal): Promise<ApiResponse<SendMessageResult>> {
  return request.post('/ai/chat/send', data, {
    timeout: 120000, // 2分钟超时
    signal, // 支持取消请求
  })
}

// 流式发送消息（SSE）
// 返回一个包含 abort 方法的对象，以及事件回调
export interface StreamCallbacks {
  onSession?: (sessionId: string) => void
  onThinking?: (content: string) => void       // 思考过程增量
  onContent?: (content: string) => void        // 回复内容增量
  onToolCall?: (tool: { name: string; arguments: any; success: boolean }) => void
  onDone?: (data: {
    sessionId: string
    tokens: { input: number; output: number }
    // 消息的实际创建时间
    userMessage?: { chatId: string; createdAt: string }
    assistantMessage?: { chatId: string; createdAt: string }
  }) => void
  onError?: (message: string) => void
}

export function streamMessage(
  data: SendMessageDto,
  callbacks: StreamCallbacks,
): { abort: () => void } {
  const controller = new AbortController()

  // 异步处理流式响应
  ;(async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
      // 获取 token 添加到请求头
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        callbacks.onError?.(errorData.message || `请求失败: ${response.status}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        callbacks.onError?.('无法获取响应流')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          // 解析 SSE 格式: "data: {...}"
          // JSON 中包含 type 字段标识事件类型
          try {
            if (trimmedLine.startsWith('data: ')) {
              const dataStr = trimmedLine.slice(6)
              const event = JSON.parse(dataStr)
              // 从 JSON 的 type 字段读取事件类型
              const eventType = event.type || 'message'
              // data 字段是 JSON 字符串，需要再解析一次
              const eventData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data

              switch (eventType) {
                case 'session':
                  callbacks.onSession?.(eventData.sessionId)
                  break
                case 'thinking':
                  callbacks.onThinking?.(eventData.content)
                  break
                case 'content':
                  callbacks.onContent?.(eventData.content)
                  break
                case 'tool_call':
                  callbacks.onToolCall?.(eventData)
                  break
                case 'done':
                  callbacks.onDone?.(eventData)
                  break
                case 'error':
                  callbacks.onError?.(eventData.message || '未知错误')
                  break
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        callbacks.onError?.(error.message || '请求失败')
      }
    }
  })()

  return {
    abort: () => controller.abort(),
  }
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

// ==================== 模型定价管理 ====================

// 获取所有模型定价配置
export function getAllPricing(): Promise<ApiResponse<AIModelPricing[]>> {
  return request.get('/ai/pricing')
}

// 获取指定模型的定价配置
export function getModelPricing(modelId: string): Promise<ApiResponse<AIModelPricing | null>> {
  return request.get(`/ai/models/${modelId}/pricing`)
}

// 设置模型定价
export function setModelPricing(modelId: string, data: CreateModelPricingDto): Promise<ApiResponse<AIModelPricing>> {
  return request.post(`/ai/models/${modelId}/pricing`, data)
}

// 更新定价配置
export function updatePricing(pricingId: string, data: UpdateModelPricingDto): Promise<ApiResponse<AIModelPricing>> {
  return request.put(`/ai/pricing/${pricingId}`, data)
}

// 定价相关类型
export interface AIModelPricing {
  pricingId: string
  modelId: string
  inputPrice: number
  outputPrice: number
  currency: string
  effectiveDate: string
  createdAt: string
}

export interface CreateModelPricingDto {
  inputPrice: number
  outputPrice: number
  currency?: string
  effectiveDate?: string
}

export interface UpdateModelPricingDto {
  inputPrice?: number
  outputPrice?: number
  currency?: string
  effectiveDate?: string
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
  useKnowledgeBase?: boolean
  thinkingType?: 'disabled' | 'enabled' | 'auto'  // 深度思考模式
}

export interface SendMessageResult {
  reply: string
  thinking?: string  // 思考过程
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
