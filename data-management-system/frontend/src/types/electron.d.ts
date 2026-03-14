/**
 * Electron API 类型声明
 * @creator dzh
 * @created 2026-03-14
 * @updated 2026-03-14
 */

import { FileDialogOptions, FileDialogResult, NotificationOptions } from '../platforms/types';

/**
 * Electron 暴露给渲染进程的 API 接口
 * 通过 contextBridge 安全暴露
 */
export interface ElectronAPI {
  /**
   * 平台信息
   */
  platform: {
    /** 操作系统类型 */
    os: 'win32' | 'darwin' | 'linux';
    /** 应用版本 */
    version: string;
  };

  /**
   * 文件对话框 API
   */
  fileDialog: {
    /**
     * 打开文件选择对话框
     * @param options 文件选择选项
     */
    open(options?: FileDialogOptions): Promise<FileDialogResult>;

    /**
     * 打开保存文件对话框
     * @param options 保存选项
     */
    save(options?: FileDialogOptions): Promise<FileDialogResult>;
  };

  /**
   * 通知 API
   */
  notification: {
    /**
     * 显示系统通知
     * @param options 通知选项
     */
    show(options: NotificationOptions): Promise<void>;

    /**
     * 检查通知权限
     */
    hasPermission(): Promise<boolean>;
  };

  /**
   * Shell API
   */
  shell: {
    /**
     * 使用系统默认应用打开外部链接
     * @param url 链接地址
     */
    openExternal(url: string): Promise<void>;

    /**
     * 在文件管理器中显示文件
     * @param path 文件路径
     */
    showItemInFolder(path: string): Promise<void>;
  };

  /**
   * 窗口控制 API
   */
  window: {
    /** 最小化窗口 */
    minimize(): void;
    /** 最大化窗口 */
    maximize(): void;
    /** 还原窗口 */
    restore(): void;
    /** 关闭窗口 */
    close(): void;
    /** 窗口是否最大化 */
    isMaximized(): boolean;
  };

  /**
   * 应用控制 API
   */
  app: {
    /** 获取应用版本 */
    getVersion(): string;
    /** 退出应用 */
    quit(): void;
    /** 重启应用 */
    relaunch(): void;
  };
}

/**
 * 扩展 Window 接口，添加 Electron API
 */
declare global {
  interface Window {
    /** Electron 暴露的 API */
    electronAPI?: ElectronAPI;
  }
}

export {};
