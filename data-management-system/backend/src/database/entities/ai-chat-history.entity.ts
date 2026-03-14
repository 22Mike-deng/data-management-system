/**
 * AI对话历史实体
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-13
 */
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AIModelConfig } from './ai-model-config.entity';

@Entity('sys_ai_chat')
@Index(['sessionId'])
@Index(['modelId'])
export class AIChatHistory {
  // 对话唯一标识
  @PrimaryColumn({ type: 'varchar', length: 36 })
  chatId: string;

  // 使用的模型ID
  @Column({ type: 'varchar', length: 36 })
  modelId: string;

  // 会话ID（用于分组对话）
  @Column({ type: 'varchar', length: 36 })
  sessionId: string;

  // 角色：user/assistant
  @Column({ type: 'varchar', length: 20 })
  role: string;

  // 对话内容
  @Column({ type: 'text' })
  content: string;

  // 思考过程（思维链）
  @Column({ type: 'text', nullable: true })
  thinking: string;

  // 创建人ID
  @Column({ type: 'varchar', length: 36, nullable: true })
  createdBy: string;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;

  // 关联模型配置
  @ManyToOne(() => AIModelConfig)
  @JoinColumn({ name: 'modelId' })
  model: AIModelConfig;
}
