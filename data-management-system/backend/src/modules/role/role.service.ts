/**
 * 角色管理服务
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { SysRole } from '../../database/entities/sys-role.entity';
import { SysPermission } from '../../database/entities/sys-permission.entity';
import { SysRolePermission } from '../../database/entities/sys-role-permission.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(SysRole)
    private roleRepository: Repository<SysRole>,
    @InjectRepository(SysPermission)
    private permissionRepository: Repository<SysPermission>,
    @InjectRepository(SysRolePermission)
    private rolePermissionRepository: Repository<SysRolePermission>,
    private dataSource: DataSource,
  ) {}

  // 获取所有角色列表
  async findAll(): Promise<any[]> {
    const roles = await this.roleRepository.find({
      order: { sort: 'ASC', createdAt: 'ASC' },
    });

    // 获取每个角色的权限数量
    const result = await Promise.all(
      roles.map(async (role) => {
        const count = await this.rolePermissionRepository.count({
          where: { roleId: role.id },
        });
        return {
          ...role,
          permissionCount: count,
        };
      }),
    );

    return result;
  }

  // 根据ID获取角色
  async findById(id: string): Promise<SysRole | null> {
    return this.roleRepository.findOne({ where: { id } });
  }

  // 根据编码获取角色
  async findByCode(code: string): Promise<SysRole | null> {
    return this.roleRepository.findOne({ where: { code } });
  }

  // 创建角色
  async create(data: Partial<SysRole>): Promise<SysRole> {
    // 检查编码是否已存在
    const existingRole = await this.findByCode(data.code!);
    if (existingRole) {
      throw new BadRequestException('角色编码已存在');
    }

    const role = this.roleRepository.create({
      id: uuidv4(),
      ...data,
    });
    return this.roleRepository.save(role);
  }

  // 更新角色
  async update(id: string, data: Partial<SysRole>): Promise<SysRole | null> {
    const role = await this.findById(id);
    if (!role) {
      throw new BadRequestException('角色不存在');
    }

    // 如果修改了编码，检查是否与其他角色冲突
    if (data.code && data.code !== role.code) {
      const existingRole = await this.findByCode(data.code);
      if (existingRole) {
        throw new BadRequestException('角色编码已存在');
      }
    }

    await this.roleRepository.update(id, data);
    return this.findById(id);
  }

  // 删除角色
  async delete(id: string): Promise<void> {
    const role = await this.findById(id);
    if (!role) {
      throw new BadRequestException('角色不存在');
    }

    // 检查是否有用户使用此角色
    const userCount = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM sys_user WHERE roleId = ?',
      [id],
    );
    if (userCount[0]?.count > 0) {
      throw new BadRequestException('该角色下存在用户，无法删除');
    }

    // 删除角色关联的权限
    await this.rolePermissionRepository.delete({ roleId: id });
    // 删除角色
    await this.roleRepository.delete(id);
  }

  // 获取角色的权限列表
  async getRolePermissions(roleId: string): Promise<SysPermission[]> {
    // 使用 QueryBuilder 更可靠地获取关联权限
    const permissions = await this.permissionRepository
      .createQueryBuilder('permission')
      .innerJoin('sys_role_permission', 'rp', 'rp.permissionId = permission.id')
      .where('rp.roleId = :roleId', { roleId })
      .getMany();
    return permissions;
  }

  // 获取角色的权限ID列表
  async getRolePermissionIds(roleId: string): Promise<string[]> {
    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId },
    });
    return rolePermissions.map((rp) => rp.permissionId);
  }

  // 分配权限给角色
  async assignPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const role = await this.findById(roleId);
    if (!role) {
      throw new BadRequestException('角色不存在');
    }

    // 使用事务处理
    await this.dataSource.transaction(async (manager) => {
      // 先删除原有的角色权限关联
      await manager.delete(SysRolePermission, { roleId });

      // 创建新的角色权限关联
      if (permissionIds && permissionIds.length > 0) {
        const rolePermissions = permissionIds.map((permissionId) => ({
          id: uuidv4(),
          roleId,
          permissionId,
        }));
        await manager.insert(SysRolePermission, rolePermissions);
      }
    });
  }

  // 获取角色详情（包含权限）
  async getRoleWithPermissions(id: string): Promise<any> {
    const role = await this.findById(id);
    if (!role) {
      return null;
    }
    const permissions = await this.getRolePermissions(id);
    return {
      ...role,
      permissions,
    };
  }

  // 初始化默认角色
  async initDefaultRoles(): Promise<void> {
    const count = await this.roleRepository.count();
    if (count > 0) {
      return; // 已有数据，跳过初始化
    }

    // 获取所有权限
    const allPermissions = await this.permissionRepository.find();
    const allPermissionIds = allPermissions.map((p) => p.id);

    // 创建超级管理员角色
    const superAdminRole = this.roleRepository.create({
      id: uuidv4(),
      code: 'super_admin',
      name: '超级管理员',
      description: '拥有系统全部权限',
      sort: 1,
      status: 0,
    });
    await this.roleRepository.save(superAdminRole);

    // 为超级管理员分配所有权限
    await this.assignPermissions(superAdminRole.id, allPermissionIds);

    // 创建管理员角色
    const adminRole = this.roleRepository.create({
      id: uuidv4(),
      code: 'admin',
      name: '管理员',
      description: '拥有数据管理和AI功能权限',
      sort: 2,
      status: 0,
    });
    await this.roleRepository.save(adminRole);

    // 为管理员分配部分权限
    const adminPermissionCodes = [
      'table:view', 'table:create', 'table:edit', 'table:delete',
      'data:view', 'data:create', 'data:edit', 'data:delete', 'data:export', 'data:import',
      'ai:model', 'ai:chat',
      'knowledge:view', 'knowledge:manage',
      'audit:view',
      'visualization:view',
      'token:stats',
    ];
    const adminPermissions = allPermissions.filter((p) =>
      adminPermissionCodes.includes(p.code),
    );
    await this.assignPermissions(adminRole.id, adminPermissions.map((p) => p.id));

    // 创建普通用户角色
    const userRole = this.roleRepository.create({
      id: uuidv4(),
      code: 'user',
      name: '普通用户',
      description: '拥有基本查看和AI对话权限',
      sort: 3,
      status: 0,
    });
    await this.roleRepository.save(userRole);

    // 为普通用户分配基本权限
    const userPermissionCodes = [
      'data:view',
      'ai:chat',
      'knowledge:view',
      'visualization:view',
    ];
    const userPermissions = allPermissions.filter((p) =>
      userPermissionCodes.includes(p.code),
    );
    await this.assignPermissions(userRole.id, userPermissions.map((p) => p.id));
  }

  // 检查用户是否为超级管理员
  async isSuperAdmin(roleId: string | null): Promise<boolean> {
    if (!roleId) return false;
    const role = await this.findById(roleId);
    return role?.code === 'super_admin';
  }
}
