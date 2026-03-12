/**
 * 数据可视化页面
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { BarChart3, PieChart, LineChart, Network, Map, RefreshCw } from 'lucide-vue-next'
import { getTableList, getTableFields } from '@/api/table-meta'
import { getDataList } from '@/api/dynamic-data'
import type { TableDefinition, FieldDefinition } from '@/types'

// 图表类型
const chartTypes = [
  { key: 'bar', title: '柱状图', icon: BarChart3 },
  { key: 'pie', title: '饼图', icon: PieChart },
  { key: 'line', title: '折线图', icon: LineChart },
]

const selectedChartType = ref('bar')
const tableList = ref<TableDefinition[]>([])
const selectedTable = ref('')
const tableFields = ref<FieldDefinition[]>([])
const tableData = ref<any[]>([])

// 图表配置
const chartConfig = ref({
  xAxis: '',
  yAxis: '',
  groupBy: '',
})

// 加载状态
const loading = ref(false)

// 加载数据表列表
const loadTableList = async () => {
  try {
    const res = await getTableList()
    tableList.value = res.data || []
  } catch (error) {
    console.error('加载数据表列表失败:', error)
  }
}

// 加载表字段
const loadTableFields = async (tableId: string) => {
  try {
    const res = await getTableFields(tableId)
    tableFields.value = res.data || []
  } catch (error) {
    console.error('加载字段失败:', error)
  }
}

// 加载表数据
const loadTableData = async (tableId: string) => {
  loading.value = true
  try {
    const res = await getDataList(tableId, { pageSize: 1000 })
    tableData.value = res.data?.list || []
  } catch (error) {
    console.error('加载数据失败:', error)
    tableData.value = []
  } finally {
    loading.value = false
  }
}

// 监听表选择变化
watch(selectedTable, async (val) => {
  if (val) {
    await loadTableFields(val)
    await loadTableData(val)
    // 自动选择字段
    const numericFields = tableFields.value.filter(f => f.fieldType === 'number')
    const textFields = tableFields.value.filter(f => ['text', 'select'].includes(f.fieldType))
    if (textFields.length > 0) {
      chartConfig.value.xAxis = textFields[0].fieldName
    }
    if (numericFields.length > 0) {
      chartConfig.value.yAxis = numericFields[0].fieldName
    }
  } else {
    tableFields.value = []
    tableData.value = []
  }
})

// 可作为X轴的字段（文本、单选）
const xAxisFields = computed(() => {
  return tableFields.value.filter(f => ['text', 'select', 'number', 'date'].includes(f.fieldType))
})

// 可作为Y轴的字段（数字）
const yAxisFields = computed(() => {
  return tableFields.value.filter(f => f.fieldType === 'number')
})

// 生成图表数据
const chartData = computed(() => {
  if (!chartConfig.value.xAxis || !chartConfig.value.yAxis || tableData.value.length === 0) {
    return { labels: [], values: [] }
  }

  // 分组统计
  const grouped = new Map<string, number>()
  tableData.value.forEach(item => {
    const key = item[chartConfig.value.xAxis] || '未知'
    const value = Number(item[chartConfig.value.yAxis]) || 0
    grouped.set(key, (grouped.get(key) || 0) + value)
  })

  return {
    labels: Array.from(grouped.keys()).slice(0, 20),
    values: Array.from(grouped.values()).slice(0, 20),
  }
})

// 计算图表最大值
const maxValue = computed(() => {
  if (chartData.value.values.length === 0) return 100
  return Math.max(...chartData.value.values) * 1.1
})

// 饼图颜色
const pieColors = computed(() => {
  const colors = []
  for (let i = 0; i < chartData.value.labels.length; i++) {
    colors.push(`hsl(${(i * 360 / chartData.value.labels.length)}, 70%, 50%)`)
  }
  return colors
})

// 刷新数据
const refreshData = async () => {
  if (selectedTable.value) {
    await loadTableData(selectedTable.value)
  }
}

onMounted(() => {
  loadTableList()
})
</script>

<template>
  <div class="space-y-6 animate-fadeIn">
    <!-- 操作栏 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-800">数据可视化</h2>
        <p class="text-sm text-gray-500 mt-1">选择数据表和图表类型进行可视化展示</p>
      </div>
      <button
        v-if="selectedTable"
        class="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        :disabled="loading"
        @click="refreshData"
      >
        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        <span>刷新</span>
      </button>
    </div>

    <!-- 配置区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 左侧配置面板 -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h3 class="text-sm font-medium text-gray-800 mb-4">图表配置</h3>
        
        <!-- 数据表选择 -->
        <div class="mb-4">
          <label class="block text-sm text-gray-600 mb-2">选择数据表</label>
          <select
            v-model="selectedTable"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">请选择数据表</option>
            <option v-for="table in tableList" :key="table.tableId" :value="table.tableId">
              {{ table.displayName }}
            </option>
          </select>
        </div>

        <!-- 图表类型选择 -->
        <div class="mb-4">
          <label class="block text-sm text-gray-600 mb-2">图表类型</label>
          <div class="grid grid-cols-3 gap-2">
            <div
              v-for="type in chartTypes"
              :key="type.key"
              class="flex flex-col items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors"
              :class="
                selectedChartType === type.key
                  ? 'bg-primary/10 border border-primary'
                  : 'bg-gray-50 border border-transparent hover:bg-gray-100'
              "
              @click="selectedChartType = type.key"
            >
              <component :is="type.icon" class="w-5 h-5" :class="selectedChartType === type.key ? 'text-primary' : 'text-gray-500'" />
              <span class="text-xs" :class="selectedChartType === type.key ? 'text-primary' : 'text-gray-600'">
                {{ type.title }}
              </span>
            </div>
          </div>
        </div>

        <!-- 字段选择 -->
        <div v-if="selectedTable && tableFields.length > 0" class="space-y-4">
          <div>
            <label class="block text-sm text-gray-600 mb-2">X轴字段 (分类)</label>
            <select
              v-model="chartConfig.xAxis"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">请选择</option>
              <option v-for="field in xAxisFields" :key="field.fieldId" :value="field.fieldName">
                {{ field.displayName }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-2">Y轴字段 (数值)</label>
            <select
              v-model="chartConfig.yAxis"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">请选择</option>
              <option v-for="field in yAxisFields" :key="field.fieldId" :value="field.fieldName">
                {{ field.displayName }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- 右侧图表展示区域 -->
      <div class="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
        <h3 class="text-sm font-medium text-gray-800 mb-4">图表预览</h3>
        
        <!-- 无数据提示 -->
        <div v-if="!selectedTable || tableData.length === 0" class="h-96 flex items-center justify-center text-gray-400">
          <div class="text-center">
            <BarChart3 class="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p v-if="!selectedTable">请选择数据表</p>
            <p v-else>该数据表暂无数据</p>
          </div>
        </div>

        <!-- 柱状图 -->
        <div v-else-if="selectedChartType === 'bar'" class="h-96">
          <div v-if="chartData.labels.length === 0" class="h-full flex items-center justify-center text-gray-400">
            请选择X轴和Y轴字段
          </div>
          <div v-else class="h-full flex items-end gap-2 px-4">
            <div
              v-for="(label, index) in chartData.labels"
              :key="index"
              class="flex-1 flex flex-col items-center"
            >
              <div
                class="w-full bg-primary rounded-t transition-all hover:bg-primary-dark cursor-pointer relative group"
                :style="{ height: `${(chartData.values[index] / maxValue) * 100}%`, minHeight: '8px' }"
              >
                <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {{ chartData.values[index].toLocaleString() }}
                </div>
              </div>
              <span class="text-xs text-gray-500 mt-2 truncate w-full text-center" :title="label">
                {{ label }}
              </span>
            </div>
          </div>
        </div>

        <!-- 饼图 -->
        <div v-else-if="selectedChartType === 'pie'" class="h-96">
          <div v-if="chartData.labels.length === 0" class="h-full flex items-center justify-center text-gray-400">
            请选择X轴和Y轴字段
          </div>
          <div v-else class="h-full flex items-center justify-center gap-8">
            <div class="relative w-64 h-64">
              <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                <circle
                  v-for="(_, index) in chartData.labels"
                  :key="index"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  :stroke="pieColors[index]"
                  stroke-width="20"
                  :stroke-dasharray="`${(chartData.values[index] / chartData.values.reduce((a, b) => a + b, 0)) * 251.2} 251.2`"
                  :stroke-dashoffset="-chartData.values.slice(0, index).reduce((a, b) => a + b, 0) / chartData.values.reduce((a, b) => a + b, 0) * 251.2"
                  class="transition-all duration-300"
                />
              </svg>
            </div>
            <div class="flex flex-col gap-2">
              <div
                v-for="(label, index) in chartData.labels"
                :key="index"
                class="flex items-center gap-2"
              >
                <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: pieColors[index] }"></div>
                <span class="text-sm text-gray-600 truncate max-w-32" :title="label">{{ label }}</span>
                <span class="text-xs text-gray-400">{{ chartData.values[index].toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 折线图 -->
        <div v-else-if="selectedChartType === 'line'" class="h-96">
          <div v-if="chartData.labels.length === 0" class="h-full flex items-center justify-center text-gray-400">
            请选择X轴和Y轴字段
          </div>
          <div v-else class="h-full flex flex-col">
            <svg class="w-full flex-1" viewBox="0 0 400 200">
              <!-- 网格线 -->
              <line x1="40" y1="10" x2="40" y2="190" stroke="#e5e7eb" stroke-width="1" />
              <line x1="40" y1="190" x2="390" y2="190" stroke="#e5e7eb" stroke-width="1" />
              <line x1="40" y1="100" x2="390" y2="100" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4" />
              
              <!-- 折线 -->
              <polyline
                :points="chartData.values.map((v, i) => `${50 + i * (340 / (chartData.values.length - 1 || 1))},${180 - (v / maxValue) * 160}`).join(' ')"
                fill="none"
                stroke="hsl(var(--primary))"
                stroke-width="2"
              />
              
              <!-- 数据点 -->
              <circle
                v-for="(v, i) in chartData.values"
                :key="i"
                :cx="50 + i * (340 / (chartData.values.length - 1 || 1))"
                :cy="180 - (v / maxValue) * 160"
                r="4"
                fill="hsl(var(--primary))"
              />
            </svg>
            <div class="flex justify-around px-10">
              <span
                v-for="(label, index) in chartData.labels"
                :key="index"
                class="text-xs text-gray-500 truncate max-w-16 text-center"
                :title="label"
              >
                {{ label }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据预览 -->
    <div v-if="selectedTable && tableData.length > 0" class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h3 class="font-semibold text-gray-800">数据预览</h3>
        <p class="text-sm text-gray-500 mt-1">共 {{ tableData.length }} 条数据</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th
                v-for="field in tableFields.slice(0, 6)"
                :key="field.fieldId"
                class="text-left px-4 py-3 text-sm font-medium text-gray-500"
              >
                {{ field.displayName }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(row, index) in tableData.slice(0, 10)" :key="index" class="hover:bg-gray-50">
              <td
                v-for="field in tableFields.slice(0, 6)"
                :key="field.fieldId"
                class="px-4 py-3 text-sm text-gray-800"
              >
                {{ row[field.fieldName] ?? '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
