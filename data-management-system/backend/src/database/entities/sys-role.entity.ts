/**
 * 系统角色实体
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SysUser } from './sys-user.entity';
import { SysRolePermission } from './sys-role-permission.entity';

@Entity('sys_role')
export class SysRole {
  // 角色唯一标识
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  // 角色编码（唯一标识符）
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  // 角色名称
  @Column({ type: 'varchar', length: 50 })
  name: string;

  // 角色描述
  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  // 状态：0-正常，1-禁用
  @Column({ type: 'tinyint', default: 0 })
  status: number;

  // 排序号
  @Column({ type: 'int', default: 0 })
  sort: number;

  // 创建人ID
  @Column({ type: 'varchar', length: 36, nullable: true })
  createdBy: string;

  // 更新人ID
  @Column({ type: 'varchar', length: 36, nullable: true })
  updatedBy: string;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;

  // 关联用户
  @OneToMany(() => SysUser, (user) => user.role)
  users: SysUser[];

  // 关联角色权限
  @OneToMany(() => SysRolePermission, (rp) => rp.role)
  rolePermissions: SysRolePermission[];
}
