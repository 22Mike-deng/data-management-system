/**
 * 数据表元数据控制器
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { TableMetaService } from './table-meta.service';
import { CreateTableDto, UpdateTableDto, CreateFieldDto, UpdateFieldDto } from './dto';

@Controller('table-meta')
export class TableMetaController {
  constructor(private readonly tableMetaService: TableMetaService) {}

  /**
   * 获取所有数据表列表
   * GET /api/table-meta
   */
  @Get()
  async findAllTables() {
    const tables = await this.tableMetaService.findAllTables();
    return {
      code: 0,
      message: 'success',
      data: tables,
    };
  }

  /**
   * 获取数据表详情
   * GET /api/table-meta/:tableId
   */
  @Get(':tableId')
  async findTableById(@Param('tableId') tableId: string) {
    const table = await this.tableMetaService.findTableById(tableId);
    return {
      code: 0,
      message: 'success',
      data: table,
    };
  }

  /**
   * 创建数据表
   * POST /api/table-meta
   */
  @Post()
  async createTable(@Body() dto: CreateTableDto) {
    const table = await this.tableMetaService.createTable(dto);
    return {
      code: 0,
      message: '创建成功',
      data: table,
    };
  }

  /**
   * 更新数据表
   * PUT /api/table-meta/:tableId
   */
  @Put(':tableId')
  async updateTable(
    @Param('tableId') tableId: string,
    @Body() dto: UpdateTableDto,
  ) {
    const table = await this.tableMetaService.updateTable(tableId, dto);
    return {
      code: 0,
      message: '更新成功',
      data: table,
    };
  }

  /**
   * 删除数据表
   * DELETE /api/table-meta/:tableId
   */
  @Delete(':tableId')
  async deleteTable(@Param('tableId') tableId: string) {
    await this.tableMetaService.deleteTable(tableId);
    return {
      code: 0,
      message: '删除成功',
    };
  }

  /**
   * 获取表的所有字段
   * GET /api/table-meta/:tableId/fields
   */
  @Get(':tableId/fields')
  async getTableFields(@Param('tableId') tableId: string) {
    const fields = await this.tableMetaService.getTableFields(tableId);
    return {
      code: 0,
      message: 'success',
      data: fields,
    };
  }

  /**
   * 添加字段
   * POST /api/table-meta/:tableId/fields
   */
  @Post(':tableId/fields')
  async addField(
    @Param('tableId') tableId: string,
    @Body() dto: CreateFieldDto,
  ) {
    const field = await this.tableMetaService.addField(tableId, dto);
    return {
      code: 0,
      message: '添加成功',
      data: field,
    };
  }

  /**
   * 更新字段
   * PUT /api/table-meta/fields/:fieldId
   */
  @Put('fields/:fieldId')
  async updateField(
    @Param('fieldId') fieldId: string,
    @Body() dto: UpdateFieldDto,
  ) {
    const field = await this.tableMetaService.updateField(fieldId, dto);
    return {
      code: 0,
      message: '更新成功',
      data: field,
    };
  }

  /**
   * 删除字段
   * DELETE /api/table-meta/fields/:fieldId
   */
  @Delete('fields/:fieldId')
  async deleteField(@Param('fieldId') fieldId: string) {
    await this.tableMetaService.deleteField(fieldId);
    return {
      code: 0,
      message: '删除成功',
    };
  }
}
