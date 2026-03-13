/**
 * Token统计服务
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-13
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
   * 返回：总Token、总费用、今日Token/费用、本月Token/费用、会话数
   */
  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // 总消耗
    const totalTokensResult = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.totalTokens)', 'tokens')
      .addSelect('SUM(usage.estimatedCost)', 'cost')
      .getRawOne();

    // 本月消耗
    const monthResult = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.totalTokens)', 'tokens')
      .addSelect('SUM(usage.estimatedCost)', 'cost')
      .where('usage.createdAt >= :thisMonthStart', { thisMonthStart })
      .getRawOne();

    // 今日消耗
    const todayResult = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.totalTokens)', 'tokens')
      .addSelect('SUM(usage.estimatedCost)', 'cost')
      .where('usage.createdAt >= :today', { today })
      .getRawOne();

    // 会话数（按 sessionId 去重）
    const sessionResult = await this.usageRepository
      .createQueryBuilder('usage')
      .select('COUNT(DISTINCT usage.sessionId)', 'count')
      .getRawOne();

    return {
      totalTokens: parseInt(totalTokensResult?.tokens || '0', 10),
      totalCost: parseFloat(totalTokensResult?.cost || '0'),
      todayTokens: parseInt(todayResult?.tokens || '0', 10),
      todayCost: parseFloat(todayResult?.cost || '0'),
      monthTokens: parseInt(monthResult?.tokens || '0', 10),
      monthCost: parseFloat(monthResult?.cost || '0'),
      sessionCount: parseInt(sessionResult?.count || '0', 10),
    };
  }

  /**
   * 获取消耗趋势数据
   * 返回：日期、Token数、费用、会话数
   */
  async getTrend(days: number = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.usageRepository
      .createQueryBuilder('usage')
      .select('DATE(usage.createdAt)', 'date')
      .addSelect('SUM(usage.totalTokens)', 'tokens')
      .addSelect('SUM(usage.estimatedCost)', 'cost')
      .addSelect('COUNT(DISTINCT usage.sessionId)', 'sessions')
      .where('usage.createdAt >= :startDate', { startDate })
      .groupBy('DATE(usage.createdAt)')
      .orderBy('DATE(usage.createdAt)', 'ASC')
      .getRawMany();

    // 转换字段类型
    return result.map((item) => ({
      date: item.date,
      tokens: parseInt(item.tokens || '0', 10),
      cost: parseFloat(item.cost || '0'),
      sessions: parseInt(item.sessions || '0', 10),
    }));
  }

  /**
   * 获取分模型统计
   * 返回：模型ID、模型名称、总Token、总费用、会话数
   */
  async getByModel() {
    const result = await this.usageRepository
      .createQueryBuilder('usage')
      .leftJoinAndSelect('usage.model', 'model')
      .select('model.modelId', 'modelId')
      .addSelect('model.modelName', 'modelName')
      .addSelect('SUM(usage.totalTokens)', 'totalTokens')
      .addSelect('SUM(usage.estimatedCost)', 'totalCost')
      .addSelect('COUNT(DISTINCT usage.sessionId)', 'sessionCount')
      .groupBy('model.modelId')
      .addGroupBy('model.modelName')
      .getRawMany();

    // 转换字段类型
    return result.map((item) => ({
      modelId: item.modelId,
      modelName: item.modelName,
      totalTokens: parseInt(item.totalTokens || '0', 10),
      totalCost: parseFloat(item.totalCost || '0'),
      sessionCount: parseInt(item.sessionCount || '0', 10),
    }));
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

    // 转换 DECIMAL 字段为数字类型（TypeORM 对 DECIMAL 返回字符串）
    const formattedList = list.map((item) => ({
      ...item,
      estimatedCost: parseFloat(String(item.estimatedCost) || '0'),
    }));

    return {
      list: formattedList,
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
