/**
 * Electron 预加载脚本
 * 通过 contextBridge 安全暴露 API 给渲染进程
 * @creator dzh
 * @created 2026-03-14
 * @updated 2026-03-14
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * 安全暴露 Electron API 给渲染进程
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 平台信息
   */
  platform: {
    os: process.platform,
    version: process.env.npm_package_version || '1.0.1',
  },

  /**
   * 文件对话框 API
   */
  fileDialog: {
    /**
     * 打开文件选择对话框
     * @param {Object} options - 文件选择选项
     * @returns {Promise<{filePaths: string[], canceled: boolean}>}
     */
    open: (options) => ipcRenderer.invoke('dialog:openFile', options),

    /**
     * 打开保存文件对话框
     * @param {Object} options - 保存选项
     * @returns {Promise<{filePaths: string[], canceled: boolean}>}
     */
    save: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  },

  /**
   * 通知 API
   */
  notification: {
    /**
     * 显示系统通知
     * @param {Object} options - 通知选项
     * @returns {Promise<{success: boolean}>}
     */
    show: (options) => ipcRenderer.invoke('notification:show', options),

    /**
     * 检查通知权限
     * @returns {Promise<boolean>}
     */
    hasPermission: async () => {
      // Electron 桌面端始终有通知权限
      return true;
    },
  },

  /**
   * Shell API
   */
  shell: {
    /**
     * 使用系统默认应用打开外部链接
     * @param {string} url - 链接地址
     * @returns {Promise<{success: boolean}>}
     */
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

    /**
     * 在文件管理器中显示文件
     * @param {string} filePath - 文件路径
     * @returns {Promise<{success: boolean}>}
     */
    showItemInFolder: (filePath) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  },

  /**
   * 窗口控制 API
   */
  window: {
    /** 最小化窗口 */
    minimize: () => ipcRenderer.invoke('window:minimize'),

    /** 最大化窗口 */
    maximize: () => ipcRenderer.invoke('window:maximize'),

    /** 还原窗口 */
    restore: () => ipcRenderer.invoke('window:restore'),

    /** 关闭窗口 */
    close: () => ipcRenderer.invoke('window:close'),

    /** 窗口是否最大化 */
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  /**
   * 应用控制 API
   */
  app: {
    /** 获取应用版本 */
    getVersion: () => ipcRenderer.invoke('app:getVersion'),

    /** 退出应用 */
    quit: () => ipcRenderer.invoke('app:quit'),

    /** 重启应用 */
    relaunch: () => ipcRenderer.invoke('app:relaunch'),
  },
});

/**
 * 监听通知点击事件
 */
ipcRenderer.on('notification:clicked', (event, options) => {
  if (options.onClick) {
    options.onClick();
  }
});

console.log('[Preload] Electron API 已加载');
