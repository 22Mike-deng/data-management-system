/**
 * 主题状态管理
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// 主题类型
export type ThemeMode = 'light' | 'dark' | 'system'

// 本地存储键名
const THEME_STORAGE_KEY = 'app-theme-mode'

/**
 * 获取系统主题偏好
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

/**
 * 获取存储的主题设置
 */
function getStoredTheme(): ThemeMode {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  }
  return 'system'
}

/**
 * 应用主题到DOM
 */
function applyTheme(theme: ThemeMode) {
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme
  
  if (typeof document !== 'undefined') {
    const html = document.documentElement
    
    if (effectiveTheme === 'dark') {
      html.setAttribute('data-theme', 'dark')
      // 同时设置TDesign的主题
      html.setAttribute('theme-mode', 'dark')
    } else {
      html.removeAttribute('data-theme')
      html.removeAttribute('theme-mode')
    }
  }
  
  return effectiveTheme
}

export const useThemeStore = defineStore('theme', () => {
  // 当前主题设置
  const themeMode = ref<ThemeMode>(getStoredTheme())
  
  // 实际生效的主题（解析system后的结果）
  const effectiveTheme = ref<'light' | 'dark'>('light')
  
  // 初始化应用主题
  const initTheme = () => {
    effectiveTheme.value = applyTheme(themeMode.value)
    
    // 监听系统主题变化
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      mediaQuery.addEventListener('change', (e) => {
        if (themeMode.value === 'system') {
          effectiveTheme.value = applyTheme('system')
        }
      })
    }
  }
  
  // 设置主题
  const setTheme = (mode: ThemeMode) => {
    themeMode.value = mode
    effectiveTheme.value = applyTheme(mode)
    
    // 持久化存储
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    }
  }
  
  // 切换亮/暗主题
  const toggleTheme = () => {
    const newTheme = effectiveTheme.value === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }
  
  // 是否为深色模式
  const isDark = () => effectiveTheme.value === 'dark'
  
  return {
    themeMode,
    effectiveTheme,
    initTheme,
    setTheme,
    toggleTheme,
    isDark,
  }
})
