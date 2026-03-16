/**
 * 权限指令
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import type { Directive, DirectiveBinding } from 'vue'
import { usePermissionStore } from '@/stores/permission'

/**
 * 权限指令
 * 用法：
 * v-permission="'user:create'" - 单个权限
 * v-permission="['user:create', 'user:edit']" - 多个权限（满足任意一个）
 */
export const permission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const permissionStore = usePermissionStore()
    const value = binding.value

    if (!value) return

    let hasPermission = false

    if (Array.isArray(value)) {
      // 数组形式：满足任意一个权限即可
      hasPermission = permissionStore.hasAnyPermission(value)
    } else {
      // 字符串形式：单个权限
      hasPermission = permissionStore.hasPermission(value)
    }

    if (!hasPermission) {
      // 无权限时移除元素
      el.parentNode?.removeChild(el)
    }
  },
}

/**
 * 权限指令 - 需要满足所有权限
 * 用法：v-permission-all="['user:view', 'user:edit']"
 */
export const permissionAll: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string[]>) {
    const permissionStore = usePermissionStore()
    const value = binding.value

    if (!value || !Array.isArray(value)) return

    const hasPermission = permissionStore.hasAllPermissions(value)

    if (!hasPermission) {
      el.parentNode?.removeChild(el)
    }
  },
}

/**
 * 角色指令
 * 用法：v-role="'admin'"
 */
export const role: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const permissionStore = usePermissionStore()
    const value = binding.value

    if (!value) return

    const userRole = permissionStore.role?.code
    let hasRole = false

    if (Array.isArray(value)) {
      hasRole = value.includes(userRole || '')
    } else {
      hasRole = userRole === value
    }

    if (!hasRole) {
      el.parentNode?.removeChild(el)
    }
  },
}

// 导出所有权限相关指令
export const permissionDirectives = {
  permission,
  permissionAll,
  role,
}
