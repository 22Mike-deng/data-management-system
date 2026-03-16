/**
 * 角色-权限关联实体
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SysRole } from './sys-role.entity';
import { SysPermission } from './sys-permission.entity';

@Entity('sys_role_permission')
export class SysRolePermission {
  // 主键ID
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  // 角色ID
  @Column({ type: 'varchar', length: 36 })
  roleId: string;

  // 权限ID
  @Column({ type: 'varchar', length: 36 })
  permissionId: string;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 关联角色
  @ManyToOne(() => SysRole, (role) => role.rolePermissions)
  @JoinColumn({ name: 'roleId' })
  role: SysRole;

  // 关联权限
  @ManyToOne(() => SysPermission, (permission) => permission.rolePermissions)
  @JoinColumn({ name: 'permissionId' })
  permission: SysPermission;
}
