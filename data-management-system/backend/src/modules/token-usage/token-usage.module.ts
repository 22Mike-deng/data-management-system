/**
 * Token统计模块
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenUsage, AIModelPricing, AIModelConfig } from '@/database/entities';
import { TokenUsageService } from './token-usage.service';
import { TokenUsageController } from './token-usage.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TokenUsage, AIModelPricing, AIModelConfig])],
  controllers: [TokenUsageController],
  providers: [TokenUsageService],
  exports: [TokenUsageService],
})
export class TokenUsageModule {}
