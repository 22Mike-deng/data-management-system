/**
 * 用户管理页面
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-14
 */
<template>
  <div class="user-manage-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <p class="page-desc">管理系统用户账户，包括创建、编辑、禁用和删除用户</p>
    </div>

    <!-- 搜索表单 -->
    <t-card class="search-card" :bordered="false">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="handleReset">
        <t-form-item label="用户名" name="username">
          <t-input 
            v-model="searchForm.username" 
            placeholder="请输入用户名" 
            clearable 
            class="search-input"
          >
            <template #prefix-icon>
              <User class="w-4 h-4 text-gray-400" />
            </template>
          </t-input>
        </t-form-item>
        <t-form-item label="邮箱" name="email">
          <t-input 
            v-model="searchForm.email" 
            placeholder="请输入邮箱" 
            clearable 
            class="search-input"
          >
            <template #prefix-icon>
              <Mail class="w-4 h-4 text-gray-400" />
            </template>
          </t-input>
        </t-form-item>
        <t-form-item label="状态" name="status">
          <t-select 
            v-model="searchForm.status" 
            placeholder="全部状态" 
            clearable 
            class="search-select"
          >
            <t-option :value="0" label="正常" />
            <t-option :value="1" label="禁用" />
          </t-select>
        </t-form-item>
        <t-form-item class="search-buttons">
          <t-button theme="primary" type="submit">
            <template #icon><Search class="w-4 h-4" /></template>
            查询
          </t-button>
          <t-button theme="default" type="reset" class="ml-2">
            <template #icon><RotateCcw class="w-4 h-4" /></template>
            重置
          </t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 用户列表 -->
    <t-card class="table-card" :bordered="false">
      <template #header>
        <div class="card-header">
          <div class="card-header-left">
            <span class="card-title">用户列表</span>
            <t-tag theme="primary" variant="light" size="small">
              共 {{ pagination.total }} 人
            </t-tag>
          </div>
          <div class="card-header-right">
            <t-button theme="default" variant="outline" @click="fetchUserList" class="mr-2">
              <template #icon><RefreshCw class="w-4 h-4" /></template>
              刷新
            </t-button>
            <t-button theme="primary" @click="openCreateDialog">
              <template #icon><Plus class="w-4 h-4" /></template>
              新增用户
            </t-button>
          </div>
        </div>
      </template>

      <t-table
        :data="userList"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        :hover="true"
        :stripe="true"
        row-key="id"
        table-layout="auto"
        empty="暂无用户数据"
        @page-change="handlePageChange"
      >
        <template #avatar="{ row }">
          <div class="avatar-cell">
            <t-avatar 
              :image="row.avatar" 
              :icon="userAvatarIcon"
              size="36px"
            />
          </div>
        </template>
        <template #userInfo="{ row }">
          <div class="user-info-cell">
            <div class="user-name">{{ row.username }}</div>
            <div class="user-nickname">{{ row.nickname || '-' }}</div>
          </div>
        </template>
        <template #email="{ row }">
          <div class="email-cell">
            <Mail class="w-4 h-4 text-gray-400 mr-1" />
            <span>{{ row.email }}</span>
          </div>
        </template>
        <template #status="{ row }">
          <t-tag 
            :theme="row.status === 0 ? 'success' : 'danger'" 
            variant="light"
            :icon="row.status === 0 ? checkIcon : closeIcon"
          >
            {{ row.status === 0 ? '正常' : '禁用' }}
          </t-tag>
        </template>
        <template #lastLoginAt="{ row }">
          <div class="time-cell">
            <Clock class="w-4 h-4 text-gray-400 mr-1" />
            <span>{{ formatDate(row.lastLoginAt) }}</span>
          </div>
        </template>
        <template #createdAt="{ row }">
          <div class="time-cell">
            <Calendar class="w-4 h-4 text-gray-400 mr-1" />
            <span>{{ formatDate(row.createdAt) }}</span>
          </div>
        </template>
        <template #operation="{ row }">
          <div class="operation-cell">
            <t-tooltip content="编辑用户信息">
              <t-link theme="primary" @click="openEditDialog(row)">
                <Edit class="w-4 h-4" />
              </t-link>
            </t-tooltip>
            <t-divider layout="vertical" />
            <t-tooltip content="重置密码">
              <t-link theme="warning" @click="handleResetPassword(row)">
                <KeyRound class="w-4 h-4" />
              </t-link>
            </t-tooltip>
            <t-divider layout="vertical" />
            <t-tooltip :content="row.status === 0 ? '禁用用户' : '启用用户'">
              <t-link 
                :theme="row.status === 0 ? 'warning' : 'success'" 
                @click="handleToggleStatus(row)"
              >
                <component :is="row.status === 0 ? Ban : CheckCircle" class="w-4 h-4" />
              </t-link>
            </t-tooltip>
            <t-divider layout="vertical" />
            <t-popconfirm 
              content="确定要删除该用户吗？此操作不可恢复" 
              theme="danger"
              @confirm="handleDelete(row.id)"
            >
              <t-tooltip content="删除用户">
                <t-link theme="danger">
                  <Trash2 class="w-4 h-4" />
                </t-link>
              </t-tooltip>
            </t-popconfirm>
          </div>
        </template>
      </t-table>
    </t-card>

    <!-- 新增/编辑弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle"
      width="520px"
      :confirm-btn="{ content: isEdit ? '保存修改' : '创建用户', theme: 'primary' }"
      :cancel-btn="{ content: '取消', theme: 'default' }"
      placement="center"
      @confirm="handleDialogConfirm"
      @close="handleDialogClose"
    >
      <t-form
        ref="formRef"
        :data="formData"
        :rules="formRules"
        label-align="right"
        label-width="80px"
        class="user-form"
      >
        <t-form-item label="用户名" name="username">
          <t-input
            v-model="formData.username"
            placeholder="请输入用户名（用于登录）"
            :disabled="isEdit"
            clearable
          >
            <template #prefix-icon>
              <User class="w-4 h-4 text-gray-400" />
            </template>
          </t-input>
        </t-form-item>
        <t-form-item v-if="!isEdit" label="密码" name="password">
          <t-input
            v-model="formData.password"
            type="password"
            placeholder="请输入初始密码"
            clearable
          >
            <template #prefix-icon>
              <Lock class="w-4 h-4 text-gray-400" />
            </template>
          </t-input>
        </t-form-item>
        <t-form-item label="邮箱" name="email">
          <t-input 
            v-model="formData.email" 
            placeholder="请输入邮箱地址" 
            clearable
          >
            <template #prefix-icon>
              <Mail class="w-4 h-4 text-gray-400" />
            </template>
          </t-input>
        </t-form-item>
        <t-form-item label="昵称" name="nickname">
          <t-input 
            v-model="formData.nickname" 
            placeholder="请输入显示昵称" 
            clearable
          >
            <template #prefix-icon>
              <Smile class="w-4 h-4 text-gray-400" />
            </template>
          </t-input>
        </t-form-item>
        <t-form-item label="头像" name="avatar">
          <t-input 
            v-model="formData.avatar" 
            placeholder="请输入头像URL地址" 
            clearable
          >
            <template #prefix-icon>
              <ImageIcon class="w-4 h-4 text-gray-400" />
            </template>
          </t-input>
        </t-form-item>
        <t-form-item label="状态" name="status">
          <t-radio-group v-model="formData.status">
            <t-radio :value="0">
              <span class="status-radio">
                <CheckCircle class="w-4 h-4 text-green-500 mr-1" />
                正常
              </span>
            </t-radio>
            <t-radio :value="1">
              <span class="status-radio">
                <Ban class="w-4 h-4 text-red-500 mr-1" />
                禁用
              </span>
            </t-radio>
          </t-radio-group>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 重置密码弹窗 -->
    <t-dialog
      v-model:visible="resetPasswordVisible"
      header="重置密码"
      width="420px"
      :confirm-btn="{ content: '确认重置', theme: 'warning' }"
      :cancel-btn="{ content: '取消', theme: 'default' }"
      placement="center"
      @confirm="handleResetPasswordConfirm"
    >
      <div class="reset-password-content">
        <div class="user-info-preview">
          <t-avatar 
            :image="currentUser?.avatar" 
            :icon="userAvatarIcon"
            size="48px"
          />
          <div class="user-detail">
            <div class="username">{{ currentUser?.username }}</div>
            <div class="email">{{ currentUser?.email }}</div>
          </div>
        </div>
        <t-divider />
        <t-form :data="resetPasswordForm" label-align="right" label-width="80px">
          <t-form-item label="新密码" name="password">
            <t-input
              v-model="resetPasswordForm.password"
              type="password"
              placeholder="请输入新密码"
              clearable
            >
              <template #prefix-icon>
                <Lock class="w-4 h-4 text-gray-400" />
              </template>
            </t-input>
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 用户管理页面
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-14
 */
import { ref, reactive, onMounted, h } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import {
  Plus,
  User,
  Mail,
  Search,
  RotateCcw,
  RefreshCw,
  Edit,
  KeyRound,
  Ban,
  CheckCircle,
  Trash2,
  Clock,
  Calendar,
  Lock,
  Smile,
  Image as ImageIcon,
  XCircle,
  CheckIcon as CheckIconComponent,
} from 'lucide-vue-next'
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

// 图标
const userAvatarIcon = () => h(User)
const checkIcon = () => h(CheckIconComponent, { class: 'w-4 h-4' })
const closeIcon = () => h(XCircle, { class: 'w-4 h-4' })

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
  showJumper: true,
  pageSizeOptions: [10, 20, 50],
})

// 表格列配置
const columns = [
  { colKey: 'avatar', title: '头像', width: 70, cell: 'avatar', align: 'center' },
  { colKey: 'userInfo', title: '用户信息', width: 160, cell: 'userInfo' },
  { colKey: 'email', title: '邮箱', width: 200, cell: 'email' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status', align: 'center' },
  { colKey: 'lastLoginAt', title: '最后登录', width: 180, cell: 'lastLoginAt' },
  { colKey: 'createdAt', title: '创建时间', width: 180, cell: 'createdAt' },
  { colKey: 'operation', title: '操作', width: 160, cell: 'operation', fixed: 'right', align: 'center' },
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
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6个字符', trigger: 'blur' },
  ],
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
  if (!date) return '从未登录'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
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
  if (resetPasswordForm.password.length < 6) {
    MessagePlugin.warning('密码长度不能少于6个字符')
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

<style scoped lang="less">
.user-manage-page {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 20px;
  
  .page-title {
    font-size: 24px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 8px 0;
  }
  
  .page-desc {
    font-size: 14px;
    color: #666;
    margin: 0;
  }
}

.search-card {
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  
  .search-input {
    width: 200px;
  }
  
  .search-select {
    width: 140px;
  }
  
  .search-buttons {
    margin-left: auto;
  }
}

.table-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .card-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .card-title {
        font-size: 16px;
        font-weight: 600;
        color: #1a1a1a;
      }
    }
    
    .card-header-right {
      display: flex;
      align-items: center;
    }
  }
}

.avatar-cell {
  display: flex;
  justify-content: center;
}

.user-info-cell {
  .user-name {
    font-weight: 500;
    color: #1a1a1a;
    margin-bottom: 2px;
  }
  
  .user-nickname {
    font-size: 12px;
    color: #999;
  }
}

.email-cell {
  display: flex;
  align-items: center;
  color: #666;
}

.time-cell {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 13px;
}

.operation-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.status-radio {
  display: flex;
  align-items: center;
}

.reset-password-content {
  .user-info-preview {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 0;
    
    .user-detail {
      .username {
        font-size: 16px;
        font-weight: 500;
        color: #1a1a1a;
        margin-bottom: 4px;
      }
      
      .email {
        font-size: 13px;
        color: #666;
      }
    }
  }
}

.user-form {
  padding: 8px 0;
}

// 响应式适配
@media (max-width: 1200px) {
  .search-card {
    :deep(.t-form) {
      flex-wrap: wrap;
    }
    
    .search-input {
      width: 180px;
    }
  }
}

@media (max-width: 768px) {
  .user-manage-page {
    padding: 12px;
  }
  
  .page-header {
    .page-title {
      font-size: 20px;
    }
  }
  
  .search-card {
    .search-input,
    .search-select {
      width: 100%;
    }
    
    :deep(.t-form-item) {
      width: 100%;
      margin-right: 0 !important;
    }
  }
}
</style>
