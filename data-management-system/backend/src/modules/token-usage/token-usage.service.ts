/**
 * Token统计服务
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { TokenUsage, AIModelPricing, AIModelConfig } from '@/database/entities';
import { QueryTokenUsageDto, CreatePricingDto, UpdatePricingDto } from './dto';

@Injectable()
export class TokenUsageService {
  constructor(
    @InjectRepository(TokenUsage)
    private usageRepository: Repository<TokenUsage>,
    @InjectRepository(AIModelPricing)
    private pricingRepository: Repository<AIModelPricing>,
    @InjectRepository(AIModelConfig)
    private modelRepository: Repository<AIModelConfig>,
  ) {}

  /**
   * 获取统计数据概览
   */
  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // 总消耗
    const totalResult = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.totalTokens)', 'total')
      .getRawOne();

    // 本月消耗
    const monthResult = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.totalTokens)', 'total')
      .where('usage.createdAt >= :thisMonthStart', { thisMonthStart })
      .getRawOne();

    // 今日消耗
    const todayResult = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.totalTokens)', 'total')
      .where('usage.createdAt >= :today', { today })
      .getRawOne();

    // 预估总费用
    const costResult = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.estimatedCost)', 'total')
      .getRawOne();

    return {
      totalTokens: parseInt(totalResult?.total || '0', 10),
      monthTokens: parseInt(monthResult?.total || '0', 10),
      todayTokens: parseInt(todayResult?.total || '0', 10),
      estimatedCost: parseFloat(costResult?.total || '0'),
    };
  }

  /**
   * 获取消耗趋势数据
   */
  async getTrend(days: number = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.usageRepository
      .createQueryBuilder('usage')
      .select('DATE(usage.createdAt)', 'date')
      .addSelect('SUM(usage.totalTokens)', 'totalTokens')
      .addSelect('SUM(usage.inputTokens)', 'inputTokens')
      .addSelect('SUM(usage.outputTokens)', 'outputTokens')
      .where('usage.createdAt >= :startDate', { startDate })
      .groupBy('DATE(usage.createdAt)')
      .orderBy('DATE(usage.createdAt)', 'ASC')
      .getRawMany();

    return result;
  }

  /**
   * 获取分模型统计
   */
  async getByModel() {
    const result = await this.usageRepository
      .createQueryBuilder('usage')
      .leftJoinAndSelect('usage.model', 'model')
      .select('model.modelId', 'modelId')
      .addSelect('model.modelName', 'modelName')
      .addSelect('SUM(usage.totalTokens)', 'totalTokens')
      .addSelect('SUM(usage.inputTokens)', 'inputTokens')
      .addSelect('SUM(usage.outputTokens)', 'outputTokens')
      .addSelect('SUM(usage.estimatedCost)', 'estimatedCost')
      .groupBy('model.modelId')
      .addGroupBy('model.modelName')
      .getRawMany();

    return result;
  }

  /**
   * 获取消耗明细列表
   */
  async getUsageList(dto: QueryTokenUsageDto) {
    const { modelId, startDate, endDate, page = 1, pageSize = 20 } = dto;

    const query = this.usageRepository
      .createQueryBuilder('usage')
      .leftJoinAndSelect('usage.model', 'model');

    if (modelId) {
      query.andWhere('usage.modelId = :modelId', { modelId });
    }

    if (startDate && endDate) {
      query.andWhere('usage.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    query.orderBy('usage.createdAt', 'DESC');

    const total = await query.getCount();
    const list = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 创建定价配置
   */
  async createPricing(dto: CreatePricingDto) {
    const pricing = this.pricingRepository.create({
      pricingId: randomUUID(),
      modelId: dto.modelId,
      inputPrice: dto.inputPrice,
      outputPrice: dto.outputPrice,
      currency: dto.currency || 'CNY',
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
    });

    return this.pricingRepository.save(pricing);
  }

  /**
   * 更新定价配置
   */
  async updatePricing(pricingId: string, dto: UpdatePricingDto) {
    const pricing = await this.pricingRepository.findOne({
      where: { pricingId },
    });

    if (!pricing) {
      throw new Error('定价配置不存在');
    }

    Object.assign(pricing, dto);
    return this.pricingRepository.save(pricing);
  }

  /**
   * 获取模型的定价配置
   */
  async getModelPricing(modelId: string) {
    return this.pricingRepository.findOne({
      where: { modelId },
      order: { effectiveDate: 'DESC' },
    });
  }
}
