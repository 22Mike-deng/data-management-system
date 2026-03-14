/**
 * 视图配置实体
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-13
 */
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sys_view_config')
export class ViewConfig {
  // 视图唯一标识
  @PrimaryColumn({ type: 'varchar', length: 36 })
  viewId: string;

  // 视图名称
  @Column({ type: 'varchar', length: 100 })
  viewName: string;

  // 关联的数据表ID
  @Column({ type: 'varchar', length: 36 })
  tableId: string;

  // 图表类型：bar/pie/line
  @Column({ type: 'varchar', length: 20 })
  chartType: string;

  // X轴字段
  @Column({ type: 'varchar', length: 100, nullable: true })
  xAxis: string;

  // Y轴字段
  @Column({ type: 'varchar', length: 100, nullable: true })
  yAxis: string;

  // 筛选条件（JSON格式）
  @Column({ type: 'json', nullable: true })
  filters: Array<{
    field: string;
    operator: string;
    value: string | number | string[] | number[];
  }>;

  // 是否为默认视图
  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

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
}
