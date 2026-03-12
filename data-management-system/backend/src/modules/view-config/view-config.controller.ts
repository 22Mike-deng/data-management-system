/**
* 视图配置控制器
* 创建者：dzh
* 创建时间：2026-03-12
* 更新时间：2026-03-12
*/
import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ViewConfigService, CreateViewDto, UpdateViewDto } from './view-config.service';

@Controller('view-config')
export class ViewConfigController {
  constructor(private readonly viewConfigService: ViewConfigService) {}

  /**
   * 获取指定表的所有视图
   */
  @Get('table/:tableId')
  async getByTable(@Param('tableId') tableId: string) {
    const views = await this.viewConfigService.findByTableId(tableId);
    return {
      code: 0,
      message: '获取成功',
      data: views,
    };
  }

  /**
   * 获取表的默认视图
   */
  @Get('default/:tableId')
  async getDefaultView(@Param('tableId') tableId: string) {
    const view = await this.viewConfigService.getDefaultView(tableId);
    return {
      code: 0,
      message: '获取成功',
      data: view,
    };
  }

  /**
   * 获取视图详情
   */
  @Get(':viewId')
  async getById(@Param('viewId') viewId: string) {
    const view = await this.viewConfigService.findById(viewId);
    return {
      code: 0,
      message: '获取成功',
      data: view,
    };
  }

  /**
   * 创建视图
   */
  @Post()
  async create(@Body() dto: CreateViewDto) {
    const view = await this.viewConfigService.create(dto);
    return {
      code: 0,
      message: '创建成功',
      data: view,
    };
  }

  /**
   * 更新视图
   */
  @Put(':viewId')
  async update(@Param('viewId') viewId: string, @Body() dto: UpdateViewDto) {
    const view = await this.viewConfigService.update(viewId, dto);
    return {
      code: 0,
      message: '更新成功',
      data: view,
    };
  }

  /**
   * 设置默认视图
   */
  @Put(':viewId/default')
  async setDefault(@Param('viewId') viewId: string) {
    const view = await this.viewConfigService.setDefault(viewId);
    return {
      code: 0,
      message: '设置成功',
      data: view,
    };
  }

  /**
   * 删除视图
   */
  @Delete(':viewId')
  async delete(@Param('viewId') viewId: string) {
    await this.viewConfigService.delete(viewId);
    return {
      code: 0,
      message: '删除成功',
    };
  }
}
