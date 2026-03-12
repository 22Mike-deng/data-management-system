/**
 * 知识库控制器
 * 创建者：dzh
 * 创建时间：2026-03-12
 * 更新时间：2026-03-12
 */
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateKnowledgeDto, UpdateKnowledgeDto, QueryKnowledgeDto, SearchKnowledgeDto } from './dto';

@Controller('knowledge')
export class KnowledgeBaseController {
  constructor(private knowledgeService: KnowledgeBaseService) {}

  /**
   * 查询知识库列表
   */
  @Get()
  async findAll(@Query() dto: QueryKnowledgeDto) {
    const result = await this.knowledgeService.findAll(dto);
    return {
      code: 0,
      message: '获取成功',
      data: result,
    };
  }

  /**
   * 获取所有分类
   */
  @Get('categories/list')
  async getCategories() {
    const categories = await this.knowledgeService.getCategories();
    return {
      code: 0,
      message: '获取成功',
      data: categories,
    };
  }

  /**
   * 获取知识条目详情
   */
  @Get(':knowledgeId')
  async findById(@Param('knowledgeId') knowledgeId: string) {
    const knowledge = await this.knowledgeService.findById(knowledgeId);
    return {
      code: 0,
      message: '获取成功',
      data: knowledge,
    };
  }

  /**
   * 创建知识条目
   */
  @Post()
  async create(@Body() dto: CreateKnowledgeDto) {
    const knowledge = await this.knowledgeService.create(dto);
    return {
      code: 0,
      message: '创建成功',
      data: knowledge,
    };
  }

  /**
   * 搜索知识库（供前端使用）
   */
  @Post('search')
  async search(@Body() dto: SearchKnowledgeDto) {
    const results = await this.knowledgeService.searchForAI(dto.query, dto.limit || 5);
    return {
      code: 0,
      message: '搜索成功',
      data: results,
    };
  }

  /**
   * 批量导入知识条目
   */
  @Post('batch-import')
  async batchImport(@Body() items: CreateKnowledgeDto[]) {
    const result = await this.knowledgeService.batchImport(items);
    return {
      code: 0,
      message: `导入完成：成功${result.success}条，失败${result.failed}条`,
      data: result,
    };
  }

  /**
   * 更新知识条目
   */
  @Put(':knowledgeId')
  async update(@Param('knowledgeId') knowledgeId: string, @Body() dto: UpdateKnowledgeDto) {
    const knowledge = await this.knowledgeService.update(knowledgeId, dto);
    return {
      code: 0,
      message: '更新成功',
      data: knowledge,
    };
  }

  /**
   * 删除知识条目
   */
  @Delete(':knowledgeId')
  async delete(@Param('knowledgeId') knowledgeId: string) {
    await this.knowledgeService.delete(knowledgeId);
    return {
      code: 0,
      message: '删除成功',
    };
  }

  /**
   * 切换启用状态
   */
  @Post(':knowledgeId/toggle')
  async toggleEnabled(@Param('knowledgeId') knowledgeId: string) {
    const knowledge = await this.knowledgeService.toggleEnabled(knowledgeId);
    return {
      code: 0,
      message: '状态切换成功',
      data: knowledge,
    };
  }
}
