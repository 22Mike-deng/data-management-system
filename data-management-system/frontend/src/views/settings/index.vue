/**
 * 个人设置页面
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
<template>
  <div class="max-w-2xl mx-auto">
    <t-card title="个人设置" :bordered="false">
      <!-- 用户信息展示 -->
      <div class="mb-8">
        <h3 class="text-base font-medium text-gray-800 mb-4">基本信息</h3>
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
            <img
              v-if="userStore.avatar"
              :src="userStore.avatar"
              :alt="userStore.nickname"
              class="w-full h-full object-cover"
            />
            <User v-else class="w-full h-full p-3 text-gray-500" />
          </div>
          <div>
            <p class="text-lg font-medium text-gray-800">{{ userStore.nickname }}</p>
            <p class="text-sm text-gray-500">{{ userStore.userInfo?.email }}</p>
          </div>
        </div>
      </div>

      <!-- 修改密码 -->
      <div class="border-t border-gray-100 pt-6">
        <h3 class="text-base font-medium text-gray-800 mb-4">修改密码</h3>
        <t-form
          ref="formRef"
          :data="passwordForm"
          :rules="passwordRules"
          @submit="handlePasswordSubmit"
        >
          <t-form-item label="当前密码" name="oldPassword">
            <t-input
              v-model="passwordForm.oldPassword"
              type="password"
              placeholder="请输入当前密码"
            />
          </t-form-item>
          <t-form-item label="新密码" name="newPassword">
            <t-input
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="请输入新密码"
            />
          </t-form-item>
          <t-form-item label="确认密码" name="confirmPassword">
            <t-input
              v-model="passwordForm.confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
            />
          </t-form-item>
          <t-form-item>
            <t-button theme="primary" type="submit" :loading="loading">
              保存修改
            </t-button>
          </t-form-item>
        </t-form>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 个人设置页面
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { ref, reactive } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { User } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (val: string) => val === passwordForm.newPassword,
      message: '两次输入的密码不一致',
      trigger: 'blur',
    },
  ],
}

async function handlePasswordSubmit({ validateResult }: { validateResult: boolean }) {
  if (!validateResult) return

  loading.value = true
  try {
    await userStore.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    MessagePlugin.success('密码修改成功')
    // 清空表单
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error: any) {
    MessagePlugin.error(error.response?.data?.message || error.message || '密码修改失败')
  } finally {
    loading.value = false
  }
}
</script>
