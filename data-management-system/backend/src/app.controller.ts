/**
 * 应用控制器
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): { message: string; version: string } {
    return this.appService.getHello();
  }

  @Get('health')
  healthCheck(): { status: string; timestamp: number } {
    return {
      status: 'ok',
      timestamp: Date.now(),
    };
  }
}
