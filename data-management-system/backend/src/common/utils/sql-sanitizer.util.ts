/**
 * SQL 安全验证工具
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */

/**
 * 表名验证正则：仅允许字母、数字、下划线，且以字母开头
 */
const TABLE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;

/**
 * 字段名验证正则：仅允许字母、数字、下划线，且以字母开头
 */
const FIELD_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;

/**
 * SQL 关键字黑名单（防止注入）
 */
const SQL_KEYWORDS = [
  'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'GRANT', 'REVOKE',
  'EXEC', 'EXECUTE', 'UNION', 'INSERT', 'UPDATE', 'SELECT',
  'INTO', 'OUTFILE', 'LOAD_FILE', 'INFORMATION_SCHEMA',
  'MYSQL', 'PERFORMANCE_SCHEMA', 'SYS',
];

/**
 * 系统表前缀黑名单（AI工具不可访问）
 * 这些前缀的表是系统核心表，AI工具严禁操作
 */
const SYSTEM_TABLE_PREFIXES = [
  'sys_',      // 系统配置表（sys_user, sys_table, sys_field等）
  'information_', // 信息模式表
  'performance_', // 性能模式表
  'mysql_',    // MySQL系统表
];

/**
 * 验证表名是否安全
 * @param tableName 表名
 * @returns 是否有效
 */
export function isValidTableName(tableName: string): boolean {
  if (!tableName || typeof tableName !== 'string') {
    return false;
  }

  // 检查格式
  if (!TABLE_NAME_REGEX.test(tableName)) {
    return false;
  }

  // 检查是否包含 SQL 关键字
  const upperName = tableName.toUpperCase();
  if (SQL_KEYWORDS.some(keyword => upperName.includes(keyword))) {
    return false;
  }

  // 【安全加固】检查是否为系统表前缀
  const lowerName = tableName.toLowerCase();
  if (SYSTEM_TABLE_PREFIXES.some(prefix => lowerName.startsWith(prefix))) {
    return false;
  }

  return true;
}

/**
 * 验证字段名是否安全
 * @param fieldName 字段名
 * @returns 是否有效
 */
export function isValidFieldName(fieldName: string): boolean {
  if (!fieldName || typeof fieldName !== 'string') {
    return false;
  }

  // 检查格式
  if (!FIELD_NAME_REGEX.test(fieldName)) {
    return false;
  }

  // 检查是否包含 SQL 关键字
  const upperName = fieldName.toUpperCase();
  if (SQL_KEYWORDS.some(keyword => upperName.includes(keyword))) {
    return false;
  }

  return true;
}

/**
 * 验证并清理表名
 * @param tableName 表名
 * @returns 清理后的表名
 * @throws Error 如果表名无效
 */
export function sanitizeTableName(tableName: string): string {
  if (!isValidTableName(tableName)) {
    throw new Error(`无效的表名: ${tableName}`);
  }
  return tableName;
}

/**
 * 验证并清理字段名
 * @param fieldName 字段名
 * @returns 清理后的字段名
 * @throws Error 如果字段名无效
 */
export function sanitizeFieldName(fieldName: string): string {
  if (!isValidFieldName(fieldName)) {
    throw new Error(`无效的字段名: ${fieldName}`);
  }
  return fieldName;
}

/**
 * 批量验证字段名
 * @param fieldNames 字段名数组
 * @returns 是否全部有效
 */
export function validateFieldNames(fieldNames: string[]): { valid: boolean; invalidFields: string[] } {
  const invalidFields: string[] = [];
  
  for (const fieldName of fieldNames) {
    if (!isValidFieldName(fieldName)) {
      invalidFields.push(fieldName);
    }
  }

  return {
    valid: invalidFields.length === 0,
    invalidFields,
  };
}

/**
 * 转义 SQL LIKE 查询中的特殊字符
 * @param value 待转义的值
 * @returns 转义后的值
 */
export function escapeLikeValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
