/**
 * 登录页面
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
      <!-- Logo 和标题 -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
          <Database class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">数据管理可视化系统</h1>
        <p class="mt-2 text-gray-500">管理后台登录</p>
      </div>

      <!-- 登录表单 -->
      <t-form
        ref="formRef"
        :data="formData"
        :rules="formRules"
        @submit="handleLogin"
      >
        <t-form-item name="username">
          <t-input
            v-model="formData.username"
            placeholder="请输入用户名"
            size="large"
            clearable
          >
            <template #prefix-icon>
              <User class="w-5 h-5 text-gray-400" />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item name="password">
          <t-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            clearable
          >
            <template #prefix-icon>
              <Lock class="w-5 h-5 text-gray-400" />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item>
          <t-button
            type="submit"
            theme="primary"
            size="large"
            block
            :loading="loading"
          >
            登 录
          </t-button>
        </t-form-item>
      </t-form>

      <!-- 提示信息 -->
      <div class="mt-6 text-center text-sm text-gray-500">
        <p>面向管理的系统，暂不开放注册</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 登录页面
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { Database, User, Lock } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)

const formData = reactive({
  username: '',
  password: '',
})

const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin({ validateResult }: { validateResult: boolean }) {
  if (!validateResult) return

  loading.value = true
  try {
    await userStore.login(formData.username, formData.password)
    MessagePlugin.success('登录成功')
    router.push('/')
  } catch (error: any) {
    MessagePlugin.error(error.response?.data?.message || error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>
