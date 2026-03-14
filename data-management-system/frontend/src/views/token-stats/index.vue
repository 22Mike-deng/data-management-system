/**
 * Token统计页面
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-13
 */
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { TrendingUp, DollarSign, Zap, Calendar, ChevronRight, ChevronLeft, Filter, X } from 'lucide-vue-next'
import { getOverview, getTrend, getByModel, getUsageList } from '@/api/token-usage'
import { getEnabledModels } from '@/api/ai-model'
import type { TokenOverview, TrendItem, ModelStats, QueryTokenUsageDto } from '@/api/token-usage'
import type { TokenUsage, AIModelConfig } from '@/types'

// 统计概览
const overview = ref<TokenOverview | null>(null)
const loading = ref(false)

// 趋势数据
const trendData = ref<TrendItem[]>([])
const trendDays = ref(7)
const hoveredBar = ref<number | null>(null)

// 分模型统计
const modelStats = ref<ModelStats[]>([])

// 消耗明细
const usageList = ref<TokenUsage[]>([])
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
})

// 筛选条件
const modelList = ref<AIModelConfig[]>([])
const filterModelId = ref<string>('')
const filterStartDate = ref<string>('')
const filterEndDate = ref<string>('')
const showFilter = ref(false)

// 是否有筛选条件
const hasFilter = computed(() => {
  return filterModelId.value || filterStartDate.value || filterEndDate.value
})

// 加载模型列表
const loadModelList = async () => {
  try {
    const res = await getEnabledModels()
    modelList.value = res.data || []
  } catch (error) {
    console.error('加载模型列表失败:', error)
  }
}

// 加载概览数据
const loadOverview = async () => {
  try {
    const res = await getOverview()
    overview.value = res.data
  } catch (error) {
    console.error('加载概览失败:', error)
  }
}

// 加载趋势数据
const loadTrend = async () => {
  try {
    const res = await getTrend(trendDays.value)
    trendData.value = res.data || []
  } catch (error) {
    console.error('加载趋势失败:', error)
  }
}

// 加载分模型统计
const loadModelStats = async () => {
  try {
    const res = await getByModel()
    modelStats.value = res.data || []
  } catch (error) {
    console.error('加载模型统计失败:', error)
  }
}

// 加载消耗明细
const loadUsageList = async () => {
  loading.value = true
  try {
    const params: QueryTokenUsageDto = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    }
    if (filterModelId.value) {
      params.modelId = filterModelId.value
    }
    if (filterStartDate.value) {
      params.startDate = filterStartDate.value
    }
    if (filterEndDate.value) {
      params.endDate = filterEndDate.value
    }
    const res = await getUsageList(params)
    usageList.value = res.data?.list || []
    pagination.value.total = res.data?.total || 0
  } catch (error) {
    console.error('加载明细失败:', error)
  } finally {
    loading.value = false
  }
}

// 应用筛选
const applyFilter = () => {
  pagination.value.page = 1
  loadUsageList()
}

// 清除筛选
const clearFilter = () => {
  filterModelId.value = ''
  filterStartDate.value = ''
  filterEndDate.value = ''
  pagination.value.page = 1
  loadUsageList()
}

// 分页
const handlePageChange = (page: number) => {
  pagination.value.page = page
  loadUsageList()
}

// 格式化数字
const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K'
  }
  return num.toFixed(2)
}

// 格式化金额
const formatCost = (cost: number) => {
  return '¥' + cost.toFixed(4)
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 格式化短日期
const formatShortDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 计算趋势图最大值
const maxTokens = computed(() => {
  if (!trendData.value.length) return 1
  const max = Math.max(...trendData.value.map(d => d.tokens))
  return max || 1
})

// 切换趋势天数
const changeTrendDays = (days: number) => {
  trendDays.value = days
  loadTrend()
}

onMounted(() => {
  loadModelList()
  loadOverview()
  loadTrend()
  loadModelStats()
  loadUsageList()
})
</script>

<template>
  <div class="space-y-6 animate-fadeIn">
    <!-- 概览卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">总消耗Token</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">
              {{ formatNumber(overview?.totalTokens || 0) }}
            </p>
          </div>
          <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Zap class="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">总费用</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">
              {{ formatCost(overview?.totalCost || 0) }}
            </p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <DollarSign class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">今日消耗</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">
              {{ formatNumber(overview?.todayTokens || 0) }}
            </p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Calendar class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">会话次数</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">
              {{ overview?.sessionCount || 0 }}
            </p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <TrendingUp class="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- 趋势图和模型统计 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Token消耗趋势 -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-800">Token消耗趋势</h3>
          <div class="flex items-center gap-2">
            <button
              v-for="days in [7, 14, 30]"
              :key="days"
              class="px-3 py-1 text-sm rounded-lg transition-colors"
              :class="trendDays === days ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="changeTrendDays(days)"
            >
              {{ days }}天
            </button>
          </div>
        </div>
        <div v-if="trendData.length === 0" class="h-64 flex items-center justify-center text-gray-400">
          暂无数据
        </div>
        <div v-else class="h-64 flex items-end gap-2 pt-8 relative">
          <!-- 悬浮提示框 -->
          <div
            v-if="hoveredBar !== null"
            class="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10"
          >
            {{ formatShortDate(trendData[hoveredBar].date) }}: {{ formatNumber(trendData[hoveredBar].tokens) }} tokens
          </div>
          <div
            v-for="(item, index) in trendData"
            :key="index"
            class="flex-1 flex flex-col items-center group cursor-pointer h-full justify-end"
            @mouseenter="hoveredBar = index"
            @mouseleave="hoveredBar = null"
          >
            <div
              class="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t transition-all duration-300 ease-out hover:from-primary hover:to-primary/80 shadow-sm hover:shadow-md"
              :style="{ flex: `${Math.max(item.tokens / maxTokens, 0.1)} 0 auto` }"
            ></div>
            <span class="text-xs text-gray-400 mt-1 truncate w-full text-center group-hover:text-gray-600 transition-colors">
              {{ formatShortDate(item.date) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 分模型统计 -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h3 class="font-semibold text-gray-800 mb-4">分模型统计</h3>
        <div v-if="modelStats.length === 0" class="h-48 flex items-center justify-center text-gray-400">
          暂无数据
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="(stat, index) in modelStats"
            :key="stat.modelId"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }"
              ></div>
              <span class="text-sm text-gray-800">{{ stat.modelName }}</span>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-gray-800">{{ formatNumber(stat.totalTokens) }}</p>
              <p class="text-xs text-gray-500">{{ formatCost(stat.totalCost) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 消耗明细 -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 class="font-semibold text-gray-800">消耗明细</h3>
        <button
          class="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          @click="showFilter = !showFilter"
        >
          <Filter class="w-4 h-4" />
          筛选
          <span v-if="hasFilter" class="w-2 h-2 bg-primary rounded-full"></span>
        </button>
      </div>
      <!-- 筛选区域 -->
      <div v-if="showFilter" class="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div class="flex flex-wrap items-end gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">模型</label>
            <select
              v-model="filterModelId"
              class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">全部模型</option>
              <option v-for="model in modelList" :key="model.modelId" :value="model.modelId">
                {{ model.modelName }}
              </option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">开始日期</label>
            <input
              v-model="filterStartDate"
              type="date"
              class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-500">结束日期</label>
            <input
              v-model="filterEndDate"
              type="date"
              class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              @click="applyFilter"
            >
              应用
            </button>
            <button
              v-if="hasFilter"
              class="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              @click="clearFilter"
            >
              <X class="w-4 h-4" />
              清除
            </button>
          </div>
        </div>
      </div>
      <div v-if="loading" class="p-8 text-center text-gray-500">
        加载中...
      </div>
      <div v-else-if="usageList.length === 0" class="p-8 text-center text-gray-400">
        暂无消耗记录
      </div>
      <table v-else class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-500">时间</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-500">模型</th>
            <th class="text-right px-6 py-3 text-sm font-medium text-gray-500">输入Token</th>
            <th class="text-right px-6 py-3 text-sm font-medium text-gray-500">输出Token</th>
            <th class="text-right px-6 py-3 text-sm font-medium text-gray-500">总Token</th>
            <th class="text-right px-6 py-3 text-sm font-medium text-gray-500">预估费用</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in usageList" :key="item.usageId" class="hover:bg-gray-50">
            <td class="px-6 py-3 text-sm text-gray-500">{{ formatDate(item.createdAt) }}</td>
            <td class="px-6 py-3 text-sm text-gray-800">{{ item.model?.modelName || item.modelId }}</td>
            <td class="px-6 py-3 text-sm text-gray-800 text-right">{{ item.inputTokens.toLocaleString() }}</td>
            <td class="px-6 py-3 text-sm text-gray-800 text-right">{{ item.outputTokens.toLocaleString() }}</td>
            <td class="px-6 py-3 text-sm text-gray-800 text-right font-medium">{{ item.totalTokens.toLocaleString() }}</td>
            <td class="px-6 py-3 text-sm text-gray-800 text-right">{{ formatCost(item.estimatedCost) }}</td>
          </tr>
        </tbody>
      </table>
      <!-- 分页 -->
      <div v-if="pagination.total > 0" class="flex items-center justify-between px-6 py-3 border-t border-gray-100">
        <div class="text-sm text-gray-500">
          共 {{ pagination.total }} 条记录
        </div>
        <div class="flex items-center gap-2">
          <button
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            :disabled="pagination.page <= 1"
            @click="handlePageChange(pagination.page - 1)"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="text-sm text-gray-600">
            {{ pagination.page }} / {{ Math.ceil(pagination.total / pagination.pageSize) }}
          </span>
          <button
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            :disabled="pagination.page >= Math.ceil(pagination.total / pagination.pageSize)"
            @click="handlePageChange(pagination.page + 1)"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 覆盖 Tailwind 硬编码颜色 */
:deep(.text-gray-800) {
  color: var(--color-text-primary);
}
:deep(.text-gray-700) {
  color: var(--color-text-primary);
}
:deep(.text-gray-600) {
  color: var(--color-text-secondary);
}
:deep(.text-gray-500) {
  color: var(--color-text-secondary);
}
:deep(.text-gray-400) {
  color: var(--color-text-tertiary, #9ca3af);
}

/* 背景色 */
:deep(.bg-white) {
  background-color: var(--color-bg-container);
}
:deep(.bg-gray-50) {
  background-color: var(--color-bg-layout);
}
:deep(.bg-gray-100) {
  background-color: var(--color-bg-active);
}

/* 边框 */
:deep(.border-gray-100) {
  border-color: var(--color-border);
}
:deep(.border-gray-200) {
  border-color: var(--color-border);
}

/* 输入框 */
:deep(input[type="date"]),
:deep(select) {
  background-color: var(--color-bg-layout);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

/* 悬停状态 */
:deep(.hover\:bg-gray-50:hover) {
  background-color: var(--color-bg-active);
}
:deep(.hover\:bg-gray-100:hover) {
  background-color: var(--color-bg-active);
}
:deep(.hover\:bg-gray-200:hover) {
  background-color: var(--color-bg-active);
}
:deep(.hover\:text-gray-800:hover) {
  color: var(--color-text-primary);
}
:deep(.hover\:text-gray-600:hover) {
  color: var(--color-text-primary);
}
</style>


