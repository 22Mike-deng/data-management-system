/**
 * 认证相关类型定义
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
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

// 登录请求
export interface LoginRequest {
  username: string
  password: string
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
