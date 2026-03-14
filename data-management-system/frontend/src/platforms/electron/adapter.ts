/**
 * Electron 桌面端平台适配器
 * @creator dzh
 * @created 2026-03-14
 * @updated 2026-03-14
 */

import {
  PlatformAdapter,
  PlatformType,
  PlatformConfig,
  FileDialogOptions,
  FileDialogResult,
  NotificationOptions,
} from '../types';

/**
 * Electron 平台适配器
 * 实现桌面环境下的平台功能
 */
export class ElectronAdapter implements PlatformAdapter {
  readonly type = PlatformType.Electron;

  /**
   * API 基础地址
   * Electron 端连接远程后端服务
   * 生产环境使用实际服务器地址，开发环境可配置
   */
  readonly apiBaseUrl: string;

  constructor() {
    // 从环境变量获取 API 地址，或使用默认值
    // 生产环境应配置为实际的远程服务器地址
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  }

  /**
   * 检查 Electron API 是否可用
   */
  private isElectronAvailable(): boolean {
    return typeof window.electronAPI !== 'undefined';
  }

  /**
   * 选择文件
   * Electron 端使用系统原生文件对话框
   */
  async selectFile(options?: FileDialogOptions): Promise<FileDialogResult> {
    if (!this.isElectronAvailable()) {
      console.warn('Electron API 不可用，回退到 Web 实现');
      // 回退到隐藏的 input 实现
      return this.fallbackSelectFile(options);
    }

    try {
      const result = await window.electronAPI!.fileDialog.open({
        multiple: options?.multiple,
        filters: options?.filters,
        title: options?.title,
      });

      return {
        filePaths: result.filePaths,
        canceled: result.canceled,
      };
    } catch (error) {
      console.error('文件选择失败:', error);
      return { filePaths: [], canceled: true };
    }
  }

  /**
   * 回退的文件选择方法
   */
  private async fallbackSelectFile(options?: FileDialogOptions): Promise<FileDialogResult> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options?.multiple ?? false;

      if (options?.filters && options.filters.length > 0) {
        const extensions = options.filters
          .flatMap((f) => f.extensions.map((ext) => `.${ext}`))
          .join(',');
        input.accept = extensions;
      }

      input.onchange = (event) => {
        const files = (event.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const filePaths = Array.from(files).map((file) => file.name);
          resolve({ filePaths, canceled: false });
        } else {
          resolve({ filePaths: [], canceled: true });
        }
      };

      input.click();
    });
  }

  /**
   * 显示系统通知
   * Electron 端使用原生通知
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.isElectronAvailable()) {
      // 回退到 Web Notification
      await this.fallbackNotification(options);
      return;
    }

    try {
      await window.electronAPI!.notification.show({
        title: options.title,
        body: options.body,
        icon: options.icon,
        onClick: options.onClick,
      });
    } catch (error) {
      console.error('显示通知失败:', error);
      // 回退到 Web Notification
      await this.fallbackNotification(options);
    }
  }

  /**
   * 回退的通知方法
   */
  private async fallbackNotification(options: NotificationOptions): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('浏览器不支持通知功能');
      return;
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.warn('通知权限被拒绝');
      return;
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon,
    });

    if (options.onClick) {
      notification.onclick = () => {
        options.onClick?.();
        notification.close();
      };
    }
  }

  /**
   * 打开外部链接
   * Electron 端使用 shell.openExternal 在默认浏览器中打开
   */
  openExternal(url: string): void {
    if (this.isElectronAvailable()) {
      window.electronAPI!.shell.openExternal(url).catch((error) => {
        console.error('打开外部链接失败:', error);
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * 获取平台配置
   */
  getConfig(): PlatformConfig {
    const os = this.isElectronAvailable()
      ? window.electronAPI!.platform.os
      : 'unknown';

    return {
      platformName: `Electron Desktop (${os})`,
      supportsNativeFileDialog: this.isElectronAvailable(),
      supportsSystemNotification: true,
      supportsNativeMenu: this.isElectronAvailable(),
    };
  }

  /**
   * 获取应用版本
   */
  getAppVersion(): string {
    if (this.isElectronAvailable()) {
      return window.electronAPI!.app.getVersion();
    }
    return 'unknown';
  }

  /**
   * 窗口控制
   */
  windowControls = {
    minimize: () => {
      if (this.isElectronAvailable()) {
        window.electronAPI!.window.minimize();
      }
    },
    maximize: () => {
      if (this.isElectronAvailable()) {
        window.electronAPI!.window.maximize();
      }
    },
    restore: () => {
      if (this.isElectronAvailable()) {
        window.electronAPI!.window.restore();
      }
    },
    close: () => {
      if (this.isElectronAvailable()) {
        window.electronAPI!.window.close();
      }
    },
    isMaximized: (): boolean => {
      if (this.isElectronAvailable()) {
        return window.electronAPI!.window.isMaximized();
      }
      return false;
    },
  };
}
