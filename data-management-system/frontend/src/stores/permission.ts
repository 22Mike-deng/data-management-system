/**
 * 权限状态管理
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 角色信息接口
export interface RoleInfo {
  id: string
  code: string
  name: string
}

export const usePermissionStore = defineStore('permission', () => {
  // 用户角色
  const role = ref<RoleInfo | null>(null)

  // 用户权限编码列表
  const permissions = ref<string[]>([])

  // 是否为超级管理员
  const isSuperAdmin = computed(() => role.value?.code === 'super_admin')

  // 是否为管理员
  const isAdmin = computed(() => role.value?.code === 'admin' || isSuperAdmin.value)

  /**
   * 设置角色和权限
   */
  function setRoleAndPermissions(roleInfo: RoleInfo | null, permissionList: string[]): void {
    role.value = roleInfo
    permissions.value = permissionList || []
  }

  /**
   * 检查是否拥有指定权限
   * @param permission 权限编码
   */
  function hasPermission(permission: string): boolean {
    // 超级管理员拥有所有权限
    if (isSuperAdmin.value) return true
    return permissions.value.includes(permission)
  }

  /**
   * 检查是否拥有任意一个权限
   * @param permissionList 权限编码列表
   */
  function hasAnyPermission(permissionList: string[]): boolean {
    // 超级管理员拥有所有权限
    if (isSuperAdmin.value) return true
    return permissionList.some((p) => permissions.value.includes(p))
  }

  /**
   * 检查是否拥有所有权限
   * @param permissionList 权限编码列表
   */
  function hasAllPermissions(permissionList: string[]): boolean {
    // 超级管理员拥有所有权限
    if (isSuperAdmin.value) return true
    return permissionList.every((p) => permissions.value.includes(p))
  }

  /**
   * 清除权限信息
   */
  function clearPermissions(): void {
    role.value = null
    permissions.value = []
  }

  return {
    role,
    permissions,
    isSuperAdmin,
    isAdmin,
    setRoleAndPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    clearPermissions,
  }
})
