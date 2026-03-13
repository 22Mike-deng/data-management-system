/**
 * AI模型模块
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
/**
 * AI模型模块
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-13
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIModelConfig, AIChatHistory, TokenUsage, AIModelPricing } from '@/database/entities';
import { AIModelService } from './ai-model.service';
import { AIChatService } from './ai-chat.service';
import { AIToolsService } from './ai-tools.service';
import { AIModelController } from './ai-model.controller';
import { KnowledgeBaseModule } from '../knowledge-base';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIModelConfig, AIChatHistory, TokenUsage, AIModelPricing]),
    KnowledgeBaseModule,
  ],
  controllers: [AIModelController],
  providers: [AIModelService, AIChatService, AIToolsService],
  exports: [AIModelService, AIChatService, AIToolsService],
})
export class AIModelModule {}
