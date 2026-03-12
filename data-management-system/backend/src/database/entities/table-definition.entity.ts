/**
 * 表定义实体
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FieldDefinition } from './field-definition.entity';

@Entity('sys_table')
export class TableDefinition {
  // 表唯一标识
  @PrimaryColumn({ type: 'varchar', length: 36 })
  tableId: string;

  // 表名称（英文名，用于数据库表名）
  @Column({ type: 'varchar', length: 100, unique: true })
  tableName: string;

  // 显示名称
  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  // 表描述
  @Column({ type: 'text', nullable: true })
  description: string;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;

  // 关联字段定义（级联删除）
  @OneToMany(() => FieldDefinition, (field) => field.table, { cascade: true })
  fields: FieldDefinition[];
}
