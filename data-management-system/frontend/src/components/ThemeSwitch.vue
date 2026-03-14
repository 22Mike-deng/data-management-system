<!--
  主题切换组件
  创建者：dzh
  创建时间：2026-03-14
  更新时间：2026-03-14
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Sun, Moon, Monitor } from 'lucide-vue-next'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

const themeStore = useThemeStore()

// 主题选项
const themeOptions = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
]

// 当前选中的主题
const selectedTheme = ref<ThemeMode>('system')
const showDropdown = ref(false)

// 初始化
onMounted(() => {
  selectedTheme.value = themeStore.themeMode
  themeStore.initTheme()
})

// 切换下拉菜单
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

// 选择主题
const selectTheme = (mode: ThemeMode) => {
  selectedTheme.value = mode
  themeStore.setTheme(mode)
  showDropdown.value = false
}

// 关闭下拉菜单
const closeDropdown = () => {
  showDropdown.value = false
}

// 获取当前图标
const getCurrentIcon = () => {
  const option = themeOptions.find(o => o.value === selectedTheme.value)
  return option?.icon || Monitor
}
</script>

<template>
  <div class="theme-switch" v-click-outside="closeDropdown">
    <button 
      class="theme-switch-btn"
      @click="toggleDropdown"
      :title="`当前主题: ${themeOptions.find(o => o.value === selectedTheme)?.label}`"
    >
      <component :is="getCurrentIcon()" class="theme-icon" />
    </button>
    
    <Transition name="dropdown">
      <div v-if="showDropdown" class="theme-dropdown">
        <div class="dropdown-header">主题设置</div>
        <div class="dropdown-options">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            class="dropdown-option"
            :class="{ active: selectedTheme === option.value }"
            @click="selectTheme(option.value as ThemeMode)"
          >
            <component :is="option.icon" class="option-icon" />
            <span class="option-label">{{ option.label }}</span>
            <span v-if="selectedTheme === option.value" class="option-check">✓</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.theme-switch {
  position: relative;
}

.theme-switch-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-bg-container);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-switch-btn:hover {
  background-color: var(--color-bg-hover);
}

.theme-icon {
  width: 20px;
  height: 20px;
}

.theme-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background-color: var(--color-bg-container);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 1000;
}

.dropdown-header {
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.dropdown-options {
  padding: 8px 0;
}

.dropdown-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  text-align: left;
}

.dropdown-option:hover {
  background-color: var(--color-bg-hover);
}

.dropdown-option.active {
  background-color: var(--color-bg-active);
  color: var(--color-primary);
}

.option-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.option-label {
  flex: 1;
  font-size: 14px;
}

.option-check {
  color: var(--color-primary);
  font-size: 14px;
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all var(--transition-fast);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
