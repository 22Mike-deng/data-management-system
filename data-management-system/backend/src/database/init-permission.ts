/**
 * 权限数据初始化脚本
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 生成UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

async function initPermissionData() {
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

    // 1. 创建权限表
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS sys_permission (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE COMMENT '权限编码',
        name VARCHAR(50) NOT NULL COMMENT '权限名称',
        type VARCHAR(20) NOT NULL COMMENT '权限类型：menu-菜单，button-按钮，api-接口',
        parentId VARCHAR(36) COMMENT '父级权限ID',
        routePath VARCHAR(200) COMMENT '关联路由路径',
        icon VARCHAR(100) COMMENT '图标',
        sort INT DEFAULT 0 COMMENT '排序号',
        status TINYINT DEFAULT 0 COMMENT '状态：0-正常，1-禁用',
        description VARCHAR(200) COMMENT '描述',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('sys_permission 表已就绪');

    // 2. 创建角色表
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS sys_role (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE COMMENT '角色编码',
        name VARCHAR(50) NOT NULL COMMENT '角色名称',
        description VARCHAR(200) COMMENT '角色描述',
        status TINYINT DEFAULT 0 COMMENT '状态：0-正常，1-禁用',
        sort INT DEFAULT 0 COMMENT '排序号',
        createdBy VARCHAR(36) COMMENT '创建人ID',
        updatedBy VARCHAR(36) COMMENT '更新人ID',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('sys_role 表已就绪');

    // 3. 创建角色权限关联表
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS sys_role_permission (
        id VARCHAR(36) PRIMARY KEY,
        roleId VARCHAR(36) NOT NULL COMMENT '角色ID',
        permissionId VARCHAR(36) NOT NULL COMMENT '权限ID',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_role_permission (roleId, permissionId),
        KEY idx_role_id (roleId),
        KEY idx_permission_id (permissionId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('sys_role_permission 表已就绪');

    // 4. 为 sys_user 表添加 roleId 字段
    const userColumns = await dataSource.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sys_user' AND COLUMN_NAME = 'roleId'
    `, [process.env.DB_DATABASE || 'data_management']);

    if (userColumns.length === 0) {
      await dataSource.query(`
        ALTER TABLE sys_user ADD COLUMN roleId VARCHAR(36) COMMENT '角色ID' AFTER avatar
      `);
      console.log('sys_user 表已添加 roleId 字段');
    }

    // 5. 检查是否已有权限数据
    const permissionCount = await dataSource.query('SELECT COUNT(*) as count FROM sys_permission');
    if (permissionCount[0].count > 0) {
      console.log('权限数据已存在，跳过初始化');
      return;
    }

    // 6. 初始化权限数据
    const permissions: Array<{ id: string; code: string; name: string; type: string; parentId?: string; routePath?: string; sort: number }> = [
      // 用户管理权限
      { id: generateUUID(), code: 'user:view', name: '查看用户', type: 'menu', routePath: '/user-manage', sort: 1 },
      { id: generateUUID(), code: 'user:create', name: '创建用户', type: 'button', sort: 2 },
      { id: generateUUID(), code: 'user:edit', name: '编辑用户', type: 'button', sort: 3 },
      { id: generateUUID(), code: 'user:delete', name: '删除用户', type: 'button', sort: 4 },

      // 角色管理权限
      { id: generateUUID(), code: 'role:manage', name: '角色管理', type: 'menu', routePath: '/role-manage', sort: 5 },

      // 权限管理权限
      { id: generateUUID(), code: 'permission:manage', name: '权限管理', type: 'menu', routePath: '/permission-manage', sort: 6 },

      // 数据表管理权限
      { id: generateUUID(), code: 'table:view', name: '查看数据表', type: 'menu', routePath: '/table-manage', sort: 10 },
      { id: generateUUID(), code: 'table:create', name: '创建数据表', type: 'button', sort: 11 },
      { id: generateUUID(), code: 'table:edit', name: '编辑数据表', type: 'button', sort: 12 },
      { id: generateUUID(), code: 'table:delete', name: '删除数据表', type: 'button', sort: 13 },

      // 数据管理权限
      { id: generateUUID(), code: 'data:view', name: '查看数据', type: 'menu', routePath: '/data-manage', sort: 20 },
      { id: generateUUID(), code: 'data:create', name: '新增数据', type: 'button', sort: 21 },
      { id: generateUUID(), code: 'data:edit', name: '编辑数据', type: 'button', sort: 22 },
      { id: generateUUID(), code: 'data:delete', name: '删除数据', type: 'button', sort: 23 },
      { id: generateUUID(), code: 'data:export', name: '导出数据', type: 'button', sort: 24 },
      { id: generateUUID(), code: 'data:import', name: '导入数据', type: 'button', sort: 25 },

      // AI功能权限
      { id: generateUUID(), code: 'ai:model', name: 'AI模型管理', type: 'menu', routePath: '/ai-model', sort: 30 },
      { id: generateUUID(), code: 'ai:chat', name: 'AI对话', type: 'menu', routePath: '/ai-chat', sort: 31 },
      // AI工具权限（细粒度控制）
      { id: generateUUID(), code: 'ai:tool:view', name: 'AI工具-查询数据', type: 'button', sort: 32 },
      { id: generateUUID(), code: 'ai:tool:create', name: 'AI工具-新增数据', type: 'button', sort: 33 },
      { id: generateUUID(), code: 'ai:tool:edit', name: 'AI工具-编辑数据', type: 'button', sort: 34 },
      { id: generateUUID(), code: 'ai:tool:delete', name: 'AI工具-删除数据', type: 'button', sort: 35 },

      // 知识库权限
      { id: generateUUID(), code: 'knowledge:view', name: '查看知识库', type: 'menu', routePath: '/knowledge-base', sort: 40 },
      { id: generateUUID(), code: 'knowledge:manage', name: '管理知识库', type: 'button', sort: 41 },

      // 审计日志权限
      { id: generateUUID(), code: 'audit:view', name: '查看审计日志', type: 'menu', routePath: '/audit-log', sort: 50 },

      // 数据可视化权限
      { id: generateUUID(), code: 'visualization:view', name: '数据可视化', type: 'menu', routePath: '/visualization', sort: 60 },

      // Token统计权限
      { id: generateUUID(), code: 'token:stats', name: 'Token统计', type: 'menu', routePath: '/token-stats', sort: 70 },

      // 系统设置权限
      { id: generateUUID(), code: 'system:settings', name: '系统设置', type: 'menu', routePath: '/settings', sort: 80 },
    ];

    for (const permission of permissions) {
      await dataSource.query(
        `INSERT INTO sys_permission (id, code, name, type, parentId, routePath, sort, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
        [permission.id, permission.code, permission.name, permission.type, permission.parentId || null, permission.routePath || null, permission.sort],
      );
    }
    console.log(`已初始化 ${permissions.length} 条权限数据`);

    // 7. 初始化角色数据
    const superAdminId = generateUUID();
    const adminId = generateUUID();
    const userId = generateUUID();

    const roles = [
      { id: superAdminId, code: 'super_admin', name: '超级管理员', description: '拥有系统全部权限', sort: 1 },
      { id: adminId, code: 'admin', name: '管理员', description: '拥有数据管理和AI功能权限', sort: 2 },
      { id: userId, code: 'user', name: '普通用户', description: '拥有基本查看和AI对话权限', sort: 3 },
    ];

    for (const role of roles) {
      await dataSource.query(
        `INSERT INTO sys_role (id, code, name, description, status, sort, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 0, ?, NOW(), NOW())`,
        [role.id, role.code, role.name, role.description, role.sort],
      );
    }
    console.log(`已初始化 ${roles.length} 条角色数据`);

    // 8. 为角色分配权限
    // 超级管理员拥有所有权限
    for (const permission of permissions) {
      await dataSource.query(
        `INSERT INTO sys_role_permission (id, roleId, permissionId, createdAt)
         VALUES (?, ?, ?, NOW())`,
        [generateUUID(), superAdminId, permission.id],
      );
    }
    console.log('已为超级管理员分配所有权限');

    // 管理员拥有部分权限
    const adminPermissionCodes = [
      'table:view', 'table:create', 'table:edit', 'table:delete',
      'data:view', 'data:create', 'data:edit', 'data:delete', 'data:export', 'data:import',
      'ai:model', 'ai:chat',
      'ai:tool:view', 'ai:tool:create', 'ai:tool:edit', 'ai:tool:delete',
      'knowledge:view', 'knowledge:manage',
      'audit:view',
      'visualization:view',
      'token:stats',
    ];
    const adminPermissions = permissions.filter((p) => adminPermissionCodes.includes(p.code));
    for (const permission of adminPermissions) {
      await dataSource.query(
        `INSERT INTO sys_role_permission (id, roleId, permissionId, createdAt)
         VALUES (?, ?, ?, NOW())`,
        [generateUUID(), adminId, permission.id],
      );
    }
    console.log(`已为管理员分配 ${adminPermissions.length} 条权限`);

    // 普通用户拥有基本权限
    const userPermissionCodes = ['data:view', 'ai:chat', 'ai:tool:view', 'knowledge:view', 'visualization:view'];
    const userPermissions = permissions.filter((p) => userPermissionCodes.includes(p.code));
    for (const permission of userPermissions) {
      await dataSource.query(
        `INSERT INTO sys_role_permission (id, roleId, permissionId, createdAt)
         VALUES (?, ?, ?, NOW())`,
        [generateUUID(), userId, permission.id],
      );
    }
    console.log(`已为普通用户分配 ${userPermissions.length} 条权限`);

    // 9. 为现有管理员用户分配超级管理员角色
    const adminUser = await dataSource.query(
      'SELECT id FROM sys_user WHERE username = ?',
      ['admin'],
    );

    if (adminUser.length > 0) {
      await dataSource.query(
        'UPDATE sys_user SET roleId = ? WHERE username = ?',
        [superAdminId, 'admin'],
      );
      console.log('已为 admin 用户分配超级管理员角色');
    }

    console.log('\n========================================');
    console.log('🎉 权限数据初始化成功！');
    console.log('========================================');
    console.log('已创建角色：');
    console.log('  - super_admin（超级管理员）：拥有所有权限');
    console.log('  - admin（管理员）：拥有数据管理和AI功能权限');
    console.log('  - user（普通用户）：拥有基本查看和AI对话权限');
    console.log('========================================\n');

  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

initPermissionData();
