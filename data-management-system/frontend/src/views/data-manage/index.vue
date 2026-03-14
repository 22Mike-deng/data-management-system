/**
 * 数据管理页面（动态CRUD）
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-14
 */
<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Edit, Trash2, Download, Upload, ArrowLeft, Search, ChevronLeft, ChevronRight, FileSpreadsheet, FileJson, FileText } from 'lucide-vue-next'
import { MessagePlugin } from 'tdesign-vue-next'
import { getTableById, getTableFields, getTableList } from '@/api/table-meta'
import { getDataList, createData, updateData, deleteData, batchDeleteData, createDynamicTable } from '@/api/dynamic-data'
import { importData, exportData, downloadTemplate } from '@/api/data-import-export'
import type { TableDefinition, FieldDefinition, FieldType } from '@/types'
import Modal from '@/components/Modal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const tableId = computed(() => route.params.tableId as string)

// 数据列表
const dataList = ref<any[]>([])
const loading = ref(false)
const tableInfo = ref<TableDefinition | null>(null)
const fields = ref<FieldDefinition[]>([])

// 外键关联数据缓存
const foreignKeyDataCache = ref<Record<string, any[]>>({})

// 分页
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
})

// 搜索
const searchKeyword = ref('')

// 弹窗状态
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const currentData = ref<any>(null)
const formData = ref<Record<string, any>>({})
const saveLoading = ref(false)

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

// 批量操作
const selectedIds = ref<string[]>([])
const showBatchDeleteConfirm = ref(false)
const batchDeleteLoading = ref(false)

// 导入相关
const showImportModal = ref(false)
const importFile = ref<File | null>(null)
const importFormat = ref<'csv' | 'json' | 'xlsx'>('xlsx')
const importLoading = ref(false)
const importProgress = ref(0)
const importResult = ref<{
  success: boolean
  total: number
  inserted: number
  skipped: number
  errors: Array<{ row: number; message: string }>
} | null>(null)

// 导出格式选择
const showExportModal = ref(false)

// 加载表结构
const loadTableInfo = async () => {
  try {
    const res = await getTableById(tableId.value)
    tableInfo.value = res.data
    // 加载字段
    const fieldsRes = await getTableFields(tableId.value)
    fields.value = fieldsRes.data || []
    // 加载外键关联数据
    await loadForeignKeyData()
  } catch (error) {
    console.error('加载表结构失败:', error)
  }
}

// 加载外键关联数据
const loadForeignKeyData = async () => {
  // 获取所有表列表
  const tablesRes = await getTableList()
  const tables = tablesRes.data || []

  // 找出所有外键字段并加载关联数据
  for (const field of fields.value) {
    if (field.isForeignKey && field.foreignKeyTable) {
      const refTable = tables.find(t => t.tableName === field.foreignKeyTable)
      if (refTable && !foreignKeyDataCache.value[field.foreignKeyTable]) {
        try {
          const res = await getDataList(refTable.tableId, { page: 1, pageSize: 1000 })
          foreignKeyDataCache.value[field.foreignKeyTable] = res.data?.list || []
        } catch (error) {
          console.error(`加载外键关联数据失败: ${field.foreignKeyTable}`, error)
          foreignKeyDataCache.value[field.foreignKeyTable] = []
        }
      }
    }
  }
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // 先确保动态表已创建
    await createDynamicTable(tableId.value)
    
    const res = await getDataList(tableId.value, {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      keyword: searchKeyword.value || undefined,
    })
    dataList.value = res.data?.list || []
    pagination.value.total = res.data?.total || 0
  } catch (error) {
    console.error('加载数据失败:', error)
    dataList.value = []
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  loadData()
}

// 重置表单数据
const resetFormData = () => {
  formData.value = {}
  if (!fields.value || fields.value.length === 0) {
    console.warn('fields is empty, cannot reset form data')
    return
  }
  fields.value.forEach(field => {
    if (field.defaultValue) {
      formData.value[field.fieldName] = field.defaultValue
    } else if (field.fieldType === 'boolean') {
      formData.value[field.fieldName] = false
    } else if (['int', 'bigint', 'float', 'double', 'decimal'].includes(field.fieldType)) {
      formData.value[field.fieldName] = null
    } else {
      formData.value[field.fieldName] = ''
    }
  })
}

// 新增数据
const handleAdd = () => {
  if (!fields.value || fields.value.length === 0) {
    alert('表单字段尚未加载，请稍后再试')
    return
  }
  modalMode.value = 'create'
  currentData.value = null
  resetFormData()
  showModal.value = true
}

// 格式化日期值为表单可用格式
const formatDateForInput = (value: any, fieldType: string): string => {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''

  if (fieldType === 'date') {
    // date 输入框需要 YYYY-MM-DD 格式
    return date.toISOString().split('T')[0]
  } else if (fieldType === 'datetime') {
    // datetime-local 需要 YYYY-MM-DDTHH:mm 格式
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }
  return value
}

// 编辑数据
const handleEdit = (row: any) => {
  modalMode.value = 'edit'
  currentData.value = row
  // 复制数据并格式化日期类型字段
  formData.value = { ...row }
  fields.value.forEach(field => {
    if ((field.fieldType === 'date' || field.fieldType === 'datetime') && row[field.fieldName]) {
      formData.value[field.fieldName] = formatDateForInput(row[field.fieldName], field.fieldType)
    }
    // JSON类型字段：对象转字符串便于编辑
    if (field.fieldType === 'json' && row[field.fieldName]) {
      const jsonValue = row[field.fieldName]
      if (typeof jsonValue === 'object') {
        formData.value[field.fieldName] = JSON.stringify(jsonValue, null, 2)
      }
    }
  })
  showModal.value = true
}

// 保存数据
const handleSave = async () => {
  saveLoading.value = true
  try {
    // 处理JSON类型字段：字符串转对象
    const submitData = { ...formData.value }
    fields.value.forEach(field => {
      if (field.fieldType === 'json' && submitData[field.fieldName]) {
        try {
          // 尝试解析JSON字符串
          submitData[field.fieldName] = JSON.parse(submitData[field.fieldName])
        } catch {
          // 解析失败则保持原值
        }
      }
    })

    if (modalMode.value === 'create') {
      await createData(tableId.value, submitData)
    } else if (currentData.value?.id) {
      await updateData(tableId.value, currentData.value.id, submitData)
    }
    showModal.value = false
    loadData()
    MessagePlugin.success('保存成功')
  } catch (error: any) {
    console.error('保存数据失败:', error)
    const errorMsg = error.response?.data?.message || error.message || '保存失败，请重试'
    MessagePlugin.error(errorMsg)
  } finally {
    saveLoading.value = false
  }
}

// 删除数据
const handleDelete = (row: any) => {
  deleteTarget.value = row
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value?.id) return
  deleteLoading.value = true
  try {
    await deleteData(tableId.value, deleteTarget.value.id)
    showDeleteConfirm.value = false
    loadData()
    MessagePlugin.success('删除成功')
  } catch (error) {
    console.error('删除数据失败:', error)
    MessagePlugin.error('删除失败，请重试')
  } finally {
    deleteLoading.value = false
  }
}

// 批量删除
const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) {
    MessagePlugin.warning('请先选择要删除的数据')
    return
  }
  showBatchDeleteConfirm.value = true
}

const confirmBatchDelete = async () => {
  batchDeleteLoading.value = true
  try {
    await batchDeleteData(tableId.value, selectedIds.value)
    showBatchDeleteConfirm.value = false
    selectedIds.value = []
    loadData()
    MessagePlugin.success('批量删除成功')
  } catch (error) {
    console.error('批量删除失败:', error)
    MessagePlugin.error('删除失败，请重试')
  } finally {
    batchDeleteLoading.value = false
  }
}

// 全选/取消全选
const handleSelectAll = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  if (checked) {
    selectedIds.value = dataList.value.map(item => item.id).filter(Boolean)
  } else {
    selectedIds.value = []
  }
}

// 单选
const handleSelect = (id: string) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

// 分页
const handlePageChange = (page: number) => {
  pagination.value.page = page
  loadData()
}

// 导入数据
const handleImport = () => {
  showImportModal.value = true
  importFile.value = null
  importResult.value = null
  importProgress.value = 0
}

// 选择文件
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    importFile.value = target.files[0]
    // 根据文件扩展名自动选择格式
    const ext = importFile.value.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv') importFormat.value = 'csv'
    else if (ext === 'json') importFormat.value = 'json'
    else importFormat.value = 'xlsx'
  }
}

// 执行导入
const handleDoImport = async () => {
  if (!importFile.value) {
    MessagePlugin.warning('请选择要导入的文件')
    return
  }

  importLoading.value = true
  importProgress.value = 0
  importResult.value = null

  try {
    const res = await importData(
      tableId.value,
      importFile.value,
      importFormat.value,
      (percent) => {
        importProgress.value = percent
      }
    )
    importResult.value = res.data
    
    if (res.data.success && res.data.inserted > 0) {
      MessagePlugin.success(`成功导入 ${res.data.inserted} 条数据`)
      loadData() // 刷新列表
    }
  } catch (error: any) {
    console.error('导入失败:', error)
    MessagePlugin.error(error.response?.data?.message || '导入失败')
  } finally {
    importLoading.value = false
  }
}

// 下载模板
const handleDownloadTemplate = () => {
  downloadTemplate(tableId.value, importFormat.value)
}

// 导出数据
const handleExport = () => {
  showExportModal.value = true
}

// 执行导出
const handleDoExport = async (format: 'csv' | 'json' | 'xlsx') => {
  try {
    await exportData(tableId.value, format)
    showExportModal.value = false
    MessagePlugin.success('导出成功')
  } catch (error: any) {
    MessagePlugin.error(error.message || '导出失败')
  }
}

// 返回
const goBack = () => {
  router.push('/table-manage')
}

// 格式化显示值
const formatValue = (value: any, field: FieldDefinition) => {
  if (value === null || value === undefined) return '-'

  // 外键字段显示关联数据的名称
  if (field.isForeignKey && field.foreignKeyTable) {
    const refData = foreignKeyDataCache.value[field.foreignKeyTable] || []
    const refItem = refData.find(item => item.id === value)
    if (refItem) {
      return refItem.name || refItem.username || refItem.title || value
    }
    return value
  }

  switch (field.fieldType) {
    case 'boolean':
      return value ? '是' : '否'
    case 'date':
      return formatDate(value)
    case 'datetime':
      return formatDateTime(value)
    case 'select':
      const opt = field.options?.find(o => o.value === value)
      return opt?.label || value
    case 'multiselect':
      if (!Array.isArray(value)) return value
      return value.map(v => {
        const o = field.options?.find(opt => opt.value === v)
        return o?.label || v
      }).join(', ')
    case 'json':
      // JSON类型显示为格式化字符串
      if (typeof value === 'object') {
        return JSON.stringify(value)
      }
      return String(value)
    default:
      return value
  }
}

// 格式化日期（只显示日期）
const formatDate = (value: any): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (isNaN(date.getTime())) return String(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化日期时间
const formatDateTime = (value: any): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (isNaN(date.getTime())) return String(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 获取外键关联数据的显示文本
const getForeignKeyDisplayText = (item: any): string => {
  // 优先显示常见的名称字段
  const nameField = item.name || item.username || item.title || item.displayName || item.label
  if (nameField) {
    return `${nameField} (${item.id?.substring(0, 8)}...)`
  }
  return item.id || '-'
}

// 字段类型映射
const getInputType = (type: FieldType): string => {
  const typeMap: Record<string, string> = {
    text: 'text',
    varchar: 'text',
    int: 'number',
    bigint: 'number',
    float: 'number',
    double: 'number',
    decimal: 'number',
    date: 'date',
    datetime: 'datetime-local',
    image: 'url',
    file: 'url',
  }
  return typeMap[type] || 'text'
}

// 监听tableId变化
watch(tableId, () => {
  loadTableInfo()
  loadData()
}, { immediate: true })
</script>

<template>
  <div class="space-y-6 animate-fadeIn data-manage-page">
    <!-- 顶部导航 -->
    <div class="flex items-center gap-3">
      <button
        class="p-2 back-btn rounded-lg transition-colors"
        @click="goBack"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div>
        <h2 class="text-xl font-semibold page-title">{{ tableInfo?.displayName || '数据管理' }}</h2>
        <p class="text-sm page-desc">{{ tableInfo?.description || '管理数据表中的数据记录' }}</p>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- 搜索框 -->
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 search-icon" />
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索..."
            class="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64 search-input"
            @keyup.enter="handleSearch"
          />
        </div>
        <button
          class="px-4 py-2 secondary-btn rounded-lg transition-colors"
          @click="handleSearch"
        >
          搜索
        </button>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="selectedIds.length > 0"
          class="flex items-center gap-2 px-3 py-2 danger-btn rounded-lg transition-colors"
          @click="handleBatchDelete"
        >
          <Trash2 class="w-4 h-4" />
          <span>删除 ({{ selectedIds.length }})</span>
        </button>
        <button
          class="flex items-center gap-2 px-3 py-2 outline-btn rounded-lg transition-colors"
          @click="handleImport"
        >
          <Upload class="w-4 h-4" />
          <span>导入</span>
        </button>
        <button
          class="flex items-center gap-2 px-3 py-2 outline-btn rounded-lg transition-colors"
          @click="handleExport"
        >
          <Download class="w-4 h-4" />
          <span>导出</span>
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 primary-btn rounded-lg transition-colors"
          @click="handleAdd"
        >
          <Plus class="w-4 h-4" />
          <span>新增数据</span>
        </button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container rounded-xl shadow-sm overflow-hidden">
      <div v-if="loading" class="p-8 text-center loading-text">
        加载中...
      </div>
      <div v-else-if="dataList.length === 0" class="p-8 text-center">
        <p class="empty-text mb-4">暂无数据</p>
        <button
          class="px-4 py-2 primary-btn rounded-lg transition-colors"
          @click="handleAdd"
        >
          添加第一条数据
        </button>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="table-header border-b">
            <tr>
              <th class="text-left px-4 py-3 w-12">
                <input
                  type="checkbox"
                  :checked="selectedIds.length === dataList.length && dataList.length > 0"
                  class="rounded text-primary focus:ring-primary"
                  @change="handleSelectAll"
                />
              </th>
              <th class="text-left px-4 py-3 text-sm font-medium th-text w-20">ID</th>
              <th
                v-for="field in fields.filter(f => !['image', 'file', 'richtext'].includes(f.fieldType))"
                :key="field.fieldId"
                class="text-left px-4 py-3 text-sm font-medium th-text"
              >
                {{ field.displayName }}
              </th>
              <th class="text-left px-4 py-3 text-sm font-medium th-text w-32">创建时间</th>
              <th class="text-left px-4 py-3 text-sm font-medium th-text w-32">更新时间</th>
              <th class="text-right px-4 py-3 text-sm font-medium th-text w-32">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y table-divider">
            <tr v-for="row in dataList" :key="row.id" class="table-row">
              <td class="px-4 py-3">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(row.id)"
                  class="rounded text-primary focus:ring-primary"
                  @change="handleSelect(row.id)"
                />
              </td>
              <td class="px-4 py-3 text-sm td-id font-mono">{{ row.id }}</td>
              <td
                v-for="field in fields.filter(f => !['image', 'file', 'richtext'].includes(f.fieldType))"
                :key="field.fieldId"
                class="px-4 py-3 text-sm td-text"
              >
                <span v-if="field.fieldType === 'image' && row[field.fieldName]" class="text-primary">
                  [图片]
                </span>
                <span v-else-if="field.fieldType === 'file' && row[field.fieldName]" class="text-primary">
                  [文件]
                </span>
                <span v-else-if="field.fieldType === 'richtext' && row[field.fieldName]" class="text-gray-500">
                  [富文本]
                </span>
                <span v-else class="truncate block max-w-xs" :title="formatValue(row[field.fieldName], field)">
                  {{ formatValue(row[field.fieldName], field) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm td-secondary">{{ formatDateTime(row.created_at) }}</td>
              <td class="px-4 py-3 text-sm td-secondary">{{ formatDateTime(row.updated_at) }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    class="p-2 action-btn rounded-lg transition-colors"
                    @click="handleEdit(row)"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                  <button
                    class="p-2 delete-btn rounded-lg transition-colors"
                    @click="handleDelete(row)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="pagination.total > 0" class="flex items-center justify-between px-4 py-3 border-t table-divider">
        <div class="text-sm td-secondary">
          共 {{ pagination.total }} 条记录
        </div>
        <div class="flex items-center gap-2">
          <button
            class="p-2 page-btn rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="pagination.page <= 1"
            @click="handlePageChange(pagination.page - 1)"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="text-sm page-info">
            {{ pagination.page }} / {{ Math.ceil(pagination.total / pagination.pageSize) }}
          </span>
          <button
            class="p-2 page-btn rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="pagination.page >= Math.ceil(pagination.total / pagination.pageSize)"
            @click="handlePageChange(pagination.page + 1)"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <Modal
      v-model:visible="showModal"
      :title="modalMode === 'create' ? '新增数据' : '编辑数据'"
      width="600px"
    >
      <div class="p-6 space-y-4 max-h-[60vh] overflow-auto">
        <div v-for="field in fields" :key="field.fieldId" class="space-y-1">
          <label class="block text-sm font-medium form-label">
            {{ field.displayName }}
            <span v-if="field.required" class="text-red-500">*</span>
          </label>

          <!-- 文本/数字/日期输入 -->
          <input
            v-if="['text', 'varchar', 'int', 'bigint', 'float', 'double', 'decimal', 'date', 'datetime'].includes(field.fieldType) && !field.isForeignKey"
            :type="getInputType(field.fieldType)"
            v-model="formData[field.fieldName]"
            :placeholder="`请输入${field.displayName}`"
            :required="field.required"
            :step="['float', 'double', 'decimal'].includes(field.fieldType) ? 'any' : undefined"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary form-input"
          />

          <!-- 外键关联选择 -->
          <select
            v-else-if="field.isForeignKey && field.foreignKeyTable"
            v-model="formData[field.fieldName]"
            :required="field.required"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary form-input"
          >
            <option value="">请选择{{ field.displayName }}</option>
            <option
              v-for="item in foreignKeyDataCache[field.foreignKeyTable] || []"
              :key="item.id"
              :value="item.id"
            >
              {{ getForeignKeyDisplayText(item) }}
            </option>
          </select>

          <!-- 多行文本/富文本 -->
          <textarea
            v-else-if="['richtext'].includes(field.fieldType)"
            v-model="formData[field.fieldName]"
            :placeholder="`请输入${field.displayName}`"
            :required="field.required"
            rows="4"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none form-input"
          ></textarea>

          <!-- 布尔值 -->
          <div v-else-if="field.fieldType === 'boolean'" class="flex items-center">
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="formData[field.fieldName]"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <!-- 单选 -->
          <select
            v-else-if="field.fieldType === 'select'"
            v-model="formData[field.fieldName]"
            :required="field.required"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary form-input"
          >
            <option value="">请选择{{ field.displayName }}</option>
            <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>

          <!-- 多选 -->
          <div v-else-if="field.fieldType === 'multiselect'" class="flex flex-wrap gap-2">
            <label
              v-for="opt in field.options"
              :key="opt.value"
              class="inline-flex items-center px-3 py-1 rounded-full border cursor-pointer transition-colors"
              :class="
                (formData[field.fieldName] || []).includes(opt.value)
                  ? 'bg-primary text-white border-primary'
                  : 'multiselect-option'
              "
            >
              <input
                type="checkbox"
                :value="opt.value"
                :checked="(formData[field.fieldName] || []).includes(opt.value)"
                class="sr-only"
                @change="
                  () => {
                    const values = formData[field.fieldName] || []
                    const idx = values.indexOf(opt.value)
                    if (idx > -1) {
                      values.splice(idx, 1)
                    } else {
                      values.push(opt.value)
                    }
                    formData[field.fieldName] = [...values]
                  }
                "
              />
              {{ opt.label }}
            </label>
          </div>

          <!-- 图片/文件URL -->
          <input
            v-else-if="['image', 'file'].includes(field.fieldType)"
            type="url"
            v-model="formData[field.fieldName]"
            :placeholder="`请输入${field.displayName}URL`"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary form-input"
          />

          <!-- JSON对象输入 -->
          <textarea
            v-else-if="field.fieldType === 'json'"
            v-model="formData[field.fieldName]"
            :placeholder="`请输入JSON格式数据，例如：{&quot;key&quot;: &quot;value&quot;}`"
            :required="field.required"
            rows="4"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono text-sm form-input"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 secondary-btn rounded-lg transition-colors"
            @click="showModal = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 primary-btn rounded-lg transition-colors disabled:opacity-50"
            :disabled="saveLoading"
            @click="handleSave"
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
      title="删除数据"
      message="确定要删除此条数据吗？此操作不可恢复。"
      confirm-text="删除"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />

    <!-- 批量删除确认 -->
    <ConfirmDialog
      v-model:visible="showBatchDeleteConfirm"
      type="error"
      title="批量删除"
      :message="`确定要删除选中的 ${selectedIds.length} 条数据吗？此操作不可恢复。`"
      confirm-text="删除"
      :loading="batchDeleteLoading"
      @confirm="confirmBatchDelete"
    />

    <!-- 导入弹窗 -->
    <Modal
      v-model:visible="showImportModal"
      title="导入数据"
      width="500px"
    >
      <div class="p-6 space-y-4">
        <!-- 格式选择 -->
        <div>
          <label class="block text-sm font-medium form-label mb-2">文件格式</label>
          <div class="flex gap-2">
            <button
              v-for="fmt in ['xlsx', 'csv', 'json'] as const"
              :key="fmt"
              class="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
              :class="importFormat === fmt ? 'bg-primary text-white border-primary' : 'format-option'"
              @click="importFormat = fmt"
            >
              <FileSpreadsheet v-if="fmt === 'xlsx'" class="w-4 h-4" />
              <FileText v-else-if="fmt === 'csv'" class="w-4 h-4" />
              <FileJson v-else class="w-4 h-4" />
              {{ fmt.toUpperCase() }}
            </button>
          </div>
        </div>

        <!-- 文件选择 -->
        <div>
          <label class="block text-sm font-medium form-label mb-2">选择文件</label>
          <input
            type="file"
            :accept="importFormat === 'xlsx' ? '.xlsx,.xls' : importFormat === 'csv' ? '.csv' : '.json'"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary form-input"
            @change="handleFileSelect"
          />
          <p v-if="importFile" class="text-sm file-info mt-1">
            已选择: {{ importFile.name }}
          </p>
        </div>

        <!-- 模板下载 -->
        <div class="flex items-center gap-2 text-sm">
          <span class="td-secondary">没有模板？</span>
          <button
            class="text-primary hover:underline"
            @click="handleDownloadTemplate"
          >
            点击下载导入模板
          </button>
        </div>

        <!-- 上传进度 -->
        <div v-if="importLoading" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="td-text">上传进度</span>
            <span class="text-primary">{{ importProgress }}%</span>
          </div>
          <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-primary transition-all duration-300"
              :style="{ width: `${importProgress}%` }"
            ></div>
          </div>
        </div>

        <!-- 导入结果 -->
        <div v-if="importResult" class="space-y-2 p-4 import-result rounded-lg">
          <div class="flex items-center gap-2">
            <span :class="importResult.success ? 'text-green-600' : 'text-red-600'" class="font-medium">
              {{ importResult.success ? '导入完成' : '导入失败' }}
            </span>
          </div>
          <div class="text-sm td-text">
            <p>总记录数: {{ importResult.total }}</p>
            <p>成功导入: {{ importResult.inserted }}</p>
            <p>跳过记录: {{ importResult.skipped }}</p>
          </div>
          <div v-if="importResult.errors.length > 0" class="mt-2">
            <p class="text-sm font-medium text-red-600 mb-1">错误信息:</p>
            <ul class="text-xs text-red-500 space-y-1 max-h-32 overflow-auto">
              <li v-for="err in importResult.errors.slice(0, 10)" :key="err.row">
                第{{ err.row }}行: {{ err.message }}
              </li>
              <li v-if="importResult.errors.length > 10" class="td-secondary">
                ...还有 {{ importResult.errors.length - 10 }} 条错误
              </li>
            </ul>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 secondary-btn rounded-lg transition-colors"
            @click="showImportModal = false"
          >
            关闭
          </button>
          <button
            v-if="!importResult"
            class="px-4 py-2 primary-btn rounded-lg transition-colors disabled:opacity-50"
            :disabled="importLoading || !importFile"
            @click="handleDoImport"
          >
            {{ importLoading ? '导入中...' : '开始导入' }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- 导出弹窗 -->
    <Modal
      v-model:visible="showExportModal"
      title="导出数据"
      width="400px"
    >
      <div class="p-6">
        <p class="text-sm td-text mb-4">请选择导出格式：</p>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="fmt in ['xlsx', 'csv', 'json'] as const"
            :key="fmt"
            class="flex flex-col items-center gap-2 p-4 rounded-lg border export-option transition-colors"
            @click="handleDoExport(fmt)"
          >
            <FileSpreadsheet v-if="fmt === 'xlsx'" class="w-8 h-8 text-green-600" />
            <FileText v-else-if="fmt === 'csv'" class="w-8 h-8 text-blue-600" />
            <FileJson v-else class="w-8 h-8 text-orange-600" />
            <span class="text-sm font-medium td-text">{{ fmt.toUpperCase() }}</span>
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
/* 主题适配样式 */
.data-manage-page {
  background-color: var(--color-bg-layout);
}

.back-btn {
  color: var(--color-text-placeholder);
}

.back-btn:hover {
  color: var(--color-text-secondary);
  background-color: var(--color-bg-active);
}

.page-title {
  color: var(--color-text-primary);
}

.page-desc {
  color: var(--color-text-secondary);
}

.search-icon {
  color: var(--color-text-placeholder);
}

.search-input {
  background-color: var(--color-bg-container);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.secondary-btn {
  background-color: var(--color-bg-active);
  color: var(--color-text-secondary);
}

.secondary-btn:hover {
  background-color: var(--color-border);
}

.danger-btn {
  color: var(--color-error);
  background-color: var(--color-error-bg);
  border: 1px solid var(--color-error-border);
}

.danger-btn:hover {
  background-color: var(--color-error);
  color: white;
}

.outline-btn {
  color: var(--color-text-secondary);
  background-color: var(--color-bg-container);
  border: 1px solid var(--color-border);
}

.outline-btn:hover {
  background-color: var(--color-bg-active);
}

.primary-btn {
  background-color: var(--color-primary);
  color: white;
}

.primary-btn:hover {
  background-color: var(--color-primary-dark);
}

.table-container {
  background-color: var(--color-bg-container);
}

.loading-text,
.empty-text {
  color: var(--color-text-secondary);
}

.table-header {
  background-color: var(--color-bg-active);
  border-color: var(--color-border);
}

.th-text {
  color: var(--color-text-secondary);
}

.table-divider {
  border-color: var(--color-border);
}

.table-row:hover {
  background-color: var(--color-bg-active);
}

.td-id,
.td-secondary {
  color: var(--color-text-placeholder);
}

.td-text {
  color: var(--color-text-primary);
}

.action-btn {
  color: var(--color-text-placeholder);
}

.action-btn:hover {
  color: var(--color-primary);
  background-color: var(--color-bg-active);
}

.delete-btn {
  color: var(--color-text-placeholder);
}

.delete-btn:hover {
  color: var(--color-error);
  background-color: var(--color-error-bg);
}

.page-btn {
  color: var(--color-text-placeholder);
}

.page-btn:hover:not(:disabled) {
  color: var(--color-text-secondary);
  background-color: var(--color-bg-active);
}

.page-info {
  color: var(--color-text-secondary);
}

.form-label {
  color: var(--color-text-primary);
}

.form-input {
  background-color: var(--color-bg-container);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.multiselect-option {
  background-color: var(--color-bg-container);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}

.multiselect-option:hover {
  border-color: var(--color-primary);
}

.format-option {
  background-color: var(--color-bg-container);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}

.format-option:hover {
  border-color: var(--color-primary);
}

.file-info {
  color: var(--color-text-secondary);
}

.import-result {
  background-color: var(--color-bg-active);
}

.export-option {
  border-color: var(--color-border);
}

.export-option:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
}
</style>
