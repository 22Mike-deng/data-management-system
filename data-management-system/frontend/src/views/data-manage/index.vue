/**
 * 数据管理页面（动态CRUD）
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Edit, Trash2, Download, Upload, ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { getTableById, getTableFields } from '@/api/table-meta'
import { getDataList, createData, updateData, deleteData, batchDeleteData, createDynamicTable } from '@/api/dynamic-data'
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

// 加载表结构
const loadTableInfo = async () => {
  try {
    const res = await getTableById(tableId.value)
    tableInfo.value = res.data
    // 加载字段
    const fieldsRes = await getTableFields(tableId.value)
    fields.value = fieldsRes.data || []
  } catch (error) {
    console.error('加载表结构失败:', error)
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
  fields.value.forEach(field => {
    if (field.defaultValue) {
      formData.value[field.fieldName] = field.defaultValue
    } else if (field.fieldType === 'boolean') {
      formData.value[field.fieldName] = false
    } else if (['number'].includes(field.fieldType)) {
      formData.value[field.fieldName] = null
    } else {
      formData.value[field.fieldName] = ''
    }
  })
}

// 新增数据
const handleAdd = () => {
  modalMode.value = 'create'
  currentData.value = null
  resetFormData()
  showModal.value = true
}

// 编辑数据
const handleEdit = (row: any) => {
  modalMode.value = 'edit'
  currentData.value = row
  formData.value = { ...row }
  showModal.value = true
}

// 保存数据
const handleSave = async () => {
  saveLoading.value = true
  try {
    if (modalMode.value === 'create') {
      await createData(tableId.value, formData.value)
    } else if (currentData.value?.id) {
      await updateData(tableId.value, currentData.value.id, formData.value)
    }
    showModal.value = false
    loadData()
  } catch (error) {
    console.error('保存数据失败:', error)
    alert('保存失败，请重试')
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
  } catch (error) {
    console.error('删除数据失败:', error)
    alert('删除失败，请重试')
  } finally {
    deleteLoading.value = false
  }
}

// 批量删除
const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) {
    alert('请先选择要删除的数据')
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
  } catch (error) {
    console.error('批量删除失败:', error)
    alert('删除失败，请重试')
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
  alert('导入功能开发中...')
}

// 导出数据
const handleExport = () => {
  // 简单的CSV导出
  if (dataList.value.length === 0) {
    alert('没有数据可导出')
    return
  }
  
  const headers = fields.value.map(f => f.displayName).join(',')
  const rows = dataList.value.map(row => 
    fields.value.map(f => {
      const val = row[f.fieldName]
      if (val === null || val === undefined) return ''
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val}"`
      }
      return val
    }).join(',')
  )
  
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${tableInfo.value?.tableName || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// 返回
const goBack = () => {
  router.push('/table-manage')
}

// 格式化显示值
const formatValue = (value: any, field: FieldDefinition) => {
  if (value === null || value === undefined) return '-'
  
  switch (field.fieldType) {
    case 'boolean':
      return value ? '是' : '否'
    case 'date':
      return new Date(value).toLocaleDateString('zh-CN')
    case 'select':
      const opt = field.options?.find(o => o.value === value)
      return opt?.label || value
    case 'multiselect':
      if (!Array.isArray(value)) return value
      return value.map(v => {
        const o = field.options?.find(opt => opt.value === v)
        return o?.label || v
      }).join(', ')
    default:
      return value
  }
}

// 字段类型映射
const getInputType = (type: FieldType): string => {
  const typeMap: Record<string, string> = {
    text: 'text',
    number: 'number',
    date: 'date',
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
  <div class="space-y-6 animate-fadeIn">
    <!-- 顶部导航 -->
    <div class="flex items-center gap-3">
      <button
        class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        @click="goBack"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div>
        <h2 class="text-xl font-semibold text-gray-800">{{ tableInfo?.displayName || '数据管理' }}</h2>
        <p class="text-sm text-gray-500">{{ tableInfo?.description || '管理数据表中的数据记录' }}</p>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- 搜索框 -->
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索..."
            class="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64"
            @keyup.enter="handleSearch"
          />
        </div>
        <button
          class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          @click="handleSearch"
        >
          搜索
        </button>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="selectedIds.length > 0"
          class="flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          @click="handleBatchDelete"
        >
          <Trash2 class="w-4 h-4" />
          <span>删除 ({{ selectedIds.length }})</span>
        </button>
        <button
          class="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          @click="handleImport"
        >
          <Upload class="w-4 h-4" />
          <span>导入</span>
        </button>
        <button
          class="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          @click="handleExport"
        >
          <Download class="w-4 h-4" />
          <span>导出</span>
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          @click="handleAdd"
        >
          <Plus class="w-4 h-4" />
          <span>新增数据</span>
        </button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-500">
        加载中...
      </div>
      <div v-else-if="dataList.length === 0" class="p-8 text-center">
        <p class="text-gray-500 mb-4">暂无数据</p>
        <button
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          @click="handleAdd"
        >
          添加第一条数据
        </button>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="text-left px-4 py-3 w-12">
                <input
                  type="checkbox"
                  :checked="selectedIds.length === dataList.length && dataList.length > 0"
                  class="rounded border-gray-300 text-primary focus:ring-primary"
                  @change="handleSelectAll"
                />
              </th>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-600 w-20">ID</th>
              <th
                v-for="field in fields.filter(f => !['image', 'file', 'richtext'].includes(f.fieldType))"
                :key="field.fieldId"
                class="text-left px-4 py-3 text-sm font-medium text-gray-600"
              >
                {{ field.displayName }}
              </th>
              <th class="text-right px-4 py-3 text-sm font-medium text-gray-600 w-32">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="row in dataList" :key="row.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(row.id)"
                  class="rounded border-gray-300 text-primary focus:ring-primary"
                  @change="handleSelect(row.id)"
                />
              </td>
              <td class="px-4 py-3 text-sm text-gray-500 font-mono">{{ row.id }}</td>
              <td
                v-for="field in fields.filter(f => !['image', 'file', 'richtext'].includes(f.fieldType))"
                :key="field.fieldId"
                class="px-4 py-3 text-sm text-gray-800"
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
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    class="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                    @click="handleEdit(row)"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                  <button
                    class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
      <div v-if="pagination.total > 0" class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div class="text-sm text-gray-500">
          共 {{ pagination.total }} 条记录
        </div>
        <div class="flex items-center gap-2">
          <button
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="pagination.page <= 1"
            @click="handlePageChange(pagination.page - 1)"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="text-sm text-gray-600">
            {{ pagination.page }} / {{ Math.ceil(pagination.total / pagination.pageSize) }}
          </span>
          <button
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
          <label class="block text-sm font-medium text-gray-700">
            {{ field.displayName }}
            <span v-if="field.required" class="text-red-500">*</span>
          </label>

          <!-- 文本输入 -->
          <input
            v-if="['text', 'number', 'date'].includes(field.fieldType)"
            :type="getInputType(field.fieldType)"
            v-model="formData[field.fieldName]"
            :placeholder="`请输入${field.displayName}`"
            :required="field.required"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />

          <!-- 多行文本/富文本 -->
          <textarea
            v-else-if="['richtext'].includes(field.fieldType)"
            v-model="formData[field.fieldName]"
            :placeholder="`请输入${field.displayName}`"
            :required="field.required"
            rows="4"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
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
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
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
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            @click="showModal = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
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
  </div>
</template>
