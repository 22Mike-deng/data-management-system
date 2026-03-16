/**
 * 用户管理类型定义
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-16
 */

// 用户信息
export interface SysUser {
  id: string
  username: string
  email: string
  nickname: string
  avatar: string
  status: number
  roleId: string | null
  lastLoginAt: string
  lastLoginIp: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 查询用户列表参数
export interface QueryUserParams {
  page?: number
  pageSize?: number
  username?: string
  email?: string
  status?: number
}

// 创建用户参数
export interface CreateUserParams {
  username: string
  password: string
  email: string
  nickname?: string
  avatar?: string
  status?: number
  roleId?: string
}

// 更新用户参数
export interface UpdateUserParams {
  email?: string
  nickname?: string
  avatar?: string
  status?: number
  password?: string
  roleId?: string
}
