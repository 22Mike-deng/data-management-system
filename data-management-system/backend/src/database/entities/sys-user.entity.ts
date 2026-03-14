/**
 * 系统用户实体
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-14
 */
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('sys_user')
export class SysUser {
  // 用户唯一标识
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  // 用户名
  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  // 密码（哈希加密存储）
  @Column({ type: 'varchar', length: 255 })
  password: string;

  // 邮箱
  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  // 昵称
  @Column({ type: 'varchar', length: 50, nullable: true })
  nickname: string;

  // 头像
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string;

  // 状态：0-正常，1-禁用
  @Column({ type: 'tinyint', default: 0 })
  status: number;

  // 最后登录时间
  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date;

  // 最后登录IP
  @Column({ type: 'varchar', length: 50, nullable: true })
  lastLoginIp: string;

  // 创建人ID
  @Column({ type: 'varchar', length: 36, nullable: true })
  createdBy: string;

  // 更新人ID
  @Column({ type: 'varchar', length: 36, nullable: true })
  updatedBy: string;

  // 【并发控制】乐观锁版本号，每次更新自动递增
  @VersionColumn()
  version: number;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}
