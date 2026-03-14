/**
 * Web 浏览器端平台适配器
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
 * Web 平台适配器
 * 实现浏览器环境下的平台功能
 */
export class WebAdapter implements PlatformAdapter {
  readonly type = PlatformType.Web;

  /**
   * API 基础地址
   * Web 端使用相对路径，由 Vite 代理或 Nginx 代理
   */
  readonly apiBaseUrl = '/api';

  /**
   * 选择文件
   * Web 端使用 input[type=file] 实现
   */
  async selectFile(options?: FileDialogOptions): Promise<FileDialogResult> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options?.multiple ?? false;

      // 设置文件类型过滤器
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

      input.oncancel = () => {
        resolve({ filePaths: [], canceled: true });
      };

      input.click();
    });
  }

  /**
   * 显示系统通知
   * Web 端使用 Web Notification API
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    // 检查浏览器是否支持通知
    if (!('Notification' in window)) {
      console.warn('浏览器不支持通知功能');
      return;
    }

    // 检查通知权限
    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.warn('通知权限被拒绝');
      return;
    }

    // 创建通知
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
   * Web 端使用 window.open
   */
  openExternal(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * 获取平台配置
   */
  getConfig(): PlatformConfig {
    return {
      platformName: 'Web Browser',
      supportsNativeFileDialog: false,
      supportsSystemNotification: 'Notification' in window,
      supportsNativeMenu: false,
    };
  }
}
