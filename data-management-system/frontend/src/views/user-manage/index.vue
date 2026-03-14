/**
 * 用户管理页面
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
<template>
  <div class="space-y-4">
    <!-- 搜索表单 -->
    <t-card :bordered="false">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="handleReset">
        <t-form-item label="用户名" name="username">
          <t-input v-model="searchForm.username" placeholder="请输入用户名" clearable />
        </t-form-item>
        <t-form-item label="邮箱" name="email">
          <t-input v-model="searchForm.email" placeholder="请输入邮箱" clearable />
        </t-form-item>
        <t-form-item label="状态" name="status">
          <t-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 120px">
            <t-option :value="0" label="正常" />
            <t-option :value="1" label="禁用" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" type="submit">查询</t-button>
          <t-button theme="default" type="reset" class="ml-2">重置</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 用户列表 -->
    <t-card title="用户列表" :bordered="false">
      <template #actions>
        <t-button theme="primary" @click="openCreateDialog">
          <template #icon><Plus class="w-4 h-4" /></template>
          新增用户
        </t-button>
      </template>

      <t-table
        :data="userList"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
      >
        <template #avatar="{ row }">
          <div class="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
            <img
              v-if="row.avatar"
              :src="row.avatar"
              :alt="row.nickname"
              class="w-full h-full object-cover"
            />
            <User v-else class="w-full h-full p-1.5 text-gray-500" />
          </div>
        </template>
        <template #status="{ row }">
          <t-tag :theme="row.status === 0 ? 'success' : 'danger'" variant="light">
            {{ row.status === 0 ? '正常' : '禁用' }}
          </t-tag>
        </template>
        <template #lastLoginAt="{ row }">
          {{ formatDate(row.lastLoginAt) }}
        </template>
        <template #createdAt="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
        <template #operation="{ row }">
          <t-space>
            <t-link theme="primary" @click="openEditDialog(row)">编辑</t-link>
            <t-link theme="primary" @click="handleResetPassword(row)">重置密码</t-link>
            <t-link :theme="row.status === 0 ? 'warning' : 'success'" @click="handleToggleStatus(row)">
              {{ row.status === 0 ? '禁用' : '启用' }}
            </t-link>
            <t-popconfirm content="确定要删除该用户吗？" @confirm="handleDelete(row.id)">
              <t-link theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 新增/编辑弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle"
      width="500px"
      @confirm="handleDialogConfirm"
      @close="handleDialogClose"
    >
      <t-form
        ref="formRef"
        :data="formData"
        :rules="formRules"
        label-align="right"
        label-width="80px"
      >
        <t-form-item label="用户名" name="username">
          <t-input
            v-model="formData.username"
            placeholder="请输入用户名"
            :disabled="isEdit"
          />
        </t-form-item>
        <t-form-item v-if="!isEdit" label="密码" name="password">
          <t-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
          />
        </t-form-item>
        <t-form-item label="邮箱" name="email">
          <t-input v-model="formData.email" placeholder="请输入邮箱" />
        </t-form-item>
        <t-form-item label="昵称" name="nickname">
          <t-input v-model="formData.nickname" placeholder="请输入昵称" />
        </t-form-item>
        <t-form-item label="头像" name="avatar">
          <t-input v-model="formData.avatar" placeholder="请输入头像URL" />
        </t-form-item>
        <t-form-item label="状态" name="status">
          <t-radio-group v-model="formData.status">
            <t-radio :value="0">正常</t-radio>
            <t-radio :value="1">禁用</t-radio>
          </t-radio-group>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 重置密码弹窗 -->
    <t-dialog
      v-model:visible="resetPasswordVisible"
      header="重置密码"
      width="400px"
      @confirm="handleResetPasswordConfirm"
    >
      <t-form :data="resetPasswordForm" label-align="right" label-width="80px">
        <t-form-item label="用户">
          <span>{{ currentUser?.username }}</span>
        </t-form-item>
        <t-form-item label="新密码" name="password">
          <t-input
            v-model="resetPasswordForm.password"
            type="password"
            placeholder="请输入新密码"
          />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 用户管理页面
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { ref, reactive, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { Plus, User } from 'lucide-vue-next'
import dayjs from 'dayjs'
import {
  getUserList,
  createUser,
  updateUser,
  deleteUser,
  resetPassword as resetPasswordApi,
  toggleUserStatus,
} from '@/api/user'
import type { SysUser, CreateUserParams, UpdateUserParams } from '@/types/user'

// 搜索表单
const searchForm = reactive({
  username: '',
  email: '',
  status: undefined as number | undefined,
})

// 用户列表
const userList = ref<SysUser[]>([])
const loading = ref(false)

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

// 表格列配置
const columns = [
  { colKey: 'avatar', title: '头像', width: 80, cell: 'avatar' },
  { colKey: 'username', title: '用户名', width: 120 },
  { colKey: 'nickname', title: '昵称', width: 120 },
  { colKey: 'email', title: '邮箱', width: 200 },
  { colKey: 'status', title: '状态', width: 80, cell: 'status' },
  { colKey: 'lastLoginAt', title: '最后登录', width: 160, cell: 'lastLoginAt' },
  { colKey: 'createdAt', title: '创建时间', width: 160, cell: 'createdAt' },
  { colKey: 'operation', title: '操作', width: 200, cell: 'operation', fixed: 'right' },
]

// 弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const isEdit = ref(false)
const formRef = ref()
const currentUserId = ref('')

const formData = reactive<CreateUserParams & { status: number }>({
  username: '',
  password: '',
  email: '',
  nickname: '',
  avatar: '',
  status: 0,
})

const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { email: true, message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
}

// 重置密码弹窗
const resetPasswordVisible = ref(false)
const currentUser = ref<SysUser | null>(null)
const resetPasswordForm = reactive({
  password: '',
})

// 格式化日期
const formatDate = (date: string) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
}

// 获取用户列表
const fetchUserList = async () => {
  loading.value = true
  try {
    const res = await getUserList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      ...searchForm,
    })
    userList.value = res.list
    pagination.total = res.total
  } catch (error: any) {
    MessagePlugin.error(error.response?.data?.message || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.current = 1
  fetchUserList()
}

// 重置
const handleReset = () => {
  searchForm.username = ''
  searchForm.email = ''
  searchForm.status = undefined
  pagination.current = 1
  fetchUserList()
}

// 分页变化
const handlePageChange = (pageInfo: { current: number; pageSize: number }) => {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  fetchUserList()
}

// 打开新增弹窗
const openCreateDialog = () => {
  isEdit.value = false
  dialogTitle.value = '新增用户'
  Object.assign(formData, {
    username: '',
    password: '',
    email: '',
    nickname: '',
    avatar: '',
    status: 0,
  })
  dialogVisible.value = true
}

// 打开编辑弹窗
const openEditDialog = (row: SysUser) => {
  isEdit.value = true
  currentUserId.value = row.id
  dialogTitle.value = '编辑用户'
  Object.assign(formData, {
    username: row.username,
    password: '',
    email: row.email,
    nickname: row.nickname || '',
    avatar: row.avatar || '',
    status: row.status,
  })
  dialogVisible.value = true
}

// 弹窗确认
const handleDialogConfirm = async () => {
  const valid = await formRef.value.validate()
  if (!valid) return

  try {
    if (isEdit.value) {
      const updateData: UpdateUserParams = {
        email: formData.email,
        nickname: formData.nickname,
        avatar: formData.avatar,
        status: formData.status,
      }
      await updateUser(currentUserId.value, updateData)
      MessagePlugin.success('更新成功')
    } else {
      await createUser(formData)
      MessagePlugin.success('创建成功')
    }
    dialogVisible.value = false
    fetchUserList()
  } catch (error: any) {
    MessagePlugin.error(error.response?.data?.message || '操作失败')
  }
}

// 弹窗关闭
const handleDialogClose = () => {
  formRef.value?.reset()
}

// 删除用户
const handleDelete = async (id: string) => {
  try {
    await deleteUser(id)
    MessagePlugin.success('删除成功')
    fetchUserList()
  } catch (error: any) {
    MessagePlugin.error(error.response?.data?.message || '删除失败')
  }
}

// 切换状态
const handleToggleStatus = async (row: SysUser) => {
  try {
    await toggleUserStatus(row.id)
    MessagePlugin.success(row.status === 0 ? '已禁用' : '已启用')
    fetchUserList()
  } catch (error: any) {
    MessagePlugin.error(error.response?.data?.message || '操作失败')
  }
}

// 打开重置密码弹窗
const handleResetPassword = (row: SysUser) => {
  currentUser.value = row
  resetPasswordForm.password = ''
  resetPasswordVisible.value = true
}

// 确认重置密码
const handleResetPasswordConfirm = async () => {
  if (!resetPasswordForm.password) {
    MessagePlugin.warning('请输入新密码')
    return
  }
  try {
    await resetPasswordApi(currentUser.value!.id, resetPasswordForm.password)
    MessagePlugin.success('密码重置成功')
    resetPasswordVisible.value = false
  } catch (error: any) {
    MessagePlugin.error(error.response?.data?.message || '密码重置失败')
  }
}

onMounted(() => {
  fetchUserList()
})
</script>
