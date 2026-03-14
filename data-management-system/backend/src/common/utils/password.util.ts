/**
 * 密码验证工具
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */

/**
 * 密码复杂度验证结果
 */
export interface PasswordValidationResult {
  valid: boolean;
  message: string;
  details: string[];
}

/**
 * 密码复杂度验证配置
 */
export const PASSWORD_CONFIG = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * 验证密码复杂度
 * @param password 待验证的密码
 * @returns 验证结果，包含是否有效、主要信息和详细错误列表
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // 长度检查
  if (!password || password.length < PASSWORD_CONFIG.minLength) {
    errors.push(`密码长度至少${PASSWORD_CONFIG.minLength}位`);
  }
  if (password && password.length > PASSWORD_CONFIG.maxLength) {
    errors.push(`密码长度不能超过${PASSWORD_CONFIG.maxLength}位`);
  }

  // 大写字母检查
  if (PASSWORD_CONFIG.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('需包含大写字母');
  }

  // 小写字母检查
  if (PASSWORD_CONFIG.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('需包含小写字母');
  }

  // 数字检查
  if (PASSWORD_CONFIG.requireNumber && !/[0-9]/.test(password)) {
    errors.push('需包含数字');
  }

  // 特殊字符检查
  if (PASSWORD_CONFIG.requireSpecialChar) {
    const specialCharRegex = new RegExp(`[${PASSWORD_CONFIG.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
    if (!specialCharRegex.test(password)) {
      errors.push(`需包含特殊字符(${PASSWORD_CONFIG.specialChars})`);
    }
  }

  // 检查常见弱密码
  const weakPasswords = [
    'password', 'Password1!', '12345678', 'Qwerty123!', 
    'Admin123!', 'Admin@123', 'Password123!', 'Aa123456!'
  ];
  if (weakPasswords.some(weak => password.toLowerCase() === weak.toLowerCase())) {
    errors.push('密码过于简单，请设置更复杂的密码');
  }

  // 检查连续字符
  if (hasConsecutiveChars(password, 4)) {
    errors.push('密码不能包含4个及以上连续相同字符');
  }

  const isValid = errors.length === 0;

  return {
    valid: isValid,
    message: isValid ? '密码符合要求' : errors[0],
    details: errors,
  };
}

/**
 * 检查是否有连续重复字符
 * @param str 字符串
 * @param count 连续次数
 * @returns 是否存在连续重复字符
 */
function hasConsecutiveChars(str: string, count: number): boolean {
  for (let i = 0; i <= str.length - count; i++) {
    const char = str[i];
    let consecutive = true;
    for (let j = 1; j < count; j++) {
      if (str[i + j] !== char) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) {
      return true;
    }
  }
  return false;
}

/**
 * 生成密码强度等级
 * @param password 密码
 * @returns 强度等级：weak, medium, strong, very-strong
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' | 'very-strong' {
  let score = 0;

  // 长度加分
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // 字符类型加分
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // 多样性加分
  const uniqueChars = new Set(password.split('')).size;
  if (uniqueChars >= password.length * 0.5) score++;

  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  if (score <= 7) return 'strong';
  return 'very-strong';
}
