/**
 * 用户管理 API
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import request from '@/utils/request'
import type { SysUser, QueryUserParams, CreateUserParams, UpdateUserParams } from '@/types/user'
import type { PaginatedResponse } from '@/types'

/**
 * 获取用户列表
 */
export async function getUserList(params?: QueryUserParams): Promise<PaginatedResponse<SysUser>> {
  const res = await request.get<PaginatedResponse<SysUser>>('/user', { params })
  return res.data
}

/**
 * 获取用户详情
 */
export async function getUserById(id: string): Promise<SysUser> {
  const res = await request.get<SysUser>(`/user/${id}`)
  return res.data
}

/**
 * 创建用户
 */
export async function createUser(data: CreateUserParams): Promise<SysUser> {
  const res = await request.post<SysUser>('/user', data)
  return res.data
}

/**
 * 更新用户
 */
export async function updateUser(id: string, data: UpdateUserParams): Promise<SysUser> {
  const res = await request.put<SysUser>(`/user/${id}`, data)
  return res.data
}

/**
 * 删除用户
 */
export async function deleteUser(id: string): Promise<void> {
  await request.delete(`/user/${id}`)
}

/**
 * 重置密码
 */
export async function resetPassword(id: string, password: string): Promise<void> {
  await request.post(`/user/${id}/reset-password`, { password })
}

/**
 * 切换用户状态
 */
export async function toggleUserStatus(id: string): Promise<SysUser> {
  const res = await request.post<SysUser>(`/user/${id}/toggle-status`)
  return res.data
}
