/**
 * 知识库服务
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-12
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { KnowledgeBase } from '@/database/entities';
import { CreateKnowledgeDto, UpdateKnowledgeDto, QueryKnowledgeDto, SearchKnowledgeDto } from './dto';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    @InjectRepository(KnowledgeBase)
    private knowledgeRepository: Repository<KnowledgeBase>,
  ) {}

  /**
   * 创建知识条目
   */
  async create(dto: CreateKnowledgeDto): Promise<KnowledgeBase> {
    const knowledge = this.knowledgeRepository.create({
      knowledgeId: uuidv4(),
      ...dto,
    });
    return this.knowledgeRepository.save(knowledge);
  }

  /**
   * 更新知识条目
   */
  async update(knowledgeId: string, dto: UpdateKnowledgeDto): Promise<KnowledgeBase> {
    const knowledge = await this.knowledgeRepository.findOne({
      where: { knowledgeId },
    });

    if (!knowledge) {
      throw new NotFoundException('知识条目不存在');
    }

    Object.assign(knowledge, dto);
    return this.knowledgeRepository.save(knowledge);
  }

  /**
   * 删除知识条目
   */
  async delete(knowledgeId: string): Promise<void> {
    const result = await this.knowledgeRepository.delete(knowledgeId);
    if (result.affected === 0) {
      throw new NotFoundException('知识条目不存在');
    }
  }

  /**
   * 根据ID获取知识条目
   */
  async findById(knowledgeId: string): Promise<KnowledgeBase> {
    const knowledge = await this.knowledgeRepository.findOne({
      where: { knowledgeId },
    });

    if (!knowledge) {
      throw new NotFoundException('知识条目不存在');
    }

    // 增加访问次数
    knowledge.viewCount += 1;
    await this.knowledgeRepository.save(knowledge);

    return knowledge;
  }

  /**
   * 查询知识库列表
   */
  async findAll(dto: QueryKnowledgeDto): Promise<{ list: KnowledgeBase[]; total: number }> {
    const { keyword, category, isEnabled, page = 1, pageSize = 10 } = dto;

    const queryBuilder = this.knowledgeRepository.createQueryBuilder('knowledge');

    if (keyword) {
      queryBuilder.andWhere(
        '(knowledge.title LIKE :keyword OR knowledge.content LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    if (category) {
      queryBuilder.andWhere('knowledge.category = :category', { category });
    }

    if (isEnabled !== undefined) {
      queryBuilder.andWhere('knowledge.isEnabled = :isEnabled', { isEnabled });
    }

    queryBuilder
      .orderBy('knowledge.priority', 'DESC')
      .addOrderBy('knowledge.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    return { list, total };
  }

  /**
   * 获取所有分类
   */
  async getCategories(): Promise<string[]> {
    const result = await this.knowledgeRepository
      .createQueryBuilder('knowledge')
      .select('DISTINCT knowledge.category', 'category')
      .where('knowledge.category IS NOT NULL')
      .getRawMany();

    return result.map(r => r.category);
  }

  /**
   * 切换启用状态
   */
  async toggleEnabled(knowledgeId: string): Promise<KnowledgeBase> {
    const knowledge = await this.knowledgeRepository.findOne({
      where: { knowledgeId },
    });

    if (!knowledge) {
      throw new NotFoundException('知识条目不存在');
    }

    knowledge.isEnabled = !knowledge.isEnabled;
    return this.knowledgeRepository.save(knowledge);
  }

  /**
   * 搜索知识库（供AI工具调用）
   * 使用简单的LIKE搜索，避免FULLTEXT索引依赖
   */
  async searchForAI(query: string, limit: number = 5): Promise<KnowledgeBase[]> {
    try {
      // 使用简单的LIKE搜索，避免FULLTEXT索引问题
      const results = await this.knowledgeRepository
        .createQueryBuilder('knowledge')
        .where('knowledge.isEnabled = :isEnabled', { isEnabled: true })
        .andWhere(
          '(knowledge.title LIKE :query OR knowledge.content LIKE :query)',
          { query: `%${query}%` }
        )
        .orderBy('knowledge.priority', 'DESC')
        .addOrderBy('knowledge.viewCount', 'DESC')
        .limit(limit)
        .getMany();

      return results;
    } catch (error) {
      // 搜索失败时返回空结果，不影响AI对话
      console.error('知识库搜索失败:', error);
      return [];
    }
  }

  /**
   * 根据关键词搜索知识库
   */
  async searchByKeywords(keywords: string[], limit: number = 5): Promise<KnowledgeBase[]> {
    if (!keywords || keywords.length === 0) {
      return [];
    }

    const queryBuilder = this.knowledgeRepository
      .createQueryBuilder('knowledge')
      .where('knowledge.isEnabled = :isEnabled', { isEnabled: true });

    // 构建关键词搜索条件
    const conditions = keywords.map(keyword => 
      `(knowledge.title LIKE :keyword OR knowledge.content LIKE :keyword OR JSON_CONTAINS(knowledge.tags, :tagJson))`
    );
    
    queryBuilder.andWhere(`(${conditions.join(' OR ')})`);

    const params: any = {};
    keywords.forEach((keyword, index) => {
      params[`keyword_${index}`] = `%${keyword}%`;
      params[`tagJson_${index}`] = JSON.stringify(keyword);
    });

    // 使用setParameter逐个设置参数
    keywords.forEach((keyword, index) => {
      queryBuilder.setParameter(`keyword`, `%${keyword}%`);
      queryBuilder.setParameter(`tagJson`, JSON.stringify(keyword));
    });

    return queryBuilder
      .orderBy('knowledge.priority', 'DESC')
      .addOrderBy('knowledge.viewCount', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * 批量导入知识条目
   */
  async batchImport(items: CreateKnowledgeDto[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await this.create(item);
        success++;
      } catch (error) {
        failed++;
      }
    }

    return { success, failed };
  }
}
