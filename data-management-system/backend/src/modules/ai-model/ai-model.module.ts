import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIModelConfig, AIChatHistory, TokenUsage, AIModelPricing } from '@/database/entities';
import { AIModelService } from './ai-model.service';
import { AIChatService } from './ai-chat.service';
import { AIToolsService } from './ai-tools.service';
import { AIModelController } from './ai-model.controller';
import { KnowledgeBaseModule } from '../knowledge-base';
import { PermissionModule } from '../permission/permission.module';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIModelConfig, AIChatHistory, TokenUsage, AIModelPricing]),
    KnowledgeBaseModule,
    PermissionModule,
    RoleModule,
  ],
  controllers: [AIModelController],
  providers: [AIModelService, AIChatService, AIToolsService],
  exports: [AIModelService, AIChatService, AIToolsService],
})
export class AIModelModule {}
