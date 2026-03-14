/**
 * AI相关常量配置
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */

/**
 * AI模型类型
 */
export const AI_MODEL_TYPES = {
  OPENAI: 'openai',
  QWEN: 'qwen',
  WENXIN: 'wenxin',
  SPARK: 'spark',
  ZHIPU: 'zhipu',
  CLAUDE: 'claude',
  CUSTOM: 'custom',
} as const;

/**
 * 各模型API的max_tokens限制
 */
export const MODEL_MAX_TOKENS_LIMITS: Record<string, number> = {
  [AI_MODEL_TYPES.ZHIPU]: 32768,      // 智谱 API 限制
  [AI_MODEL_TYPES.QWEN]: 32000,       // 通义千问
  [AI_MODEL_TYPES.WENXIN]: 8000,      // 文心一言
  [AI_MODEL_TYPES.OPENAI]: 128000,    // OpenAI GPT-4-turbo/4o
  [AI_MODEL_TYPES.CLAUDE]: 128000,    // Claude 3
} as const;

/**
 * 默认AI参数配置
 */
export const DEFAULT_AI_PARAMS = {
  MAX_TOKENS: 8192,
  TEMPERATURE: 0.7,
  TOP_P: 1,
  CONTEXT_LENGTH: 20,
} as const;

/**
 * 工具调用最大轮数
 */
export const MAX_TOOL_CALL_ROUNDS = {
  STREAM: 10,   // 流式调用最大轮数
  NORMAL: 5,    // 普通调用最大轮数
  CLAUDE: 3,    // Claude调用最大轮数
} as const;

/**
 * Token估算配置
 */
export const TOKEN_ESTIMATION = {
  CHARS_PER_TOKEN: 2,        // 简单估算：约2字符/token
  INPUT_RATIO: 0.6,          // 输入token占比
  OUTPUT_RATIO: 0.4,         // 输出token占比
} as const;

/**
 * 工具结果截断配置
 */
export const TOOL_RESULT_CONFIG = {
  MAX_LENGTH: 5000,          // 工具结果最大长度
  TRUNCATE_SUFFIX: '... [结果已截断]',
} as const;
