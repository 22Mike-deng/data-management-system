/**
 * 系统权限实体
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
import { SysRolePermission } from './sys-role-permission.entity';

@Entity('sys_permission')
export class SysPermission {
  // 权限唯一标识
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  // 权限编码（唯一标识符，如 user:view）
  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  // 权限名称
  @Column({ type: 'varchar', length: 50 })
  name: string;

  // 权限类型：menu-菜单，button-按钮，api-接口
  @Column({ type: 'varchar', length: 20 })
  type: string;

  // 父级权限ID
  @Column({ type: 'varchar', length: 36, nullable: true })
  parentId: string;

  // 关联路由路径（菜单类型）
  @Column({ type: 'varchar', length: 200, nullable: true })
  routePath: string;

  // 图标
  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string;

  // 排序号
  @Column({ type: 'int', default: 0 })
  sort: number;

  // 状态：0-正常，1-禁用
  @Column({ type: 'tinyint', default: 0 })
  status: number;

  // 描述
  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;

  // 关联角色权限
  @OneToMany(() => SysRolePermission, (rp) => rp.permission)
  rolePermissions: SysRolePermission[];
}
