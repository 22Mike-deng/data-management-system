/**
 * 字段定义实体
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
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

  // 字段类型：text/number/boolean/date/select/multiselect/richtext/image/file/relation
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

  // 关联表ID（关联类型时使用）
  @Column({ type: 'varchar', length: 36, nullable: true })
  relationTableId: string;

  // 排序序号
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 关联表定义
  @ManyToOne(() => TableDefinition, (table) => table.fields)
  @JoinColumn({ name: 'tableId' })
  table: TableDefinition;
}
