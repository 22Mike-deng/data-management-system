<template>
  <div class="flex h-screen w-full items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="mb-8">
        <svg class="mx-auto h-24 w-24 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
      <h1 class="mb-4 text-6xl font-bold text-gray-800">403</h1>
      <h2 class="mb-4 text-2xl font-semibold text-gray-600">访问被拒绝</h2>
      <p class="mb-8 text-gray-500">抱歉，您没有权限访问此页面</p>
      <div class="flex justify-center gap-4">
        <t-button theme="primary" @click="goBack">返回上一页</t-button>
        <t-button theme="default" @click="goHome">返回首页</t-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 403 无权限页面
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import { useRouter } from 'vue-router'

const router = useRouter()

// 返回上一页
function goBack() {
  router.go(-1)
}

// 返回首页
function goHome() {
  router.push('/')
}
</script>
