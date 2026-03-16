<template>
  <div class="role-manage-page p-6">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-800">角色管理</h1>
      <p class="mt-1 text-sm text-gray-500">管理系统角色，分配权限控制用户访问</p>
    </div>

    <!-- 操作栏 -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <t-input v-model="searchKeyword" placeholder="搜索角色名称" class="w-64">
          <template #prefix-icon>
            <search-icon />
          </template>
        </t-input>
      </div>
      <t-button theme="primary" @click="openCreateDialog">
        <template #icon><add-icon /></template>
        新建角色
      </t-button>
    </div>

    <!-- 角色列表 -->
    <t-card :bordered="false" class="shadow-sm">
      <t-table
        :data="filteredRoles"
        :columns="columns"
        :loading="loading"
        row-key="id"
        hover
        stripe
      >
        <template #name="{ row }">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ row.name }}</span>
            <t-tag v-if="row.code === 'super_admin'" theme="warning" size="small">超管</t-tag>
          </div>
        </template>
        <template #code="{ row }">
          <t-tag variant="light" theme="primary">{{ row.code }}</t-tag>
        </template>
        <template #status="{ row }">
          <t-tag :theme="row.status === 0 ? 'success' : 'danger'" variant="light">
            {{ row.status === 0 ? '正常' : '禁用' }}
          </t-tag>
        </template>
        <template #permissions="{ row }">
          <span class="text-gray-600">{{ getRolePermissionCount(row) }} 个权限</span>
        </template>
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" hover="color" @click="openPermissionDialog(row)">
              配置权限
            </t-link>
            <t-link theme="primary" hover="color" @click="openEditDialog(row)">
              编辑
            </t-link>
            <t-popconfirm
              content="确定删除该角色吗？"
              @confirm="handleDelete(row.id)"
            >
              <t-link theme="danger" hover="color">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 创建/编辑角色对话框 -->
    <t-dialog
      v-model:visible="roleDialogVisible"
      :header="isEdit ? '编辑角色' : '新建角色'"
      :confirm-btn="{ content: '确定', theme: 'primary' }"
      :on-confirm="handleSubmit"
      width="500px"
    >
      <t-form :data="roleForm" :rules="roleRules" ref="roleFormRef" label-align="right">
        <t-form-item label="角色编码" name="code">
          <t-input
            v-model="roleForm.code"
            placeholder="请输入角色编码（如 admin）"
            :disabled="isEdit"
          />
        </t-form-item>
        <t-form-item label="角色名称" name="name">
          <t-input v-model="roleForm.name" placeholder="请输入角色名称" />
        </t-form-item>
        <t-form-item label="角色描述" name="description">
          <t-textarea
            v-model="roleForm.description"
            placeholder="请输入角色描述"
            :maxlength="200"
          />
        </t-form-item>
        <t-form-item label="排序号" name="sort">
          <t-input-number v-model="roleForm.sort" :min="0" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 权限配置对话框 -->
    <t-dialog
      v-model:visible="permissionDialogVisible"
      header="配置权限"
      :confirm-btn="{ content: '保存', theme: 'primary', loading: permissionLoading }"
      :on-confirm="handlePermissionSubmit"
      width="600px"
    >
      <div class="mb-4">
        <span class="font-medium text-gray-700">{{ currentRole?.name }}</span>
        <span class="ml-2 text-sm text-gray-500">选择该角色拥有的权限</span>
      </div>
      <div v-if="permissionLoading" class="flex justify-center py-8">
        <t-loading text="加载中..." />
      </div>
      <div v-else class="max-h-96 overflow-y-auto">
        <t-tree
          :key="treeRenderKey"
          ref="permissionTreeRef"
          :data="permissionTree"
          v-model:value="checkedPermissions"
          :value="checkedPermissions"
          checkable
          expand-all
          check-strictly
          @change="onTreeChange"
        />
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 角色管理页面
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import { ref, computed, onMounted, reactive, nextTick } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { SearchIcon, AddIcon } from 'tdesign-icons-vue-next'
import request from '@/utils/request'

// 类型定义
interface Role {
  id: string
  code: string
  name: string
  description: string
  status: number
  sort: number
  createdAt: string
  updatedAt: string
}

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

interface PermissionTree {
  id: string
  label: string
  value: string
  children?: PermissionTree[]
}

// 状态
const loading = ref(false)
const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const searchKeyword = ref('')
const roleDialogVisible = ref(false)
const permissionDialogVisible = ref(false)
const permissionLoading = ref(false)
const isEdit = ref(false)
const currentRole = ref<Role | null>(null)
const checkedPermissions = ref<string[]>([])
const treeRenderKey = ref(0)
const permissionTreeRef = ref()
const roleFormRef = ref()

// 表单数据
const roleForm = reactive({
  id: '',
  code: '',
  name: '',
  description: '',
  sort: 0,
})

// 表单验证规则
const roleRules = {
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
}

// 表格列定义
const columns = [
  { colKey: 'name', title: '角色名称', width: 180 },
  { colKey: 'code', title: '角色编码', width: 150 },
  { colKey: 'description', title: '描述', ellipsis: true },
  { colKey: 'permissions', title: '权限数', width: 100 },
  { colKey: 'status', title: '状态', width: 80 },
  { colKey: 'sort', title: '排序', width: 60 },
  { colKey: 'operation', title: '操作', width: 200, fixed: 'right' as const },
]

// 计算属性：过滤后的角色列表
const filteredRoles = computed(() => {
  if (!searchKeyword.value) return roles.value
  const keyword = searchKeyword.value.toLowerCase()
  return roles.value.filter(
    (role) =>
      role.name.toLowerCase().includes(keyword) ||
      role.code.toLowerCase().includes(keyword)
  )
})

// 计算属性：权限树
const permissionTree = computed(() => {
  return buildPermissionTree(permissions.value, null)
})

// 构建权限树
function buildPermissionTree(list: Permission[], parentId: string | null): PermissionTree[] {
  const nodes = list
    .filter((p) => {
      // 处理 null 和 undefined 的情况
      const pParentId = p.parentId ?? null
      return pParentId === parentId
    })
    .sort((a, b) => a.sort - b.sort)
    .map((p) => {
      const children = buildPermissionTree(list, p.id)
      const node: PermissionTree = {
        id: p.id,
        label: `${p.name} (${p.code})`,
        value: p.id,
      }
      if (children.length > 0) {
        node.children = children
      }
      return node
    })
  return nodes
}

// 获取角色权限数量
function getRolePermissionCount(role: any): number {
  return role.permissionCount || 0
}

// 获取角色列表
async function fetchRoles() {
  loading.value = true
  try {
    const res = await request.get('/role')
    roles.value = res.data || []
  } catch (error: any) {
    MessagePlugin.error(error.message || '获取角色列表失败')
  } finally {
    loading.value = false
  }
}

// 获取权限列表
async function fetchPermissions() {
  try {
    const res = await request.get('/permission')
    permissions.value = res.data || []
  } catch (error: any) {
    MessagePlugin.error(error.message || '获取权限列表失败')
  }
}

// 打开创建对话框
function openCreateDialog() {
  isEdit.value = false
  Object.assign(roleForm, {
    id: '',
    code: '',
    name: '',
    description: '',
    sort: 0,
  })
  roleDialogVisible.value = true
}

// 打开编辑对话框
function openEditDialog(role: Role) {
  isEdit.value = true
  Object.assign(roleForm, {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    sort: role.sort,
  })
  roleDialogVisible.value = true
}

// 提交表单
async function handleSubmit() {
  const valid = await roleFormRef.value?.validate()
  if (valid !== true) return

  try {
    if (isEdit.value) {
      await request.put(`/role/${roleForm.id}`, roleForm)
      MessagePlugin.success('更新成功')
    } else {
      await request.post('/role', roleForm)
      MessagePlugin.success('创建成功')
    }
    roleDialogVisible.value = false
    fetchRoles()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

// 打开权限配置对话框
async function openPermissionDialog(role: Role) {
  currentRole.value = role
  checkedPermissions.value = [] // 先清空
  treeRenderKey.value = Date.now() // 使用新key强制重新渲染
  permissionLoading.value = true
  permissionDialogVisible.value = true

  // 获取角色当前的权限
  try {
    const res = await request.get(`/role/${role.id}`)
    console.log('角色详情响应:', res)
    const roleData = res.data
    const permissionList = roleData?.permissions || []
    console.log('权限列表:', permissionList)

    // 提取权限ID列表，确保是字符串类型
    const ids = permissionList.map((p: Permission) => String(p.id))
    console.log('选中的权限ID (string):', ids)

    // 关闭加载状态，让Tree显示
    permissionLoading.value = false

    // 等待DOM更新，然后设置选中值
    await nextTick()
    checkedPermissions.value = [...ids] // 使用新数组触发响应式更新
    console.log('已设置checkedPermissions:', checkedPermissions.value)
  } catch (error) {
    console.error('获取角色权限失败:', error)
    permissionLoading.value = false
    checkedPermissions.value = []
  }
}

// 树节点变化回调
function onTreeChange(value: string[]) {
  checkedPermissions.value = value
  console.log('Tree选中变化:', value)
}

// 提交权限配置
async function handlePermissionSubmit() {
  if (!currentRole.value) return

  try {
    console.log('提交的权限ID:', checkedPermissions.value)

    await request.post(`/role/${currentRole.value.id}/permissions`, {
      permissionIds: checkedPermissions.value,
    })
    MessagePlugin.success('权限配置成功')
    permissionDialogVisible.value = false
    fetchRoles()
  } catch (error: any) {
    MessagePlugin.error(error.message || '权限配置失败')
  }
}

// 删除角色
async function handleDelete(id: string) {
  try {
    await request.delete(`/role/${id}`)
    MessagePlugin.success('删除成功')
    fetchRoles()
  } catch (error: any) {
    MessagePlugin.error(error.message || '删除失败')
  }
}

// 初始化
onMounted(() => {
  fetchRoles()
  fetchPermissions()
})
</script>

<style scoped>
.role-manage-page {
  min-height: calc(100vh - 120px);
}
</style>
