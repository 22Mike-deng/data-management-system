/**
 * 平台适配器入口
 * @creator dzh
 * @created 2026-03-14
 * @updated 2026-03-14
 */

import { PlatformAdapter, PlatformType } from './types';
import { WebAdapter } from './web/adapter';
import { ElectronAdapter } from './electron/adapter';

// 导出类型
export * from './types';
export { WebAdapter } from './web/adapter';
export { ElectronAdapter } from './electron/adapter';

/**
 * 检测当前运行平台
 */
export function detectPlatform(): PlatformType {
  // 通过检查 window.process 或 window.electronAPI 判断是否在 Electron 环境
  const isElectron =
    typeof window !== 'undefined' &&
    (typeof window.electronAPI !== 'undefined' ||
      typeof window.process?.type === 'string');

  return isElectron ? PlatformType.Electron : PlatformType.Web;
}

/**
 * 获取当前平台的适配器实例
 */
export function getPlatformAdapter(): PlatformAdapter {
  const platform = detectPlatform();

  switch (platform) {
    case PlatformType.Electron:
      return new ElectronAdapter();
    case PlatformType.Web:
    default:
      return new WebAdapter();
  }
}

/**
 * 全局平台适配器实例（单例）
 */
let platformInstance: PlatformAdapter | null = null;

/**
 * 获取全局平台适配器实例
 */
export function usePlatform(): PlatformAdapter {
  if (!platformInstance) {
    platformInstance = getPlatformAdapter();
  }
  return platformInstance;
}

/**
 * 初始化平台适配器
 * 应在应用启动时调用
 */
export function initPlatform(): PlatformAdapter {
  const adapter = usePlatform();
  const config = adapter.getConfig();

  console.log(`[Platform] 已初始化平台: ${config.platformName}`);
  console.log(`[Platform] API 基础地址: ${adapter.apiBaseUrl}`);
  console.log(`[Platform] 原生文件对话框: ${config.supportsNativeFileDialog ? '支持' : '不支持'}`);
  console.log(`[Platform] 系统通知: ${config.supportsSystemNotification ? '支持' : '不支持'}`);

  return adapter;
}

// 默认导出
export default usePlatform;
