/**
 * 知识库实体
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-12
 */
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sys_knowledge_base')
export class KnowledgeBase {
  // 知识条目唯一标识
  @PrimaryColumn({ type: 'varchar', length: 36 })
  knowledgeId: string;

  // 知识标题
  @Column({ type: 'varchar', length: 200 })
  title: string;

  // 知识内容
  @Column({ type: 'text' })
  content: string;

  // 知识分类
  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string;

  // 关键词标签（JSON数组格式存储）
  @Column({ type: 'json', nullable: true })
  tags: string[];

  // 知识来源
  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string;

  // 优先级（数值越大优先级越高）
  @Column({ type: 'int', default: 0 })
  priority: number;

  // 是否启用
  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;

  // 访问次数
  @Column({ type: 'int', default: 0 })
  viewCount: number;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;
}
