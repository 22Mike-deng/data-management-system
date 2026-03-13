/**
 * 缓存常量配置
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */

// 缓存键前缀
export const CACHE_KEY_PREFIX = {
  TABLE_META: 'table_meta',       // 表元数据
  TABLE_FIELDS: 'table_fields',   // 表字段
  VIEW_CONFIG: 'view_config',     // 视图配置
  USER_DATA: 'user_data',         // 用户数据
  AI_CHAT: 'ai_chat',             // AI对话
} as const;

// 缓存过期时间（秒）
export const CACHE_TTL = {
  SHORT: 60,           // 1分钟 - 用于频繁变化的数据
  MEDIUM: 300,         // 5分钟 - 用于一般数据
  LONG: 600,           // 10分钟 - 用于表结构等较稳定的数据
  VERY_LONG: 3600,     // 1小时 - 用于很少变化的数据
  DAY: 86400,          // 1天
} as const;

// 缓存键构建辅助函数
export const CacheKeyBuilder = {
  // 表元数据
  tableMeta: (tableId: string) => `${CACHE_KEY_PREFIX.TABLE_META}:table:${tableId}`,
  allTables: () => `${CACHE_KEY_PREFIX.TABLE_META}:all_tables`,
  
  // 表字段
  tableFields: (tableId: string) => `${CACHE_KEY_PREFIX.TABLE_FIELDS}:${tableId}`,
  
  // 视图配置
  viewConfig: (viewId: string) => `${CACHE_KEY_PREFIX.VIEW_CONFIG}:${viewId}`,
  tableViews: (tableId: string) => `${CACHE_KEY_PREFIX.VIEW_CONFIG}:table:${tableId}`,
  defaultView: (tableId: string) => `${CACHE_KEY_PREFIX.VIEW_CONFIG}:default:${tableId}`,
  
  // AI对话上下文
  aiChatContext: (sessionId: string) => `${CACHE_KEY_PREFIX.AI_CHAT}:context:${sessionId}`,
};
