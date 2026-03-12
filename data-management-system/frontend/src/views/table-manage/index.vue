/**
 * 数据表管理页面
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Edit, Trash2, Eye, Settings, ChevronRight } from 'lucide-vue-next'
import {
  getTableList,
  getTableFields,
  createTable,
  updateTable,
  deleteTable,
  addField,
  updateField,
  deleteField,
} from '@/api/table-meta'
import { createDynamicTable } from '@/api/dynamic-data'
import type { TableDefinition, FieldDefinition, FieldType } from '@/types'
import Modal from '@/components/Modal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const router = useRouter()

// 数据表列表
const tableList = ref<TableDefinition[]>([])
const loading = ref(false)

// 弹窗状态
const showTableModal = ref(false)
const showFieldModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const currentTable = ref<TableDefinition | null>(null)
const currentFields = ref<FieldDefinition[]>([])
const currentField = ref<FieldDefinition | null>(null)
const fieldMode = ref<'create' | 'edit'>('create')

// 表单数据
const tableForm = ref({
  tableName: '',
  displayName: '',
  description: '',
})
const fieldForm = ref({
  fieldName: '',
  displayName: '',
  fieldType: 'text' as FieldType,
  required: false,
  defaultValue: '',
  options: '',
  relationTable: '',
})

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<TableDefinition | null>(null)
const deleteLoading = ref(false)

// 字段删除确认
const showDeleteFieldConfirm = ref(false)
const deleteFieldTarget = ref<FieldDefinition | null>(null)
const deleteFieldLoading = ref(false)

// 字段类型选项
const fieldTypeOptions = [
  { label: '文本', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '布尔值', value: 'boolean' },
  { label: '日期', value: 'date' },
  { label: '单选', value: 'select' },
  { label: '多选', value: 'multiselect' },
  { label: '富文本', value: 'richtext' },
  { label: '图片', value: 'image' },
  { label: '文件', value: 'file' },
  { label: '关联', value: 'relation' },
]

// 加载数据表列表
const loadTableList = async () => {
  loading.value = true
  try {
    const res = await getTableList()
    tableList.value = res.data || []
  } catch (error) {
    console.error('加载数据表列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 打开创建表弹窗
const handleCreate = () => {
  modalMode.value = 'create'
  currentTable.value = null
  tableForm.value = {
    tableName: '',
    displayName: '',
    description: '',
  }
  showTableModal.value = true
}

// 打开编辑表弹窗
const handleEdit = (table: TableDefinition) => {
  modalMode.value = 'edit'
  currentTable.value = table
  tableForm.value = {
    tableName: table.tableName,
    displayName: table.displayName,
    description: table.description || '',
  }
  showTableModal.value = true
}

// 保存数据表
const saveTableLoading = ref(false)
const handleSaveTable = async () => {
  if (!tableForm.value.tableName || !tableForm.value.displayName) {
    alert('请填写表名称和显示名称')
    return
  }

  saveTableLoading.value = true
  try {
    if (modalMode.value === 'create') {
      await createTable(tableForm.value)
    } else if (currentTable.value) {
      await updateTable(currentTable.value.tableId, {
        displayName: tableForm.value.displayName,
        description: tableForm.value.description,
      })
    }
    showTableModal.value = false
    loadTableList()
  } catch (error) {
    console.error('保存数据表失败:', error)
    alert('保存失败，请重试')
  } finally {
    saveTableLoading.value = false
  }
}

// 删除数据表
const handleDelete = (table: TableDefinition) => {
  deleteTarget.value = table
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await deleteTable(deleteTarget.value.tableId)
    showDeleteConfirm.value = false
    loadTableList()
  } catch (error) {
    console.error('删除数据表失败:', error)
    alert('删除失败，请重试')
  } finally {
    deleteLoading.value = false
  }
}

// 查看表数据
const handleViewData = (table: TableDefinition) => {
  router.push(`/data-manage/${table.tableId}`)
}

// 管理字段
const handleManageFields = async (table: TableDefinition) => {
  currentTable.value = table
  try {
    const res = await getTableFields(table.tableId)
    currentFields.value = res.data || []
    showFieldModal.value = true
  } catch (error) {
    console.error('加载字段列表失败:', error)
  }
}

// 打开添加字段弹窗
const handleAddField = () => {
  fieldMode.value = 'create'
  currentField.value = null
  fieldForm.value = {
    fieldName: '',
    displayName: '',
    fieldType: 'text',
    required: false,
    defaultValue: '',
    options: '',
    relationTable: '',
  }
}

// 编辑字段
const handleEditField = (field: FieldDefinition) => {
  fieldMode.value = 'edit'
  currentField.value = field
  fieldForm.value = {
    fieldName: field.fieldName,
    displayName: field.displayName,
    fieldType: field.fieldType,
    required: field.required,
    defaultValue: field.defaultValue || '',
    options: field.options ? JSON.stringify(field.options) : '',
    relationTable: field.relationTable || '',
  }
}

// 保存字段
const saveFieldLoading = ref(false)
const handleSaveField = async () => {
  if (!currentTable.value) return
  if (!fieldForm.value.fieldName || !fieldForm.value.displayName) {
    alert('请填写字段名称和显示名称')
    return
  }

  saveFieldLoading.value = true
  try {
    const data = {
      fieldName: fieldForm.value.fieldName,
      displayName: fieldForm.value.displayName,
      fieldType: fieldForm.value.fieldType,
      required: fieldForm.value.required,
      defaultValue: fieldForm.value.defaultValue || undefined,
      options: fieldForm.value.options ? JSON.parse(fieldForm.value.options) : undefined,
      relationTable: fieldForm.value.relationTable || undefined,
    }

    if (fieldMode.value === 'create') {
      await addField(currentTable.value.tableId, data)
      // 创建实际数据库表
      await createDynamicTable(currentTable.value.tableId)
    } else if (currentField.value) {
      await updateField(currentField.value.fieldId, data)
    }

    // 重新加载字段
    const res = await getTableFields(currentTable.value.tableId)
    currentFields.value = res.data || []

    // 重置表单
    fieldMode.value = 'create'
    currentField.value = null
  } catch (error) {
    console.error('保存字段失败:', error)
    alert('保存失败，请重试')
  } finally {
    saveFieldLoading.value = false
  }
}

// 删除字段
const handleDeleteField = (field: FieldDefinition) => {
  deleteFieldTarget.value = field
  showDeleteFieldConfirm.value = true
}

const confirmDeleteField = async () => {
  if (!deleteFieldTarget.value || !currentTable.value) return
  deleteFieldLoading.value = true
  try {
    await deleteField(deleteFieldTarget.value.fieldId)
    showDeleteFieldConfirm.value = false
    // 重新加载字段
    const res = await getTableFields(currentTable.value.tableId)
    currentFields.value = res.data || []
  } catch (error) {
    console.error('删除字段失败:', error)
    alert('删除失败，请重试')
  } finally {
    deleteFieldLoading.value = false
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
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
        <h2 class="text-xl font-semibold text-gray-800">数据表管理</h2>
        <p class="text-sm text-gray-500 mt-1">创建和管理您的数据表结构</p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        @click="handleCreate"
      >
        <Plus class="w-4 h-4" />
        <span>新建数据表</span>
      </button>
    </div>

    <!-- 表格区域 -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-500">
        加载中...
      </div>
      <div v-else-if="tableList.length === 0" class="p-8 text-center">
        <div class="text-gray-400 mb-4">
          <Eye class="w-12 h-12 mx-auto" />
        </div>
        <p class="text-gray-500 mb-4">暂无数据表</p>
        <button
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          @click="handleCreate"
        >
          创建第一个数据表
        </button>
      </div>
      <table v-else class="w-full">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="text-left px-6 py-4 text-sm font-medium text-gray-600">表名称</th>
            <th class="text-left px-6 py-4 text-sm font-medium text-gray-600">显示名称</th>
            <th class="text-left px-6 py-4 text-sm font-medium text-gray-600">描述</th>
            <th class="text-left px-6 py-4 text-sm font-medium text-gray-600">创建时间</th>
            <th class="text-right px-6 py-4 text-sm font-medium text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="table in tableList" :key="table.tableId" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm text-gray-800 font-mono">{{ table.tableName }}</td>
            <td class="px-6 py-4 text-sm text-gray-600">{{ table.displayName }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ table.description || '-' }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ formatDate(table.createdAt) }}</td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  class="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                  title="查看数据"
                  @click="handleViewData(table)"
                >
                  <Eye class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                  title="管理字段"
                  @click="handleManageFields(table)"
                >
                  <Settings class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                  title="编辑"
                  @click="handleEdit(table)"
                >
                  <Edit class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除"
                  @click="handleDelete(table)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 创建/编辑数据表弹窗 -->
    <Modal v-model:visible="showTableModal" :title="modalMode === 'create' ? '新建数据表' : '编辑数据表'">
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            表名称 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="tableForm.tableName"
            type="text"
            placeholder="例如: user_info"
            :disabled="modalMode === 'edit'"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50"
          />
          <p class="text-xs text-gray-400 mt-1">使用英文、数字和下划线，创建后不可修改</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            显示名称 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="tableForm.displayName"
            type="text"
            placeholder="例如: 用户信息"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <textarea
            v-model="tableForm.description"
            rows="3"
            placeholder="请输入数据表描述"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            @click="showTableModal = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            :disabled="saveTableLoading"
            @click="handleSaveTable"
          >
            {{ saveTableLoading ? '保存中...' : '保存' }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- 字段管理弹窗 -->
    <Modal v-model:visible="showFieldModal" :title="`字段管理 - ${currentTable?.displayName}`" width="700px">
      <div class="p-6">
        <!-- 添加字段表单 -->
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 class="text-sm font-medium text-gray-700 mb-3">
            {{ fieldMode === 'create' ? '添加新字段' : '编辑字段' }}
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">字段名 <span class="text-red-500">*</span></label>
              <input
                v-model="fieldForm.fieldName"
                type="text"
                placeholder="例如: user_name"
                :disabled="fieldMode === 'edit'"
                class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-100"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">显示名称 <span class="text-red-500">*</span></label>
              <input
                v-model="fieldForm.displayName"
                type="text"
                placeholder="例如: 用户名"
                class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">字段类型</label>
              <select
                v-model="fieldForm.fieldType"
                class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option v-for="opt in fieldTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">默认值</label>
              <input
                v-model="fieldForm.defaultValue"
                type="text"
                placeholder="可选"
                class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div class="col-span-2">
              <label class="flex items-center gap-2 text-xs text-gray-500">
                <input
                  v-model="fieldForm.required"
                  type="checkbox"
                  class="rounded border-gray-300 text-primary focus:ring-primary"
                />
                必填字段
              </label>
            </div>
            <div v-if="['select', 'multiselect'].includes(fieldForm.fieldType)" class="col-span-2">
              <label class="block text-xs text-gray-500 mb-1">选项配置 (JSON格式)</label>
              <input
                v-model="fieldForm.options"
                type="text"
                placeholder='[{"label":"选项1","value":"1"}]'
                class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          <div class="flex justify-end mt-3 gap-2">
            <button
              v-if="fieldMode === 'edit'"
              class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              @click="handleAddField"
            >
              取消编辑
            </button>
            <button
              class="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary-dark transition-colors disabled:opacity-50"
              :disabled="saveFieldLoading"
              @click="handleSaveField"
            >
              {{ saveFieldLoading ? '保存中...' : fieldMode === 'create' ? '添加字段' : '保存修改' }}
            </button>
          </div>
        </div>

        <!-- 字段列表 -->
        <div class="border border-gray-200 rounded-lg overflow-hidden">
          <div v-if="currentFields.length === 0" class="p-4 text-center text-gray-400 text-sm">
            暂无字段，请添加
          </div>
          <table v-else class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="text-left px-4 py-2 text-xs font-medium text-gray-500">字段名</th>
                <th class="text-left px-4 py-2 text-xs font-medium text-gray-500">显示名称</th>
                <th class="text-left px-4 py-2 text-xs font-medium text-gray-500">类型</th>
                <th class="text-left px-4 py-2 text-xs font-medium text-gray-500">必填</th>
                <th class="text-right px-4 py-2 text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="field in currentFields" :key="field.fieldId" class="hover:bg-gray-50">
                <td class="px-4 py-2 text-sm font-mono text-gray-800">{{ field.fieldName }}</td>
                <td class="px-4 py-2 text-sm text-gray-600">{{ field.displayName }}</td>
                <td class="px-4 py-2 text-sm text-gray-500">{{ fieldTypeOptions.find(o => o.value === field.fieldType)?.label || field.fieldType }}</td>
                <td class="px-4 py-2 text-sm">
                  <span :class="field.required ? 'text-red-500' : 'text-gray-400'">
                    {{ field.required ? '是' : '否' }}
                  </span>
                </td>
                <td class="px-4 py-2 text-right">
                  <button
                    class="p-1 text-gray-400 hover:text-primary"
                    @click="handleEditField(field)"
                  >
                    <Edit class="w-3.5 h-3.5" />
                  </button>
                  <button
                    class="p-1 text-gray-400 hover:text-red-500"
                    @click="handleDeleteField(field)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      type="error"
      title="删除数据表"
      :message="`确定要删除数据表「${deleteTarget?.displayName}」吗？此操作不可恢复。`"
      confirm-text="删除"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />

    <!-- 删除字段确认对话框 -->
    <ConfirmDialog
      v-model:visible="showDeleteFieldConfirm"
      type="error"
      title="删除字段"
      :message="`确定要删除字段「${deleteFieldTarget?.displayName}」吗？此操作不可恢复。`"
      confirm-text="删除"
      :loading="deleteFieldLoading"
      @confirm="confirmDeleteField"
    />
  </div>
</template>
