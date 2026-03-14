/**
 * AI模型管理页面
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-13
 */
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Edit, Trash2, Power, PowerOff, Zap, Star, CheckCircle, XCircle } from 'lucide-vue-next'
import {
  getModelList,
  createModel,
  updateModel,
  deleteModel,
  toggleModel,
  setDefaultModel,
  testConnection,
  testConnectionById,
  getModelPricing,
  setModelPricing,
  updatePricing,
  type AIModelPricing,
} from '@/api/ai-model'
import type { AIModelConfig } from '@/types'
import Modal from '@/components/Modal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

// 模型列表
const modelList = ref<AIModelConfig[]>([])
const loading = ref(false)

// 弹窗状态
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const currentModel = ref<AIModelConfig | null>(null)
const saveLoading = ref(false)

// 表单数据
const modelForm = ref({
  modelName: '',
  modelType: 'openai',
  apiEndpoint: '',
  apiKey: '',
  modelIdentifier: '',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
  contextLength: 20,
})

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<AIModelConfig | null>(null)
const deleteLoading = ref(false)

// 价格设置
const pricingForm = ref({
  inputPrice: 0,
  outputPrice: 0,
  currency: 'CNY',
})
const currentPricing = ref<AIModelPricing | null>(null)
const pricingLoading = ref(false)

// 测试连接
const testLoading = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

// 模型类型选项
const modelTypeOptions = [
  { label: 'OpenAI', value: 'openai' },
  { label: '通义千问', value: 'qwen' },
  { label: '文心一言', value: 'wenxin' },
  { label: '智谱AI', value: 'zhipu' },
  { label: 'Claude', value: 'claude' },
  { label: '自定义', value: 'custom' },
]

// 常用模型标识符
const commonModelIdentifiers: Record<string, string[]> = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
  qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-max-longcontext'],
  wenxin: ['ernie-bot-4', 'ernie-bot-turbo', 'ernie-bot'],
  zhipu: ['glm-4', 'glm-4-flash', 'glm-3-turbo'],
  claude: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  custom: [],
}

// 加载模型列表
const loadModelList = async () => {
  loading.value = true
  try {
    const res = await getModelList()
    modelList.value = res.data || []
  } catch (error) {
    console.error('加载模型列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 重置表单
const resetForm = () => {
  modelForm.value = {
    modelName: '',
    modelType: 'openai',
    apiEndpoint: '',
    apiKey: '',
    modelIdentifier: '',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
    contextLength: 20,
  }
  testResult.value = null
  // 重置价格表单
  pricingForm.value = {
    inputPrice: 0,
    outputPrice: 0,
    currency: 'CNY',
  }
  currentPricing.value = null
}

// 打开添加弹窗
const handleAdd = () => {
  modalMode.value = 'create'
  currentModel.value = null
  resetForm()
  // 设置默认端点
  updateDefaultEndpoint('openai')
  showModal.value = true
}

// 打开编辑弹窗
const handleEdit = async (model: AIModelConfig) => {
  modalMode.value = 'edit'
  currentModel.value = model
  modelForm.value = {
    modelName: model.modelName,
    modelType: model.modelType,
    apiEndpoint: model.apiEndpoint,
    apiKey: '', // 安全考虑不显示API Key
    modelIdentifier: model.modelIdentifier,
    temperature: model.parameters?.temperature || 0.7,
    maxTokens: model.parameters?.maxTokens || 4096,
    topP: model.parameters?.topP || 1,
    contextLength: model.parameters?.contextLength || 20,
  }
  testResult.value = null
  showModal.value = true
  
  // 加载价格配置
  pricingLoading.value = true
  try {
    const res = await getModelPricing(model.modelId)
    if (res.data) {
      currentPricing.value = res.data
      pricingForm.value = {
        inputPrice: res.data.inputPrice,
        outputPrice: res.data.outputPrice,
        currency: res.data.currency || 'CNY',
      }
    } else {
      // 没有价格配置时重置
      pricingForm.value = { inputPrice: 0, outputPrice: 0, currency: 'CNY' }
      currentPricing.value = null
    }
  } catch (error) {
    console.error('加载价格配置失败:', error)
  } finally {
    pricingLoading.value = false
  }
}

// 更新默认端点
const updateDefaultEndpoint = (type: string) => {
  const endpoints: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    qwen: 'https://dashscope.aliyuncs.com/api/v1',
    wenxin: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4',
    claude: 'https://api.anthropic.com/v1',
  }
  if (!modelForm.value.apiEndpoint || modalMode.value === 'create') {
    modelForm.value.apiEndpoint = endpoints[type] || ''
  }
}

// 保存模型
const handleSave = async () => {
  // 验证必填项（编辑模式下 API Key 可选）
  if (!modelForm.value.modelName || !modelForm.value.modelIdentifier) {
    alert('请填写模型名称和模型标识符')
    return
  }
  // 创建模式下 API Key 必填
  if (modalMode.value === 'create' && !modelForm.value.apiKey) {
    alert('请填写 API Key')
    return
  }

  saveLoading.value = true
  try {
    const data: any = {
      modelName: modelForm.value.modelName,
      modelType: modelForm.value.modelType,
      apiEndpoint: modelForm.value.apiEndpoint,
      modelIdentifier: modelForm.value.modelIdentifier,
      parameters: {
        temperature: modelForm.value.temperature,
        maxTokens: modelForm.value.maxTokens,
        topP: modelForm.value.topP,
        contextLength: modelForm.value.contextLength,
      },
    }

    // 只有填写了 API Key 才传递
    if (modelForm.value.apiKey) {
      data.apiKey = modelForm.value.apiKey
    }

    let savedModelId: string | null = null

    if (modalMode.value === 'create') {
      const res = await createModel(data)
      savedModelId = res.data?.modelId
    } else if (currentModel.value) {
      await updateModel(currentModel.value.modelId, data)
      savedModelId = currentModel.value.modelId
    }

    // 保存价格配置（仅在编辑模式或创建成功后）
    if (savedModelId && (pricingForm.value.inputPrice > 0 || pricingForm.value.outputPrice > 0)) {
      try {
        if (currentPricing.value) {
          // 更新现有定价
          await updatePricing(currentPricing.value.pricingId, pricingForm.value)
        } else {
          // 创建新定价
          await setModelPricing(savedModelId, pricingForm.value)
        }
      } catch (error) {
        console.error('保存价格配置失败:', error)
        // 价格保存失败不影响整体流程
      }
    }

    showModal.value = false
    loadModelList()
  } catch (error) {
    console.error('保存模型失败:', error)
    alert('保存失败，请重试')
  } finally {
    saveLoading.value = false
  }
}

// 删除模型
const handleDelete = (model: AIModelConfig) => {
  deleteTarget.value = model
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await deleteModel(deleteTarget.value.modelId)
    showDeleteConfirm.value = false
    loadModelList()
  } catch (error) {
    console.error('删除模型失败:', error)
    alert('删除失败，请重试')
  } finally {
    deleteLoading.value = false
  }
}

// 切换启用状态
const handleToggle = async (model: AIModelConfig) => {
  try {
    await toggleModel(model.modelId)
    loadModelList()
  } catch (error) {
    console.error('切换状态失败:', error)
    alert('操作失败，请重试')
  }
}

// 设置为默认
const handleSetDefault = async (model: AIModelConfig) => {
  try {
    await setDefaultModel(model.modelId)
    loadModelList()
  } catch (error) {
    console.error('设置默认模型失败:', error)
    alert('操作失败，请重试')
  }
}

// 测试连接
const handleTest = async () => {
  // 编辑模式下，如果没有填写API Key，使用已保存的配置测试
  if (modalMode.value === 'edit' && !modelForm.value.apiKey && currentModel.value) {
    testLoading.value = true
    testResult.value = null
    try {
      const res = await testConnectionById(currentModel.value.modelId)
      testResult.value = {
        success: res.data?.success || false,
        message: res.data?.responseTime
          ? `${res.data?.message || '测试完成'} (${res.data.responseTime}ms)`
          : res.data?.message || '测试完成',
      }
    } catch (error: any) {
      testResult.value = {
        success: false,
        message: error.message || '测试失败',
      }
    } finally {
      testLoading.value = false
    }
    return
  }

  // 新建模式或填写了API Key时，使用表单数据测试
  if (!modelForm.value.apiKey || !modelForm.value.modelIdentifier) {
    alert('请先填写API Key和模型标识符')
    return
  }

  testLoading.value = true
  testResult.value = null
  try {
    const res = await testConnection({
      modelType: modelForm.value.modelType,
      apiEndpoint: modelForm.value.apiEndpoint,
      apiKey: modelForm.value.apiKey,
      modelIdentifier: modelForm.value.modelIdentifier,
    })
    testResult.value = {
      success: res.data?.success || false,
      message: res.data?.responseTime
        ? `${res.data?.message || '测试完成'} (${res.data.responseTime}ms)`
        : res.data?.message || '测试完成',
    }
  } catch (error: any) {
    testResult.value = {
      success: false,
      message: error.message || '测试失败',
    }
  } finally {
    testLoading.value = false
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => {
  loadModelList()
})
</script>

<template>
  <div class="space-y-6 animate-fadeIn ai-model-page">
    <!-- 操作栏 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold page-title">AI模型管理</h2>
        <p class="text-sm page-desc mt-1">配置和管理AI模型，支持OpenAI、通义千问、文心一言等</p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 primary-btn text-white rounded-lg transition-colors"
        @click="handleAdd"
      >
        <Plus class="w-4 h-4" />
        <span>添加模型</span>
      </button>
    </div>

    <!-- 模型列表 -->
    <div v-if="loading" class="text-center py-8 loading-text">
      加载中...
    </div>
    <div v-else-if="modelList.length === 0" class="empty-card rounded-xl shadow-sm p-8 text-center">
      <div class="empty-icon mb-4">
        <Zap class="w-12 h-12 mx-auto" />
      </div>
      <p class="empty-text mb-4">暂无AI模型配置</p>
      <button
        class="px-4 py-2 primary-btn text-white rounded-lg transition-colors"
        @click="handleAdd"
      >
        添加第一个模型
      </button>
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="model in modelList"
        :key="model.modelId"
        class="model-card rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow relative"
        :class="{ 'model-default': model.isDefault }"
      >
        <!-- 默认标记 -->
        <div
          v-if="model.isDefault"
          class="absolute top-3 right-3 px-2 py-1 default-tag text-xs rounded-full flex items-center gap-1"
        >
          <Star class="w-3 h-3" />
          默认
        </div>

        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="font-semibold card-title">{{ model.modelName }}</h3>
            <span class="text-xs card-desc">{{ modelTypeOptions.find(o => o.value === model.modelType)?.label || model.modelType }}</span>
          </div>
          <span
            class="px-2 py-1 text-xs rounded-full"
            :class="model.isEnabled ? 'enabled-tag' : 'disabled-tag'"
          >
            {{ model.isEnabled ? '已启用' : '已禁用' }}
          </span>
        </div>
        <div class="text-sm card-desc mb-4">
          <p class="font-mono text-xs">{{ model.modelIdentifier }}</p>
          <p class="text-xs mt-1 truncate" :title="model.apiEndpoint">{{ model.apiEndpoint }}</p>
        </div>
        <div class="flex items-center justify-between pt-4 card-divider">
          <div class="flex items-center gap-1">
            <button
              class="p-2 action-btn rounded-lg transition-colors"
              title="测试连接"
              @click="handleEdit(model); showModal = true; handleTest()"
            >
              <Zap class="w-4 h-4" />
            </button>
            <button
              class="p-2 action-btn rounded-lg transition-colors"
              title="编辑"
              @click="handleEdit(model)"
            >
              <Edit class="w-4 h-4" />
            </button>
            <button
              class="p-2 delete-action-btn rounded-lg transition-colors"
              title="删除"
              @click="handleDelete(model)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
            <button
              v-if="!model.isDefault"
              class="p-2 star-action-btn rounded-lg transition-colors"
              title="设为默认"
              @click="handleSetDefault(model)"
            >
              <Star class="w-4 h-4" />
            </button>
          </div>
          <button
            class="p-2 rounded-lg transition-colors"
            :class="model.isEnabled ? 'enabled-action-btn' : 'action-btn'"
            :title="model.isEnabled ? '禁用' : '启用'"
            @click="handleToggle(model)"
          >
            <Power v-if="model.isEnabled" class="w-4 h-4" />
            <PowerOff v-else class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑模型弹窗 -->
    <Modal
      v-model:visible="showModal"
      :title="modalMode === 'create' ? '添加AI模型' : '编辑AI模型'"
      width="600px"
    >
      <div class="p-6 space-y-4 max-h-[60vh] overflow-auto">
        <!-- 基本信息 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium form-label mb-1">
              模型名称 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="modelForm.modelName"
              type="text"
              placeholder="例如: GPT-4"
              class="w-full px-3 py-2 border form-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label class="block text-sm font-medium form-label mb-1">模型类型</label>
            <select
              v-model="modelForm.modelType"
              class="w-full px-3 py-2 border form-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              @change="updateDefaultEndpoint(modelForm.modelType)"
            >
              <option v-for="opt in modelTypeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium form-label mb-1">API端点</label>
          <input
            v-model="modelForm.apiEndpoint"
            type="text"
            placeholder="例如: https://api.openai.com/v1"
            class="w-full px-3 py-2 border form-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div>
          <label class="block text-sm font-medium form-label mb-1">
            API Key <span v-if="modalMode === 'create'" class="text-red-500">*</span>
          </label>
          <input
            v-model="modelForm.apiKey"
            type="password"
            :placeholder="modalMode === 'edit' ? '留空保持不变' : '请输入API密钥'"
            class="w-full px-3 py-2 border form-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <p v-if="modalMode === 'edit'" class="text-xs form-hint mt-1">留空则保持原密钥不变</p>
        </div>

        <div>
          <label class="block text-sm font-medium form-label mb-1">
            模型标识符 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="modelForm.modelIdentifier"
            type="text"
            placeholder="例如: gpt-4"
            class="w-full px-3 py-2 border form-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <div v-if="commonModelIdentifiers[modelForm.modelType]?.length" class="flex flex-wrap gap-1 mt-2">
            <span class="text-xs form-hint">快速选择：</span>
            <button
              v-for="id in commonModelIdentifiers[modelForm.modelType]"
              :key="id"
              class="px-2 py-0.5 text-xs quick-select-btn rounded transition-colors"
              @click="modelForm.modelIdentifier = id"
            >
              {{ id }}
            </button>
          </div>
        </div>

        <!-- 参数设置 -->
        <div class="border-t form-divider pt-4">
          <h4 class="text-sm font-medium form-label mb-3">模型参数</h4>
          <div class="grid grid-cols-4 gap-4">
            <div>
              <label class="block text-xs form-hint mb-1">Temperature</label>
              <input
                v-model.number="modelForm.temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                class="w-full px-2 py-1.5 text-sm border form-input rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label class="block text-xs form-hint mb-1">Max Tokens</label>
              <input
                v-model.number="modelForm.maxTokens"
                type="number"
                min="1"
                max="1000000"
                step="1"
                class="w-full px-2 py-1.5 text-sm border form-input rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p class="text-xs form-hint mt-1">范围: 1-1000000</p>
            </div>
            <div>
              <label class="block text-xs form-hint mb-1">Top P</label>
              <input
                v-model.number="modelForm.topP"
                type="number"
                min="0"
                max="1"
                step="0.1"
                class="w-full px-2 py-1.5 text-sm border form-input rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label class="block text-xs form-hint mb-1">上下文长度</label>
              <input
                v-model.number="modelForm.contextLength"
                type="number"
                min="1"
                max="100"
                step="1"
                class="w-full px-2 py-1.5 text-sm border form-input rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p class="text-xs form-hint mt-1">记忆消息数</p>
            </div>
          </div>
        </div>

        <!-- 价格设置 -->
        <div class="border-t form-divider pt-4">
          <h4 class="text-sm font-medium form-label mb-3">模型定价</h4>
          <div v-if="pricingLoading" class="text-center py-2 loading-text text-sm">
            加载价格配置中...
          </div>
          <div v-else class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-xs form-hint mb-1">输入价格 (每1K tokens)</label>
              <div class="relative">
                <input
                  v-model.number="pricingForm.inputPrice"
                  type="number"
                  min="0"
                  step="0.0001"
                  class="w-full px-2 py-1.5 text-sm border form-input rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="0.00"
                />
              </div>
              <p class="text-xs form-hint mt-1">单位: {{ pricingForm.currency }}/1K tokens</p>
            </div>
            <div>
              <label class="block text-xs form-hint mb-1">输出价格 (每1K tokens)</label>
              <input
                v-model.number="pricingForm.outputPrice"
                type="number"
                min="0"
                step="0.0001"
                class="w-full px-2 py-1.5 text-sm border form-input rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="block text-xs form-hint mb-1">货币单位</label>
              <select
                v-model="pricingForm.currency"
                class="w-full px-2 py-1.5 text-sm border form-input rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="CNY">人民币 (CNY)</option>
                <option value="USD">美元 (USD)</option>
              </select>
            </div>
          </div>
          <p class="text-xs form-hint mt-2">
            提示：价格用于计算对话消耗成本，设置为0表示不计算费用
          </p>
        </div>

        <!-- 测试结果 -->
        <div v-if="testResult" class="p-3 rounded-lg" :class="testResult.success ? 'test-success' : 'test-error'">
          <div class="flex items-center gap-2">
            <CheckCircle v-if="testResult.success" class="w-4 h-4" />
            <XCircle v-else class="w-4 h-4" />
            <span>
              {{ testResult.message }}
            </span>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between">
          <button
            class="px-4 py-2 test-btn transition-colors disabled:opacity-50"
            :disabled="testLoading"
            @click="handleTest"
          >
            <span v-if="testLoading" class="flex items-center gap-2">
              <span class="w-4 h-4 border-2 rounded-full animate-spin"></span>
              测试中...
            </span>
            <span v-else class="flex items-center gap-1">
              <Zap class="w-4 h-4" />
              测试连接
            </span>
          </button>
          <div class="flex gap-3">
            <button
              class="px-4 py-2 cancel-btn rounded-lg transition-colors"
              @click="showModal = false"
            >
              取消
            </button>
            <button
              class="px-4 py-2 primary-btn text-white rounded-lg transition-colors disabled:opacity-50"
              :disabled="saveLoading"
              @click="handleSave"
            >
              {{ saveLoading ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- 删除确认 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      type="error"
      title="删除模型"
      :message="`确定要删除模型「${deleteTarget?.modelName}」吗？此操作不可恢复。`"
      confirm-text="删除"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
/* 主题适配样式 */
.ai-model-page {
  background-color: var(--color-bg-layout);
}

.page-title {
  color: var(--color-text-primary);
}

.page-desc {
  color: var(--color-text-secondary);
}

.primary-btn {
  background-color: var(--color-primary);
}

.primary-btn:hover {
  background-color: var(--color-primary-dark);
}

.loading-text {
  color: var(--color-text-secondary);
}

.empty-card {
  background-color: var(--color-bg-container);
}

.empty-icon {
  color: var(--color-text-placeholder);
}

.empty-text {
  color: var(--color-text-secondary);
}

.model-card {
  background-color: var(--color-bg-container);
}

.model-default {
  box-shadow: 0 0 0 2px var(--color-primary);
}

.default-tag {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.card-title {
  color: var(--color-text-primary);
}

.card-desc {
  color: var(--color-text-secondary);
}

.enabled-tag {
  background-color: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.disabled-tag {
  background-color: var(--color-bg-active);
  color: var(--color-text-placeholder);
}

.card-divider {
  border-top: 1px solid var(--color-border);
}

.action-btn {
  color: var(--color-text-placeholder);
}

.action-btn:hover {
  color: var(--color-primary);
  background-color: var(--color-bg-active);
}

.delete-action-btn {
  color: var(--color-text-placeholder);
}

.delete-action-btn:hover {
  color: var(--color-error);
  background-color: var(--color-error-bg);
}

.star-action-btn {
  color: var(--color-text-placeholder);
}

.star-action-btn:hover {
  color: #eab308;
  background-color: rgba(234, 179, 8, 0.1);
}

.enabled-action-btn {
  color: #22c55e;
}

.enabled-action-btn:hover {
  background-color: rgba(34, 197, 94, 0.1);
}

.form-label {
  color: var(--color-text-primary);
}

.form-input {
  background-color: var(--color-bg-container);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.form-hint {
  color: var(--color-text-placeholder);
}

.form-divider {
  border-color: var(--color-border);
}

.quick-select-btn {
  background-color: var(--color-bg-active);
  color: var(--color-text-secondary);
}

.quick-select-btn:hover {
  background-color: var(--color-border);
}

.test-success {
  background-color: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.test-error {
  background-color: var(--color-error-bg);
  color: var(--color-error);
}

.test-btn {
  color: var(--color-text-secondary);
}

.test-btn:hover {
  color: var(--color-text-primary);
}

.cancel-btn {
  color: var(--color-text-secondary);
  background-color: var(--color-bg-active);
}

.cancel-btn:hover {
  background-color: var(--color-border);
}
</style>
