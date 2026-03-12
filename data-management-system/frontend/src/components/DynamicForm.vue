/**
 * 通用表单组件 - 支持动态字段渲染
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-12
 */
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { FieldType } from '@/types'

interface FieldConfig {
  name: string
  label: string
  type: FieldType | 'password' | 'textarea'
  required?: boolean
  placeholder?: string
  defaultValue?: string | number | boolean
  options?: { label: string; value: string | number }[]
  min?: number
  max?: number
  disabled?: boolean
}

interface Props {
  fields: FieldConfig[]
  modelValue: Record<string, any>
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
  submit: []
}>()

// 表单数据
const formData = ref<Record<string, any>>({})

// 初始化表单数据
watch(
  () => props.modelValue,
  (val) => {
    formData.value = { ...val }
  },
  { immediate: true, deep: true }
)

// 更新数据
const updateValue = (name: string, value: any) => {
  formData.value[name] = value
  emit('update:modelValue', { ...formData.value })
}

// 提交表单
const handleSubmit = () => {
  emit('submit')
}

// 字段类型映射到input type
const getInputType = (type: string) => {
  const typeMap: Record<string, string> = {
    text: 'text',
    number: 'number',
    password: 'password',
    date: 'date',
    boolean: 'checkbox',
  }
  return typeMap[type] || 'text'
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div v-for="field in fields" :key="field.name" class="space-y-1">
      <!-- 标签 -->
      <label class="block text-sm font-medium text-gray-700">
        {{ field.label }}
        <span v-if="field.required" class="text-red-500">*</span>
      </label>

      <!-- 文本输入 -->
      <input
        v-if="['text', 'number', 'password', 'date'].includes(field.type)"
        :type="getInputType(field.type)"
        :value="formData[field.name]"
        :placeholder="field.placeholder || `请输入${field.label}`"
        :required="field.required"
        :disabled="disabled || field.disabled"
        :min="field.min"
        :max="field.max"
        class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:bg-gray-50 disabled:text-gray-500"
        @input="updateValue(field.name, ($event.target as HTMLInputElement).value)"
      />

      <!-- 多行文本 -->
      <textarea
        v-else-if="field.type === 'textarea' || field.type === 'richtext'"
        :value="formData[field.name]"
        :placeholder="field.placeholder || `请输入${field.label}`"
        :required="field.required"
        :disabled="disabled || field.disabled"
        rows="4"
        class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:bg-gray-50 disabled:text-gray-500 resize-none"
        @input="updateValue(field.name, ($event.target as HTMLTextAreaElement).value)"
      ></textarea>

      <!-- 开关/复选框 -->
      <div v-else-if="field.type === 'boolean'" class="flex items-center">
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            :checked="!!formData[field.name]"
            :disabled="disabled || field.disabled"
            class="sr-only peer"
            @change="updateValue(field.name, ($event.target as HTMLInputElement).checked)"
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      <!-- 单选框 -->
      <select
        v-else-if="field.type === 'select'"
        :value="formData[field.name]"
        :required="field.required"
        :disabled="disabled || field.disabled"
        class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:bg-gray-50 disabled:text-gray-500"
        @change="updateValue(field.name, ($event.target as HTMLSelectElement).value)"
      >
        <option value="">请选择{{ field.label }}</option>
        <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <!-- 多选框 -->
      <div v-else-if="field.type === 'multiselect'" class="flex flex-wrap gap-2">
        <label
          v-for="opt in field.options"
          :key="opt.value"
          class="inline-flex items-center px-3 py-1 rounded-full border cursor-pointer transition-colors"
          :class="
            (formData[field.name] || []).includes(opt.value)
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
          "
        >
          <input
            type="checkbox"
            :value="opt.value"
            :checked="(formData[field.name] || []).includes(opt.value)"
            :disabled="disabled || field.disabled"
            class="sr-only"
            @change="
              () => {
                const values = formData[field.name] || []
                const idx = values.indexOf(opt.value)
                if (idx > -1) {
                  values.splice(idx, 1)
                } else {
                  values.push(opt.value)
                }
                updateValue(field.name, [...values])
              }
            "
          />
          {{ opt.label }}
        </label>
      </div>
    </div>
  </form>
</template>
