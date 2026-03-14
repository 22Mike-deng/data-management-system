/**
 * 数据导入导出模块
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DataImportExportService } from './data-import-export.service';
import { DataImportExportController } from './data-import-export.controller';
import { TableMetaModule } from '../table-meta';
import { AuditLogModule } from '../audit-log';

@Module({
  imports: [
    TableMetaModule,
    AuditLogModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [DataImportExportController],
  providers: [DataImportExportService],
  exports: [DataImportExportService],
})
export class DataImportExportModule {}
