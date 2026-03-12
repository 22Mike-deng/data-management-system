/**
* 视图配置服务
* 创建者：dzh
* 创建时间：2026-03-12
* 更新时间：2026-03-12
*/
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ViewConfig } from '@/database/entities';

// 创建视图DTO
export class CreateViewDto {
  viewName: string;
  tableId: string;
  chartType: string;
  xAxis?: string;
  yAxis?: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: string | number | string[] | number[];
  }>;
  isDefault?: boolean;
}

// 更新视图DTO
export class UpdateViewDto {
  viewName?: string;
  chartType?: string;
  xAxis?: string;
  yAxis?: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: string | number | string[] | number[];
  }>;
  isDefault?: boolean;
}

@Injectable()
export class ViewConfigService {
  constructor(
    @InjectRepository(ViewConfig)
    private viewConfigRepository: Repository<ViewConfig>,
  ) {}

  /**
   * 获取指定表的所有视图配置
   */
  async findByTableId(tableId: string): Promise<ViewConfig[]> {
    return this.viewConfigRepository.find({
      where: { tableId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * 获取视图详情
   */
  async findById(viewId: string): Promise<ViewConfig> {
    const view = await this.viewConfigRepository.findOne({
      where: { viewId },
    });
    if (!view) {
      throw new NotFoundException(`视图 ${viewId} 不存在`);
    }
    return view;
  }

  /**
   * 创建视图配置
   */
  async create(dto: CreateViewDto): Promise<ViewConfig> {
    // 如果设置为默认视图，先取消该表的其他默认视图
    if (dto.isDefault) {
      await this.clearDefaultView(dto.tableId);
    }

    const view = this.viewConfigRepository.create({
      viewId: uuidv4(),
      ...dto,
    });
    return this.viewConfigRepository.save(view);
  }

  /**
   * 更新视图配置
   */
  async update(viewId: string, dto: UpdateViewDto): Promise<ViewConfig> {
    const view = await this.findById(viewId);

    // 如果设置为默认视图，先取消该表的其他默认视图
    if (dto.isDefault) {
      await this.clearDefaultView(view.tableId);
    }

    Object.assign(view, dto);
    return this.viewConfigRepository.save(view);
  }

  /**
   * 删除视图配置
   */
  async delete(viewId: string): Promise<void> {
    const view = await this.findById(viewId);
    await this.viewConfigRepository.remove(view);
  }

  /**
   * 设置默认视图
   */
  async setDefault(viewId: string): Promise<ViewConfig> {
    const view = await this.findById(viewId);
    await this.clearDefaultView(view.tableId);
    view.isDefault = true;
    return this.viewConfigRepository.save(view);
  }

  /**
   * 获取表的默认视图
   */
  async getDefaultView(tableId: string): Promise<ViewConfig | null> {
    return this.viewConfigRepository.findOne({
      where: { tableId, isDefault: true },
    });
  }

  /**
   * 清除表的默认视图标记
   */
  private async clearDefaultView(tableId: string): Promise<void> {
    await this.viewConfigRepository.update(
      { tableId, isDefault: true },
      { isDefault: false },
    );
  }
}
