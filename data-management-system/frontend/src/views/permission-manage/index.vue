<template>
  <div class="permission-manage-page p-6">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-800">权限管理</h1>
      <p class="mt-1 text-sm text-gray-500">管理系统权限，控制用户访问和操作</p>
    </div>

    <!-- 操作栏 -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <t-input v-model="searchKeyword" placeholder="搜索权限名称或编码" class="w-64">
          <template #prefix-icon>
            <search-icon />
          </template>
        </t-input>
      </div>
      <t-button theme="primary" @click="openCreateDialog">
        <template #icon><add-icon /></template>
        新建权限
      </t-button>
    </div>

    <!-- 权限列表 -->
    <t-card :bordered="false" class="shadow-sm">
      <t-table
        :data="filteredPermissions"
        :columns="columns"
        :loading="loading"
        row-key="id"
        hover
        stripe
      >
        <template #name="{ row }">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ row.name }}</span>
            <t-tag v-if="row.type === 'menu'" theme="primary" size="small">菜单</t-tag>
            <t-tag v-else-if="row.type === 'button'" theme="success" size="small">按钮</t-tag>
            <t-tag v-else theme="warning" size="small">接口</t-tag>
          </div>
        </template>
        <template #code="{ row }">
          <t-tag variant="light" theme="primary">{{ row.code }}</t-tag>
        </template>
        <template #routePath="{ row }">
          <span class="text-gray-600">{{ row.routePath || '-' }}</span>
        </template>
        <template #status="{ row }">
          <t-tag :theme="row.status === 0 ? 'success' : 'danger'" variant="light">
            {{ row.status === 0 ? '正常' : '禁用' }}
          </t-tag>
        </template>
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" hover="color" @click="openEditDialog(row)">
              编辑
            </t-link>
            <t-popconfirm
              content="确定删除该权限吗？"
              @confirm="handleDelete(row.id)"
            >
              <t-link theme="danger" hover="color">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 创建/编辑权限对话框 -->
    <t-dialog
      v-model:visible="permissionDialogVisible"
      :header="isEdit ? '编辑权限' : '新建权限'"
      :confirm-btn="{ content: '确定', theme: 'primary' }"
      :on-confirm="handleSubmit"
      width="500px"
    >
      <t-form :data="permissionForm" :rules="permissionRules" ref="permissionFormRef" label-align="right">
        <t-form-item label="权限编码" name="code">
          <t-input
            v-model="permissionForm.code"
            placeholder="请输入权限编码（如 user:create）"
            :disabled="isEdit"
          />
        </t-form-item>
        <t-form-item label="权限名称" name="name">
          <t-input v-model="permissionForm.name" placeholder="请输入权限名称" />
        </t-form-item>
        <t-form-item label="权限类型" name="type">
          <t-select v-model="permissionForm.type" placeholder="请选择权限类型">
            <t-option value="menu" label="菜单" />
            <t-option value="button" label="按钮" />
            <t-option value="api" label="接口" />
          </t-select>
        </t-form-item>
        <t-form-item label="父级权限" name="parentId">
          <t-select
            v-model="permissionForm.parentId"
            placeholder="请选择父级权限（可选）"
            clearable
          >
            <t-option
              v-for="p in parentPermissions"
              :key="p.id"
              :value="p.id"
              :label="p.name"
            />
          </t-select>
        </t-form-item>
        <t-form-item label="路由路径" name="routePath">
          <t-input v-model="permissionForm.routePath" placeholder="请输入路由路径（如 /user-manage）" />
        </t-form-item>
        <t-form-item label="排序号" name="sort">
          <t-input-number v-model="permissionForm.sort" :min="0" />
        </t-form-item>
        <t-form-item label="描述" name="description">
          <t-textarea
            v-model="permissionForm.description"
            placeholder="请输入权限描述"
            :maxlength="200"
          />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 权限管理页面
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import { ref, computed, onMounted, reactive } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { SearchIcon, AddIcon } from 'tdesign-icons-vue-next'
import request from '@/utils/request'

// 类型定义
interface Permission {
  id: string
  code: string
  name: string
  type: string
  parentId: string | null
  routePath: string | null
  sort: number
  status: number
  description: string
}

// 状态
const loading = ref(false)
const permissions = ref<Permission[]>([])
const searchKeyword = ref('')
const permissionDialogVisible = ref(false)
const isEdit = ref(false)
const permissionFormRef = ref()

// 表单数据
const permissionForm = reactive({
  id: '',
  code: '',
  name: '',
  type: 'menu',
  parentId: '',
  routePath: '',
  sort: 0,
  description: '',
})

// 表单验证规则
const permissionRules = {
  code: [{ required: true, message: '请输入权限编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择权限类型', trigger: 'change' }],
}

// 表格列定义
const columns = [
  { colKey: 'name', title: '权限名称', width: 200 },
  { colKey: 'code', title: '权限编码', width: 180 },
  { colKey: 'type', title: '类型', width: 80 },
  { colKey: 'routePath', title: '路由路径', width: 150 },
  { colKey: 'sort', title: '排序', width: 60 },
  { colKey: 'status', title: '状态', width: 80 },
  { colKey: 'description', title: '描述', ellipsis: true },
  { colKey: 'operation', title: '操作', width: 150, fixed: 'right' as const },
]

// 计算属性：过滤后的权限列表
const filteredPermissions = computed(() => {
  if (!searchKeyword.value) return permissions.value
  const keyword = searchKeyword.value.toLowerCase()
  return permissions.value.filter(
    (p) =>
      p.name.toLowerCase().includes(keyword) ||
      p.code.toLowerCase().includes(keyword)
  )
})

// 计算属性：可选的父级权限
const parentPermissions = computed(() => {
  return permissions.value.filter((p) => p.type === 'menu')
})

// 获取权限列表
async function fetchPermissions() {
  loading.value = true
  try {
    const res = await request.get('/permission')
    permissions.value = res.data || []
  } catch (error: any) {
    MessagePlugin.error(error.message || '获取权限列表失败')
  } finally {
    loading.value = false
  }
}

// 打开创建对话框
function openCreateDialog() {
  isEdit.value = false
  Object.assign(permissionForm, {
    id: '',
    code: '',
    name: '',
    type: 'menu',
    parentId: '',
    routePath: '',
    sort: 0,
    description: '',
  })
  permissionDialogVisible.value = true
}

// 打开编辑对话框
function openEditDialog(permission: Permission) {
  isEdit.value = true
  Object.assign(permissionForm, {
    id: permission.id,
    code: permission.code,
    name: permission.name,
    type: permission.type,
    parentId: permission.parentId || '',
    routePath: permission.routePath || '',
    sort: permission.sort,
    description: permission.description || '',
  })
  permissionDialogVisible.value = true
}

// 提交表单
async function handleSubmit() {
  const valid = await permissionFormRef.value?.validate()
  if (valid !== true) return

  try {
    const data = {
      ...permissionForm,
      parentId: permissionForm.parentId || null,
      routePath: permissionForm.routePath || null,
    }

    if (isEdit.value) {
      await request.put(`/permission/${permissionForm.id}`, data)
      MessagePlugin.success('更新成功')
    } else {
      await request.post('/permission', data)
      MessagePlugin.success('创建成功')
    }
    permissionDialogVisible.value = false
    fetchPermissions()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

// 删除权限
async function handleDelete(id: string) {
  try {
    await request.delete(`/permission/${id}`)
    MessagePlugin.success('删除成功')
    fetchPermissions()
  } catch (error: any) {
    MessagePlugin.error(error.message || '删除失败')
  }
}

// 初始化
onMounted(() => {
  fetchPermissions()
})
</script>

<style scoped>
.permission-manage-page {
  min-height: calc(100vh - 120px);
}
</style>
