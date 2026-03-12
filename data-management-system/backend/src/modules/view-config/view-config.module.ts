/**
* 视图配置模块
* 创建者：dzh
* 创建时间：2026-03-12
* 更新时间：2026-03-12
*/
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViewConfig } from '@/database/entities';
import { ViewConfigService } from './view-config.service';
import { ViewConfigController } from './view-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ViewConfig])],
  controllers: [ViewConfigController],
  providers: [ViewConfigService],
  exports: [ViewConfigService],
})
export class ViewConfigModule {}
