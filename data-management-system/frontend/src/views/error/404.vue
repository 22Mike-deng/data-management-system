/**
 * 404页面
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Home, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="text-center">
      <h1 class="text-9xl font-bold text-primary/20">404</h1>
      <p class="text-2xl font-semibold text-gray-800 mt-4">页面未找到</p>
      <p class="text-gray-500 mt-2">抱歉，您访问的页面不存在</p>
      <div class="flex items-center justify-center gap-4 mt-8">
        <button
          class="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          @click="goBack"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>返回</span>
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          @click="goHome"
        >
          <Home class="w-4 h-4" />
          <span>返回首页</span>
        </button>
      </div>
    </div>
  </div>
</template>
