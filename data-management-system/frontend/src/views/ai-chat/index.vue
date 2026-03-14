/**
 * AI对话页面
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-13
 */
<script setup lang="ts">
import { ref, onMounted, nextTick, computed, onUnmounted, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { Send, Bot, User, Plus, Trash2, MessageSquare, BookOpen, Square, Copy, Check, Brain, ChevronDown, ChevronUp, Table } from 'lucide-vue-next'
import { getEnabledModels, streamMessage, getSessionList, deleteSession, getChatHistory } from '@/api/ai-model'
import { getTableList } from '@/api/table-meta'
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
// 输入框引用
const inputTextarea = ref<HTMLTextAreaElement | null>(null)
// 用于取消流式请求
const streamAbort = ref<{ abort: () => void } | null>(null)

// 会话列表
const sessions = ref<any[]>([])
const currentSessionId = ref('')

// 知识库开关
const useKnowledgeBase = ref(false)

// 深度思考模式：disabled-关闭, enabled-开启
const thinkingMode = ref<'disabled' | 'enabled'>('enabled')

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTargetSession = ref<any>(null)
const deleteLoading = ref(false)

// ==================== @提及功能 ====================
// 所有表列表（排除sys_前缀的系统表）
const allTables = ref<{ tableName: string; displayName: string }[]>([])
// 是否显示提及列表
const showMentionList = ref(false)
// 提及列表筛选关键词
const mentionKeyword = ref('')
// 当前选中的提及项索引
const mentionSelectedIndex = ref(0)
// @符号的位置
const mentionStartPosition = ref(-1)

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

// 加载表列表（用于@提及功能）
const loadTableList = async () => {
  try {
    const res = await getTableList()
    // 过滤掉sys_前缀的系统表
    allTables.value = (res.data || [])
      .filter((t: any) => !t.tableName.startsWith('sys_'))
      .map((t: any) => ({
        tableName: t.tableName.replace('data_', ''), // 移除data_前缀
        displayName: t.displayName || t.tableName,
      }))
  } catch (error) {
    console.error('加载表列表失败:', error)
  }
}

// 筛选后的提及列表
const filteredMentionList = computed(() => {
  if (!mentionKeyword.value) {
    return allTables.value.slice(0, 10) // 默认显示前10个
  }
  const keyword = mentionKeyword.value.toLowerCase()
  return allTables.value
    .filter(t => 
      t.tableName.toLowerCase().includes(keyword) || 
      t.displayName.toLowerCase().includes(keyword)
    )
    .slice(0, 10) // 最多显示10个
})

// 处理输入事件
const handleInput = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement
  const value = textarea.value
  const cursorPos = textarea.selectionStart
  
  // 查找当前光标位置前最近的@符号
  let atPos = -1
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (value[i] === '@') {
      atPos = i
      break
    }
    // 如果遇到空格或换行，停止搜索
    if (value[i] === ' ' || value[i] === '\n') {
      break
    }
  }
  
  if (atPos !== -1 && atPos < cursorPos) {
    // 找到@符号，显示提及列表
    mentionStartPosition.value = atPos
    mentionKeyword.value = value.substring(atPos + 1, cursorPos)
    showMentionList.value = true
    mentionSelectedIndex.value = 0
  } else {
    // 没有找到@符号，隐藏提及列表
    showMentionList.value = false
    mentionStartPosition.value = -1
    mentionKeyword.value = ''
  }
}

// 选择提及项
const selectMention = (table: { tableName: string; displayName: string }) => {
  if (!inputTextarea.value || mentionStartPosition.value === -1) return
  
  const value = inputMessage.value
  const cursorPos = inputTextarea.value.selectionStart
  
  // 替换@及其后面的关键词为选中的表名
  const beforeAt = value.substring(0, mentionStartPosition.value)
  const afterKeyword = value.substring(cursorPos)
  const newValue = beforeAt + table.tableName + ' ' + afterKeyword
  
  inputMessage.value = newValue
  
  // 隐藏提及列表
  showMentionList.value = false
  mentionStartPosition.value = -1
  mentionKeyword.value = ''
  
  // 设置光标位置到插入内容之后
  nextTick(() => {
    if (inputTextarea.value) {
      const newCursorPos = beforeAt.length + table.tableName.length + 1
      inputTextarea.value.focus()
      inputTextarea.value.setSelectionRange(newCursorPos, newCursorPos)
    }
  })
}

// 处理键盘事件（用于导航提及列表）
const handleKeydown = (event: KeyboardEvent) => {
  if (!showMentionList.value) {
    // 正常发送消息
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
    return
  }
  
  // 提及列表打开时的键盘处理
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      mentionSelectedIndex.value = Math.min(
        mentionSelectedIndex.value + 1,
        filteredMentionList.value.length - 1
      )
      break
    case 'ArrowUp':
      event.preventDefault()
      mentionSelectedIndex.value = Math.max(mentionSelectedIndex.value - 1, 0)
      break
    case 'Enter':
    case 'Tab':
      event.preventDefault()
      if (filteredMentionList.value[mentionSelectedIndex.value]) {
        selectMention(filteredMentionList.value[mentionSelectedIndex.value])
      }
      break
    case 'Escape':
      event.preventDefault()
      showMentionList.value = false
      mentionStartPosition.value = -1
      mentionKeyword.value = ''
      break
  }
}

// 点击外部关闭提及列表
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.mention-dropdown') && !target.closest('textarea')) {
    showMentionList.value = false
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

  // 保存用户消息索引，用于后续更新时间
  const userMessageIndex = messages.value.length
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
        // 更新消息的实际创建时间（从服务器返回）
        if (data.userMessage) {
          messages.value[userMessageIndex].chatId = data.userMessage.chatId
          messages.value[userMessageIndex].createdAt = data.userMessage.createdAt
        }
        if (data.assistantMessage) {
          messages.value[aiMessageIndex].chatId = data.assistantMessage.chatId
          messages.value[aiMessageIndex].createdAt = data.assistantMessage.createdAt
        }
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

// 新建会话（对话中时需要确认）
const newSession = () => {
  if (loading.value) {
    if (!confirm('AI正在回复中，确定要终止对话并新建会话吗？')) {
      return
    }
    // 终止当前对话
    stopStream()
  }
  messages.value = []
  currentSessionId.value = ''
}

// 页面离开确认（刷新/关闭页面）
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (loading.value) {
    e.preventDefault()
    e.returnValue = 'AI正在回复中，确定要离开吗？'
    return e.returnValue
  }
}

// 路由跳转确认（点击菜单栏等）
onBeforeRouteLeave((to, from, next) => {
  if (loading.value) {
    if (confirm('AI正在回复中，确定要终止对话并离开吗？')) {
      stopStream()
      next()
    } else {
      next(false)
    }
  } else {
    next()
  }
})

// 加载会话消息（对话中时需要确认）
const loadSessionMessages = async (session: any) => {
  // 对话中时确认是否切换会话
  if (loading.value) {
    if (!confirm('AI正在回复中，确定要终止对话并切换会话吗？')) {
      return
    }
    // 终止当前对话
    stopStream()
  }
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

// 格式化时间（包含时分秒）
const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
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
  insert_record: '➕ 插入记录',
  update_record: '✏️ 更新记录',
  search_field: '🔎 搜索字段',
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
  loadTableList()
  // 添加点击外部关闭提及列表的监听
  document.addEventListener('click', handleClickOutside)
  // 添加页面离开事件监听
  window.addEventListener('beforeunload', handleBeforeUnload)
})

// 组件卸载时取消pending请求
onUnmounted(() => {
  if (streamAbort.value) {
    streamAbort.value.abort()
  }
  // 移除点击监听
  document.removeEventListener('click', handleClickOutside)
  // 移除页面离开事件监听
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="h-[calc(100vh-8rem)] flex animate-fadeIn">
    <!-- 左侧会话列表 -->
    <div class="chat-sidebar w-64 rounded-l-xl shadow-sm flex flex-col">
      <div class="p-4 border-b border-gray-100 dark:border-gray-700">
        <button
          class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          @click="newSession"
        >
          <Plus class="w-4 h-4" />
          <span>新建会话</span>
        </button>
      </div>
      <div class="flex-1 overflow-auto p-2">
        <div v-if="sessions.length === 0" class="text-center text-sm py-8 session-empty">
          暂无历史会话
        </div>
        <div v-else class="space-y-1">
          <div
            v-for="session in sessions"
            :key="session.sessionId"
            class="group p-3 rounded-lg cursor-pointer transition-colors"
            :class="session.sessionId === currentSessionId ? 'session-active' : 'session-item'"
            @click="loadSessionMessages(session)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-sm truncate session-title">{{ session.lastMessage || '新会话' }}</p>
                <p class="text-xs mt-1 session-model">{{ session.modelName }}</p>
              </div>
              <button
                class="opacity-0 group-hover:opacity-100 p-1 transition-all delete-btn"
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
    <div class="chat-main flex-1 flex flex-col rounded-r-xl shadow-sm">
      <!-- 顶部工具栏 -->
      <div class="flex items-center justify-between px-6 py-4 border-b chat-border">
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
              <option value="enabled">开启思考</option>
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
                class="px-3 py-2 border rounded-lg text-xs tool-call"
              >
                <div class="flex items-center gap-2">
                  <span class="font-medium tool-name">{{ getToolDisplayName(tool.name) }}</span>
                  <span :class="tool.success ? 'text-green-600' : 'text-red-600'">
                    {{ tool.success ? '✓ 成功' : '✗ 失败' }}
                  </span>
                </div>
              </div>
            </div>
            <!-- 思考步骤显示 -->
            <div v-if="msg.thinking" class="mb-2">
              <button
                class="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs transition-colors w-full thinking-btn"
                @click="toggleThinking(index)"
              >
                <Brain class="w-3.5 h-3.5" />
                <span class="font-medium">思考过程</span>
                <ChevronDown v-if="!expandedThinking.has(index)" class="w-3.5 h-3.5 ml-auto" />
                <ChevronUp v-else class="w-3.5 h-3.5 ml-auto" />
              </button>
              <div
                v-if="expandedThinking.has(index)"
                class="mt-1 px-3 py-2 border rounded-lg text-xs whitespace-pre-wrap thinking-content"
              >
                {{ msg.thinking }}
              </div>
            </div>
            <div
              class="px-4 py-3 rounded-2xl"
              :class="msg.role === 'user' ? 'bg-primary text-white' : 'message-bubble'"
            >
              <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
            </div>
            <div class="flex items-center gap-2 mt-1" :class="msg.role === 'user' ? 'justify-end' : ''">
              <p class="text-xs text-gray-400">
                {{ formatTime(msg.createdAt) }}
              </p>
              <button
                class="p-1 transition-colors copy-btn"
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
          <div class="px-4 py-3 rounded-2xl message-bubble">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="p-4 border-t chat-border relative">
        <div class="flex items-end gap-3">
          <div class="flex-1 relative">
            <textarea
              ref="inputTextarea"
              v-model="inputMessage"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="输入消息... 使用 @ 提及数据表"
              rows="1"
              @input="handleInput"
              @keydown="handleKeydown"
            ></textarea>
            <!-- @提及下拉列表 -->
            <div
              v-if="showMentionList && filteredMentionList.length > 0"
              class="mention-dropdown absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto z-10"
            >
              <div class="p-2 text-xs text-gray-500 border-b border-gray-100">
                <Table class="w-3 h-3 inline-block mr-1" />
                选择数据表
              </div>
              <div
                v-for="(table, index) in filteredMentionList"
                :key="table.tableName"
                class="px-3 py-2 cursor-pointer transition-colors"
                :class="index === mentionSelectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'"
                @click="selectMention(table)"
              >
                <div class="flex items-center gap-2">
                  <Table class="w-4 h-4 text-gray-400" />
                  <div>
                    <div class="text-sm font-medium">{{ table.tableName }}</div>
                    <div class="text-xs text-gray-400">{{ table.displayName }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
          按 Enter 发送消息 | 输入 @ 提及数据表 | 模型: {{ currentModelName || '未选择' }}
          <span v-if="useKnowledgeBase" class="text-primary ml-2">| 知识库已开启</span>
          <span v-if="thinkingMode === 'enabled'" class="text-purple-500 ml-2">| 思考模式已开启</span>
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

<style scoped>
/* 主题适配样式 */
.chat-sidebar {
  background-color: var(--color-bg-container);
  border-right: 1px solid var(--color-border);
}

.chat-main {
  background-color: var(--color-bg-container);
}

.chat-border {
  border-color: var(--color-border);
}

.model-select {
  background-color: var(--color-bg-container);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.clear-btn {
  color: var(--color-text-placeholder);
}

.clear-btn:hover {
  color: var(--color-error);
}

.message-container {
  background-color: var(--color-bg-layout);
}

.empty-message {
  color: var(--color-text-placeholder);
}

.session-empty {
  color: var(--color-text-placeholder);
}

.session-item {
  background-color: transparent;
}

.session-item:hover {
  background-color: var(--color-bg-active);
}

.session-active {
  background-color: var(--color-primary-bg);
}

.session-title {
  color: var(--color-text-primary);
}

.session-model {
  color: var(--color-text-placeholder);
}

.delete-btn {
  color: var(--color-text-placeholder);
}

.delete-btn:hover {
  color: var(--color-error);
}

.tool-call {
  background-color: var(--color-primary-bg);
  border-color: var(--color-primary-border);
}

.tool-name {
  color: var(--color-primary);
}

.thinking-btn {
  background-color: var(--color-bg-container);
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.thinking-btn:hover {
  background-color: var(--color-bg-active);
}

.thinking-content {
  background-color: var(--color-bg-container);
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.message-bubble {
  background-color: var(--color-bg-container);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.copy-btn {
  color: var(--color-text-placeholder);
}

.copy-btn:hover {
  color: var(--color-text-secondary);
}

.input-area {
  background-color: var(--color-bg-container);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.input-hint {
  color: var(--color-text-placeholder);
}

.mention-dropdown {
  background-color: var(--color-bg-container);
  border-color: var(--color-border);
}

.mention-dropdown-header {
  color: var(--color-text-placeholder);
  border-color: var(--color-border);
}

.mention-item {
  background-color: transparent;
}

.mention-item:hover {
  background-color: var(--color-bg-active);
}

.mention-item-active {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.mention-icon {
  color: var(--color-text-placeholder);
}

.mention-desc {
  color: var(--color-text-placeholder);
}
</style>
