/**
 * 数据库迁移脚本：添加操作人字段
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrate() {
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

    // 需要添加操作人字段的表
    const tables = [
      { name: 'sys_user', hasUpdatedBy: true },
      { name: 'sys_ai_model', hasUpdatedBy: true },
      { name: 'sys_knowledge_base', hasUpdatedBy: true },
      { name: 'sys_ai_chat', hasUpdatedBy: false },
      { name: 'sys_ai_model_pricing', hasUpdatedBy: true },
      { name: 'sys_ai_token_usage', hasUpdatedBy: false },
      { name: 'sys_view_config', hasUpdatedBy: true },
    ];

    for (const table of tables) {
      console.log(`\n处理表: ${table.name}`);

      // 检查 createdBy 字段是否存在
      const [createdByExists] = await dataSource.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'createdBy'`,
        [process.env.DB_DATABASE || 'data_management', table.name],
      );

      if (!createdByExists) {
        await dataSource.query(
          `ALTER TABLE ${table.name} ADD COLUMN createdBy VARCHAR(36) NULL COMMENT '创建人ID'`,
        );
        console.log(`  ✓ 添加 createdBy 字段`);
      } else {
        console.log(`  - createdBy 字段已存在`);
      }

      // 检查 updatedBy 字段是否存在
      if (table.hasUpdatedBy) {
        const [updatedByExists] = await dataSource.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'updatedBy'`,
          [process.env.DB_DATABASE || 'data_management', table.name],
        );

        if (!updatedByExists) {
          await dataSource.query(
            `ALTER TABLE ${table.name} ADD COLUMN updatedBy VARCHAR(36) NULL COMMENT '更新人ID'`,
          );
          console.log(`  ✓ 添加 updatedBy 字段`);
        } else {
          console.log(`  - updatedBy 字段已存在`);
        }
      }
    }

    console.log('\n迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

migrate();
