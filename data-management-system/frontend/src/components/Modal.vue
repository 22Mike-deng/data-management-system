/**
 * 模态弹窗组件
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-12
 */
<script setup lang="ts">
import { watch } from 'vue'
import { X } from 'lucide-vue-next'

interface Props {
  visible: boolean
  title?: string
  width?: string
  closable?: boolean
  maskClosable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: '500px',
  closable: true,
  maskClosable: true,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

// 关闭弹窗
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

// 点击遮罩关闭
const handleMaskClick = () => {
  if (props.maskClosable) {
    handleClose()
  }
}

// 监听visible变化，控制body滚动
watch(
  () => props.visible,
  (val) => {
    if (val) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- 遮罩层 -->
        <div
          class="absolute inset-0 bg-black/50"
          @click="handleMaskClick"
        ></div>

        <!-- 弹窗内容 -->
        <div
          class="relative bg-white rounded-xl shadow-2xl overflow-hidden animate-modalIn"
          :style="{ width, maxWidth: '90vw', maxHeight: '90vh' }"
        >
          <!-- 头部 -->
          <div
            v-if="title || closable"
            class="flex items-center justify-between px-6 py-4 border-b border-gray-100"
          >
            <h3 class="text-lg font-semibold text-gray-800">{{ title }}</h3>
            <button
              v-if="closable"
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="handleClose"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- 内容区域 -->
          <div class="overflow-auto" style="max-height: calc(90vh - 130px)">
            <slot></slot>
          </div>

          <!-- 底部 -->
          <div v-if="$slots.footer" class="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-modalIn {
  animation: modalIn 0.2s ease-out;
}
</style>
