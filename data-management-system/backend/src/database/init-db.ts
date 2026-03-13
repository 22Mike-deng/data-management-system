/**
 * 数据库初始化脚本 (MySQL版本)
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { DataSource } from 'typeorm';

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'Asd2644',
  database: process.env.DB_DATABASE || 'data_management',
};

// 用于创建数据库的连接（不指定数据库）
const rootDataSource = new DataSource({
  type: 'mysql',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
});

// 用于操作数据库的连接（指定数据库）
const appDataSource = new DataSource({
  type: 'mysql',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  synchronize: false,
});

/**
 * 初始化数据库
 */
async function initDatabase() {
  try {
    // 步骤1: 连接MySQL服务器（不指定数据库）
    await rootDataSource.initialize();
    console.log('✅ MySQL服务器连接成功');

    // 步骤2: 创建数据库（如果不存在）
    await rootDataSource.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` 
       DEFAULT CHARACTER SET utf8mb4 
       COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ 数据库 "${dbConfig.database}" 创建成功`);

    // 步骤3: 关闭root连接
    await rootDataSource.destroy();

    // 步骤4: 连接到目标数据库
    await appDataSource.initialize();
    console.log(`✅ 数据库 "${dbConfig.database}" 连接成功`);

    // 步骤5: 逐个创建表
    const tables = [
      // 表定义表
      {
        name: 'sys_table',
        sql: `CREATE TABLE IF NOT EXISTS sys_table (
          table_id VARCHAR(36) PRIMARY KEY,
          table_name VARCHAR(100) UNIQUE NOT NULL,
          display_name VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      // 字段定义表
      {
        name: 'sys_field',
        sql: `CREATE TABLE IF NOT EXISTS sys_field (
          field_id VARCHAR(36) PRIMARY KEY,
          table_id VARCHAR(36) NOT NULL,
          field_name VARCHAR(100) NOT NULL,
          display_name VARCHAR(100) NOT NULL,
          field_type VARCHAR(20) NOT NULL,
          required TINYINT(1) DEFAULT 0,
          default_value TEXT,
          options TEXT,
          relation_table_id VARCHAR(36),
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_sys_field_table_id (table_id),
          FOREIGN KEY (table_id) REFERENCES sys_table(table_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      // AI模型配置表
      {
        name: 'sys_ai_model',
        sql: `CREATE TABLE IF NOT EXISTS sys_ai_model (
          model_id VARCHAR(36) PRIMARY KEY,
          model_name VARCHAR(100) NOT NULL,
          model_type VARCHAR(20) NOT NULL,
          api_endpoint VARCHAR(500) NOT NULL,
          api_key TEXT NOT NULL,
          model_identifier VARCHAR(100) NOT NULL,
          parameters TEXT,
          is_enabled TINYINT(1) DEFAULT 1,
          is_default TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      // AI对话历史表
      {
        name: 'sys_ai_chat',
        sql: `CREATE TABLE IF NOT EXISTS sys_ai_chat (
          chat_id VARCHAR(36) PRIMARY KEY,
          model_id VARCHAR(36) NOT NULL,
          session_id VARCHAR(36) NOT NULL,
          role VARCHAR(20) NOT NULL,
          content TEXT NOT NULL,
          thinking TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_sys_ai_chat_session_id (session_id),
          INDEX idx_sys_ai_chat_model_id (model_id),
          FOREIGN KEY (model_id) REFERENCES sys_ai_model(model_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      // Token消耗记录表
      {
        name: 'sys_ai_token_usage',
        sql: `CREATE TABLE IF NOT EXISTS sys_ai_token_usage (
          usage_id VARCHAR(36) PRIMARY KEY,
          model_id VARCHAR(36) NOT NULL,
          chat_id VARCHAR(36),
          session_id VARCHAR(36) NOT NULL,
          input_tokens INT NOT NULL,
          output_tokens INT NOT NULL,
          total_tokens INT NOT NULL,
          estimated_cost DECIMAL(10, 6) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_sys_ai_token_usage_model_id (model_id),
          INDEX idx_sys_ai_token_usage_session_id (session_id),
          INDEX idx_sys_ai_token_usage_created_at (created_at),
          FOREIGN KEY (model_id) REFERENCES sys_ai_model(model_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      // 模型定价配置表
      {
        name: 'sys_ai_model_pricing',
        sql: `CREATE TABLE IF NOT EXISTS sys_ai_model_pricing (
          pricing_id VARCHAR(36) PRIMARY KEY,
          model_id VARCHAR(36) NOT NULL,
          input_price DECIMAL(10, 6) NOT NULL,
          output_price DECIMAL(10, 6) NOT NULL,
          currency VARCHAR(10) DEFAULT 'CNY',
          effective_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (model_id) REFERENCES sys_ai_model(model_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      },
      // 知识库表
      {
        name: 'sys_knowledge_base',
        sql: `CREATE TABLE IF NOT EXISTS sys_knowledge_base (
          knowledge_id VARCHAR(36) PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          content TEXT NOT NULL,
          category VARCHAR(50),
          tags JSON,
          source VARCHAR(100),
          priority INT DEFAULT 0,
          is_enabled TINYINT(1) DEFAULT 1,
          view_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_knowledge_category (category),
          INDEX idx_knowledge_priority (priority),
          FULLTEXT INDEX ft_knowledge_content (title, content)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      }
    ];

    for (const table of tables) {
      await appDataSource.query(table.sql);
      console.log(`✅ 表 "${table.name}" 创建成功`);
    }

    // 步骤5.5: 数据库迁移 - 为已存在的表添加新字段
    try {
      // 检查 thinking 字段是否存在
      const columns = await appDataSource.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sys_ai_chat' AND COLUMN_NAME = 'thinking'`,
        [dbConfig.database]
      );
      
      if (columns.length === 0) {
        await appDataSource.query(`ALTER TABLE sys_ai_chat ADD COLUMN thinking TEXT`);
        console.log(`✅ 迁移成功: 添加 thinking 字段到 sys_ai_chat 表`);
      } else {
        console.log(`ℹ️ 字段 thinking 已存在，跳过迁移`);
      }
    } catch (error: any) {
      console.log(`⚠️ 迁移警告: ${error.message}`);
    }

    console.log('✅ 数据库表结构初始化完成');

    // 步骤6: 关闭连接
    await appDataSource.destroy();
    console.log('✅ 数据库连接已关闭');
    
    console.log('\n🎉 数据库初始化成功！');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

// 执行初始化
initDatabase();
