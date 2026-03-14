/**
 * 路由配置
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-13
 */
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '工作台', icon: 'home' },
      },
      {
        path: 'user-manage',
        name: 'UserManage',
        component: () => import('@/views/user-manage/index.vue'),
        meta: { title: '用户管理', icon: 'users' },
      },
      {
        path: 'table-manage',
        name: 'TableManage',
        component: () => import('@/views/table-manage/index.vue'),
        meta: { title: '数据表管理', icon: 'server' },
      },
      {
        path: 'data-manage/:tableId',
        name: 'DataManage',
        component: () => import('@/views/data-manage/index.vue'),
        meta: { title: '数据管理', icon: 'database', hidden: true },
      },
      {
        path: 'visualization',
        name: 'Visualization',
        component: () => import('@/views/visualization/index.vue'),
        meta: { title: '数据可视化', icon: 'chart-bar' },
      },
      {
        path: 'ai-model',
        name: 'AIModel',
        component: () => import('@/views/ai-model/index.vue'),
        meta: { title: 'AI模型管理', icon: 'robot' },
      },
      {
        path: 'ai-chat',
        name: 'AIChat',
        component: () => import('@/views/ai-chat/index.vue'),
        meta: { title: 'AI对话', icon: 'chat' },
      },
      {
        path: 'knowledge-base',
        name: 'KnowledgeBase',
        component: () => import('@/views/knowledge-base/index.vue'),
        meta: { title: '知识库管理', icon: 'book' },
      },
      {
        path: 'token-stats',
        name: 'TokenStats',
        component: () => import('@/views/token-stats/index.vue'),
        meta: { title: 'Token统计', icon: 'chart-line' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/index.vue'),
        meta: { title: '个人设置', icon: 'settings', hidden: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  // 设置页面标题
  document.title = `${to.meta.title || '数据管理系统'} - 数据管理可视化系统`

  // 检查是否需要认证
  const requiresAuth = to.meta.requiresAuth !== false
  const token = localStorage.getItem('token')

  // 如果不需要认证（如登录页），直接放行
  if (!requiresAuth) {
    // 已登录用户访问登录页，重定向到首页
    if (to.path === '/login' && token) {
      next('/')
      return
    }
    next()
    return
  }

  // 需要认证但没有 token，跳转登录页
  if (!token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  next()
})

export default router
