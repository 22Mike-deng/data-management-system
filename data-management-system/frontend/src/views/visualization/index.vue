/**
* 数据可视化页面
* 创建者：dzh
* 创建时间：2026-03-11
* 更新时间：2026-03-12
*/
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { BarChart3, PieChart, LineChart, RefreshCw, Plus, Save, Trash2, Star, Bookmark, X } from 'lucide-vue-next'
import { getTableList, getTableFields } from '@/api/table-meta'
import { getDataList } from '@/api/dynamic-data'
import { getViewsByTable, createView, updateView, deleteView, setDefaultView, getDefaultView } from '@/api/view-config'
import type { TableDefinition, FieldDefinition } from '@/types'
import type { FilterCondition } from '@/api/dynamic-data'
import type { ViewConfig } from '@/api/view-config'
import Modal from '@/components/Modal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

// 图表类型
const chartTypes = [
  { key: 'bar', title: '柱状图', icon: BarChart3 },
  { key: 'pie', title: '饼图', icon: PieChart },
  { key: 'line', title: '折线图', icon: LineChart },
]

// 时间范围选项
const timeRangeOptions = [
  { value: '7d', label: '近7日' },
  { value: '30d', label: '近30日' },
  { value: '90d', label: '近三个月' },
  { value: '365d', label: '近一年' },
  { value: '1825d', label: '近五年' },
  { value: 'all', label: '全部时间' },
]

// 分组方式选项
const groupByOptions = [
  { value: 'day', label: '按日' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' },
  { value: 'year', label: '按年' },
]

// 筛选操作符
const filterOperators = [
  { value: 'eq', label: '等于' },
  { value: 'ne', label: '不等于' },
  { value: 'gt', label: '大于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lt', label: '小于' },
  { value: 'lte', label: '小于等于' },
  { value: 'like', label: '包含' },
  { value: 'in', label: '在列表中' },
]

const selectedChartType = ref('bar')
const tableList = ref<TableDefinition[]>([])
const selectedTable = ref('')
const tableFields = ref<FieldDefinition[]>([])
const tableData = ref<any[]>([])

// 图表配置
const chartConfig = ref({
  dateField: '',      // 日期字段
  timeRange: '30d',   // 时间范围
  groupBy: 'day',     // 分组方式
  yAxis: '',          // Y轴数值字段
  categoryField: '',  // 分类字段（可选，用于分组对比）
})

// 筛选条件
const filters = ref<FilterCondition[]>([])

// 视图列表
const viewList = ref<ViewConfig[]>([])
const selectedView = ref<ViewConfig | null>(null)

// 保存视图弹窗
const showSaveModal = ref(false)
const saveViewName = ref('')
const saveAsDefault = ref(false)
const saveLoading = ref(false)

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<ViewConfig | null>(null)
const deleteLoading = ref(false)

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

// 计算时间范围起始日期
const getStartDate = (range: string): Date | null => {
  if (range === 'all') return null
  const days = parseInt(range)
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

// 验证字段是否存在
const validateFieldName = (fieldName: string, fieldList: FieldDefinition[]): boolean => {
  // 系统字段特殊处理
  if (fieldName === 'created_at' || fieldName === 'updated_at') {
    return true
  }
  return fieldList.some(f => f.fieldName === fieldName)
}

// 加载表数据
const loadTableData = async (tableId: string) => {
  loading.value = true
  try {
    // 验证日期字段是否存在
    if (chartConfig.value.dateField && !validateFieldName(chartConfig.value.dateField, tableFields.value)) {
      console.warn(`日期字段 "${chartConfig.value.dateField}" 不存在，已重置`)
      chartConfig.value.dateField = ''
      tableData.value = []
      return
    }
    
    // 验证Y轴字段是否存在
    if (chartConfig.value.yAxis && !validateFieldName(chartConfig.value.yAxis, tableFields.value)) {
      console.warn(`数值字段 "${chartConfig.value.yAxis}" 不存在，已重置`)
      chartConfig.value.yAxis = ''
      tableData.value = []
      return
    }
    
    // 构建筛选条件
    const allFilters: FilterCondition[] = []
    
    // 添加时间范围筛选（仅对非系统字段使用筛选条件）
    if (chartConfig.value.dateField && chartConfig.value.timeRange !== 'all') {
      const startDate = getStartDate(chartConfig.value.timeRange)
      if (startDate) {
        allFilters.push({
          field: chartConfig.value.dateField,
          operator: 'gte',
          value: startDate.toISOString()
        })
      }
    }
    
    // 添加用户定义的筛选条件（验证字段是否存在）
    for (const filter of filters.value) {
      if (validateFieldName(filter.field, tableFields.value)) {
        allFilters.push(filter)
      } else {
        console.warn(`筛选字段 "${filter.field}" 不存在，已跳过`)
      }
    }
    
    const res = await getDataList(tableId, { 
      pageSize: 5000,
      filters: allFilters.length > 0 ? allFilters : undefined
    })
    tableData.value = res.data?.list || []
  } catch (error) {
    console.error('加载数据失败:', error)
    tableData.value = []
  } finally {
    loading.value = false
  }
}

// 加载视图列表
const loadViewList = async (tableId: string) => {
  try {
    const res = await getViewsByTable(tableId)
    viewList.value = res.data || []
  } catch (error) {
    console.error('加载视图列表失败:', error)
    viewList.value = []
  }
}

// 加载默认视图
const loadDefaultView = async (tableId: string) => {
  try {
    const res = await getDefaultView(tableId)
    if (res.data) {
      applyView(res.data)
    }
  } catch (error) {
    console.error('加载默认视图失败:', error)
  }
}

// 应用视图配置
const applyView = (view: ViewConfig) => {
  selectedView.value = view
  selectedChartType.value = view.chartType
  
  // 从视图配置中恢复设置
  if (view.xAxis) {
    // xAxis 格式: "dateField|timeRange|groupBy"
    const [dateField, timeRange, groupBy] = view.xAxis.split('|')
    
    // 验证日期字段是否存在
    if (validateFieldName(dateField, tableFields.value)) {
      chartConfig.value.dateField = dateField || ''
    } else {
      console.warn(`视图配置中的日期字段 "${dateField}" 已不存在`)
      chartConfig.value.dateField = ''
    }
    chartConfig.value.timeRange = timeRange || '30d'
    chartConfig.value.groupBy = groupBy || 'day'
  }
  
  // 验证Y轴字段是否存在
  if (view.yAxis && validateFieldName(view.yAxis, tableFields.value)) {
    chartConfig.value.yAxis = view.yAxis
  } else if (view.yAxis) {
    console.warn(`视图配置中的数值字段 "${view.yAxis}" 已不存在`)
    chartConfig.value.yAxis = ''
  } else {
    chartConfig.value.yAxis = ''
  }
  
  // 过滤有效的筛选条件
  if (view.filters && view.filters.length > 0) {
    filters.value = view.filters.filter(f => validateFieldName(f.field, tableFields.value))
    if (filters.value.length < view.filters.length) {
      console.warn('部分筛选条件字段已不存在，已自动移除')
    }
  } else {
    filters.value = []
  }
}

// 监听表选择变化
watch(selectedTable, async (val) => {
  if (val) {
    // 重置配置
    chartConfig.value.dateField = ''
    chartConfig.value.yAxis = ''
    tableData.value = []
    
    await loadTableFields(val)
    await loadViewList(val)
    
    // 尝试加载默认视图
    await loadDefaultView(val)
    
    // 如果没有默认视图，自动选择字段并加载数据
    if (!selectedView.value) {
      autoSelectFields()
    }
    
    // 确保有配置后才加载数据
    if (chartConfig.value.dateField && chartConfig.value.yAxis) {
      await loadTableData(val)
    }
  } else {
    tableFields.value = []
    tableData.value = []
    viewList.value = []
    selectedView.value = null
    filters.value = []
    chartConfig.value.dateField = ''
    chartConfig.value.yAxis = ''
  }
})

// 自动选择字段
const autoSelectFields = () => {
  // 优先选择用户定义的日期字段，否则选择创建时间
  const userDateFields = tableFields.value.filter(f => ['date', 'datetime'].includes(f.fieldType))
  if (userDateFields.length > 0) {
    chartConfig.value.dateField = userDateFields[0].fieldName
  } else {
    // 默认使用创建时间
    chartConfig.value.dateField = 'created_at'
  }
  
  // 选择数值字段
  const numericFields = tableFields.value.filter(f => ['int', 'bigint', 'float', 'double', 'decimal'].includes(f.fieldType))
  if (numericFields.length > 0) {
    chartConfig.value.yAxis = numericFields[0].fieldName
  }
}

// 日期字段（包含系统字段）
const dateFields = computed(() => {
  const fields = tableFields.value.filter(f => ['date', 'datetime'].includes(f.fieldType))
  // 添加系统日期字段（确保类型兼容）
  const sysFields: FieldDefinition[] = [
    { fieldId: 'sys_created_at', tableId: '', fieldName: 'created_at', displayName: '创建时间', fieldType: 'datetime', required: false, sortOrder: 0, createdAt: '' },
    { fieldId: 'sys_updated_at', tableId: '', fieldName: 'updated_at', displayName: '更新时间', fieldType: 'datetime', required: false, sortOrder: 0, createdAt: '' },
  ]
  return [...fields, ...sysFields]
})

// 可作为Y轴的字段（数字类型，用于统计数值）
const yAxisFields = computed(() => {
  return tableFields.value.filter(f => ['int', 'bigint', 'float', 'double', 'decimal'].includes(f.fieldType))
})

// 可用于筛选的字段
const filterableFields = computed(() => {
  return tableFields.value.filter(f => !['image', 'file', 'richtext', 'json'].includes(f.fieldType))
})

// 格式化显示值
const formatDisplayValue = (value: any, fieldType: string): string => {
  if (value === null || value === undefined || value === '') return '-'
  
  switch (fieldType) {
    case 'date':
      // 只显示日期部分
      const dateVal = new Date(value)
      if (isNaN(dateVal.getTime())) return String(value)
      return `${dateVal.getFullYear()}-${String(dateVal.getMonth() + 1).padStart(2, '0')}-${String(dateVal.getDate()).padStart(2, '0')}`
    case 'datetime':
      // 显示日期时间
      const datetimeVal = new Date(value)
      if (isNaN(datetimeVal.getTime())) return String(value)
      return `${datetimeVal.getFullYear()}-${String(datetimeVal.getMonth() + 1).padStart(2, '0')}-${String(datetimeVal.getDate()).padStart(2, '0')} ${String(datetimeVal.getHours()).padStart(2, '0')}:${String(datetimeVal.getMinutes()).padStart(2, '0')}`
    case 'boolean':
      return value ? '是' : '否'
    case 'json':
    case 'multiselect':
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value
        if (Array.isArray(parsed)) return parsed.join(', ')
        return JSON.stringify(parsed)
      } catch {
        return String(value)
      }
    default:
      return String(value)
  }
}

// 格式化日期分组
const formatDateGroup = (date: Date, groupBy: string): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  switch (groupBy) {
    case 'day':
      return `${year}-${month}-${day}`
    case 'week':
      const weekNum = Math.ceil((date.getDate()) / 7)
      return `${year}-${month}第${weekNum}周`
    case 'month':
      return `${year}-${month}`
    case 'year':
      return `${year}年`
    default:
      return `${year}-${month}-${day}`
  }
}

// 获取日期分组键
const getDateGroupKey = (dateValue: any, groupBy: string): string => {
  if (!dateValue) return '未知'
  const date = new Date(dateValue)
  if (isNaN(date.getTime())) return '未知'
  return formatDateGroup(date, groupBy)
}

// 生成图表数据
const chartData = computed(() => {
  if (!chartConfig.value.dateField || !chartConfig.value.yAxis || tableData.value.length === 0) {
    return { labels: [], values: [] }
  }

  // 按时间分组统计
  const grouped = new Map<string, number>()
  
  // 按日期排序的数据
  const sortedData = [...tableData.value].sort((a, b) => {
    const dateA = new Date(a[chartConfig.value.dateField])
    const dateB = new Date(b[chartConfig.value.dateField])
    return dateA.getTime() - dateB.getTime()
  })
  
  sortedData.forEach(item => {
    const key = getDateGroupKey(item[chartConfig.value.dateField], chartConfig.value.groupBy)
    const value = Number(item[chartConfig.value.yAxis]) || 0
    grouped.set(key, (grouped.get(key) || 0) + value)
  })

  // 转换为数组并排序
  const entries = Array.from(grouped.entries())
  
  return {
    labels: entries.map(e => e[0]),
    values: entries.map(e => e[1]),
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

// 添加筛选条件
const addFilter = () => {
  const firstField = filterableFields.value[0]
  if (firstField) {
    filters.value.push({
      field: firstField.fieldName,
      operator: 'eq',
      value: ''
    })
  }
}

// 删除筛选条件
const removeFilter = (index: number) => {
  filters.value.splice(index, 1)
}

// 应用筛选条件
const applyFilters = async () => {
  if (selectedTable.value) {
    await loadTableData(selectedTable.value)
  }
}

// 清空筛选条件
const clearFilters = () => {
  filters.value = []
}

// 打开保存视图弹窗
const openSaveModal = () => {
  if (selectedView.value) {
    saveViewName.value = selectedView.value.viewName
    saveAsDefault.value = selectedView.value.isDefault
  } else {
    saveViewName.value = ''
    saveAsDefault.value = false
  }
  showSaveModal.value = true
}

// 保存视图
const handleSaveView = async () => {
  if (!saveViewName.value.trim()) {
    alert('请输入视图名称')
    return
  }
  saveLoading.value = true
  try {
    // xAxis 格式: "dateField|timeRange|groupBy"
    const xAxisValue = `${chartConfig.value.dateField}|${chartConfig.value.timeRange}|${chartConfig.value.groupBy}`
    
    const data = {
      viewName: saveViewName.value.trim(),
      tableId: selectedTable.value,
      chartType: selectedChartType.value,
      xAxis: xAxisValue,
      yAxis: chartConfig.value.yAxis,
      filters: filters.value.length > 0 ? filters.value : [],
      isDefault: saveAsDefault.value
    }
    
    if (selectedView.value) {
      await updateView(selectedView.value.viewId, data)
    } else {
      const res = await createView(data)
      selectedView.value = res.data
    }
    
    await loadViewList(selectedTable.value)
    showSaveModal.value = false
  } catch (error) {
    console.error('保存视图失败:', error)
    alert('保存失败，请重试')
  } finally {
    saveLoading.value = false
  }
}

// 选择视图
const handleSelectView = (view: ViewConfig) => {
  applyView(view)
  loadTableData(selectedTable.value)
}

// 设置默认视图
const handleSetDefault = async (view: ViewConfig) => {
  try {
    await setDefaultView(view.viewId)
    viewList.value.forEach(v => v.isDefault = false)
    view.isDefault = true
  } catch (error) {
    console.error('设置默认视图失败:', error)
  }
}

// 删除视图
const handleDeleteView = (view: ViewConfig) => {
  deleteTarget.value = view
  showDeleteConfirm.value = true
}

const confirmDeleteView = async () => {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await deleteView(deleteTarget.value.viewId)
    viewList.value = viewList.value.filter(v => v.viewId !== deleteTarget.value!.viewId)
    if (selectedView.value?.viewId === deleteTarget.value.viewId) {
      selectedView.value = null
    }
    showDeleteConfirm.value = false
  } catch (error) {
    console.error('删除视图失败:', error)
    alert('删除失败，请重试')
  } finally {
    deleteLoading.value = false
  }
}

// 防抖加载标志
let loadDebounceTimer: ReturnType<typeof setTimeout> | null = null

// 监听配置变化，防抖加载数据
watch([() => chartConfig.value.dateField, () => chartConfig.value.timeRange, () => chartConfig.value.groupBy, () => chartConfig.value.yAxis], () => {
  // 清除之前的定时器
  if (loadDebounceTimer) {
    clearTimeout(loadDebounceTimer)
  }
  // 防抖加载，确保配置完整
  loadDebounceTimer = setTimeout(() => {
    if (selectedTable.value && chartConfig.value.dateField && chartConfig.value.yAxis) {
      loadTableData(selectedTable.value)
    }
  }, 300)
})

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
      <div class="flex items-center gap-2">
        <button
          v-if="selectedTable"
          class="flex items-center gap-2 px-3 py-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
          @click="openSaveModal"
        >
          <Save class="w-4 h-4" />
          <span>保存视图</span>
        </button>
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
    </div>

    <!-- 配置区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- 左侧配置面板 -->
      <div class="lg:col-span-1 space-y-4">
        <!-- 数据表选择 -->
        <div class="bg-white rounded-xl shadow-sm p-4">
          <h3 class="text-sm font-medium text-gray-800 mb-3">数据源</h3>
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

        <!-- 已保存的视图 -->
        <div v-if="selectedTable && viewList.length > 0" class="bg-white rounded-xl shadow-sm p-4">
          <h3 class="text-sm font-medium text-gray-800 mb-3">已保存视图</h3>
          <div class="space-y-2">
            <div
              v-for="view in viewList"
              :key="view.viewId"
              class="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors"
              :class="selectedView?.viewId === view.viewId ? 'bg-primary/10 border border-primary' : 'bg-gray-50 hover:bg-gray-100'"
              @click="handleSelectView(view)"
            >
              <div class="flex items-center gap-2">
                <Star v-if="view.isDefault" class="w-4 h-4 text-yellow-500" />
                <Bookmark v-else class="w-4 h-4 text-gray-400" />
                <span class="text-sm">{{ view.viewName }}</span>
              </div>
              <div class="flex items-center gap-1">
                <button
                  v-if="!view.isDefault"
                  class="p-1 text-gray-400 hover:text-yellow-500"
                  @click.stop="handleSetDefault(view)"
                  title="设为默认"
                >
                  <Star class="w-3 h-3" />
                </button>
                <button
                  class="p-1 text-gray-400 hover:text-red-500"
                  @click.stop="handleDeleteView(view)"
                  title="删除"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 图表类型选择 -->
        <div v-if="selectedTable" class="bg-white rounded-xl shadow-sm p-4">
          <h3 class="text-sm font-medium text-gray-800 mb-3">图表类型</h3>
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

        <!-- 字段配置 -->
        <div v-if="selectedTable && tableFields.length > 0" class="bg-white rounded-xl shadow-sm p-4">
          <h3 class="text-sm font-medium text-gray-800 mb-3">字段配置</h3>
          <div class="space-y-3">
            <!-- 日期字段 -->
            <div>
              <label class="block text-xs text-gray-500 mb-1">日期字段</label>
              <select
                v-model="chartConfig.dateField"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">请选择日期字段</option>
                <option v-for="field in dateFields" :key="field.fieldId" :value="field.fieldName">
                  {{ field.displayName }}
                </option>
              </select>
            </div>
            
            <!-- 时间范围（X轴） -->
            <div>
              <label class="block text-xs text-gray-500 mb-1">X轴 - 时间范围</label>
              <select
                v-model="chartConfig.timeRange"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option v-for="opt in timeRangeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            
            <!-- 分组方式 -->
            <div>
              <label class="block text-xs text-gray-500 mb-1">分组方式</label>
              <select
                v-model="chartConfig.groupBy"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option v-for="opt in groupByOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            
            <!-- Y轴数值字段 -->
            <div>
              <label class="block text-xs text-gray-500 mb-1">Y轴 - 数值字段</label>
              <select
                v-model="chartConfig.yAxis"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">请选择数值字段</option>
                <option v-for="field in yAxisFields" :key="field.fieldId" :value="field.fieldName">
                  {{ field.displayName }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- 筛选条件 -->
        <div v-if="selectedTable && tableFields.length > 0" class="bg-white rounded-xl shadow-sm p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-gray-800">筛选条件</h3>
            <button
              class="text-xs text-primary hover:text-primary-dark"
              @click="addFilter"
            >
              + 添加条件
            </button>
          </div>
          
          <div v-if="filters.length === 0" class="text-sm text-gray-400 text-center py-2">
            暂无筛选条件
          </div>
          
          <div v-else class="space-y-2">
            <div
              v-for="(filter, index) in filters"
              :key="index"
              class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
            >
              <select
                v-model="filter.field"
                class="flex-1 px-2 py-1 text-xs border border-gray-200 rounded"
              >
                <option v-for="field in filterableFields" :key="field.fieldId" :value="field.fieldName">
                  {{ field.displayName }}
                </option>
              </select>
              <select
                v-model="filter.operator"
                class="w-20 px-2 py-1 text-xs border border-gray-200 rounded"
              >
                <option v-for="op in filterOperators" :key="op.value" :value="op.value">
                  {{ op.label }}
                </option>
              </select>
              <input
                v-model="filter.value"
                type="text"
                placeholder="值"
                class="flex-1 px-2 py-1 text-xs border border-gray-200 rounded"
              />
              <button
                class="p-1 text-gray-400 hover:text-red-500"
                @click="removeFilter(index)"
              >
                <X class="w-3 h-3" />
              </button>
            </div>
            <div class="flex gap-2 pt-2">
              <button
                class="flex-1 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark"
                @click="applyFilters"
              >
                应用筛选
              </button>
              <button
                class="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                @click="clearFilters"
              >
                清空
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧图表展示区域 -->
      <div class="lg:col-span-3 bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-gray-800">图表预览</h3>
          <span v-if="selectedView" class="text-xs text-gray-500">
            当前视图: {{ selectedView.viewName }}
          </span>
        </div>
        
        <!-- 无数据提示 -->
        <div v-if="!selectedTable || tableData.length === 0" class="h-96 flex items-center justify-center text-gray-400">
          <div class="text-center">
            <BarChart3 class="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p v-if="!selectedTable">请选择数据表</p>
            <p v-else-if="!chartConfig.dateField">请选择日期字段</p>
            <p v-else-if="!chartConfig.yAxis">请选择数值字段</p>
            <p v-else>该时间范围内暂无数据</p>
          </div>
        </div>

        <!-- 柱状图 -->
        <div v-else-if="selectedChartType === 'bar'" class="h-96">
          <div v-if="chartData.labels.length === 0" class="h-full flex items-center justify-center text-gray-400">
            请配置日期字段和数值字段
          </div>
          <div v-else class="h-full flex items-end gap-2 px-4 overflow-x-auto">
            <div
              v-for="(label, index) in chartData.labels"
              :key="index"
              class="flex-1 min-w-[40px] flex flex-col items-center"
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
            请配置日期字段和数值字段
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
            <div class="flex flex-col gap-2 max-h-64 overflow-y-auto">
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
            请配置日期字段和数值字段
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
            <div class="flex justify-around px-10 overflow-x-auto">
              <span
                v-for="(label, index) in chartData.labels"
                :key="index"
                class="text-xs text-gray-500 truncate max-w-16 text-center flex-shrink-0"
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
                {{ formatDisplayValue(row[field.fieldName], field.fieldType) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 保存视图弹窗 -->
    <Modal
      v-model:visible="showSaveModal"
      title="保存视图"
      width="400px"
    >
      <div class="p-4 space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-2">视图名称</label>
          <input
            v-model="saveViewName"
            type="text"
            placeholder="请输入视图名称"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="setDefault"
            v-model="saveAsDefault"
            class="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label for="setDefault" class="text-sm text-gray-600">设为默认视图</label>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            @click="showSaveModal = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            :disabled="saveLoading"
            @click="handleSaveView"
          >
            {{ saveLoading ? '保存中...' : '保存' }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- 删除确认 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      type="error"
      title="删除视图"
      :message="`确定要删除视图「${deleteTarget?.viewName}」吗？`"
      confirm-text="删除"
      :loading="deleteLoading"
      @confirm="confirmDeleteView"
    />
  </div>
</template>
