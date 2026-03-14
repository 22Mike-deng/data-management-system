/**
 * 加密工具
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import * as crypto from 'crypto';

// 加密算法配置
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * 从环境变量获取加密密钥
 * 如果没有配置，使用JWT_SECRET作为备选（生产环境应单独配置）
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('缺少加密密钥配置，请设置 ENCRYPTION_KEY 或 JWT_SECRET 环境变量');
  }
  // 使用SHA-256派生固定长度的密钥
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * 加密敏感数据
 * @param plaintext 明文
 * @returns 加密后的字符串（格式：salt:iv:authTag:ciphertext，均为hex编码）
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return '';
  }

  const key = getEncryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // 使用PBKDF2派生密钥，增加安全性
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // 返回格式：salt:iv:authTag:ciphertext
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    ciphertext,
  ].join(':');
}

/**
 * 解密敏感数据
 * @param encryptedData 加密后的字符串
 * @returns 解密后的明文
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    return '';
  }

  // 检查是否为加密格式（包含4个冒号分隔的部分）
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    // 兼容旧数据：如果格式不对，可能是未加密的旧数据
    // 生产环境应该返回空或抛出错误
    console.warn('数据格式不正确，可能为未加密的旧数据');
    return encryptedData;
  }

  const [saltHex, ivHex, authTagHex, ciphertext] = parts;
  const key = getEncryptionKey();

  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // 使用相同的派生方法
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);

  try {
    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
  } catch (error) {
    console.error('解密失败：数据可能已被篡改或密钥不正确');
    throw new Error('解密失败');
  }
}

/**
 * 检查字符串是否已加密
 * @param data 待检查的字符串
 * @returns 是否为加密格式
 */
export function isEncrypted(data: string): boolean {
  if (!data) {
    return false;
  }
  const parts = data.split(':');
  if (parts.length !== 4) {
    return false;
  }
  // 检查各部分是否为有效的hex字符串
  return parts.every(part => /^[0-9a-f]+$/i.test(part));
}

/**
 * 对敏感信息进行脱敏处理（用于日志）
 * @param data 原始数据
 * @param showLength 显示的前几位字符
 * @returns 脱敏后的字符串
 */
export function maskSensitive(data: string, showLength: number = 4): string {
  if (!data) {
    return '';
  }
  if (data.length <= showLength) {
    return '*'.repeat(data.length);
  }
  return data.substring(0, showLength) + '*'.repeat(Math.min(data.length - showLength, 10));
}
