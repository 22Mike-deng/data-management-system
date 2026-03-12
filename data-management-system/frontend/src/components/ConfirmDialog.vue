/**
 * 确认对话框组件
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-12
 */
<script setup lang="ts">
import { ref } from 'vue'
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-vue-next'
import Modal from './Modal.vue'

interface Props {
  type?: 'warning' | 'info' | 'success' | 'error'
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'warning',
  title: '确认操作',
  confirmText: '确认',
  cancelText: '取消',
  loading: false,
})

const visible = defineModel<boolean>('visible', { default: false })

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

// 获取图标和颜色
const getIconComponent = () => {
  const icons = {
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle,
    error: XCircle,
  }
  return icons[props.type]
}

const getIconColor = () => {
  const colors = {
    warning: 'text-yellow-500 bg-yellow-50',
    info: 'text-blue-500 bg-blue-50',
    success: 'text-green-500 bg-green-50',
    error: 'text-red-500 bg-red-50',
  }
  return colors[props.type]
}

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  visible.value = false
  emit('cancel')
}
</script>

<template>
  <Modal v-model:visible="visible" :title="title" width="400px" :closable="!loading" :mask-closable="!loading">
    <div class="p-6">
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" :class="getIconColor()">
          <component :is="getIconComponent()" class="w-6 h-6" />
        </div>
        <div class="flex-1">
          <p class="text-gray-800">{{ message }}</p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          :disabled="loading"
          @click="handleCancel"
        >
          {{ cancelText }}
        </button>
        <button
          class="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
          :class="type === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'"
          :disabled="loading"
          @click="handleConfirm"
        >
          <span v-if="loading" class="flex items-center gap-2">
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            处理中...
          </span>
          <span v-else>{{ confirmText }}</span>
        </button>
      </div>
    </template>
  </Modal>
</template>
