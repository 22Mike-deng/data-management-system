/**
 * 数据表元数据模块
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableDefinition, FieldDefinition } from '@/database/entities';
import { TableMetaService } from './table-meta.service';
import { TableMetaController } from './table-meta.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TableDefinition, FieldDefinition])],
  controllers: [TableMetaController],
  providers: [TableMetaService],
  exports: [TableMetaService],
})
export class TableMetaModule {}
