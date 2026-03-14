/**
 * 数据迁移脚本：加密未加密的API Key
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 * 
 * 使用方法：npx tsx src/database/migrate-encrypt-apikeys.ts
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { encrypt, isEncrypted } from '../common/utils/crypto.util';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function migrate() {
  // 创建数据源连接
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_DATABASE || 'data_management',
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 查询所有AI模型配置
    const models = await dataSource.query(
      'SELECT modelId, modelName, apiKey FROM sys_ai_model'
    );

    console.log(`📋 找到 ${models.length} 个AI模型配置`);

    let updatedCount = 0;

    for (const model of models) {
      if (model.apiKey && !isEncrypted(model.apiKey)) {
        // 加密未加密的API Key
        const encryptedKey = encrypt(model.apiKey);
        await dataSource.query(
          'UPDATE sys_ai_model SET apiKey = ? WHERE modelId = ?',
          [encryptedKey, model.modelId]
        );
        console.log(`🔒 已加密: ${model.modelName} (${model.modelId})`);
        updatedCount++;
      }
    }

    if (updatedCount === 0) {
      console.log('✨ 所有API Key已加密，无需迁移');
    } else {
      console.log(`\n✅ 迁移完成！已加密 ${updatedCount} 个API Key`);
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

migrate();
