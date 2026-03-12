/**
 * 路由配置
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
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
        path: 'token-stats',
        name: 'TokenStats',
        component: () => import('@/views/token-stats/index.vue'),
        meta: { title: 'Token统计', icon: 'chart-line' },
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
router.beforeEach((to, _from, next) => {
  // 设置页面标题
  document.title = `${to.meta.title || '数据管理系统'} - 数据管理可视化系统`
  next()
})

export default router
