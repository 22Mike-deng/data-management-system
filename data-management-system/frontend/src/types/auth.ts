/**
 * 认证相关类型定义
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-14
 */

// 用户信息
export interface UserInfo {
  id: string
  username: string
  email: string
  nickname: string
  avatar: string
  status: number
  lastLoginAt: string
  lastLoginIp: string
  createdAt: string
  updatedAt: string
}

// 登录方式
export type LoginType = 'password' | 'code'

// 登录请求（密码登录）
export interface LoginRequest {
  account: string  // 用户名或邮箱
  password: string
}

// 发送验证码请求
export interface SendCodeRequest {
  email: string
}

// 验证码登录请求
export interface LoginByCodeRequest {
  email: string
  code: string
}

// 登录响应
export interface LoginResponse {
  token: string
  user: UserInfo
}

// 修改密码请求
export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}
