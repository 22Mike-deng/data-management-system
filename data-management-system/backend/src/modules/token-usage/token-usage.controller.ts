/**
 * Token统计控制器
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { TokenUsageService } from './token-usage.service';
import { QueryTokenUsageDto, CreatePricingDto, UpdatePricingDto } from './dto';

@Controller('token-usage')
export class TokenUsageController {
  constructor(private readonly tokenUsageService: TokenUsageService) {}

  /**
   * 获取统计数据概览
   * GET /api/token-usage/overview
   */
  @Get('overview')
  async getOverview() {
    const overview = await this.tokenUsageService.getOverview();
    return {
      code: 0,
      message: 'success',
      data: overview,
    };
  }

  /**
   * 获取消耗趋势
   * GET /api/token-usage/trend
   */
  @Get('trend')
  async getTrend(@Query('days') days?: number) {
    const trend = await this.tokenUsageService.getTrend(days || 7);
    return {
      code: 0,
      message: 'success',
      data: trend,
    };
  }

  /**
   * 获取分模型统计
   * GET /api/token-usage/by-model
   */
  @Get('by-model')
  async getByModel() {
    const result = await this.tokenUsageService.getByModel();
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  /**
   * 获取消耗明细列表
   * GET /api/token-usage/list
   */
  @Get('list')
  async getUsageList(@Query() dto: QueryTokenUsageDto) {
    const result = await this.tokenUsageService.getUsageList(dto);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  /**
   * 创建定价配置
   * POST /api/token-usage/pricing
   */
  @Post('pricing')
  async createPricing(@Body() dto: CreatePricingDto) {
    const pricing = await this.tokenUsageService.createPricing(dto);
    return {
      code: 0,
      message: '创建成功',
      data: pricing,
    };
  }

  /**
   * 更新定价配置
   * PUT /api/token-usage/pricing/:pricingId
   */
  @Put('pricing/:pricingId')
  async updatePricing(
    @Param('pricingId') pricingId: string,
    @Body() dto: UpdatePricingDto,
  ) {
    const pricing = await this.tokenUsageService.updatePricing(pricingId, dto);
    return {
      code: 0,
      message: '更新成功',
      data: pricing,
    };
  }

  /**
   * 获取模型定价配置
   * GET /api/token-usage/pricing/:modelId
   */
  @Get('pricing/:modelId')
  async getModelPricing(@Param('modelId') modelId: string) {
    const pricing = await this.tokenUsageService.getModelPricing(modelId);
    return {
      code: 0,
      message: 'success',
      data: pricing,
    };
  }
}
