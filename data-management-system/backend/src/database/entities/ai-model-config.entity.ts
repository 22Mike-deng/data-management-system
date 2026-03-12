/**
 * AI模型配置实体
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
} from 'typeorm';

@Entity('sys_ai_model')
export class AIModelConfig {
  // 模型唯一标识
  @PrimaryColumn({ type: 'varchar', length: 36 })
  modelId: string;

  // 模型显示名称
  @Column({ type: 'varchar', length: 100 })
  modelName: string;

  // 模型类型：openai/qwen/wenxin/spark/zhipu/custom
  @Column({ type: 'varchar', length: 20 })
  modelType: string;

  // API接口地址
  @Column({ type: 'varchar', length: 500 })
  apiEndpoint: string;

  // API密钥（加密存储）
  @Column({ type: 'text' })
  apiKey: string;

  // 具体模型标识（gpt-4、qwen-turbo等）
  @Column({ type: 'varchar', length: 100 })
  modelIdentifier: string;

  // 模型参数配置
  @Column({ type: 'json', nullable: true })
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    contextLength?: number; // 上下文记忆消息数量，默认20条
  };

  // 是否启用
  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;

  // 是否为默认模型
  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}
