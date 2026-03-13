/**
 * 动态数据控制器
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-13
 */
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { DynamicDataService } from './dynamic-data.service';
import { QueryDataDto, CreateDataDto, UpdateDataDto, BatchDeleteDto, AggregateQueryDto } from './dto';

@Controller('dynamic-data')
export class DynamicDataController {
  constructor(private readonly dynamicDataService: DynamicDataService) {}

  /**
   * 创建动态数据表
   * POST /api/dynamic-data/:tableId/create-table
   */
  @Post(':tableId/create-table')
  async createDynamicTable(@Param('tableId') tableId: string) {
    await this.dynamicDataService.createDynamicTable(tableId);
    return {
      code: 0,
      message: '数据表创建成功',
    };
  }

  /**
   * 查询数据列表
   * GET /api/dynamic-data/:tableId
   */
  @Get(':tableId')
  async findDataList(
    @Param('tableId') tableId: string,
    @Query() query: QueryDataDto,
  ) {
    const result = await this.dynamicDataService.findDataList(tableId, query);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  /**
   * 查询单条数据
   * GET /api/dynamic-data/:tableId/:dataId
   */
  @Get(':tableId/:dataId')
  async findDataById(
    @Param('tableId') tableId: string,
    @Param('dataId') dataId: string,
  ) {
    const data = await this.dynamicDataService.findDataById(tableId, dataId);
    return {
      code: 0,
      message: 'success',
      data,
    };
  }

  /**
   * 创建数据
   * POST /api/dynamic-data/:tableId
   */
  @Post(':tableId')
  @UsePipes(new ValidationPipe({ whitelist: false, transform: true }))
  async createData(
    @Param('tableId') tableId: string,
    @Body() dto: CreateDataDto,
  ) {
    console.log('createData controller - dto:', JSON.stringify(dto, null, 2));
    const data = await this.dynamicDataService.createData(tableId, dto);
    return {
      code: 0,
      message: '创建成功',
      data,
    };
  }

  /**
   * 更新数据
   * PUT /api/dynamic-data/:tableId/:dataId
   */
  @Put(':tableId/:dataId')
  @UsePipes(new ValidationPipe({ whitelist: false, transform: true }))
  async updateData(
    @Param('tableId') tableId: string,
    @Param('dataId') dataId: string,
    @Body() dto: UpdateDataDto,
  ) {
    const data = await this.dynamicDataService.updateData(tableId, dataId, dto);
    return {
      code: 0,
      message: '更新成功',
      data,
    };
  }

  /**
   * 删除数据
   * DELETE /api/dynamic-data/:tableId/:dataId
   */
  @Delete(':tableId/:dataId')
  async deleteData(
    @Param('tableId') tableId: string,
    @Param('dataId') dataId: string,
  ) {
    await this.dynamicDataService.deleteData(tableId, dataId);
    return {
      code: 0,
      message: '删除成功',
    };
  }

  /**
   * 批量删除
   * POST /api/dynamic-data/:tableId/batch-delete
   */
  @Post(':tableId/batch-delete')
  async batchDelete(
    @Param('tableId') tableId: string,
    @Body() dto: BatchDeleteDto,
  ) {
    await this.dynamicDataService.batchDelete(tableId, dto);
    return {
      code: 0,
      message: '批量删除成功',
    };
  }

  /**
   * 分组统计查询
   * GET /api/dynamic-data/:tableId/aggregate
   * 支持多字段分组和多聚合统计
   */
  @Get(':tableId/aggregate')
  async aggregateQuery(
    @Param('tableId') tableId: string,
    @Query() query: AggregateQueryDto,
  ) {
    const result = await this.dynamicDataService.aggregateQuery(tableId, query);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }
}
