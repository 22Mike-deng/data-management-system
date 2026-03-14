/**
 * 知识库管理页面
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-12
 */
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Edit, Trash2, Power, PowerOff, BookOpen, Search, Tag, FolderOpen, Eye, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import {
  getKnowledgeList,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  toggleKnowledge,
  getCategories,
} from '@/api/knowledge-base'
import type { KnowledgeBase } from '@/types'
import Modal from '@/components/Modal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

// 列表数据
const knowledgeList = ref<KnowledgeBase[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索筛选
const searchKeyword = ref('')
const filterCategory = ref('')
const filterEnabled = ref<string>('')
const categories = ref<string[]>([])

// 弹窗状态
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const currentKnowledge = ref<KnowledgeBase | null>(null)
const saveLoading = ref(false)

// 表单数据
const knowledgeForm = ref({
  title: '',
  content: '',
  category: '',
  tags: '' as string,
  source: '',
  priority: 1,
  isEnabled: true,
})

// 删除确认
const showDeleteConfirm = ref(false)
const deleteTarget = ref<KnowledgeBase | null>(null)
const deleteLoading = ref(false)

// 详情预览
const showDetail = ref(false)
const detailKnowledge = ref<KnowledgeBase | null>(null)

// 计算总页数
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

// 加载知识库列表
const loadKnowledgeList = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value,
    }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (filterCategory.value) params.category = filterCategory.value
    if (filterEnabled.value !== '') params.isEnabled = filterEnabled.value === 'true'

    const res = await getKnowledgeList(params)
    knowledgeList.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (error) {
    console.error('加载知识库列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载分类列表
const loadCategories = async () => {
  try {
    const res = await getCategories()
    categories.value = res.data || []
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

// 重置表单
const resetForm = () => {
  knowledgeForm.value = {
    title: '',
    content: '',
    category: '',
    tags: '',
    source: '',
    priority: 1,
    isEnabled: true,
  }
}

// 打开添加弹窗
const handleAdd = () => {
  modalMode.value = 'create'
  currentKnowledge.value = null
  resetForm()
  showModal.value = true
}

// 打开编辑弹窗
const handleEdit = (knowledge: KnowledgeBase) => {
  modalMode.value = 'edit'
  currentKnowledge.value = knowledge
  knowledgeForm.value = {
    title: knowledge.title,
    content: knowledge.content,
    category: knowledge.category || '',
    tags: knowledge.tags?.join(', ') || '',
    source: knowledge.source || '',
    priority: knowledge.priority || 1,
    isEnabled: knowledge.isEnabled,
  }
  showModal.value = true
}

// 查看详情
const handleView = (knowledge: KnowledgeBase) => {
  detailKnowledge.value = knowledge
  showDetail.value = true
}

// 保存知识库
const handleSave = async () => {
  if (!knowledgeForm.value.title || !knowledgeForm.value.content) {
    alert('请填写标题和内容')
    return
  }

  saveLoading.value = true
  try {
    const tags = knowledgeForm.value.tags
      ? knowledgeForm.value.tags.split(',').map(t => t.trim()).filter(Boolean)
      : []

    const data: any = {
      title: knowledgeForm.value.title,
      content: knowledgeForm.value.content,
      category: knowledgeForm.value.category || undefined,
      tags: tags.length > 0 ? tags : undefined,
      source: knowledgeForm.value.source || undefined,
      priority: knowledgeForm.value.priority,
      isEnabled: knowledgeForm.value.isEnabled,
    }

    if (modalMode.value === 'create') {
      await createKnowledge(data)
    } else if (currentKnowledge.value) {
      await updateKnowledge(currentKnowledge.value.knowledgeId, data)
    }
    showModal.value = false
    loadKnowledgeList()
    loadCategories() // 刷新分类列表
  } catch (error) {
    console.error('保存知识库失败:', error)
    alert('保存失败，请重试')
  } finally {
    saveLoading.value = false
  }
}

// 删除知识库
const handleDelete = (knowledge: KnowledgeBase) => {
  deleteTarget.value = knowledge
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await deleteKnowledge(deleteTarget.value.knowledgeId)
    showDeleteConfirm.value = false
    loadKnowledgeList()
  } catch (error) {
    console.error('删除知识库失败:', error)
    alert('删除失败，请重试')
  } finally {
    deleteLoading.value = false
  }
}

// 切换启用状态
const handleToggle = async (knowledge: KnowledgeBase) => {
  try {
    await toggleKnowledge(knowledge.knowledgeId)
    loadKnowledgeList()
  } catch (error) {
    console.error('切换状态失败:', error)
    alert('操作失败，请重试')
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadKnowledgeList()
}

// 分页
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadKnowledgeList()
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 截取内容预览
const truncateContent = (content: string, length: number = 100) => {
  if (!content) return ''
  return content.length > length ? content.slice(0, length) + '...' : content
}

onMounted(() => {
  loadKnowledgeList()
  loadCategories()
})
</script>

<template>
  <div class="space-y-6 animate-fadeIn">
    <!-- 操作栏 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold page-title">知识库管理</h2>
        <p class="text-sm page-desc mt-1">管理系统知识库，供AI对话调用</p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        @click="handleAdd"
      >
        <Plus class="w-4 h-4" />
        <span>添加知识</span>
      </button>
    </div>

    <!-- 搜索筛选 -->
    <div class="bg-white rounded-xl shadow-sm p-4">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-[200px]">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索标题或内容..."
              class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              @keyup.enter="handleSearch"
            />
          </div>
        </div>
        <select
          v-model="filterCategory"
          class="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          @change="handleSearch"
        >
          <option value="">全部分类</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <select
          v-model="filterEnabled"
          class="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          @change="handleSearch"
        >
          <option value="">全部状态</option>
          <option value="true">已启用</option>
          <option value="false">已禁用</option>
        </select>
        <button
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          @click="handleSearch"
        >
          搜索
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="text-center py-8 text-gray-500">
      加载中...
    </div>
    <div v-else-if="knowledgeList.length === 0" class="bg-white rounded-xl shadow-sm p-8 text-center">
      <div class="text-gray-400 mb-4">
        <BookOpen class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 mb-4">暂无知识库内容</p>
      <button
        class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        @click="handleAdd"
      >
        添加第一条知识
      </button>
    </div>
    <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-600">标题</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-600">分类</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-600">标签</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-600">优先级</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-600">状态</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-600">查看次数</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in knowledgeList" :key="item.knowledgeId" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <BookOpen class="w-4 h-4 text-gray-400" />
                <div>
                  <div class="font-medium text-gray-800">{{ item.title }}</div>
                  <div class="text-xs text-gray-400 truncate max-w-xs">{{ truncateContent(item.content) }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span v-if="item.category" class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                <FolderOpen class="w-3 h-3" />
                {{ item.category }}
              </span>
              <span v-else class="text-gray-400 text-sm">-</span>
            </td>
            <td class="px-6 py-4">
              <div v-if="item.tags?.length" class="flex flex-wrap gap-1">
                <span
                  v-for="tag in item.tags.slice(0, 3)"
                  :key="tag"
                  class="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  <Tag class="w-3 h-3" />
                  {{ tag }}
                </span>
                <span v-if="item.tags.length > 3" class="text-xs text-gray-400">+{{ item.tags.length - 3 }}</span>
              </div>
              <span v-else class="text-gray-400 text-sm">-</span>
            </td>
            <td class="px-6 py-4">
              <span class="px-2 py-1 bg-amber-50 text-amber-600 text-xs rounded">{{ item.priority || 1 }}</span>
            </td>
            <td class="px-6 py-4">
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="item.isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'"
              >
                {{ item.isEnabled ? '已启用' : '已禁用' }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center gap-1 text-sm text-gray-500">
                <Eye class="w-3 h-3" />
                {{ item.viewCount || 0 }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-1">
                <button
                  class="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                  title="查看详情"
                  @click="handleView(item)"
                >
                  <Eye class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                  title="编辑"
                  @click="handleEdit(item)"
                >
                  <Edit class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除"
                  @click="handleDelete(item)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
                <button
                  class="p-2 rounded-lg transition-colors"
                  :class="
                    item.isEnabled
                      ? 'text-green-500 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  "
                  :title="item.isEnabled ? '禁用' : '启用'"
                  @click="handleToggle(item)"
                >
                  <Power v-if="item.isEnabled" class="w-4 h-4" />
                  <PowerOff v-else class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-6 py-4 border-t border-gray-100">
        <div class="text-sm text-gray-500">
          共 {{ total }} 条记录，第 {{ currentPage }} / {{ totalPages }} 页
        </div>
        <div class="flex items-center gap-2">
          <button
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            :disabled="currentPage <= 1"
            @click="handlePageChange(currentPage - 1)"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <template v-for="page in totalPages" :key="page">
            <button
              v-if="page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1"
              class="w-8 h-8 text-sm rounded-lg transition-colors"
              :class="page === currentPage ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'"
              @click="handlePageChange(page)"
            >
              {{ page }}
            </button>
            <span v-else-if="Math.abs(page - currentPage) === 2" class="text-gray-400">...</span>
          </template>
          <button
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            :disabled="currentPage >= totalPages"
            @click="handlePageChange(currentPage + 1)"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <Modal
      v-model:visible="showModal"
      :title="modalMode === 'create' ? '添加知识' : '编辑知识'"
      width="700px"
    >
      <div class="p-6 space-y-4 max-h-[60vh] overflow-auto">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            标题 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="knowledgeForm.title"
            type="text"
            placeholder="请输入知识标题"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            内容 <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="knowledgeForm.content"
            rows="8"
            placeholder="请输入知识内容，支持详细描述..."
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <input
              v-model="knowledgeForm.category"
              type="text"
              list="category-list"
              placeholder="输入或选择分类"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <datalist id="category-list">
              <option v-for="cat in categories" :key="cat" :value="cat" />
            </datalist>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">标签</label>
            <input
              v-model="knowledgeForm.tags"
              type="text"
              placeholder="多个标签用逗号分隔"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">来源</label>
            <input
              v-model="knowledgeForm.source"
              type="text"
              placeholder="例如：官方文档、用户手册"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">优先级</label>
            <input
              v-model.number="knowledgeForm.priority"
              type="number"
              min="1"
              max="100"
              placeholder="1-100，数字越大优先级越高"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            :id="'knowledge-enabled'"
            v-model="knowledgeForm.isEnabled"
            type="checkbox"
            class="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label for="knowledge-enabled" class="text-sm text-gray-700">启用此知识</label>
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

    <!-- 详情弹窗 -->
    <Modal
      v-model:visible="showDetail"
      title="知识详情"
      width="700px"
    >
      <div v-if="detailKnowledge" class="p-6 space-y-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-800">{{ detailKnowledge.title }}</h3>
        </div>
        <div class="flex flex-wrap gap-2">
          <span v-if="detailKnowledge.category" class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
            <FolderOpen class="w-3 h-3" />
            {{ detailKnowledge.category }}
          </span>
          <span
            class="px-2 py-1 text-xs rounded-full"
            :class="detailKnowledge.isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'"
          >
            {{ detailKnowledge.isEnabled ? '已启用' : '已禁用' }}
          </span>
          <span class="px-2 py-1 bg-amber-50 text-amber-600 text-xs rounded">优先级: {{ detailKnowledge.priority || 1 }}</span>
        </div>
        <div v-if="detailKnowledge.tags?.length" class="flex flex-wrap gap-1">
          <span
            v-for="tag in detailKnowledge.tags"
            :key="tag"
            class="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
          >
            <Tag class="w-3 h-3" />
            {{ tag }}
          </span>
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ detailKnowledge.content }}</p>
        </div>
        <div v-if="detailKnowledge.source" class="text-sm text-gray-500">
          <span class="font-medium">来源：</span>{{ detailKnowledge.source }}
        </div>
        <div class="flex justify-between text-xs text-gray-400">
          <span>创建时间：{{ formatDate(detailKnowledge.createdAt) }}</span>
          <span>更新时间：{{ formatDate(detailKnowledge.updatedAt) }}</span>
          <span class="inline-flex items-center gap-1">
            <Eye class="w-3 h-3" />
            查看次数：{{ detailKnowledge.viewCount || 0 }}
          </span>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            @click="showDetail = false"
          >
            关闭
          </button>
          <button
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            @click="showDetail = false; handleEdit(detailKnowledge!)"
          >
            编辑
          </button>
        </div>
      </template>
    </Modal>

    <!-- 删除确认 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      type="error"
      title="删除知识"
      :message="`确定要删除知识「${deleteTarget?.title}」吗？此操作不可恢复。`"
      confirm-text="删除"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
/* 页面标题 - 覆盖 Tailwind 硬编码颜色 */
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
:deep(input[type="number"]),
:deep(textarea),
:deep(select) {
  background-color: var(--color-bg-layout);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}
:deep(input::placeholder),
:deep(textarea::placeholder) {
  color: var(--color-text-secondary);
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
:deep(.hover\:text-gray-600:hover) {
  color: var(--color-text-primary);
}
</style>
