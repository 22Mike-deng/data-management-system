/**
 * 权限管理服务
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SysPermission } from '../../database/entities/sys-permission.entity';
import { SysRolePermission } from '../../database/entities/sys-role-permission.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(SysPermission)
    private permissionRepository: Repository<SysPermission>,
    @InjectRepository(SysRolePermission)
    private rolePermissionRepository: Repository<SysRolePermission>,
  ) {}

  // 获取所有权限列表
  async findAll(): Promise<SysPermission[]> {
    return this.permissionRepository.find({
      order: { sort: 'ASC', createdAt: 'ASC' },
    });
  }

  // 获取权限树形结构
  async findTree(): Promise<any[]> {
    const permissions = await this.findAll();
    return this.buildTree(permissions, null);
  }

  // 构建权限树
  private buildTree(permissions: SysPermission[], parentId: string | null): any[] {
    return permissions
      .filter((p) => p.parentId === parentId)
      .map((p) => ({
        ...p,
        children: this.buildTree(permissions, p.id),
      }));
  }

  // 根据ID获取权限
  async findById(id: string): Promise<SysPermission | null> {
    return this.permissionRepository.findOne({ where: { id } });
  }

  // 根据编码获取权限
  async findByCode(code: string): Promise<SysPermission | null> {
    return this.permissionRepository.findOne({ where: { code } });
  }

  // 创建权限
  async create(data: Partial<SysPermission>): Promise<SysPermission> {
    const permission = this.permissionRepository.create({
      id: uuidv4(),
      ...data,
    });
    return this.permissionRepository.save(permission);
  }

  // 更新权限
  async update(id: string, data: Partial<SysPermission>): Promise<SysPermission | null> {
    await this.permissionRepository.update(id, data);
    return this.findById(id);
  }

  // 删除权限
  async delete(id: string): Promise<void> {
    await this.permissionRepository.delete(id);
  }

  // 根据角色ID获取权限列表
  async findByRoleId(roleId: string): Promise<SysPermission[]> {
    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId },
      relations: ['permission'],
    });
    return rolePermissions.map((rp) => rp.permission).filter(Boolean);
  }

  // 根据多个角色ID获取权限列表
  async findByRoleIds(roleIds: string[]): Promise<SysPermission[]> {
    if (!roleIds || roleIds.length === 0) {
      return [];
    }
    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId: In(roleIds) },
      relations: ['permission'],
    });
    // 去重
    const permissionMap = new Map<string, SysPermission>();
    rolePermissions.forEach((rp) => {
      if (rp.permission) {
        permissionMap.set(rp.permission.id, rp.permission);
      }
    });
    return Array.from(permissionMap.values());
  }

  // 获取用户的权限编码列表
  async getPermissionCodesByRoleId(roleId: string): Promise<string[]> {
    const permissions = await this.findByRoleId(roleId);
    return permissions.map((p) => p.code);
  }

  // 批量创建权限
  async batchCreate(permissions: Partial<SysPermission>[]): Promise<SysPermission[]> {
    const entities = permissions.map((p) =>
      this.permissionRepository.create({
        id: uuidv4(),
        ...p,
      }),
    );
    return this.permissionRepository.save(entities);
  }

  // 初始化权限数据
  async initPermissions(): Promise<void> {
    const count = await this.permissionRepository.count();
    if (count > 0) {
      return; // 已有数据，跳过初始化
    }

    const defaultPermissions: Partial<SysPermission>[] = [
      // 用户管理权限
      { code: 'user:view', name: '查看用户', type: 'menu', routePath: '/user-manage', sort: 1 },
      { code: 'user:create', name: '创建用户', type: 'button', parentId: null, sort: 2 },
      { code: 'user:edit', name: '编辑用户', type: 'button', parentId: null, sort: 3 },
      { code: 'user:delete', name: '删除用户', type: 'button', parentId: null, sort: 4 },

      // 数据表管理权限
      { code: 'table:view', name: '查看数据表', type: 'menu', routePath: '/table-manage', sort: 10 },
      { code: 'table:create', name: '创建数据表', type: 'button', sort: 11 },
      { code: 'table:edit', name: '编辑数据表', type: 'button', sort: 12 },
      { code: 'table:delete', name: '删除数据表', type: 'button', sort: 13 },

      // 数据管理权限
      { code: 'data:view', name: '查看数据', type: 'menu', routePath: '/data-manage', sort: 20 },
      { code: 'data:create', name: '新增数据', type: 'button', sort: 21 },
      { code: 'data:edit', name: '编辑数据', type: 'button', sort: 22 },
      { code: 'data:delete', name: '删除数据', type: 'button', sort: 23 },
      { code: 'data:export', name: '导出数据', type: 'button', sort: 24 },
      { code: 'data:import', name: '导入数据', type: 'button', sort: 25 },

      // AI功能权限
      { code: 'ai:model', name: 'AI模型管理', type: 'menu', routePath: '/ai-model', sort: 30 },
      { code: 'ai:chat', name: 'AI对话', type: 'menu', routePath: '/ai-chat', sort: 31 },

      // 知识库权限
      { code: 'knowledge:view', name: '查看知识库', type: 'menu', routePath: '/knowledge-base', sort: 40 },
      { code: 'knowledge:manage', name: '管理知识库', type: 'button', sort: 41 },

      // 审计日志权限
      { code: 'audit:view', name: '查看审计日志', type: 'menu', routePath: '/audit-log', sort: 50 },

      // 数据可视化权限
      { code: 'visualization:view', name: '数据可视化', type: 'menu', routePath: '/visualization', sort: 60 },

      // Token统计权限
      { code: 'token:stats', name: 'Token统计', type: 'menu', routePath: '/token-stats', sort: 70 },

      // 系统设置权限
      { code: 'system:settings', name: '系统设置', type: 'menu', routePath: '/settings', sort: 80 },
      { code: 'role:manage', name: '角色管理', type: 'menu', routePath: '/role-manage', sort: 5 },
    ];

    await this.batchCreate(defaultPermissions);
  }
}
