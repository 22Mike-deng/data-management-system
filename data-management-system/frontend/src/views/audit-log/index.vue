/**
 * 审计日志页面
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Search, Eye, RefreshCw, FileText, Download, Trash2, User, Database, LogIn, LogOut, Upload as UploadIcon } from 'lucide-vue-next'
import { queryAuditLogs, getAuditLogById, type AuditLogItem, type QueryAuditLogParams } from '@/api/audit-log'
import Modal from '@/components/Modal.vue'

// 操作类型映射
const actionMap: Record<string, { label: string; color: string; icon: any }> = {
  create: { label: '创建', color: 'bg-green-100 text-green-700', icon: FileText },
  update: { label: '更新', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  delete: { label: '删除', color: 'bg-red-100 text-red-700', icon: Trash2 },
  import: { label: '导入', color: 'bg-purple-100 text-purple-700', icon: UploadIcon },
  export: { label: '导出', color: 'bg-orange-100 text-orange-700', icon: Download },
  login: { label: '登录', color: 'bg-cyan-100 text-cyan-700', icon: LogIn },
  logout: { label: '登出', color: 'bg-gray-100 text-gray-700', icon: LogOut },
}

// 列表数据
const logList = ref<AuditLogItem[]>([])
const loading = ref(false)
const total = ref(0)

// 分页
const pagination = ref({
  page: 1,
  pageSize: 20,
})

// 筛选条件
const filters = ref<QueryAuditLogParams>({
  action: undefined,
  module: '',
  username: '',
  tableName: '',
  startDate: '',
  endDate: '',
  success: undefined,
})

// 详情弹窗
const showDetail = ref(false)
const currentLog = ref<AuditLogItem | null>(null)
const detailLoading = ref(false)

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const params: QueryAuditLogParams = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    }
    
    // 只添加有值的筛选条件
    if (filters.value.action) params.action = filters.value.action
    if (filters.value.module) params.module = filters.value.module
    if (filters.value.username) params.username = filters.value.username
    if (filters.value.tableName) params.tableName = filters.value.tableName
    if (filters.value.startDate) params.startDate = filters.value.startDate
    if (filters.value.endDate) params.endDate = filters.value.endDate
    if (filters.value.success !== undefined) params.success = filters.value.success

    const res = await queryAuditLogs(params)
    logList.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (error) {
    console.error('加载审计日志失败:', error)
    logList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  loadData()
}

// 重置筛选
const handleReset = () => {
  filters.value = {
    action: undefined,
    module: '',
    username: '',
    tableName: '',
    startDate: '',
    endDate: '',
    success: undefined,
  }
  pagination.value.page = 1
  loadData()
}

// 分页
const handlePageChange = (page: number) => {
  pagination.value.page = page
  loadData()
}

// 查看详情
const handleViewDetail = async (log: AuditLogItem) => {
  detailLoading.value = true
  showDetail.value = true
  try {
    const res = await getAuditLogById(log.id)
    currentLog.value = res.data
  } catch (error) {
    console.error('加载详情失败:', error)
    currentLog.value = log
  } finally {
    detailLoading.value = false
  }
}

// 格式化时间
const formatDateTime = (value: any): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (isNaN(date.getTime())) return String(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 计算总页数
const totalPages = computed(() => Math.ceil(total.value / pagination.value.pageSize))

// 获取操作类型信息
const getActionInfo = (action: string) => {
  return actionMap[action] || { label: action, color: 'bg-gray-100 text-gray-700', icon: FileText }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="space-y-6 animate-fadeIn">
    <!-- 页面标题 -->
    <div>
      <h2 class="text-xl font-semibold text-gray-800">审计日志</h2>
      <p class="text-sm text-gray-500">查看系统操作记录和变更历史</p>
    </div>

    <!-- 筛选条件 -->
    <div class="bg-white rounded-xl shadow-sm p-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- 操作类型 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
          <select
            v-model="filters.action"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">全部</option>
            <option v-for="(info, key) in actionMap" :key="key" :value="key">
              {{ info.label }}
            </option>
          </select>
        </div>

        <!-- 操作模块 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">操作模块</label>
          <input
            v-model="filters.module"
            type="text"
            placeholder="请输入模块名称"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <!-- 操作用户 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">操作用户</label>
          <input
            v-model="filters.username"
            type="text"
            placeholder="请输入用户名"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <!-- 关联表名 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">关联表名</label>
          <input
            v-model="filters.tableName"
            type="text"
            placeholder="请输入表名"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <!-- 开始日期 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
          <input
            v-model="filters.startDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <!-- 结束日期 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
          <input
            v-model="filters.endDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <!-- 操作结果 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">操作结果</label>
          <select
            v-model="filters.success"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option :value="undefined">全部</option>
            <option :value="true">成功</option>
            <option :value="false">失败</option>
          </select>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-end gap-2">
          <button
            class="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            @click="handleSearch"
          >
            搜索
          </button>
          <button
            class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            @click="handleReset"
          >
            重置
          </button>
        </div>
      </div>
    </div>

    <!-- 日志列表 -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-500">
        加载中...
      </div>
      <div v-else-if="logList.length === 0" class="p-8 text-center text-gray-500">
        暂无日志记录
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-600">时间</th>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-600">操作类型</th>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-600">模块</th>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-600">操作描述</th>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-600">操作用户</th>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-600">关联表</th>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-600">结果</th>
              <th class="text-right px-4 py-3 text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="log in logList" :key="log.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-500">
                {{ formatDateTime(log.createdAt) }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                  :class="getActionInfo(log.action).color"
                >
                  <component :is="getActionInfo(log.action).icon" class="w-3 h-3" />
                  {{ getActionInfo(log.action).label }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-800">{{ log.module }}</td>
              <td class="px-4 py-3 text-sm text-gray-800">
                <span class="truncate block max-w-xs" :title="log.description">
                  {{ log.description }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">
                <div class="flex items-center gap-2">
                  <User class="w-4 h-4 text-gray-400" />
                  {{ log.username || '-' }}
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">
                <div v-if="log.tableName" class="flex items-center gap-2">
                  <Database class="w-4 h-4 text-gray-400" />
                  {{ log.tableName }}
                </div>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex px-2 py-1 rounded-full text-xs font-medium"
                  :class="log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                >
                  {{ log.success ? '成功' : '失败' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  class="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                  @click="handleViewDetail(log)"
                >
                  <Eye class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="total > 0" class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div class="text-sm text-gray-500">
          共 {{ total }} 条记录
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="pagination.page <= 1"
            @click="handlePageChange(pagination.page - 1)"
          >
            上一页
          </button>
          <span class="text-sm text-gray-600">
            {{ pagination.page }} / {{ totalPages }}
          </span>
          <button
            class="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="pagination.page >= totalPages"
            @click="handlePageChange(pagination.page + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <Modal
      v-model:visible="showDetail"
      title="日志详情"
      width="700px"
    >
      <div v-if="detailLoading" class="p-8 text-center text-gray-500">
        加载中...
      </div>
      <div v-else-if="currentLog" class="p-6 space-y-4">
        <!-- 基本信息 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-gray-500">操作时间</label>
            <p class="text-sm text-gray-800 mt-1">{{ formatDateTime(currentLog.createdAt) }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">操作类型</label>
            <p class="text-sm mt-1">
              <span
                class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                :class="getActionInfo(currentLog.action).color"
              >
                {{ getActionInfo(currentLog.action).label }}
              </span>
            </p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">操作模块</label>
            <p class="text-sm text-gray-800 mt-1">{{ currentLog.module }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">操作用户</label>
            <p class="text-sm text-gray-800 mt-1">{{ currentLog.username || '-' }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">关联表名</label>
            <p class="text-sm text-gray-800 mt-1">{{ currentLog.tableName || '-' }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">记录ID</label>
            <p class="text-sm text-gray-800 mt-1 font-mono">{{ currentLog.recordId || '-' }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">IP地址</label>
            <p class="text-sm text-gray-800 mt-1">{{ currentLog.ipAddress || '-' }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">操作结果</label>
            <p class="text-sm mt-1">
              <span
                class="inline-flex px-2 py-1 rounded-full text-xs font-medium"
                :class="currentLog.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
              >
                {{ currentLog.success ? '成功' : '失败' }}
              </span>
            </p>
          </div>
        </div>

        <!-- 操作描述 -->
        <div>
          <label class="text-sm font-medium text-gray-500">操作描述</label>
          <p class="text-sm text-gray-800 mt-1">{{ currentLog.description }}</p>
        </div>

        <!-- 错误信息 -->
        <div v-if="currentLog.errorMessage">
          <label class="text-sm font-medium text-red-500">错误信息</label>
          <p class="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded">{{ currentLog.errorMessage }}</p>
        </div>

        <!-- 操作前数据 -->
        <div v-if="currentLog.oldData && Object.keys(currentLog.oldData).length > 0">
          <label class="text-sm font-medium text-gray-500">操作前数据</label>
          <pre class="text-xs text-gray-800 mt-1 bg-gray-50 p-3 rounded overflow-auto max-h-40">{{ JSON.stringify(currentLog.oldData, null, 2) }}</pre>
        </div>

        <!-- 操作后数据 -->
        <div v-if="currentLog.newData && Object.keys(currentLog.newData).length > 0">
          <label class="text-sm font-medium text-gray-500">操作后数据</label>
          <pre class="text-xs text-gray-800 mt-1 bg-gray-50 p-3 rounded overflow-auto max-h-40">{{ JSON.stringify(currentLog.newData, null, 2) }}</pre>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
/* 覆盖 Tailwind 硬编码颜色 */
:deep(.text-gray-800) {
  color: var(--color-text-primary);
}
:deep(.text-gray-700) {
  color: var(--color-text-primary);
}
:deep(.text-gray-600) {
  color: var(--color-text-secondary);
}
:deep(.text-gray-500) {
  color: var(--color-text-secondary);
}
:deep(.text-gray-400) {
  color: var(--color-text-tertiary, #9ca3af);
}

/* 背景色 */
:deep(.bg-white) {
  background-color: var(--color-bg-container);
}
:deep(.bg-gray-50) {
  background-color: var(--color-bg-layout);
}
:deep(.bg-gray-100) {
  background-color: var(--color-bg-active);
}

/* 边框 */
:deep(.border-gray-100) {
  border-color: var(--color-border);
}
:deep(.border-gray-200) {
  border-color: var(--color-border);
}

/* 输入框 */
:deep(input[type="text"]),
:deep(input[type="date"]),
:deep(select) {
  background-color: var(--color-bg-layout);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

/* 悬停状态 */
:deep(.hover\:bg-gray-50:hover) {
  background-color: var(--color-bg-active);
}
:deep(.hover\:bg-gray-100:hover) {
  background-color: var(--color-bg-active);
}
:deep(.hover\:bg-gray-200:hover) {
  background-color: var(--color-bg-active);
}
</style>
