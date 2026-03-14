/**
 * 系统用户初始化脚本
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-14
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * 生成随机密码
 * @param length 密码长度，默认16位
 * @returns 随机密码
 */
function generateRandomPassword(length: number = 16): string {
  // 排除容易混淆的字符：0O1lI
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  
  // 确保包含各类字符
  password += uppercase[randomBytes[0] % uppercase.length];
  password += lowercase[randomBytes[1] % lowercase.length];
  password += numbers[randomBytes[2] % numbers.length];
  password += special[randomBytes[3] % special.length];
  
  // 填充剩余字符
  for (let i = 4; i < length; i++) {
    password += allChars[randomBytes[i] % allChars.length];
  }
  
  // 打乱顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * 验证密码复杂度
 * @param password 待验证的密码
 * @returns 验证结果
 */
function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少8位' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '密码需包含大写字母' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '密码需包含小写字母' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码需包含数字' };
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return { valid: false, message: '密码需包含特殊字符(!@#$%^&*)' };
  }
  return { valid: true, message: '密码符合要求' };
}

async function initAdminUser() {
  // 创建数据源
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_DATABASE || 'data_management',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    // 检查表是否存在，不存在则创建
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS sys_user (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        nickname VARCHAR(50),
        avatar VARCHAR(500),
        status TINYINT DEFAULT 0,
        lastLoginAt DATETIME,
        lastLoginIp VARCHAR(50),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('sys_user 表已就绪');

    // 检查管理员是否已存在
    const [existingAdmin] = await dataSource.query(
      'SELECT id FROM sys_user WHERE username = ?',
      ['admin'],
    );

    if (existingAdmin) {
      console.log('管理员账号已存在，跳过创建');
      return;
    }

    // 【安全修复】从环境变量获取密码或生成随机密码
    let password: string;
    const envPassword = process.env.ADMIN_INITIAL_PASSWORD;
    
    if (envPassword) {
      // 使用环境变量中的密码
      const validation = validatePassword(envPassword);
      if (!validation.valid) {
        console.error(`❌ ADMIN_INITIAL_PASSWORD 不符合复杂度要求: ${validation.message}`);
        process.exit(1);
      }
      password = envPassword;
      console.log('✅ 使用环境变量中的管理员密码');
    } else {
      // 生成随机密码
      password = generateRandomPassword(16);
      console.log('✅ 已生成随机管理员密码');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建管理员账号
    await dataSource.query(
      `INSERT INTO sys_user (id, username, password, email, nickname, avatar, status, createdAt, updatedAt)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'admin',
        hashedPassword,
        '2644073630@qq.com',
        '管理员',
        '/avatar/2026/02/01/7c6a81c6-d8a0-481d-adac-aea73424d5ee.png',
        0,
      ],
    );

    console.log('\n========================================');
    console.log('🎉 管理员账号创建成功！');
    console.log('========================================');
    console.log('用户名: admin');
    console.log(`密码: ${password}`);
    console.log('========================================');
    console.log('⚠️  请妥善保管此密码，并在首次登录后立即修改！');
    console.log('💡 提示: 可通过 ADMIN_INITIAL_PASSWORD 环境变量预设密码');
    console.log('========================================\n');
  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

initAdminUser();
