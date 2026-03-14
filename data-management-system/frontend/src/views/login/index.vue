/**
 * 登录页面
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-14
 */
<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="grid-pattern"></div>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <!-- Logo 区域 -->
      <div class="logo-section">
        <div class="logo-icon">
          <Database class="w-8 h-8" />
        </div>
        <h1 class="title">数据管理可视化系统</h1>
        <p class="subtitle">Management Dashboard</p>
      </div>

      <!-- 登录方式切换 -->
      <div class="tab-switcher">
        <button
          :class="['tab-btn', { active: loginType === 'password' }]"
          @click="switchLoginType('password')"
        >
          <Key class="w-4 h-4" />
          <span>密码登录</span>
        </button>
        <button
          :class="['tab-btn', { active: loginType === 'code' }]"
          @click="switchLoginType('code')"
        >
          <Mail class="w-4 h-4" />
          <span>验证码登录</span>
        </button>
        <div class="tab-indicator" :class="{ 'to-right': loginType === 'code' }"></div>
      </div>

      <!-- 密码登录表单 -->
      <transition name="fade-slide" mode="out-in">
        <t-form
          v-if="loginType === 'password'"
          key="password"
          ref="passwordFormRef"
          :data="passwordForm"
          :rules="passwordRules"
          class="login-form"
          label-width="0"
          :required-mark="false"
          @submit="handlePasswordLogin"
        >
          <t-form-item name="account">
            <t-input
              v-model="passwordForm.account"
              placeholder="用户名或邮箱"
              size="large"
              clearable
              class="custom-input"
            >
              <template #prefix-icon>
                <User class="input-icon" />
              </template>
            </t-input>
          </t-form-item>

          <t-form-item name="password">
            <t-input
              v-model="passwordForm.password"
              type="password"
              placeholder="密码"
              size="large"
              clearable
              class="custom-input"
            >
              <template #prefix-icon>
                <Lock class="input-icon" />
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
              class="submit-btn"
            >
              <span v-if="!loading">登 录</span>
            </t-button>
          </t-form-item>
        </t-form>

        <!-- 验证码登录表单 -->
        <t-form
          v-else
          key="code"
          ref="codeFormRef"
          :data="codeForm"
          :rules="codeRules"
          class="login-form"
          label-width="0"
          :required-mark="false"
          @submit="handleCodeLogin"
        >
          <t-form-item name="email">
            <t-input
              v-model="codeForm.email"
              placeholder="邮箱地址"
              size="large"
              clearable
              class="custom-input"
            >
              <template #prefix-icon>
                <Mail class="input-icon" />
              </template>
            </t-input>
          </t-form-item>

          <t-form-item name="code">
            <div class="code-input-group">
              <t-input
                v-model="codeForm.code"
                placeholder="验证码"
                size="large"
                clearable
                class="custom-input code-input"
              >
                <template #prefix-icon>
                  <Shield class="input-icon" />
                </template>
              </t-input>
              <t-button
                theme="default"
                size="large"
                :disabled="countdown > 0 || sendingCode"
                :loading="sendingCode"
                class="code-btn"
                @click="handleSendCode"
              >
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </t-button>
            </div>
          </t-form-item>

          <t-form-item>
            <t-button
              type="submit"
              theme="primary"
              size="large"
              block
              :loading="loading"
              class="submit-btn"
            >
              <span v-if="!loading">登 录</span>
            </t-button>
          </t-form-item>
        </t-form>
      </transition>

      <!-- 底部提示 -->
      <div class="footer-note">
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
 * 更新时间：2026-03-14
 */
import { ref, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { Database, User, Lock, Mail, Key, Shield } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import type { LoginType } from '@/types/auth'

const router = useRouter()
const userStore = useUserStore()

const passwordFormRef = ref()
const codeFormRef = ref()
const loading = ref(false)
const sendingCode = ref(false)
const loginType = ref<LoginType>('password')
const countdown = ref(0)

// 密码登录表单
const passwordForm = reactive({
  account: '',
  password: '',
})

// 验证码登录表单
const codeForm = reactive({
  email: '',
  code: '',
})

// 密码登录验证规则
const passwordRules = {
  account: [{ required: true, message: '请输入用户名或邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

// 验证码登录验证规则
const codeRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { email: { message: '请输入有效的邮箱地址' }, trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为6位数字', trigger: 'blur' },
  ],
}

// 倒计时定时器
let countdownTimer: ReturnType<typeof setInterval> | null = null

/**
 * 切换登录方式
 */
function switchLoginType(type: LoginType) {
  loginType.value = type
}

/**
 * 发送验证码
 */
async function handleSendCode() {
  const valid = await codeFormRef.value?.validate({ fields: ['email'] })
  if (valid !== true) return

  sendingCode.value = true
  try {
    await userStore.sendEmailCode(codeForm.email)
    MessagePlugin.success('验证码已发送，请查收邮件')
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
  } catch (error: any) {
    MessagePlugin.error(error.response?.data?.message || '验证码发送失败')
  } finally {
    sendingCode.value = false
  }
}

/**
 * 密码登录
 */
async function handlePasswordLogin({ validateResult }: { validateResult: boolean }) {
  if (!validateResult) return

  loading.value = true
  try {
    await userStore.login(passwordForm.account, passwordForm.password)
    MessagePlugin.success('登录成功')
    router.push('/')
  } catch (error: any) {
    MessagePlugin.error(error.response?.data?.message || error.message || '登录失败')
  } finally {
    loading.value = false
  }
}

/**
 * 验证码登录
 */
async function handleCodeLogin({ validateResult }: { validateResult: boolean }) {
  if (!validateResult) return

  loading.value = true
  try {
    await userStore.loginByCode(codeForm.email, codeForm.code)
    MessagePlugin.success('登录成功')
    router.push('/')
  } catch (error: any) {
    MessagePlugin.error(error.response?.data?.message || error.message || '登录失败')
  } finally {
    loading.value = false
  }
}

// 组件卸载时清理定时器
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})
</script>

<style scoped>
/* 容器 */
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d0d1f 100%);
  position: relative;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  bottom: -50px;
  right: -50px;
  animation-delay: -7s;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #ec4899, #f43f5e);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(30px, -30px) scale(1.1);
  }
  50% {
    transform: translate(-20px, 20px) scale(0.95);
  }
  75% {
    transform: translate(-30px, -20px) scale(1.05);
  }
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 50px 50px;
}

/* 登录卡片 */
.login-card {
  width: 100%;
  max-width: 420px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
  z-index: 1;
  animation: cardEnter 0.6s ease-out;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Logo 区域 */
.logo-section {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4);
  animation: iconPulse 2s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% {
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4);
  }
  50% {
    box-shadow: 0 8px 48px rgba(99, 102, 241, 0.6);
  }
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 500;
}

/* 标签切换 */
.tab-switcher {
  display: flex;
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 28px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.3s ease;
  position: relative;
  z-index: 1;
}

.tab-btn:hover {
  color: rgba(255, 255, 255, 0.7);
}

.tab-btn.active {
  color: #ffffff;
}

.tab-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3));
  border-radius: 10px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-indicator.to-right {
  transform: translateX(100%);
}

/* 表单 */
.login-form {
  animation: formEnter 0.4s ease-out;
}

@keyframes formEnter {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 过渡动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* 输入框样式覆盖 */
.login-card :deep(.t-form-item) {
  margin-bottom: 20px;
}

.login-card :deep(.t-input) {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  transition: all 0.3s ease;
}

.login-card :deep(.t-input:hover) {
  border-color: rgba(255, 255, 255, 0.2) !important;
}

.login-card :deep(.t-input:focus-within) {
  border-color: rgba(99, 102, 241, 0.5) !important;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

.login-card :deep(.t-input__inner) {
  color: #ffffff !important;
  font-size: 15px !important;
}

.login-card :deep(.t-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.3) !important;
}

.input-icon {
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.4);
}

/* 验证码输入组 */
.code-input-group {
  display: flex;
  gap: 12px;
}

.code-input {
  flex: 1;
}

.code-btn {
  flex-shrink: 0;
  min-width: 110px;
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  color: rgba(255, 255, 255, 0.8) !important;
  font-weight: 500;
  transition: all 0.3s ease;
}

.code-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
}

.code-btn:disabled {
  opacity: 0.5;
}

/* 提交按钮 */
.submit-btn {
  margin-top: 8px;
  height: 48px !important;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
  border: none !important;
  border-radius: 12px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  letter-spacing: 0.05em;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5);
}

.submit-btn:active {
  transform: translateY(0);
}

/* 底部提示 */
.footer-note {
  margin-top: 24px;
  text-align: center;
}

.footer-note p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
}

/* 错误提示样式 */
.login-card :deep(.t-form__msg) {
  color: #f87171 !important;
  font-size: 12px !important;
}
</style>
