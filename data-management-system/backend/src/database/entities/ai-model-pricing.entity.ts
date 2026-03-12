/**
 * 模型定价配置实体
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
import { AIModelConfig } from './ai-model-config.entity';

@Entity('sys_ai_model_pricing')
export class AIModelPricing {
  // 定价配置ID
  @PrimaryColumn({ type: 'varchar', length: 36 })
  pricingId: string;

  // 关联模型ID
  @Column({ type: 'varchar', length: 36 })
  modelId: string;

  // 输入token单价（元/千tokens）
  @Column({ type: 'decimal', precision: 10, scale: 6 })
  inputPrice: number;

  // 输出token单价（元/千tokens）
  @Column({ type: 'decimal', precision: 10, scale: 6 })
  outputPrice: number;

  // 货币单位
  @Column({ type: 'varchar', length: 10, default: 'CNY' })
  currency: string;

  // 生效日期
  @Column({ type: 'date' })
  effectiveDate: Date;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 关联模型配置
  @ManyToOne(() => AIModelConfig)
  @JoinColumn({ name: 'modelId' })
  model: AIModelConfig;
}
