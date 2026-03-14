/**
 * 认证 API
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-14
 */
import request from '@/utils/request'
import type { LoginRequest, LoginResponse, UserInfo, ChangePasswordRequest } from '@/types/auth'

/**
 * 用户登录
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await request.post<LoginResponse>('/auth/login', data)
  return res.data
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  await request.post('/auth/logout')
}

/**
 * 获取当前用户信息
 */
export async function getUserInfo(): Promise<UserInfo> {
  const res = await request.get<UserInfo>('/auth/me')
  return res.data
}

/**
 * 修改密码
 */
export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  await request.post('/auth/change-password', data)
}
