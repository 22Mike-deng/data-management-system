/**
 * Vue 应用入口文件
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-14
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'

import App from './App.vue'
import router from './router'
import './styles/variables.css'
import './style.css'

// 初始化平台适配器（支持 Web 和 Electron）
import { initPlatform } from './platforms'

// 在应用启动时初始化平台适配器
initPlatform()

const app = createApp(App)

// 状态管理
app.use(createPinia())

// 路由
app.use(router)

// TDesign 组件库
app.use(TDesign)

app.mount('#app')
