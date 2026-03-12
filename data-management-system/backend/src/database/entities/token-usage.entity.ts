/**
 * Token消耗记录实体
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
  Index,
} from 'typeorm';
import { AIModelConfig } from './ai-model-config.entity';

@Entity('sys_ai_token_usage')
@Index(['modelId'])
@Index(['sessionId'])
@Index(['createdAt'])
export class TokenUsage {
  // 记录唯一标识
  @PrimaryColumn({ type: 'varchar', length: 36 })
  usageId: string;

  // 使用的模型ID
  @Column({ type: 'varchar', length: 36 })
  modelId: string;

  // 关联的对话ID
  @Column({ type: 'varchar', length: 36, nullable: true })
  chatId: string;

  // 会话ID
  @Column({ type: 'varchar', length: 36 })
  sessionId: string;

  // 输入token数
  @Column({ type: 'int' })
  inputTokens: number;

  // 输出token数
  @Column({ type: 'int' })
  outputTokens: number;

  // 总token数
  @Column({ type: 'int' })
  totalTokens: number;

  // 预估费用（元）
  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  estimatedCost: number;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 关联模型配置
  @ManyToOne(() => AIModelConfig)
  @JoinColumn({ name: 'modelId' })
  model: AIModelConfig;
}
