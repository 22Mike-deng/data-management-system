/**
 * 审计日志实体
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 操作类型枚举
 */
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  IMPORT = 'import',
  EXPORT = 'export',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

/**
 * 审计日志实体
 * 记录系统中所有重要操作
 */
@Entity('sys_audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 操作类型
   */
  @Column({
    type: 'enum',
    enum: AuditAction,
    comment: '操作类型',
  })
  @Index()
  action: AuditAction;

  /**
   * 操作模块
   */
  @Column({ length: 50, comment: '操作模块' })
  @Index()
  module: string;

  /**
   * 操作描述
   */
  @Column({ length: 500, comment: '操作描述' })
  description: string;

  /**
   * 操作用户ID
   */
  @Column({ length: 36, nullable: true, comment: '操作用户ID' })
  @Index()
  userId: string;

  /**
   * 操作用户名
   */
  @Column({ length: 100, nullable: true, comment: '操作用户名' })
  username: string;

  /**
   * 关联表名
   */
  @Column({ length: 100, nullable: true, comment: '关联表名' })
  @Index()
  tableName: string;

  /**
   * 关联记录ID
   */
  @Column({ length: 36, nullable: true, comment: '关联记录ID' })
  recordId: string;

  /**
   * 操作前数据（JSON格式）
   */
  @Column({ type: 'json', nullable: true, comment: '操作前数据' })
  oldData: Record<string, any>;

  /**
   * 操作后数据（JSON格式）
   */
  @Column({ type: 'json', nullable: true, comment: '操作后数据' })
  newData: Record<string, any>;

  /**
   * 操作IP地址
   */
  @Column({ length: 45, nullable: true, comment: '操作IP地址' })
  ipAddress: string;

  /**
   * 用户代理
   */
  @Column({ length: 500, nullable: true, comment: '用户代理' })
  userAgent: string;

  /**
   * 操作结果
   */
  @Column({ default: true, comment: '操作结果' })
  success: boolean;

  /**
   * 错误信息
   */
  @Column({ length: 1000, nullable: true, comment: '错误信息' })
  errorMessage: string;

  /**
   * 创建时间
   */
  @CreateDateColumn({ comment: '创建时间' })
  @Index()
  createdAt: Date;
}
