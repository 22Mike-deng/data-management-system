/**
 * 主布局组件
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
<script setup lang="ts">
import { ref, computed } from 'vue'
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
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)

// 菜单配置
const menuItems = [
  { key: '/dashboard', title: '工作台', icon: Home },
  { key: '/table-manage', title: '数据表管理', icon: Database },
  { key: '/visualization', title: '数据可视化', icon: BarChart3 },
  { key: '/ai-model', title: 'AI模型管理', icon: Bot },
  { key: '/ai-chat', title: 'AI对话', icon: MessageSquare },
  { key: '/knowledge-base', title: '知识库管理', icon: BookOpen },
  { key: '/token-stats', title: 'Token统计', icon: LineChart },
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
</script>

<template>
  <div class="flex h-screen bg-background">
    <!-- 侧边栏 -->
    <aside
      class="flex flex-col bg-white shadow-lg transition-all duration-300"
      :class="collapsed ? 'w-16' : 'w-64'"
    >
      <!-- Logo区域 -->
      <div class="flex items-center h-16 px-4 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Database class="w-5 h-5 text-white" />
          </div>
          <span
            v-if="!collapsed"
            class="text-lg font-semibold text-gray-800 whitespace-nowrap"
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
            class="flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all duration-200"
            :class="
              activeMenu === item.key
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50'
            "
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

      <!-- 折叠按钮 -->
      <div class="p-3 border-t border-gray-100">
        <button
          class="w-full flex items-center justify-center py-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          @click="toggleCollapsed"
        >
          <MenuIcon v-if="collapsed" class="w-5 h-5" />
          <X v-else class="w-5 h-5" />
        </button>
      </div>
    </aside>

    <!-- 主内容区域 -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- 顶部导航 -->
      <header class="h-16 bg-white shadow-sm flex items-center justify-between px-6">
        <div class="flex items-center gap-4">
          <h1 class="text-lg font-semibold text-gray-800">
            {{ route.meta.title || '工作台' }}
          </h1>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-500">
            数据管理可视化系统 v1.0.0
          </span>
        </div>
      </header>

      <!-- 内容区域 -->
      <div class="flex-1 overflow-auto p-6">
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
