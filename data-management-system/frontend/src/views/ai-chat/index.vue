/**
 * AI对话页面
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
<script setup lang="ts">
import { ref, onMounted, nextTick, computed, onUnmounted } from 'vue'
import { Send, Bot, User, Plus, Trash2, MessageSquare, BookOpen, Square, Copy, Check, Brain, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { getEnabledModels, streamMessage, getSessionList, deleteSession, getChatHistory } from '@/api/ai-model'
import type { AIModelConfig, ChatMessage } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

// 消息列表
const messages = ref<ChatMessage[]>([])
// 输入内容
const inputMessage = ref('')
// 当前选中模型
const selectedModel = ref('')
// 可用模型列表
const modelList = ref<AIModelConfig[]>([])
// 加载状态
const loading = ref(false)
// 消息容器引用
const messageContainer = ref<HTMLElement | null>(null)
// 用于取消流式请求
const streamAbort = ref<{ abort: () => void } | null>(null)

// 会话列表
const sessions = ref<any[]>([])
const currentSessionId = ref('')

// 知识库开关
const useKnowledgeBase = ref(false)

// 深度思考模式：disabled-关闭, enabled-开启, auto-自动
const thinkingMode = ref<'disabled' | 'enabled' | 'auto'>('auto')

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTargetSession = ref<any>(null)
const deleteLoading = ref(false)

// 加载模型列表
const loadModelList = async () => {
  try {
    const res = await getEnabledModels()
    modelList.value = res.data || []
    // 自动选择默认模型
    const defaultModel = modelList.value.find(m => m.isDefault)
    if (defaultModel) {
      selectedModel.value = defaultModel.modelId
    } else if (modelList.value.length > 0) {
      selectedModel.value = modelList.value[0].modelId
    }
  } catch (error) {
    console.error('加载模型列表失败:', error)
  }
}

// 加载会话列表
const loadSessions = async () => {
  try {
    const res = await getSessionList()
    sessions.value = res.data || []
  } catch (error) {
    console.error('加载会话列表失败:', error)
  }
}

// 发送消息
const handleSendMessage = async () => {
  if (!inputMessage.value.trim() || loading.value) return
  if (!selectedModel.value) {
    alert('请先选择AI模型')
    return
  }

  const userMessage: ChatMessage = {
    chatId: '',
    modelId: selectedModel.value,
    sessionId: currentSessionId.value,
    role: 'user',
    content: inputMessage.value,
    createdAt: new Date().toISOString(),
  }
  messages.value.push(userMessage)
  const messageContent = inputMessage.value
  inputMessage.value = ''
  loading.value = true

  // 创建AI回复占位消息
  const aiMessageIndex = messages.value.length
  messages.value.push({
    chatId: '',
    modelId: selectedModel.value,
    sessionId: currentSessionId.value,
    role: 'assistant',
    content: '',
    thinking: '',
    toolCalls: [],
    createdAt: new Date().toISOString(),
  })

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  // 使用流式API
  streamAbort.value = streamMessage(
    {
      modelId: selectedModel.value,
      content: messageContent,
      sessionId: currentSessionId.value || undefined,
      useKnowledgeBase: useKnowledgeBase.value,
      thinkingType: thinkingMode.value,
    },
    {
      onSession: (sessionId) => {
        currentSessionId.value = sessionId
        messages.value[aiMessageIndex].sessionId = sessionId
      },
      onThinking: (content) => {
        // 实时追加思考内容
        messages.value[aiMessageIndex].thinking! += content
        scrollToBottom()
      },
      onContent: (content) => {
        // 实时追加回复内容
        messages.value[aiMessageIndex].content += content
        scrollToBottom()
      },
      onToolCall: (tool) => {
        // 添加工具调用记录
        if (!messages.value[aiMessageIndex].toolCalls) {
          messages.value[aiMessageIndex].toolCalls = []
        }
        messages.value[aiMessageIndex].toolCalls!.push({
          name: tool.name,
          arguments: tool.arguments,
          result: null,
          success: tool.success,
        })
      },
      onDone: (data) => {
        loading.value = false
        streamAbort.value = null
        scrollToBottom()
        loadSessions()
      },
      onError: (message) => {
        messages.value[aiMessageIndex].content = `发生错误: ${message}`
        loading.value = false
        streamAbort.value = null
      },
    },
  )
}

// 停止生成
const handleStopGenerate = () => {
  if (streamAbort.value) {
    streamAbort.value.abort()
    // 找到最后一条 AI 消息，标记为已停止
    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg?.role === 'assistant' && !lastMsg.content) {
      lastMsg.content = '已停止生成'
    }
    loading.value = false
    streamAbort.value = null
  }
}

// 滚动到底部
const scrollToBottom = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}

// 清空对话
const clearMessages = () => {
  messages.value = []
  currentSessionId.value = ''
}

// 新建会话
const newSession = () => {
  messages.value = []
  currentSessionId.value = ''
}

// 加载会话消息
const loadSessionMessages = async (session: any) => {
  currentSessionId.value = session.sessionId
  try {
    const res = await getChatHistory(session.sessionId)
    messages.value = (res.data?.list || []).map((msg: any) => ({
      chatId: msg.chatId,
      modelId: msg.modelId,
      sessionId: msg.sessionId,
      role: msg.role,
      content: msg.content,
      thinking: msg.thinking,
      createdAt: msg.createdAt,
    }))
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('加载会话消息失败:', error)
    messages.value = []
  }
}

// 删除会话
const handleDeleteSession = (session: any) => {
  deleteTargetSession.value = session
  showDeleteConfirm.value = true
}

const confirmDeleteSession = async () => {
  if (!deleteTargetSession.value) return
  deleteLoading.value = true
  try {
    await deleteSession(deleteTargetSession.value.sessionId)
    showDeleteConfirm.value = false
    // 如果删除的是当前会话，清空消息
    if (deleteTargetSession.value.sessionId === currentSessionId.value) {
      messages.value = []
      currentSessionId.value = ''
    }
    loadSessions()
  } catch (error) {
    console.error('删除会话失败:', error)
    alert('删除失败，请重试')
  } finally {
    deleteLoading.value = false
  }
}

// 格式化时间
const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 工具名称映射
const toolNameMap: Record<string, string> = {
  list_tables: '📋 列出数据表',
  describe_table: '📝 查看表结构',
  query_data: '🔍 查询数据',
  count_data: '📊 统计数量',
  aggregate_data: '📈 聚合统计',
  group_by_field: '📊 分组统计',
  search_knowledge: '📚 查询知识库',
}

// 获取工具显示名称
const getToolDisplayName = (name: string) => {
  return toolNameMap[name] || name
}

// 获取当前模型名称
const currentModelName = computed(() => {
  const model = modelList.value.find(m => m.modelId === selectedModel.value)
  return model?.modelName || 'AI'
})

// 复制相关
const copiedIndex = ref<number | null>(null)

// 思考步骤展开状态
const expandedThinking = ref<Set<number>>(new Set())

// 切换思考步骤展开状态
const toggleThinking = (index: number) => {
  if (expandedThinking.value.has(index)) {
    expandedThinking.value.delete(index)
  } else {
    expandedThinking.value.add(index)
  }
}

// 复制消息内容
const handleCopyMessage = async (content: string, index: number) => {
  try {
    await navigator.clipboard.writeText(content)
    copiedIndex.value = index
    setTimeout(() => {
      copiedIndex.value = null
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
    // 降级方案：创建临时文本区域
    const textarea = document.createElement('textarea')
    textarea.value = content
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copiedIndex.value = index
    setTimeout(() => {
      copiedIndex.value = null
    }, 2000)
  }
}

onMounted(() => {
  loadModelList()
  loadSessions()
})

// 组件卸载时取消pending请求
onUnmounted(() => {
  if (streamAbort.value) {
    streamAbort.value.abort()
  }
})
</script>

<template>
  <div class="h-[calc(100vh-8rem)] flex animate-fadeIn">
    <!-- 左侧会话列表 -->
    <div class="w-64 bg-white rounded-l-xl shadow-sm border-r border-gray-100 flex flex-col">
      <div class="p-4 border-b border-gray-100">
        <button
          class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          @click="newSession"
        >
          <Plus class="w-4 h-4" />
          <span>新建会话</span>
        </button>
      </div>
      <div class="flex-1 overflow-auto p-2">
        <div v-if="sessions.length === 0" class="text-center text-gray-400 text-sm py-8">
          暂无历史会话
        </div>
        <div v-else class="space-y-1">
          <div
            v-for="session in sessions"
            :key="session.sessionId"
            class="group p-3 rounded-lg cursor-pointer transition-colors"
            :class="session.sessionId === currentSessionId ? 'bg-primary/10' : 'hover:bg-gray-50'"
            @click="loadSessionMessages(session)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-800 truncate">{{ session.lastMessage || '新会话' }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ session.modelName }}</p>
              </div>
              <button
                class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                @click.stop="handleDeleteSession(session)"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧对话区域 -->
    <div class="flex-1 flex flex-col bg-white rounded-r-xl shadow-sm">
      <!-- 顶部工具栏 -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div class="flex items-center gap-4">
          <select
            v-model="selectedModel"
            class="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          >
            <option value="" disabled>选择模型</option>
            <option v-for="model in modelList" :key="model.modelId" :value="model.modelId">
              {{ model.modelName }}
            </option>
          </select>
          <!-- 知识库开关 -->
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <div class="relative">
              <input
                type="checkbox"
                v-model="useKnowledgeBase"
                class="sr-only peer"
              />
              <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </div>
            <div class="flex items-center gap-1 text-sm" :class="useKnowledgeBase ? 'text-primary' : 'text-gray-500'">
              <BookOpen class="w-4 h-4" />
              <span>知识库</span>
            </div>
          </label>
          <!-- 深度思考模式 -->
          <div class="flex items-center gap-1.5">
            <Brain class="w-4 h-4 text-purple-500" />
            <select
              v-model="thinkingMode"
              class="px-2 py-1 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 bg-purple-50 text-purple-700"
              title="深度思考模式"
            >
              <option value="disabled">关闭思考</option>
              <option value="auto">自动思考</option>
              <option value="enabled">强制思考</option>
            </select>
          </div>
        </div>
        <button
          class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="清空对话"
          @click="clearMessages"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>

      <!-- 消息区域 -->
      <div ref="messageContainer" class="flex-1 overflow-auto p-6 space-y-4">
        <div v-if="messages.length === 0" class="h-full flex items-center justify-center text-gray-400">
          <div class="text-center">
            <Bot class="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>开始与AI对话吧</p>
            <p class="text-sm mt-2">选择模型后输入您的问题</p>
          </div>
        </div>
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="flex gap-3"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            v-if="msg.role === 'assistant'"
            class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"
          >
            <Bot class="w-4 h-4 text-primary" />
          </div>
          <div class="max-w-[70%]">
            <!-- 工具调用显示 -->
            <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="mb-2 space-y-1">
              <div
                v-for="(tool, ti) in msg.toolCalls"
                :key="ti"
                class="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs"
              >
                <div class="flex items-center gap-2">
                  <span class="font-medium text-blue-700">{{ getToolDisplayName(tool.name) }}</span>
                  <span :class="tool.success ? 'text-green-600' : 'text-red-600'">
                    {{ tool.success ? '✓ 成功' : '✗ 失败' }}
                  </span>
                </div>
              </div>
            </div>
            <!-- 思考步骤显示 -->
            <div v-if="msg.thinking" class="mb-2">
              <button
                class="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700 hover:bg-purple-100 transition-colors w-full"
                @click="toggleThinking(index)"
              >
                <Brain class="w-3.5 h-3.5" />
                <span class="font-medium">思考过程</span>
                <ChevronDown v-if="!expandedThinking.has(index)" class="w-3.5 h-3.5 ml-auto" />
                <ChevronUp v-else class="w-3.5 h-3.5 ml-auto" />
              </button>
              <div
                v-if="expandedThinking.has(index)"
                class="mt-1 px-3 py-2 bg-purple-50/50 border border-purple-100 rounded-lg text-xs text-gray-600 whitespace-pre-wrap"
              >
                {{ msg.thinking }}
              </div>
            </div>
            <div
              class="px-4 py-3 rounded-2xl"
              :class="msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'"
            >
              <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
            </div>
            <div class="flex items-center gap-2 mt-1" :class="msg.role === 'user' ? 'justify-end' : ''">
              <p class="text-xs text-gray-400">
                {{ formatTime(msg.createdAt) }}
              </p>
              <button
                class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="复制内容"
                @click="handleCopyMessage(msg.content, index)"
              >
                <Check v-if="copiedIndex === index" class="w-3.5 h-3.5 text-green-500" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div
            v-if="msg.role === 'user'"
            class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
          >
            <User class="w-4 h-4 text-white" />
          </div>
        </div>
        <div v-if="loading" class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot class="w-4 h-4 text-primary" />
          </div>
          <div class="px-4 py-3 bg-gray-100 rounded-2xl">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="p-4 border-t border-gray-100">
        <div class="flex items-end gap-3">
          <textarea
            v-model="inputMessage"
            class="flex-1 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="输入消息..."
            rows="1"
            @keydown.enter.exact.prevent="handleSendMessage"
          ></textarea>
          <button
            v-if="!loading"
            class="p-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!inputMessage.trim() || !selectedModel"
            @click="handleSendMessage"
          >
            <Send class="w-5 h-5" />
          </button>
          <button
            v-else
            class="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors animate-pulse"
            @click="handleStopGenerate"
            title="点击停止生成"
          >
            <Square class="w-5 h-5" />
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-2 text-center">
          按 Enter 发送消息，模型: {{ currentModelName || '未选择' }}
          <span v-if="useKnowledgeBase" class="text-primary ml-2">| 知识库已开启</span>
          <span v-if="thinkingMode !== 'disabled'" class="text-purple-500 ml-2">| {{ thinkingMode === 'enabled' ? '强制思考' : '自动思考' }}</span>
        </p>
      </div>
    </div>

    <!-- 删除会话确认 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      type="error"
      title="删除会话"
      message="确定要删除此会话吗？此操作不可恢复。"
      confirm-text="删除"
      :loading="deleteLoading"
      @confirm="confirmDeleteSession"
    />
  </div>
</template>
