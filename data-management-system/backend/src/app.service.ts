/**
 * 应用服务
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string; version: string } {
    return {
      message: '数据管理可视化系统 API',
      version: '1.0.0',
    };
  }
}
