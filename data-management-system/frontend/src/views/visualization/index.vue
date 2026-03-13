/**
 * 数据可视化页面 - 重构版
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-13
 * 
 * 功能特性：
 * 1. 支持单表统计查询
 * 2. 支持父子表（外键关联）联合查询统计
 * 3. 可视化配置，无需编写SQL
 */
<script setup lang="ts">
import { ref, onMounted, watch, computed, reactive } from 'vue'
import { 
  BarChart3, PieChart, LineChart, RefreshCw, Plus, Save, Trash2, 
  Star, Bookmark, X, Table2, Link2, Layers, Calculator, Filter
} from 'lucide-vue-next'
import { getTableList, getTableFields } from '@/api/table-meta'
import { getDataList, aggregateQuery } from '@/api/dynamic-data'
import type { AggregateConfig, GroupByConfig, AggregateQueryDto } from '@/api/dynamic-data'
import { getViewsByTable, createView, updateView, deleteView, setDefaultView, getDefaultView } from '@/api/view-config'
import type { TableDefinition, FieldDefinition, FieldType } from '@/types'
import type { FilterCondition } from '@/api/dynamic-data'
import type { ViewConfig } from '@/api/view-config'
import Modal from '@/components/Modal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

// ==================== 类型定义 ====================

// 关联表配置
interface JoinTable {
  tableId: string
  tableName: string
  displayName: string
  alias: string
  joinType: 'LEFT' | 'INNER'
  localField: string  // 主表关联字段
  foreignField: string // 关联表字段
  fields: FieldDefinition[]
}

// 统计配置
interface StatisticsConfig {
  type: 'COUNT' | 'SUM' | 'AVG' | 'MAX' | 'MIN'
  field: string  // 统计字段（COUNT时可为空）
  fieldTable: string // 字段所属表ID
}

// 分组配置
interface GroupByConfig {
  field: string
  fieldTable: string
  timeGranularity?: 'day' | 'week' | 'month' | 'year' // 时间字段可选粒度
}

// 查询配置
interface QueryConfig {
  mainTable: string
  mainTableFields: FieldDefinition[]
  joinTables: JoinTable[]
  statistics: StatisticsConfig[]
  groupBy: GroupByConfig[]
  filters: FilterCondition[]
  timeRange?: {
    field: string
    fieldTable: string
    range: string
  }
}

// ==================== 基础数据 ====================

const tableList = ref<TableDefinition[]>([])
const loading = ref(false)
const queryConfig = reactive<QueryConfig>({
  mainTable: '',
  mainTableFields: [],
  joinTables: [],
  statistics: [],
  groupBy: [],
  filters: [],
})

// 图表类型
const chartTypes = [
  { key: 'bar', title: '柱状图', icon: BarChart3 },
  { key: 'pie', title: '饼图', icon: PieChart },
  { key: 'line', title: '折线图', icon: LineChart },
  { key: 'table', title: '数据表', icon: Table2 },
]
const selectedChartType = ref('bar')

// 统计类型选项
const statisticsTypes = [
  { value: 'COUNT', label: '计数 COUNT', description: '统计记录数量' },
  { value: 'SUM', label: '求和 SUM', description: '计算字段总和' },
  { value: 'AVG', label: '平均值 AVG', description: '计算字段平均值' },
  { value: 'MAX', label: '最大值 MAX', description: '获取字段最大值' },
  { value: 'MIN', label: '最小值 MIN', description: '获取字段最小值' },
]

// 时间范围选项
const timeRangeOptions = [
  { value: '7d', label: '近7日' },
  { value: '30d', label: '近30日' },
  { value: '90d', label: '近三个月' },
  { value: '365d', label: '近一年' },
  { value: 'all', label: '全部时间' },
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

// 视图相关
const viewList = ref<ViewConfig[]>([])
const selectedView = ref<ViewConfig | null>(null)
const showSaveModal = ref(false)
const saveViewName = ref('')
const saveAsDefault = ref(false)
const saveLoading = ref(false)
const showDeleteConfirm = ref(false)
const deleteTarget = ref<ViewConfig | null>(null)
const deleteLoading = ref(false)

// 统计结果
const statisticsResult = ref<{ labels: string[], values: number[], rawData: any[] }>({
  labels: [],
  values: [],
  rawData: []
})

// ==================== 辅助函数 ====================

// 标准化字段类型
const normalizeFieldType = (fieldType: string): string => {
  if (!fieldType) return 'text'
  const validTypes = ['text', 'varchar', 'int', 'bigint', 'float', 'double', 'decimal', 'boolean', 'date', 'datetime', 'json', 'select', 'multiselect', 'image', 'file', 'richtext', 'relation']
  if (validTypes.includes(fieldType.toLowerCase())) return fieldType.toLowerCase()
  const dbTypeMap: Record<string, string> = {
    'TEXT': 'text', 'VARCHAR': 'varchar', 'INT': 'int', 'BIGINT': 'bigint',
    'FLOAT': 'float', 'DOUBLE': 'double', 'DECIMAL': 'decimal',
    'TINYINT': 'boolean', 'DATE': 'date', 'DATETIME': 'datetime', 'JSON': 'json',
  }
  return dbTypeMap[fieldType.toUpperCase()] || 'text'
}

// 判断是否为数值类型
const isNumericType = (fieldType: string): boolean => {
  const normalized = normalizeFieldType(fieldType)
  return ['int', 'bigint', 'float', 'double', 'decimal'].includes(normalized)
}

// 判断是否为日期类型
const isDateType = (fieldType: string): boolean => {
  const normalized = normalizeFieldType(fieldType)
  return ['date', 'datetime'].includes(normalized)
}

// 判断是否可筛选
const isFilterableType = (fieldType: string): boolean => {
  const normalized = normalizeFieldType(fieldType)
  return !['image', 'file', 'richtext', 'json'].includes(normalized)
}

// 系统字段定义（所有表都有的字段）
const systemFields: FieldDefinition[] = [
  { fieldId: 'sys_created_at', fieldName: 'created_at', displayName: '创建时间', fieldType: 'datetime', required: false, isSystemField: true },
  { fieldId: 'sys_updated_at', fieldName: 'updated_at', displayName: '更新时间', fieldType: 'datetime', required: false, isSystemField: true },
]

// 获取所有表的字段（包含主表、关联表和系统字段）
const allTableFields = computed(() => {
  const fields: { field: FieldDefinition, tableId: string, tableName: string, alias: string }[] = []
  
  // 主表字段
  queryConfig.mainTableFields.forEach(f => {
    fields.push({ field: f, tableId: queryConfig.mainTable, tableName: '', alias: 't0' })
  })
  
  // 主表系统字段
  if (queryConfig.mainTable) {
    systemFields.forEach(f => {
      fields.push({ field: f, tableId: queryConfig.mainTable, tableName: '', alias: 't0' })
    })
  }
  
  // 关联表字段
  queryConfig.joinTables.forEach((jt, index) => {
    jt.fields.forEach(f => {
      fields.push({ field: f, tableId: jt.tableId, tableName: jt.tableName, alias: jt.alias || `t${index + 1}` })
    })
    // 关联表系统字段
    systemFields.forEach(f => {
      fields.push({ field: f, tableId: jt.tableId, tableName: jt.tableName, alias: jt.alias || `t${index + 1}` })
    })
  })
  
  return fields
})

// 获取数值类型字段列表
const numericFields = computed(() => {
  return allTableFields.value.filter(item => isNumericType(item.field.fieldType))
})

// 获取日期类型字段列表
const dateFields = computed(() => {
  return allTableFields.value.filter(item => isDateType(item.field.fieldType))
})

// 获取可筛选字段列表
const filterableFields = computed(() => {
  return allTableFields.value.filter(item => isFilterableType(item.field.fieldType))
})

// ==================== 数据加载 ====================

// 加载表列表
const loadTableList = async () => {
  try {
    const res = await getTableList()
    tableList.value = res.data || []
  } catch (error) {
    console.error('加载表列表失败:', error)
  }
}

// 加载表字段
const loadTableFields = async (tableId: string): Promise<FieldDefinition[]> => {
  try {
    const res = await getTableFields(tableId)
    return res.data || []
  } catch (error) {
    console.error('加载字段失败:', error)
    return []
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

// ==================== 配置操作 ====================

// 选择主表
const handleSelectMainTable = async (tableId: string) => {
  // 重置配置
  queryConfig.mainTable = tableId
  queryConfig.joinTables = []
  queryConfig.statistics = []
  queryConfig.groupBy = []
  queryConfig.filters = []
  statisticsResult.value = { labels: [], values: [], rawData: [] }
  
  if (tableId) {
    // 加载主表字段
    queryConfig.mainTableFields = await loadTableFields(tableId)
    await loadViewList(tableId)
    await loadDefaultView(tableId)
  } else {
    queryConfig.mainTableFields = []
    viewList.value = []
    selectedView.value = null
  }
}

// 添加关联表
const handleAddJoinTable = async () => {
  // 获取可选的关联表（排除已关联的表和主表）
  const availableTables = tableList.value.filter(t => 
    t.tableId !== queryConfig.mainTable && 
    !queryConfig.joinTables.some(jt => jt.tableId === t.tableId)
  )
  
  if (availableTables.length === 0) {
    alert('没有可关联的表')
    return
  }
  
  // 默认选择第一个可用表
  const firstTable = availableTables[0]
  const fields = await loadTableFields(firstTable.tableId)
  
  // 查找主表的外键字段（指向这个表的）
  const foreignKeyField = queryConfig.mainTableFields.find(f => 
    f.isForeignKey && f.foreignKeyTable === firstTable.tableName
  )
  
  // 查找关联表的主键或ID字段
  const targetPrimaryKey = fields.find(f => f.fieldName === 'id') || fields[0]
  
  const joinTable: JoinTable = {
    tableId: firstTable.tableId,
    tableName: firstTable.tableName,
    displayName: firstTable.displayName,
    alias: `t${queryConfig.joinTables.length + 1}`,
    joinType: 'LEFT',
    localField: foreignKeyField?.fieldName || '',
    foreignField: targetPrimaryKey?.fieldName || 'id',
    fields: fields
  }
  
  queryConfig.joinTables.push(joinTable)
}

// 移除关联表
const handleRemoveJoinTable = (index: number) => {
  queryConfig.joinTables.splice(index, 1)
  // 重新分配别名
  queryConfig.joinTables.forEach((jt, i) => {
    jt.alias = `t${i + 1}`
  })
}

// 添加统计项
const handleAddStatistics = () => {
  const firstNumericField = numericFields.value[0]
  queryConfig.statistics.push({
    type: 'COUNT',
    field: '',
    fieldTable: ''
  })
}

// 移除统计项
const handleRemoveStatistics = (index: number) => {
  queryConfig.statistics.splice(index, 1)
}

// 添加分组项
const handleAddGroupBy = () => {
  queryConfig.groupBy.push({
    field: '',
    fieldTable: '',
    timeGranularity: 'day'
  })
}

// 移除分组项
const handleRemoveGroupBy = (index: number) => {
  queryConfig.groupBy.splice(index, 1)
}

// 添加筛选条件
const handleAddFilter = () => {
  const firstField = filterableFields.value[0]
  if (firstField) {
    queryConfig.filters.push({
      field: firstField.field.fieldName,
      operator: 'eq',
      value: ''
    })
  }
}

// 移除筛选条件
const handleRemoveFilter = (index: number) => {
  queryConfig.filters.splice(index, 1)
}

// ==================== 查询执行 ====================

// 执行统计查询
const executeQuery = async () => {
  if (!queryConfig.mainTable) {
    alert('请先选择数据表')
    return
  }
  
  if (queryConfig.statistics.length === 0) {
    alert('请至少添加一个统计项')
    return
  }
  
  if (queryConfig.groupBy.length === 0) {
    alert('请至少添加一个分组字段')
    return
  }
  
  loading.value = true
  
  try {
    // 如果是单表查询，使用后端分组统计API
    if (queryConfig.joinTables.length === 0) {
      await executeSingleTableQuery()
    } else {
      // 关联表查询，使用前端处理
      await executeJoinTableQuery()
    }
  } catch (error) {
    console.error('查询执行失败:', error)
    alert('查询执行失败，请检查配置')
  } finally {
    loading.value = false
  }
}

// 执行单表分组统计查询（调用后端API）
const executeSingleTableQuery = async () => {
  // 构建聚合配置
  const aggregates: AggregateConfig[] = queryConfig.statistics.map((stat, index) => ({
    type: stat.type.toLowerCase() as 'count' | 'sum' | 'avg' | 'max' | 'min',
    field: stat.field || undefined,
    alias: `agg_${index}`,
  }))
  
  // 构建分组配置
  const groupBy: GroupByConfig[] = queryConfig.groupBy.map(gb => ({
    field: gb.field,
    timeGranularity: gb.timeGranularity,
  }))
  
  // 构建查询参数
  const params: AggregateQueryDto = {
    aggregates,
    groupBy,
    filters: queryConfig.filters.length > 0 ? queryConfig.filters : undefined,
    limit: 1000,
  }
  
  // 调用后端API
  const res = await aggregateQuery(queryConfig.mainTable, params)
  const rawData = res.data?.list || []
  
  // 转换结果格式
  const labels: string[] = []
  const values: number[] = []
  const firstAggAlias = 'agg_0'
  
  rawData.forEach((row: any) => {
    // 构建分组标签
    const label = queryConfig.groupBy.map(gb => {
      let value = row[gb.field] ?? row[`${gb.field}_group`] ?? '未知'
      // 时间格式处理
      if (gb.timeGranularity) {
        value = formatTimeGroupLabel(value, gb.timeGranularity)
      }
      return String(value)
    }).join(' | ')
    
    labels.push(label)
    values.push(Number(row[firstAggAlias]) || 0)
  })
  
  // 更新统计结果
  statisticsResult.value = {
    labels,
    values,
    rawData,
  }
}

// 格式化时间分组标签
const formatTimeGroupLabel = (value: string, granularity: string): string => {
  if (!value) return '未知'
  
  switch (granularity) {
    case 'day':
      return value // YYYY-MM-DD
    case 'week':
      return `${value}周`
    case 'month':
      return value.replace('-', '年') + '月'
    case 'year':
      return `${value}年`
    default:
      return value
  }
}

// 执行关联表查询（前端处理）
const executeJoinTableQuery = async () => {
  // 构建查询参数
  const params: any = {
    pageSize: 10000
  }
  
  // 添加筛选条件
  if (queryConfig.filters.length > 0) {
    params.filters = queryConfig.filters
  }
  
  // 加载主表数据
  const res = await getDataList(queryConfig.mainTable, params)
  const mainData = res.data?.list || []
  
  // 如果有关联表，需要加载关联数据并合并
  let mergedData = mainData.map(row => ({ ...row, _source: 't0' }))
  
  for (const joinTable of queryConfig.joinTables) {
    if (!joinTable.localField || !joinTable.foreignField) continue
    
    // 加载关联表数据
    const joinRes = await getDataList(joinTable.tableId, { pageSize: 10000 })
    const joinData = joinRes.data?.list || []
    
    // 合并数据
    const newMergedData: any[] = []
    for (const mainRow of mergedData) {
      const localValue = mainRow[joinTable.localField]
      const matchingJoinRows = joinData.filter(jr => jr[joinTable.foreignField] === localValue)
      
      if (matchingJoinRows.length > 0) {
        for (const joinRow of matchingJoinRows) {
          newMergedData.push({
            ...mainRow,
            ...Object.fromEntries(Object.entries(joinRow).map(([k, v]) => [`${joinTable.alias}_${k}`, v]))
          })
        }
      } else if (joinTable.joinType === 'LEFT') {
        // 左连接保留主表数据
        newMergedData.push(mainRow)
      }
    }
    mergedData = newMergedData
  }
  
  // 执行分组统计
  const groupedData = performGroupingAndAggregation(mergedData)
  statisticsResult.value = groupedData
}

// 执行分组和聚合
const performGroupingAndAggregation = (data: any[]) => {
  const grouped = new Map<string, { items: any[], label: string }>()
  
  // 分组
  data.forEach(row => {
    const groupKey = queryConfig.groupBy.map(gb => {
      const fieldInfo = allTableFields.value.find(f => 
        f.field.fieldName === gb.field && f.tableId === gb.fieldTable
      )
      let value = row[gb.field]
      if (fieldInfo?.alias) {
        value = row[`${fieldInfo.alias}_${gb.field}`] || row[gb.field]
      }
      
      // 时间字段格式化
      if (gb.timeGranularity && isDateType(fieldInfo?.field.fieldType || '')) {
        return formatDateValue(value, gb.timeGranularity)
      }
      
      return value ?? '未知'
    }).join(' | ')
    
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, { items: [], label: groupKey })
    }
    grouped.get(groupKey)!.items.push(row)
  })
  
  // 聚合计算
  const labels: string[] = []
  const values: number[] = []
  
  grouped.forEach((group, key) => {
    labels.push(key)
    
    // 如果有多个统计项，只取第一个的值用于图表
    const stat = queryConfig.statistics[0]
    let value = 0
    
    if (stat.type === 'COUNT') {
      value = group.items.length
    } else {
      const fieldInfo = allTableFields.value.find(f => 
        f.field.fieldName === stat.field && f.tableId === stat.fieldTable
      )
      const fieldName = fieldInfo?.alias ? `${fieldInfo.alias}_${stat.field}` : stat.field
      
      const fieldValues = group.items
        .map(item => Number(item[fieldName]))
        .filter(v => !isNaN(v))
      
      if (fieldValues.length > 0) {
        switch (stat.type) {
          case 'SUM':
            value = fieldValues.reduce((a, b) => a + b, 0)
            break
          case 'AVG':
            value = fieldValues.reduce((a, b) => a + b, 0) / fieldValues.length
            break
          case 'MAX':
            value = Math.max(...fieldValues)
            break
          case 'MIN':
            value = Math.min(...fieldValues)
            break
        }
      }
    }
    
    values.push(value)
  })
  
  return { labels, values, rawData: data }
}

// 格式化日期值
const formatDateValue = (value: any, granularity: string): string => {
  if (!value) return '未知'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '未知'
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  switch (granularity) {
    case 'day':
      return `${year}-${month}-${day}`
    case 'week':
      const weekNum = Math.ceil(date.getDate() / 7)
      return `${year}-${month}第${weekNum}周`
    case 'month':
      return `${year}-${month}`
    case 'year':
      return `${year}年`
    default:
      return `${year}-${month}-${day}`
  }
}

// ==================== 视图管理 ====================

const applyView = (view: ViewConfig) => {
  selectedView.value = view
  selectedChartType.value = view.chartType
  // TODO: 从视图配置恢复查询配置
}

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

const handleSaveView = async () => {
  if (!saveViewName.value.trim()) {
    alert('请输入视图名称')
    return
  }
  saveLoading.value = true
  try {
    const data = {
      viewName: saveViewName.value.trim(),
      tableId: queryConfig.mainTable,
      chartType: selectedChartType.value,
      xAxis: JSON.stringify(queryConfig.groupBy),
      yAxis: JSON.stringify(queryConfig.statistics),
      filters: queryConfig.filters,
      isDefault: saveAsDefault.value
    }
    
    if (selectedView.value) {
      await updateView(selectedView.value.viewId, data)
    } else {
      const res = await createView(data)
      selectedView.value = res.data
    }
    
    await loadViewList(queryConfig.mainTable)
    showSaveModal.value = false
  } catch (error) {
    console.error('保存视图失败:', error)
    alert('保存失败，请重试')
  } finally {
    saveLoading.value = false
  }
}

const handleSelectView = (view: ViewConfig) => {
  applyView(view)
}

const handleSetDefault = async (view: ViewConfig) => {
  try {
    await setDefaultView(view.viewId)
    viewList.value.forEach(v => v.isDefault = false)
    view.isDefault = true
  } catch (error) {
    console.error('设置默认视图失败:', error)
  }
}

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

// ==================== 图表计算 ====================

const maxValue = computed(() => {
  if (statisticsResult.value.values.length === 0) return 100
  return Math.max(...statisticsResult.value.values) * 1.1 || 100
})

const pieColors = computed(() => {
  const colors = []
  for (let i = 0; i < statisticsResult.value.labels.length; i++) {
    colors.push(`hsl(${(i * 360 / Math.max(statisticsResult.value.labels.length, 1))}, 70%, 50%)`)
  }
  return colors
})

// ==================== 生命周期 ====================

onMounted(() => {
  loadTableList()
})

// 监听主表变化
watch(() => queryConfig.mainTable, (val) => {
  if (!val) {
    queryConfig.mainTableFields = []
    queryConfig.joinTables = []
    statisticsResult.value = { labels: [], values: [], rawData: [] }
  }
})
</script>

<template>
  <div class="space-y-6 animate-fadeIn">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-800">数据可视化</h2>
        <p class="text-sm text-gray-500 mt-1">可视化配置统计查询，支持单表和关联表联合统计</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="queryConfig.mainTable"
          class="flex items-center gap-2 px-3 py-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
          @click="openSaveModal"
        >
          <Save class="w-4 h-4" />
          <span>保存视图</span>
        </button>
        <button
          v-if="queryConfig.mainTable"
          class="flex items-center gap-2 px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          :disabled="loading"
          @click="executeQuery"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          <span>{{ loading ? '查询中...' : '执行查询' }}</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- 左侧配置面板 -->
      <div class="lg:col-span-1 space-y-4">
        <!-- 1. 数据源配置 -->
        <div class="bg-white rounded-xl shadow-sm p-4">
          <div class="flex items-center gap-2 mb-3">
            <Table2 class="w-4 h-4 text-primary" />
            <h3 class="text-sm font-medium text-gray-800">数据源</h3>
          </div>
          
          <!-- 主表选择 -->
          <div class="mb-3">
            <label class="block text-xs text-gray-500 mb-1">主表 *</label>
            <select
              :value="queryConfig.mainTable"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              @change="handleSelectMainTable(($event.target as HTMLSelectElement).value)"
            >
              <option value="">请选择数据表</option>
              <option v-for="table in tableList" :key="table.tableId" :value="table.tableId">
                {{ table.displayName }} ({{ table.tableName }})
              </option>
            </select>
          </div>
          
          <!-- 关联表 -->
          <div v-if="queryConfig.mainTable">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-gray-500">关联表</span>
              <button
                class="text-xs text-primary hover:text-primary-dark"
                @click="handleAddJoinTable"
              >
                + 添加关联表
              </button>
            </div>
            
            <div v-if="queryConfig.joinTables.length > 0" class="space-y-2">
              <div
                v-for="(joinTable, index) in queryConfig.joinTables"
                :key="joinTable.tableId"
                class="p-2 bg-gray-50 rounded-lg text-xs"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium text-gray-700">{{ joinTable.displayName }}</span>
                  <button
                    class="text-gray-400 hover:text-red-500"
                    @click="handleRemoveJoinTable(index)"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </div>
                <div class="grid grid-cols-2 gap-1 text-gray-500">
                  <div>关联方式: {{ joinTable.joinType }}</div>
                  <div>别名: {{ joinTable.alias }}</div>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-gray-400 text-center py-2">
              可添加关联表进行联合查询
            </div>
          </div>
        </div>

        <!-- 已保存的视图 -->
        <div v-if="queryConfig.mainTable && viewList.length > 0" class="bg-white rounded-xl shadow-sm p-4">
          <div class="flex items-center gap-2 mb-3">
            <Bookmark class="w-4 h-4 text-primary" />
            <h3 class="text-sm font-medium text-gray-800">已保存视图</h3>
          </div>
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

        <!-- 2. 统计配置 -->
        <div v-if="queryConfig.mainTable" class="bg-white rounded-xl shadow-sm p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Calculator class="w-4 h-4 text-primary" />
              <h3 class="text-sm font-medium text-gray-800">统计配置</h3>
            </div>
            <button
              class="text-xs text-primary hover:text-primary-dark"
              @click="handleAddStatistics"
            >
              + 添加统计
            </button>
          </div>
          
          <div v-if="queryConfig.statistics.length === 0" class="text-xs text-gray-400 text-center py-2">
            请添加统计项
          </div>
          
          <div v-else class="space-y-2">
            <div
              v-for="(stat, index) in queryConfig.statistics"
              :key="index"
              class="p-2 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <select
                  v-model="stat.type"
                  class="flex-1 px-2 py-1 text-xs border border-gray-200 rounded"
                >
                  <option v-for="opt in statisticsTypes" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <button
                  class="ml-2 text-gray-400 hover:text-red-500"
                  @click="handleRemoveStatistics(index)"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
              <div v-if="stat.type !== 'COUNT'" class="text-xs">
                <select
                  v-model="stat.field"
                  class="w-full px-2 py-1 border border-gray-200 rounded"
                >
                  <option value="">选择字段</option>
                  <optgroup label="主表字段">
                    <option
                      v-for="item in numericFields.filter(f => f.tableId === queryConfig.mainTable)"
                      :key="item.field.fieldId"
                      :value="item.field.fieldName"
                    >
                      {{ item.field.displayName }}
                    </option>
                  </optgroup>
                  <optgroup v-if="queryConfig.joinTables.length > 0" label="关联表字段">
                    <option
                      v-for="item in numericFields.filter(f => f.tableId !== queryConfig.mainTable)"
                      :key="item.field.fieldId"
                      :value="item.field.fieldName"
                    >
                      {{ item.field.displayName }} ({{ item.tableName }})
                    </option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. 分组配置 -->
        <div v-if="queryConfig.mainTable" class="bg-white rounded-xl shadow-sm p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Layers class="w-4 h-4 text-primary" />
              <h3 class="text-sm font-medium text-gray-800">分组字段</h3>
            </div>
            <button
              class="text-xs text-primary hover:text-primary-dark"
              @click="handleAddGroupBy"
            >
              + 添加分组
            </button>
          </div>
          
          <div v-if="queryConfig.groupBy.length === 0" class="text-xs text-gray-400 text-center py-2">
            请添加分组字段
          </div>
          
          <div v-else class="space-y-2">
            <div
              v-for="(gb, index) in queryConfig.groupBy"
              :key="index"
              class="p-2 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <select
                  v-model="gb.field"
                  class="flex-1 px-2 py-1 text-xs border border-gray-200 rounded"
                  @change="gb.fieldTable = allTableFields.find(f => f.field.fieldName === gb.field)?.tableId || ''"
                >
                  <option value="">选择分组字段</option>
                  <optgroup label="主表字段">
                    <option
                      v-for="item in allTableFields.filter(f => f.tableId === queryConfig.mainTable)"
                      :key="item.field.fieldId"
                      :value="item.field.fieldName"
                    >
                      {{ item.field.displayName }}
                    </option>
                  </optgroup>
                  <optgroup v-if="queryConfig.joinTables.length > 0" label="关联表字段">
                    <option
                      v-for="item in allTableFields.filter(f => f.tableId !== queryConfig.mainTable)"
                      :key="item.field.fieldId"
                      :value="item.field.fieldName"
                    >
                      {{ item.field.displayName }} ({{ item.tableName }})
                    </option>
                  </optgroup>
                </select>
                <button
                  class="ml-2 text-gray-400 hover:text-red-500"
                  @click="handleRemoveGroupBy(index)"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
              <!-- 时间粒度选择 -->
              <div v-if="gb.field && dateFields.some(f => f.field.fieldName === gb.field)" class="text-xs">
                <select v-model="gb.timeGranularity" class="w-full px-2 py-1 border border-gray-200 rounded">
                  <option value="day">按日</option>
                  <option value="week">按周</option>
                  <option value="month">按月</option>
                  <option value="year">按年</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 筛选条件 -->
        <div v-if="queryConfig.mainTable" class="bg-white rounded-xl shadow-sm p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Filter class="w-4 h-4 text-primary" />
              <h3 class="text-sm font-medium text-gray-800">筛选条件</h3>
            </div>
            <button
              class="text-xs text-primary hover:text-primary-dark"
              @click="handleAddFilter"
            >
              + 添加条件
            </button>
          </div>
          
          <div v-if="queryConfig.filters.length === 0" class="text-xs text-gray-400 text-center py-2">
            暂无筛选条件
          </div>
          
          <div v-else class="space-y-2">
            <div
              v-for="(filter, index) in queryConfig.filters"
              :key="index"
              class="flex items-center gap-1 p-2 bg-gray-50 rounded-lg"
            >
              <select
                v-model="filter.field"
                class="flex-1 px-1 py-1 text-xs border border-gray-200 rounded"
              >
                <option v-for="item in filterableFields" :key="item.field.fieldId" :value="item.field.fieldName">
                  {{ item.field.displayName }}
                </option>
              </select>
              <select
                v-model="filter.operator"
                class="w-14 px-1 py-1 text-xs border border-gray-200 rounded"
              >
                <option v-for="op in filterOperators" :key="op.value" :value="op.value">
                  {{ op.label.substring(0, 2) }}
                </option>
              </select>
              <input
                v-model="filter.value"
                type="text"
                placeholder="值"
                class="flex-1 px-1 py-1 text-xs border border-gray-200 rounded"
              />
              <button
                class="text-gray-400 hover:text-red-500"
                @click="handleRemoveFilter(index)"
              >
                <X class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧图表展示区域 -->
      <div class="lg:col-span-3 space-y-4">
        <!-- 图表类型选择 -->
        <div class="bg-white rounded-xl shadow-sm p-4">
          <div class="flex items-center gap-4">
            <span class="text-sm text-gray-500">图表类型:</span>
            <div class="flex gap-2">
              <div
                v-for="type in chartTypes"
                :key="type.key"
                class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                :class="selectedChartType === type.key ? 'bg-primary/10 border border-primary' : 'bg-gray-50 border border-transparent hover:bg-gray-100'"
                @click="selectedChartType = type.key"
              >
                <component :is="type.icon" class="w-4 h-4" :class="selectedChartType === type.key ? 'text-primary' : 'text-gray-500'" />
                <span class="text-xs" :class="selectedChartType === type.key ? 'text-primary' : 'text-gray-600'">
                  {{ type.title }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 图表展示 -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-800">统计结果</h3>
            <span v-if="selectedView" class="text-xs text-gray-500">
              当前视图: {{ selectedView.viewName }}
            </span>
          </div>
          
          <!-- 无数据提示 -->
          <div v-if="statisticsResult.labels.length === 0" class="h-96 flex items-center justify-center text-gray-400">
            <div class="text-center">
              <BarChart3 class="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p v-if="!queryConfig.mainTable">请选择数据表并配置统计</p>
              <p v-else>请配置统计和分组后点击"执行查询"</p>
            </div>
          </div>

          <!-- 柱状图 -->
          <div v-else-if="selectedChartType === 'bar'" class="h-96">
            <div class="h-full flex flex-col">
              <div class="flex-1 flex">
                <div class="w-16 flex flex-col justify-between text-right pr-2 text-xs text-gray-400">
                  <span>{{ maxValue > 1000 ? (maxValue / 1000).toFixed(1) + 'K' : maxValue.toFixed(0) }}</span>
                  <span>{{ (maxValue * 0.75) > 1000 ? ((maxValue * 0.75) / 1000).toFixed(1) + 'K' : (maxValue * 0.75).toFixed(0) }}</span>
                  <span>{{ (maxValue * 0.5) > 1000 ? ((maxValue * 0.5) / 1000).toFixed(1) + 'K' : (maxValue * 0.5).toFixed(0) }}</span>
                  <span>{{ (maxValue * 0.25) > 1000 ? ((maxValue * 0.25) / 1000).toFixed(1) + 'K' : (maxValue * 0.25).toFixed(0) }}</span>
                  <span>0</span>
                </div>
                <div class="flex-1 relative border-l border-b border-gray-200">
                  <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div class="border-b border-gray-100 border-dashed"></div>
                    <div class="border-b border-gray-100 border-dashed"></div>
                    <div class="border-b border-gray-100 border-dashed"></div>
                    <div class="border-b border-gray-100 border-dashed"></div>
                  </div>
                  <div class="absolute inset-0 flex items-end gap-1 px-2 pb-0">
                    <div
                      v-for="(label, index) in statisticsResult.labels"
                      :key="index"
                      class="flex-1 min-w-[24px] flex flex-col items-center justify-end"
                    >
                      <div class="relative w-full flex flex-col items-center" 
                        :style="{ height: `${Math.max((statisticsResult.values[index] / maxValue) * 100, 2)}%`, minHeight: '4px' }">
                        <span class="absolute -top-5 text-xs font-medium text-gray-700 whitespace-nowrap">
                          {{ statisticsResult.values[index] > 1000 ? (statisticsResult.values[index] / 1000).toFixed(1) + 'K' : statisticsResult.values[index].toFixed(0) }}
                        </span>
                        <div
                          class="w-full flex-1 rounded-t-md transition-all cursor-pointer shadow-sm hover:shadow-md bg-gradient-to-t from-primary to-primary/60"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex pl-16">
                <div class="flex-1 flex gap-1 px-2 pt-2 overflow-x-auto">
                  <span
                    v-for="(label, index) in statisticsResult.labels"
                    :key="index"
                    class="flex-1 min-w-[24px] text-xs text-gray-500 text-center truncate"
                    :title="label"
                  >
                    {{ label }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 饼图 -->
          <div v-else-if="selectedChartType === 'pie'" class="h-96">
            <div class="h-full flex items-center justify-center gap-8">
              <div class="relative w-64 h-64">
                <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                  <circle
                    v-for="(_, index) in statisticsResult.labels"
                    :key="index"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    :stroke="pieColors[index]"
                    stroke-width="20"
                    :stroke-dasharray="`${(statisticsResult.values[index] / statisticsResult.values.reduce((a, b) => a + b, 0)) * 251.2} 251.2`"
                    :stroke-dashoffset="-statisticsResult.values.slice(0, index).reduce((a, b) => a + b, 0) / statisticsResult.values.reduce((a, b) => a + b, 0) * 251.2"
                    class="transition-all duration-300"
                  />
                </svg>
              </div>
              <div class="flex flex-col gap-2 max-h-64 overflow-y-auto">
                <div
                  v-for="(label, index) in statisticsResult.labels"
                  :key="index"
                  class="flex items-center gap-2"
                >
                  <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: pieColors[index] }"></div>
                  <span class="text-sm text-gray-600 truncate max-w-32" :title="label">{{ label }}</span>
                  <span class="text-xs text-gray-400">{{ statisticsResult.values[index].toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 折线图 -->
          <div v-else-if="selectedChartType === 'line'" class="h-96">
            <div class="h-full flex flex-col">
              <svg class="w-full flex-1" viewBox="0 0 400 200">
                <line x1="40" y1="10" x2="40" y2="190" stroke="#e5e7eb" stroke-width="1" />
                <line x1="40" y1="190" x2="390" y2="190" stroke="#e5e7eb" stroke-width="1" />
                <line x1="40" y1="100" x2="390" y2="100" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4" />
                <polyline
                  :points="statisticsResult.values.map((v, i) => `${50 + i * (340 / (statisticsResult.values.length - 1 || 1))},${180 - (v / maxValue) * 160}`).join(' ')"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  stroke-width="2"
                />
                <circle
                  v-for="(v, i) in statisticsResult.values"
                  :key="i"
                  :cx="50 + i * (340 / (statisticsResult.values.length - 1 || 1))"
                  :cy="180 - (v / maxValue) * 160"
                  r="4"
                  fill="hsl(var(--primary))"
                />
              </svg>
              <div class="flex justify-around px-10 overflow-x-auto">
                <span
                  v-for="(label, index) in statisticsResult.labels"
                  :key="index"
                  class="text-xs text-gray-500 truncate max-w-16 text-center flex-shrink-0"
                  :title="label"
                >
                  {{ label }}
                </span>
              </div>
            </div>
          </div>

          <!-- 数据表 -->
          <div v-else-if="selectedChartType === 'table'" class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">分组</th>
                  <th class="text-right px-4 py-3 text-sm font-medium text-gray-500">数值</th>
                  <th class="text-right px-4 py-3 text-sm font-medium text-gray-500">占比</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(label, index) in statisticsResult.labels" :key="index" class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm text-gray-800">{{ label }}</td>
                  <td class="px-4 py-3 text-sm text-gray-800 text-right font-medium">{{ statisticsResult.values[index].toLocaleString() }}</td>
                  <td class="px-4 py-3 text-sm text-gray-500 text-right">
                    {{ ((statisticsResult.values[index] / statisticsResult.values.reduce((a, b) => a + b, 0)) * 100).toFixed(1) }}%
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-gray-50">
                <tr>
                  <td class="px-4 py-3 text-sm font-medium text-gray-800">合计</td>
                  <td class="px-4 py-3 text-sm font-medium text-gray-800 text-right">{{ statisticsResult.values.reduce((a, b) => a + b, 0).toLocaleString() }}</td>
                  <td class="px-4 py-3 text-sm text-gray-500 text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 保存视图弹窗 -->
    <Modal v-model:visible="showSaveModal" title="保存视图" width="400px">
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
          <input type="checkbox" id="setDefault" v-model="saveAsDefault" class="rounded border-gray-300 text-primary focus:ring-primary" />
          <label for="setDefault" class="text-sm text-gray-600">设为默认视图</label>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" @click="showSaveModal = false">
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
