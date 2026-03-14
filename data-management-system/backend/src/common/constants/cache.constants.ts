/**
 * 缓存相关常量配置
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */

/**
 * 缓存键前缀
 */
export const CACHE_KEY_PREFIX = {
  TABLE_META: 'table_meta',
  TABLE_FIELDS: 'table_fields',
  AI_SESSION: 'ai_session',
  USER_PERMISSIONS: 'user_permissions',
} as const;

/**
 * 缓存过期时间（秒）
 */
export const CACHE_TTL = {
  TABLE_META: 600,           // 表结构缓存：10分钟
  TABLE_FIELDS: 600,         // 表字段缓存：10分钟
  AI_SESSION: 1800,          // AI会话缓存：30分钟
  USER_PERMISSIONS: 300,     // 用户权限缓存：5分钟
  SHORT: 60,                 // 短期缓存：1分钟
  MEDIUM: 300,               // 中期缓存：5分钟
  LONG: 3600,                // 长期缓存：1小时
} as const;

/**
 * 默认缓存配置
 */
export const DEFAULT_CACHE_CONFIG = {
  TTL: 3600,                 // 默认过期时间：1小时
  MAX_KEYS: 10000,           // 最大缓存键数量
} as const;
