/**
 * 字段定义实体
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TableDefinition } from './table-definition.entity';

@Entity('sys_field')
export class FieldDefinition {
  // 字段唯一标识
  @PrimaryColumn({ type: 'varchar', length: 36 })
  fieldId: string;

  // 所属表ID
  @Column({ type: 'varchar', length: 36 })
  tableId: string;

  // 字段名称（英文名，用于数据库字段名）
  @Column({ type: 'varchar', length: 100 })
  fieldName: string;

  // 显示名称
  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  // 字段类型：text/int/bigint/float/double/decimal/boolean/date/datetime/select/multiselect/richtext/image/file/relation
  @Column({ type: 'varchar', length: 20 })
  fieldType: string;

  // 是否必填
  @Column({ type: 'boolean', default: false })
  required: boolean;

  // 默认值
  @Column({ type: 'text', nullable: true })
  defaultValue: string;

  // 选项配置（单选/多选时使用）
  @Column({ type: 'json', nullable: true })
  options: { label: string; value: string | number }[];

  // 关联表名（关联类型时使用）
  @Column({ type: 'varchar', length: 100, nullable: true })
  relationTable: string;

  // 关联表ID（关联类型时使用，已废弃，保留兼容）
  @Column({ type: 'varchar', length: 36, nullable: true })
  relationTableId: string;

  // ============ 新增字段属性 ============

  // 字段长度（字符串、数字类型使用）
  @Column({ type: 'int', nullable: true })
  length: number;

  // 小数位数（数字类型使用）
  @Column({ type: 'int', nullable: true })
  decimalPlaces: number;

  // 是否建立索引
  @Column({ type: 'boolean', default: false })
  isIndex: boolean;

  // 是否唯一约束
  @Column({ type: 'boolean', default: false })
  isUnique: boolean;

  // 是否外键
  @Column({ type: 'boolean', default: false })
  isForeignKey: boolean;

  // 外键关联表名
  @Column({ type: 'varchar', length: 100, nullable: true })
  foreignKeyTable: string;

  // 外键关联字段名
  @Column({ type: 'varchar', length: 100, nullable: true })
  foreignKeyField: string;

  // 外键删除行为: CASCADE/SET NULL/RESTRICT
  @Column({ type: 'varchar', length: 20, nullable: true })
  foreignKeyOnDelete: string;

  // 是否自增（数字类型使用）
  @Column({ type: 'boolean', default: false })
  isAutoIncrement: boolean;

  // 字段注释
  @Column({ type: 'varchar', length: 500, nullable: true })
  comment: string;

  // ============ 原有字段 ============

  // 排序序号
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 关联表定义（级联删除）
  @ManyToOne(() => TableDefinition, (table) => table.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tableId' })
  table: TableDefinition;
}
