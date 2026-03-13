/**
 * 数据表管理页面
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Edit, Trash2, Eye, Settings, ChevronDown, ChevronUp, Info } from 'lucide-vue-next'
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
import { FIELD_TYPE_OPTIONS, FOREIGN_KEY_ON_DELETE_OPTIONS } from '@/types'
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

// 高级选项展开状态
const showAdvancedOptions = ref(false)

// 外键关联表的字段列表
const foreignKeyTableFields = ref<FieldDefinition[]>([])
const loadingForeignKeyFields = ref(false)

// 表单数据
const tableForm = ref({
  tableName: '',
  displayName: '',
  description: '',
})

// 字段表单数据 - 包含所有新属性
const fieldForm = ref({
  fieldName: '',
  displayName: '',
  fieldType: 'text' as FieldType,
  required: false,
  defaultValue: '',
  options: '',
  relationTable: '',
  // 新增属性
  length: undefined as number | undefined,
  decimalPlaces: undefined as number | undefined,
  isIndex: false,
  isUnique: false,
  isForeignKey: false,
  foreignKeyTable: '',
  foreignKeyField: '',
  foreignKeyOnDelete: 'RESTRICT' as 'CASCADE' | 'SET NULL' | 'RESTRICT',
  isAutoIncrement: false,
  comment: '',
})

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<TableDefinition | null>(null)
const deleteLoading = ref(false)

// 字段删除确认
const showDeleteFieldConfirm = ref(false)
const deleteFieldTarget = ref<FieldDefinition | null>(null)
const deleteFieldLoading = ref(false)

// 当前字段类型信息
const currentFieldType = computed(() => {
  return FIELD_TYPE_OPTIONS.find(opt => opt.value === fieldForm.value.fieldType)
})

// 是否显示长度设置（文本、数字类型）
const showLengthSetting = computed(() => {
  return ['text', 'varchar', 'decimal', 'select', 'image', 'file'].includes(fieldForm.value.fieldType)
})

// 是否显示小数位数（decimal类型）
const showDecimalSetting = computed(() => {
  return fieldForm.value.fieldType === 'decimal'
})

// 是否显示自增选项（整数类型）
const showAutoIncrement = computed(() => {
  return ['int', 'bigint'].includes(fieldForm.value.fieldType)
})

// 是否显示选项配置（单选、多选）
const showOptionsSetting = computed(() => {
  return ['select', 'multiselect'].includes(fieldForm.value.fieldType)
})

// 是否显示关联表设置
const showRelationSetting = computed(() => {
  return fieldForm.value.fieldType === 'relation'
})

// 系统字段（每个动态表都有）
const systemFields = [
  { fieldId: 'sys_id', fieldName: 'id', displayName: '主键ID' },
  { fieldId: 'sys_created_at', fieldName: 'created_at', displayName: '创建时间' },
  { fieldId: 'sys_updated_at', fieldName: 'updated_at', displayName: '更新时间' },
]

// 加载外键关联表的字段列表
const loadForeignKeyTableFields = async (tableName: string) => {
  if (!tableName) {
    foreignKeyTableFields.value = []
    return
  }

  loadingForeignKeyFields.value = true
  try {
    // 根据表名找到表ID
    const table = tableList.value.find(t => t.tableName === tableName)
    if (table) {
      const res = await getTableFields(table.tableId)
      // 合并系统字段和自定义字段
      const customFields = res.data || []
      foreignKeyTableFields.value = [...systemFields, ...customFields]
    } else {
      // 如果找不到表，只显示系统字段
      foreignKeyTableFields.value = systemFields
    }
  } catch (error) {
    console.error('加载外键表字段失败:', error)
    foreignKeyTableFields.value = systemFields
  } finally {
    loadingForeignKeyFields.value = false
  }
}

// 监听外键关联表变化
watch(() => fieldForm.value.foreignKeyTable, (newVal) => {
  if (newVal) {
    loadForeignKeyTableFields(newVal)
    // 清空已选字段
    fieldForm.value.foreignKeyField = ''
  } else {
    foreignKeyTableFields.value = []
  }
})

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
    // 重置表单
    resetFieldForm()
  } catch (error) {
    console.error('加载字段列表失败:', error)
  }
}

// 重置字段表单
const resetFieldForm = () => {
  fieldMode.value = 'create'
  currentField.value = null
  showAdvancedOptions.value = false
  fieldForm.value = {
    fieldName: '',
    displayName: '',
    fieldType: 'text',
    required: false,
    defaultValue: '',
    options: '',
    relationTable: '',
    length: undefined,
    decimalPlaces: undefined,
    isIndex: false,
    isUnique: false,
    isForeignKey: false,
    foreignKeyTable: '',
    foreignKeyField: '',
    foreignKeyOnDelete: 'RESTRICT',
    isAutoIncrement: false,
    comment: '',
  }
  // 清空外键表字段列表
  foreignKeyTableFields.value = []
}

// 打开添加字段弹窗
const handleAddField = () => {
  resetFieldForm()
}

// 编辑字段
const handleEditField = (field: FieldDefinition) => {
  fieldMode.value = 'edit'
  currentField.value = field

  // 确保字段类型在选项列表中，如果不在则转换为小写或设置默认值
  let fieldType = field.fieldType
  const validTypes = FIELD_TYPE_OPTIONS.map(opt => opt.value)
  if (!fieldType || !validTypes.includes(fieldType)) {
    // 尝试转换为小写匹配
    const lowerType = fieldType?.toLowerCase()
    if (validTypes.includes(lowerType as FieldType)) {
      fieldType = lowerType as FieldType
    } else {
      // 根据数据库类型推断
      const dbTypeMap: Record<string, FieldType> = {
        'TEXT': 'text',
        'VARCHAR': 'varchar',
        'INT': 'int',
        'BIGINT': 'bigint',
        'FLOAT': 'float',
        'DOUBLE': 'double',
        'DECIMAL': 'decimal',
        'TINYINT': 'boolean',
        'DATE': 'date',
        'DATETIME': 'datetime',
        'JSON': 'json',
      }
      fieldType = dbTypeMap[fieldType?.toUpperCase() || ''] || 'text'
    }
  }

  fieldForm.value = {
    fieldName: field.fieldName,
    displayName: field.displayName,
    fieldType: fieldType as FieldType,
    required: field.required,
    defaultValue: field.defaultValue || '',
    options: field.options ? JSON.stringify(field.options) : '',
    relationTable: field.relationTable || '',
    length: field.length,
    decimalPlaces: field.decimalPlaces,
    isIndex: field.isIndex || false,
    isUnique: field.isUnique || false,
    isForeignKey: field.isForeignKey || false,
    foreignKeyTable: field.foreignKeyTable || '',
    foreignKeyField: field.foreignKeyField || '',
    foreignKeyOnDelete: field.foreignKeyOnDelete || 'RESTRICT',
    isAutoIncrement: field.isAutoIncrement || false,
    comment: field.comment || '',
  }
  // 如果有高级选项值，自动展开
  if (field.length || field.isIndex || field.isUnique || field.isForeignKey || field.comment) {
    showAdvancedOptions.value = true
  }
  // 如果有外键表，加载字段列表
  if (field.foreignKeyTable) {
    loadForeignKeyTableFields(field.foreignKeyTable)
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

  // 验证字段名格式
  const fieldNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/
  if (!fieldNameRegex.test(fieldForm.value.fieldName)) {
    alert('字段名只能包含字母、数字和下划线，且必须以字母或下划线开头')
    return
  }

  // 外键验证
  if (fieldForm.value.isForeignKey) {
    if (!fieldForm.value.foreignKeyTable || !fieldForm.value.foreignKeyField) {
      alert('请填写外键关联表和关联字段')
      return
    }
  }

  saveFieldLoading.value = true
  try {
    const data: Record<string, unknown> = {
      fieldName: fieldForm.value.fieldName,
      displayName: fieldForm.value.displayName,
      fieldType: fieldForm.value.fieldType,
      required: fieldForm.value.required,
    }

    // 可选字段
    if (fieldForm.value.defaultValue) {
      data.defaultValue = fieldForm.value.defaultValue
    }
    if (fieldForm.value.options && showOptionsSetting.value) {
      try {
        data.options = JSON.parse(fieldForm.value.options)
      } catch (e) {
        alert('选项配置JSON格式错误')
        saveFieldLoading.value = false
        return
      }
    }
    if (fieldForm.value.relationTable && showRelationSetting.value) {
      data.relationTable = fieldForm.value.relationTable
    }

    // 新增属性
    if (fieldForm.value.length && showLengthSetting.value) {
      data.length = fieldForm.value.length
    }
    if (fieldForm.value.decimalPlaces && showDecimalSetting.value) {
      data.decimalPlaces = fieldForm.value.decimalPlaces
    }
    data.isIndex = fieldForm.value.isIndex
    data.isUnique = fieldForm.value.isUnique
    data.isForeignKey = fieldForm.value.isForeignKey
    if (fieldForm.value.isForeignKey) {
      data.foreignKeyTable = fieldForm.value.foreignKeyTable
      data.foreignKeyField = fieldForm.value.foreignKeyField
      data.foreignKeyOnDelete = fieldForm.value.foreignKeyOnDelete
    }
    data.isAutoIncrement = fieldForm.value.isAutoIncrement && showAutoIncrement.value
    if (fieldForm.value.comment) {
      data.comment = fieldForm.value.comment
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
    resetFieldForm()
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

// 获取字段类型显示名称
const getFieldTypeName = (type: FieldType) => {
  const opt = FIELD_TYPE_OPTIONS.find(o => o.value === type)
  return opt ? opt.label : type
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 字段类型变更时的默认值处理
watch(() => fieldForm.value.fieldType, (newType) => {
  // 根据类型设置默认长度
  if (newType === 'text' && !fieldForm.value.length) {
    fieldForm.value.length = 255
  } else if (newType === 'number' && !fieldForm.value.length) {
    fieldForm.value.length = 10
  }
  // 重置不适用的属性
  if (newType !== 'number') {
    fieldForm.value.decimalPlaces = undefined
    fieldForm.value.isAutoIncrement = false
  }
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
    <Modal v-model:visible="showFieldModal" :title="`字段管理 - ${currentTable?.displayName}`" width="800px">
      <div class="p-6">
        <!-- 添加字段表单 -->
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-gray-700">
              {{ fieldMode === 'create' ? '添加新字段' : '编辑字段' }}
              <span v-if="currentFieldType" class="text-xs text-gray-400 ml-2">
                ({{ currentFieldType.dbType }})
              </span>
            </h4>
            <div v-if="fieldMode === 'edit'" class="flex gap-2">
              <button
                class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                @click="handleAddField"
              >
                取消编辑
              </button>
            </div>
          </div>

          <!-- 基础属性 -->
          <div class="grid grid-cols-3 gap-3 mb-3">
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
                <option v-for="opt in FIELD_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- 类型相关属性 -->
          <div class="grid grid-cols-4 gap-3 mb-3">
            <!-- 长度 -->
            <div v-if="showLengthSetting">
              <label class="block text-xs text-gray-500 mb-1">长度</label>
              <input
                v-model.number="fieldForm.length"
                type="number"
                min="1"
                placeholder="长度"
                class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <!-- 小数位数 -->
            <div v-if="showDecimalSetting">
              <label class="block text-xs text-gray-500 mb-1">小数位</label>
              <input
                v-model.number="fieldForm.decimalPlaces"
                type="number"
                min="0"
                max="30"
                placeholder="小数位"
                class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <!-- 默认值 -->
            <div>
              <label class="block text-xs text-gray-500 mb-1">默认值</label>
              <input
                v-model="fieldForm.defaultValue"
                type="text"
                placeholder="可选"
                class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <!-- 必填 -->
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input
                  v-model="fieldForm.required"
                  type="checkbox"
                  class="rounded border-gray-300 text-primary focus:ring-primary"
                />
                必填字段
              </label>
            </div>
          </div>

          <!-- 选项配置 -->
          <div v-if="showOptionsSetting" class="mb-3">
            <label class="block text-xs text-gray-500 mb-1">选项配置 (JSON格式)</label>
            <input
              v-model="fieldForm.options"
              type="text"
              placeholder='[{"label":"选项1","value":"1"},{"label":"选项2","value":"2"}]'
              class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <!-- 关联表设置 -->
          <div v-if="showRelationSetting" class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">关联表</label>
              <select
                v-model="fieldForm.relationTable"
                class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">请选择</option>
                <option v-for="table in tableList" :key="table.tableId" :value="table.tableName">
                  {{ table.displayName }} ({{ table.tableName }})
                </option>
              </select>
            </div>
          </div>

          <!-- 高级选项 -->
          <div class="border-t border-gray-200 pt-3 mt-3">
            <button
              class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              @click="showAdvancedOptions = !showAdvancedOptions"
            >
              <ChevronDown v-if="!showAdvancedOptions" class="w-3 h-3" />
              <ChevronUp v-else class="w-3 h-3" />
              高级选项
            </button>

            <div v-if="showAdvancedOptions" class="mt-3 space-y-3">
              <!-- 约束选项 -->
              <div class="grid grid-cols-4 gap-3">
                <label class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input
                    v-model="fieldForm.isIndex"
                    type="checkbox"
                    class="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  建立索引
                </label>
                <label class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input
                    v-model="fieldForm.isUnique"
                    type="checkbox"
                    class="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  唯一约束
                </label>
                <label v-if="showAutoIncrement" class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input
                    v-model="fieldForm.isAutoIncrement"
                    type="checkbox"
                    class="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  自增
                </label>
                <label class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input
                    v-model="fieldForm.isForeignKey"
                    type="checkbox"
                    class="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  外键约束
                </label>
              </div>

              <!-- 外键设置 -->
              <div v-if="fieldForm.isForeignKey" class="bg-white p-3 rounded border border-gray-200">
                <div class="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Info class="w-3 h-3" />
                  外键关联设置
                </div>
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">关联表</label>
                    <select
                      v-model="fieldForm.foreignKeyTable"
                      class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">请选择</option>
                      <option v-for="table in tableList" :key="table.tableId" :value="table.tableName">
                        {{ table.displayName }} ({{ table.tableName }})
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">关联字段</label>
                    <select
                      v-model="fieldForm.foreignKeyField"
                      :disabled="!fieldForm.foreignKeyTable"
                      class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">{{ loadingForeignKeyFields ? '加载中...' : '请先选择关联表' }}</option>
                      <option v-for="field in foreignKeyTableFields" :key="field.fieldId" :value="field.fieldName">
                        {{ field.displayName }} ({{ field.fieldName }})
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">删除行为</label>
                    <select
                      v-model="fieldForm.foreignKeyOnDelete"
                      class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option v-for="opt in FOREIGN_KEY_ON_DELETE_OPTIONS" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- 字段注释 -->
              <div>
                <label class="block text-xs text-gray-500 mb-1">字段注释</label>
                <input
                  v-model="fieldForm.comment"
                  type="text"
                  placeholder="字段的业务含义说明"
                  class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <!-- 保存按钮 -->
          <div class="flex justify-end mt-3">
            <button
              class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
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
                <th class="text-left px-4 py-2 text-xs font-medium text-gray-500">长度</th>
                <th class="text-left px-4 py-2 text-xs font-medium text-gray-500">约束</th>
                <th class="text-left px-4 py-2 text-xs font-medium text-gray-500">必填</th>
                <th class="text-right px-4 py-2 text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="field in currentFields" :key="field.fieldId" class="hover:bg-gray-50">
                <td class="px-4 py-2 text-sm font-mono text-gray-800">{{ field.fieldName }}</td>
                <td class="px-4 py-2 text-sm text-gray-600">{{ field.displayName }}</td>
                <td class="px-4 py-2">
                  <span class="text-sm text-gray-500">{{ getFieldTypeName(field.fieldType) }}</span>
                </td>
                <td class="px-4 py-2 text-sm text-gray-500">
                  <span v-if="field.length">{{ field.length }}<span v-if="field.decimalPlaces">,{{ field.decimalPlaces }}</span></span>
                  <span v-else>-</span>
                </td>
                <td class="px-4 py-2">
                  <div class="flex flex-wrap gap-1">
                    <span v-if="field.isIndex" class="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">索引</span>
                    <span v-if="field.isUnique" class="px-1.5 py-0.5 text-xs bg-purple-50 text-purple-600 rounded">唯一</span>
                    <span v-if="field.isAutoIncrement" class="px-1.5 py-0.5 text-xs bg-green-50 text-green-600 rounded">自增</span>
                    <span v-if="field.isForeignKey" class="px-1.5 py-0.5 text-xs bg-orange-50 text-orange-600 rounded">外键</span>
                  </div>
                </td>
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
