/**
 * 用户状态管理
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-16
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo } from '@/types/auth'
import * as authApi from '@/api/auth'
import { usePermissionStore } from './permission'

// 登录响应接口（扩展后端返回的数据结构）
interface LoginResponse {
  token: string
  user: UserInfo
  role?: {
    id: string
    code: string
    name: string
  } | null
  permissions: string[]
}

export const useUserStore = defineStore('user', () => {
  // 用户信息
  const userInfo = ref<UserInfo | null>(null)
  
  // Token
  const token = ref<string | null>(localStorage.getItem('token'))

  // 是否已登录
  const isLoggedIn = computed(() => !!token.value)

  // 用户名
  const username = computed(() => userInfo.value?.username || '')

  // 昵称
  const nickname = computed(() => userInfo.value?.nickname || userInfo.value?.username || '')

  // 头像
  const avatar = computed(() => userInfo.value?.avatar || '')

  /**
   * 登录（支持用户名或邮箱密码登录）
   */
  async function login(account: string, password: string): Promise<void> {
    const res = await authApi.login({ account, password }) as LoginResponse
    token.value = res.token
    userInfo.value = res.user
    localStorage.setItem('token', res.token)
    
    // 设置权限信息
    const permissionStore = usePermissionStore()
    permissionStore.setRoleAndPermissions(res.role, res.permissions)
  }

  /**
   * 邮箱验证码登录
   */
  async function loginByCode(email: string, code: string): Promise<void> {
    const res = await authApi.loginByCode({ email, code }) as LoginResponse
    token.value = res.token
    userInfo.value = res.user
    localStorage.setItem('token', res.token)
    
    // 设置权限信息
    const permissionStore = usePermissionStore()
    permissionStore.setRoleAndPermissions(res.role, res.permissions)
  }

  /**
   * 发送邮箱验证码
   */
  async function sendEmailCode(email: string): Promise<void> {
    await authApi.sendEmailCode({ email })
  }

  /**
   * 获取用户信息
   */
  async function fetchUserInfo(): Promise<void> {
    if (!token.value) return
    try {
      const user = await authApi.getUserInfo() as any
      userInfo.value = user
      
      // 设置权限信息
      if (user.role || user.permissions) {
        const permissionStore = usePermissionStore()
        permissionStore.setRoleAndPermissions(user.role, user.permissions)
      }
    } catch {
      logout()
    }
  }

  /**
   * 登出
   * 调用后端 API 将 Token 加入黑名单，然后清除本地状态
   */
  async function logout(): Promise<void> {
    try {
      // 调用后端 logout API
      await authApi.logout()
    } catch {
      // 忽略错误，继续清除本地状态
    } finally {
      // 清除本地状态
      token.value = null
      userInfo.value = null
      localStorage.removeItem('token')
      
      // 清除权限信息
      const permissionStore = usePermissionStore()
      permissionStore.clearPermissions()
    }
  }

  /**
   * 修改密码
   */
  async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await authApi.changePassword({ oldPassword, newPassword })
  }

  return {
    userInfo,
    token,
    isLoggedIn,
    username,
    nickname,
    avatar,
    login,
    loginByCode,
    sendEmailCode,
    logout,
    fetchUserInfo,
    changePassword,
  }
})
