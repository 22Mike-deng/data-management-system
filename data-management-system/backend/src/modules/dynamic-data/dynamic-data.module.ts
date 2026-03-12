/**
 * 动态数据模块
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Module } from '@nestjs/common';
import { TableMetaModule } from '../table-meta';
import { DynamicDataService } from './dynamic-data.service';
import { DynamicDataController } from './dynamic-data.controller';

@Module({
  imports: [TableMetaModule],
  controllers: [DynamicDataController],
  providers: [DynamicDataService],
  exports: [DynamicDataService],
})
export class DynamicDataModule {}
