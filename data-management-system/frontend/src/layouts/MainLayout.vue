/**
 * 主布局组件
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-14
 */
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Home,
  Database,
  BarChart3,
  Bot,
  MessageSquare,
  LineChart,
  Menu as MenuIcon,
  X,
  BookOpen,
  Settings,
  LogOut,
  User,
  Users,
  FileText,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import ThemeSwitch from '@/components/ThemeSwitch.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const themeStore = useThemeStore()
const collapsed = ref(false)

// 菜单配置
const menuItems = [
  { key: '/dashboard', title: '工作台', icon: Home },
  { key: '/user-manage', title: '用户管理', icon: Users },
  { key: '/table-manage', title: '数据表管理', icon: Database },
  { key: '/visualization', title: '数据可视化', icon: BarChart3 },
  { key: '/ai-model', title: 'AI模型管理', icon: Bot },
  { key: '/ai-chat', title: 'AI对话', icon: MessageSquare },
  { key: '/knowledge-base', title: '知识库管理', icon: BookOpen },
  { key: '/token-stats', title: 'Token统计', icon: LineChart },
  { key: '/audit-log', title: '审计日志', icon: FileText },
]

// 当前激活菜单
const activeMenu = computed(() => {
  const path = route.path
  // 匹配一级菜单
  const firstPath = '/' + path.split('/')[1]
  return firstPath || '/dashboard'
})

// 切换侧边栏
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
}

// 菜单点击
const handleMenuClick = (key: string) => {
  router.push(key)
}

// 处理退出登录
const handleLogout = async () => {
  await userStore.logout()
  router.push('/login')
}

// 初始化获取用户信息
onMounted(() => {
  if (userStore.token && !userStore.userInfo) {
    userStore.fetchUserInfo()
  }
  // 初始化主题
  themeStore.initTheme()
})
</script>

<template>
  <div class="flex h-screen main-layout">
    <!-- 侧边栏 -->
    <aside
      class="flex flex-col sidebar shadow-lg transition-all duration-300"
      :class="collapsed ? 'w-16' : 'w-64'"
    >
      <!-- Logo区域 -->
      <div class="flex items-center h-16 px-4 border-b sidebar-border">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Database class="w-5 h-5 text-white" />
          </div>
          <span
            v-if="!collapsed"
            class="text-lg font-semibold sidebar-title whitespace-nowrap"
          >
            数据管理系统
          </span>
        </div>
      </div>

      <!-- 菜单区域 -->
      <nav class="flex-1 py-4 overflow-y-auto">
        <ul class="space-y-1 px-3">
          <li
            v-for="item in menuItems"
            :key="item.key"
            class="flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 menu-item"
            :class="{ 'menu-item-active': activeMenu === item.key }"
            @click="handleMenuClick(item.key)"
          >
            <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
            <span
              v-if="!collapsed"
              class="text-sm font-medium whitespace-nowrap"
            >
              {{ item.title }}
            </span>
          </li>
        </ul>
      </nav>

      <!-- 用户信息区域 -->
      <div class="p-3 border-t sidebar-border">
        <t-popup
          placement="top-left"
          trigger="click"
          :overlay-style="{ padding: '4px 0' }"
        >
          <div class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer user-info transition-colors">
            <div class="w-8 h-8 rounded-full user-avatar flex-shrink-0 overflow-hidden">
              <img
                v-if="userStore.avatar"
                :src="userStore.avatar"
                :alt="userStore.nickname"
                class="w-full h-full object-cover"
              />
              <User v-else class="w-full h-full p-1.5 user-avatar-icon" />
            </div>
            <div v-if="!collapsed" class="flex-1 min-w-0">
              <p class="text-sm font-medium user-name truncate">
                {{ userStore.nickname || '未登录' }}
              </p>
              <p class="text-xs user-email truncate">
                {{ userStore.userInfo?.email || '' }}
              </p>
            </div>
          </div>
          <template #content>
            <div class="popup-menu rounded-lg shadow-lg border sidebar-border py-1 min-w-[140px]">
              <div
                class="flex items-center gap-2 px-4 py-2 text-sm popup-item cursor-pointer"
                @click="router.push('/settings')"
              >
                <Settings class="w-4 h-4" />
                <span>个人设置</span>
              </div>
              <div
                class="flex items-center gap-2 px-4 py-2 text-sm logout-item cursor-pointer"
                @click="handleLogout"
              >
                <LogOut class="w-4 h-4" />
                <span>退出登录</span>
              </div>
            </div>
          </template>
        </t-popup>
      </div>

      <!-- 折叠按钮 -->
      <div class="p-3 border-t sidebar-border">
        <button
          class="w-full flex items-center justify-center py-2 rounded-lg collapse-btn transition-colors"
          @click="toggleCollapsed"
        >
          <MenuIcon v-if="collapsed" class="w-5 h-5" />
          <X v-else class="w-5 h-5" />
        </button>
      </div>
    </aside>

    <!-- 主内容区域 -->
    <main class="flex-1 flex flex-col overflow-hidden main-content">
      <!-- 顶部导航 -->
      <header class="h-16 header shadow-sm flex items-center justify-between px-6">
        <div class="flex items-center gap-4">
          <h1 class="text-lg font-semibold header-title">
            {{ route.meta.title || '工作台' }}
          </h1>
        </div>
        <div class="flex items-center gap-4">
          <!-- 主题切换 -->
          <ThemeSwitch />
          <span class="text-sm header-version">
            数据管理可视化系统 v1.0.1
          </span>
        </div>
      </header>

      <!-- 内容区域 -->
      <div class="flex-1 overflow-auto p-6 content-area">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* 主布局 */
.main-layout {
  background-color: var(--color-bg-page);
}

/* 侧边栏 */
.sidebar {
  background-color: var(--color-bg-container);
}

.sidebar-border {
  border-color: var(--color-border);
}

.sidebar-title {
  color: var(--color-text-primary);
}

/* 菜单项 */
.menu-item {
  color: var(--color-text-secondary);
}

.menu-item:hover {
  background-color: var(--color-bg-hover);
}

.menu-item-active {
  background-color: var(--color-bg-active);
  color: var(--color-primary);
}

/* 用户信息 */
.user-info:hover {
  background-color: var(--color-bg-hover);
}

.user-avatar {
  background-color: var(--color-bg-hover);
}

.user-avatar-icon {
  color: var(--color-text-placeholder);
}

.user-name {
  color: var(--color-text-primary);
}

.user-email {
  color: var(--color-text-secondary);
}

/* 弹出菜单 */
.popup-menu {
  background-color: var(--color-bg-container);
}

.popup-item {
  color: var(--color-text-primary);
}

.popup-item:hover {
  background-color: var(--color-bg-hover);
}

.logout-item {
  color: var(--color-error);
}

.logout-item:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

/* 折叠按钮 */
.collapse-btn {
  color: var(--color-text-secondary);
}

.collapse-btn:hover {
  background-color: var(--color-bg-hover);
}

/* 主内容区 */
.main-content {
  background-color: var(--color-bg-page);
}

/* 顶部导航 */
.header {
  background-color: var(--color-bg-container);
}

.header-title {
  color: var(--color-text-primary);
}

.header-version {
  color: var(--color-text-secondary);
}

/* 内容区域 */
.content-area {
  background-color: var(--color-bg-page);
}

/* 路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
