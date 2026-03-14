/**
 * 平台适配器类型定义
 * @creator dzh
 * @created 2026-03-14
 * @updated 2026-03-14
 */

/**
 * 平台类型枚举
 */
export enum PlatformType {
  /** Web 浏览器端 */
  Web = 'web',
  /** Electron 桌面端 */
  Electron = 'electron',
}

/**
 * 文件选择选项
 */
export interface FileDialogOptions {
  /** 是否多选 */
  multiple?: boolean;
  /** 文件类型过滤器 */
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  /** 标题 */
  title?: string;
}

/**
 * 文件选择结果
 */
export interface FileDialogResult {
  /** 选中的文件路径列表 */
  filePaths: string[];
  /** 是否取消 */
  canceled: boolean;
}

/**
 * 通知选项
 */
export interface NotificationOptions {
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  body?: string;
  /** 图标路径 */
  icon?: string;
  /** 点击回调 */
  onClick?: () => void;
}

/**
 * 平台适配器接口
 * 定义不同平台需要实现的统一方法
 */
export interface PlatformAdapter {
  /** 当前平台类型 */
  readonly type: PlatformType;

  /** API 基础地址 */
  readonly apiBaseUrl: string;

  /**
   * 选择文件
   * @param options 文件选择选项
   */
  selectFile(options?: FileDialogOptions): Promise<FileDialogResult>;

  /**
   * 显示系统通知
   * @param options 通知选项
   */
  showNotification(options: NotificationOptions): Promise<void>;

  /**
   * 打开外部链接
   * @param url 链接地址
   */
  openExternal(url: string): void;

  /**
   * 获取平台特定配置
   */
  getConfig(): PlatformConfig;
}

/**
 * 平台配置
 */
export interface PlatformConfig {
  /** 平台名称 */
  platformName: string;
  /** 是否支持原生文件对话框 */
  supportsNativeFileDialog: boolean;
  /** 是否支持系统通知 */
  supportsSystemNotification: boolean;
  /** 是否支持原生菜单 */
  supportsNativeMenu: boolean;
}
