/**
 * AI对话页面
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { Send, Bot, User, Plus, Trash2, MessageSquare } from 'lucide-vue-next'
import { getEnabledModels, sendMessage, getSessionList, deleteSession } from '@/api/ai-model'
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

// 会话列表
const sessions = ref<any[]>([])
const currentSessionId = ref('')

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

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  try {
    const res = await sendMessage({
      modelId: selectedModel.value,
      message: messageContent,
      sessionId: currentSessionId.value || undefined,
    })

    // 更新会话ID
    if (res.data?.sessionId) {
      currentSessionId.value = res.data.sessionId
    }

    // 添加AI回复
    messages.value.push({
      chatId: '',
      modelId: selectedModel.value,
      sessionId: currentSessionId.value,
      role: 'assistant',
      content: res.data?.response || '抱歉，我没有理解您的问题。',
      createdAt: new Date().toISOString(),
    })
  } catch (error: any) {
    messages.value.push({
      chatId: '',
      modelId: selectedModel.value,
      sessionId: currentSessionId.value,
      role: 'assistant',
      content: `发生错误: ${error.message || '请求失败'}`,
      createdAt: new Date().toISOString(),
    })
  } finally {
    loading.value = false
    scrollToBottom()
    // 刷新会话列表
    loadSessions()
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
  // 这里应该有API获取历史消息，暂时跳过
  currentSessionId.value = session.sessionId
  messages.value = []
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

// 获取当前模型名称
const currentModelName = computed(() => {
  const model = modelList.value.find(m => m.modelId === selectedModel.value)
  return model?.modelName || 'AI'
})

onMounted(() => {
  loadModelList()
  loadSessions()
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
            <div
              class="px-4 py-3 rounded-2xl"
              :class="msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'"
            >
              <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
            </div>
            <p class="text-xs text-gray-400 mt-1" :class="msg.role === 'user' ? 'text-right' : ''">
              {{ formatTime(msg.createdAt) }}
            </p>
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
            class="p-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!inputMessage.trim() || loading || !selectedModel"
            @click="handleSendMessage"
          >
            <Send class="w-5 h-5" />
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-2 text-center">
          按 Enter 发送消息，模型: {{ currentModelName || '未选择' }}
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
