/**
 * 工作台/仪表板页面
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Database, 
  Table2, 
  Bot, 
  MessageSquare, 
  TrendingUp, 
  ChevronRight,
  Zap,
  DollarSign
} from 'lucide-vue-next'
import { getTableList } from '@/api/table-meta'
import { getModelList } from '@/api/ai-model'
import { getOverview } from '@/api/token-usage'
import type { TableDefinition, AIModelConfig } from '@/types'
import type { TokenOverview } from '@/api/token-usage'

const router = useRouter()

// 统计数据
const stats = ref({
  tables: 0,
  models: 0,
  sessions: 0,
  tokens: 0,
  cost: 0,
})

// 最近数据表
const recentTables = ref<TableDefinition[]>([])
// 最近模型
const recentModels = ref<AIModelConfig[]>([])

// 加载状态
const loading = ref(false)

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // 并行请求
    const [tablesRes, modelsRes, overviewRes] = await Promise.all([
      getTableList(),
      getModelList(),
      getOverview(),
    ])
    
    stats.value.tables = tablesRes.data?.length || 0
    stats.value.models = modelsRes.data?.length || 0
    stats.value.sessions = overviewRes.data?.sessionCount || 0
    stats.value.tokens = overviewRes.data?.totalTokens || 0
    stats.value.cost = overviewRes.data?.totalCost || 0

    // 最近数据表
    recentTables.value = (tablesRes.data || []).slice(0, 5)
    // 最近模型
    recentModels.value = (modelsRes.data || []).slice(0, 5)
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 快捷操作
const quickActions = [
  { icon: Table2, label: '创建数据表', path: '/table-manage', color: 'bg-blue-500' },
  { icon: Bot, label: '添加AI模型', path: '/ai-model', color: 'bg-purple-500' },
  { icon: MessageSquare, label: '开始对话', path: '/ai-chat', color: 'bg-green-500' },
  { icon: TrendingUp, label: '查看统计', path: '/token-stats', color: 'bg-orange-500' },
]

// 导航
const navigateTo = (path: string) => {
  router.push(path)
}

// 格式化数字
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
  return num.toString()
}

// 格式化金额
const formatCost = (cost: number) => {
  return '¥' + cost.toFixed(4)
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="space-y-6 animate-fadeIn">
    <!-- 欢迎区域 -->
    <div class="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-8 text-white">
      <h1 class="text-2xl font-bold">欢迎使用数据管理可视化系统</h1>
      <p class="mt-2 opacity-90">高效管理您的数据，智能AI助手助您一臂之力</p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" @click="navigateTo('/table-manage')">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">数据表</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats.tables }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Table2 class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" @click="navigateTo('/ai-model')">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">AI模型</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats.models }}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Bot class="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" @click="navigateTo('/ai-chat')">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">对话次数</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats.sessions }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <MessageSquare class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" @click="navigateTo('/token-stats')">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Token消耗</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ formatNumber(stats.tokens) }}</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Zap class="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" @click="navigateTo('/token-stats')">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">总费用</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ formatCost(stats.cost) }}</p>
          </div>
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <DollarSign class="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="bg-white rounded-xl shadow-sm p-6">
      <h3 class="font-semibold text-gray-800 mb-4">快捷操作</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          v-for="action in quickActions"
          :key="action.path"
          class="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-primary hover:bg-primary/5 transition-all group"
          @click="navigateTo(action.path)"
        >
          <div :class="[action.color, 'w-10 h-10 rounded-lg flex items-center justify-center']">
            <component :is="action.icon" class="w-5 h-5 text-white" />
          </div>
          <span class="text-sm text-gray-700 group-hover:text-primary">{{ action.label }}</span>
          <ChevronRight class="w-4 h-4 text-gray-400 ml-auto group-hover:text-primary" />
        </button>
      </div>
    </div>

    <!-- 最近数据 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 最近数据表 -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800">最近数据表</h3>
          <button class="text-sm text-primary hover:underline" @click="navigateTo('/table-manage')">
            查看全部
          </button>
        </div>
        <div v-if="recentTables.length === 0" class="p-6 text-center text-gray-400">
          暂无数据表
        </div>
        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="table in recentTables"
            :key="table.tableId"
            class="flex items-center justify-between px-6 py-3 hover:bg-gray-50 cursor-pointer"
            @click="navigateTo(`/data-manage/${table.tableId}`)"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Table2 class="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p class="text-sm text-gray-800">{{ table.displayName }}</p>
                <p class="text-xs text-gray-400">{{ table.tableName }}</p>
              </div>
            </div>
            <ChevronRight class="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      <!-- AI模型列表 -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800">AI模型</h3>
          <button class="text-sm text-primary hover:underline" @click="navigateTo('/ai-model')">
            查看全部
          </button>
        </div>
        <div v-if="recentModels.length === 0" class="p-6 text-center text-gray-400">
          暂无AI模型
        </div>
        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="model in recentModels"
            :key="model.modelId"
            class="flex items-center justify-between px-6 py-3 hover:bg-gray-50 cursor-pointer"
            @click="navigateTo('/ai-model')"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Bot class="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p class="text-sm text-gray-800">{{ model.modelName }}</p>
                <p class="text-xs text-gray-400">{{ model.modelIdentifier }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span
                v-if="model.isDefault"
                class="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
              >
                默认
              </span>
              <span
                class="px-2 py-0.5 text-xs rounded-full"
                :class="model.isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'"
              >
                {{ model.isEnabled ? '启用' : '禁用' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
