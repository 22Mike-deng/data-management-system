/**
 * 系统用户初始化脚本
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

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

    // 加密默认密码 admin123
    const hashedPassword = await bcrypt.hash('admin123', 10);

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

    console.log('管理员账号创建成功');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('请在首次登录后立即修改密码！');
  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

initAdminUser();
