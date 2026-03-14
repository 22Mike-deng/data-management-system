/**
 * 审计日志控制器
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from '../../database/entities/audit-log.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('audit-log')
@UseGuards(JwtAuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * 查询审计日志列表
   */
  @Get()
  async queryLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: AuditAction,
    @Query('module') module?: string,
    @Query('userId') userId?: string,
    @Query('username') username?: string,
    @Query('tableName') tableName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('success') success?: string,
  ) {
    const data = await this.auditLogService.queryLogs({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      action,
      module,
      userId,
      username,
      tableName,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      success: success === 'true' ? true : success === 'false' ? false : undefined,
    });
    return {
      code: 0,
      message: 'success',
      data,
    };
  }

  /**
   * 获取审计日志详情
   */
  @Get(':id')
  async getLogById(@Param('id') id: string) {
    const data = await this.auditLogService.getLogById(id);
    return {
      code: 0,
      message: 'success',
      data,
    };
  }

  /**
   * 获取当前用户的操作历史
   */
  @Get('user/history')
  async getUserHistory(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const data = await this.auditLogService.getUserActionHistory(req.user?.userId, {
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return {
      code: 0,
      message: 'success',
      data,
    };
  }

  /**
   * 获取操作统计
   */
  @Get('stats/actions')
  async getActionStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.auditLogService.getActionStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return {
      code: 0,
      message: 'success',
      data,
    };
  }
}
