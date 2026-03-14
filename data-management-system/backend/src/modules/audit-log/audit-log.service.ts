/**
 * 审计日志服务
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In } from 'typeorm';
import { AuditLog, AuditAction } from '../../database/entities/audit-log.entity';

/**
 * 创建审计日志参数
 */
export interface CreateAuditLogParams {
  action: AuditAction;
  module: string;
  description: string;
  userId?: string;
  username?: string;
  tableName?: string;
  recordId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

/**
 * 查询审计日志参数
 */
export interface QueryAuditLogParams {
  page?: number;
  pageSize?: number;
  action?: AuditAction;
  module?: string;
  userId?: string;
  username?: string;
  tableName?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * 创建审计日志
   */
  async createLog(params: CreateAuditLogParams): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      ...params,
      success: params.success ?? true,
    });
    return this.auditLogRepository.save(log);
  }

  /**
   * 批量创建审计日志
   */
  async createBatchLogs(paramsList: CreateAuditLogParams[]): Promise<void> {
    const logs = paramsList.map(params => 
      this.auditLogRepository.create({
        ...params,
        success: params.success ?? true,
      })
    );
    await this.auditLogRepository.save(logs);
  }

  /**
   * 查询审计日志列表
   */
  async queryLogs(params: QueryAuditLogParams): Promise<{ list: AuditLog[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      action,
      module,
      userId,
      username,
      tableName,
      startDate,
      endDate,
      success,
    } = params;

    const whereConditions: any = {};

    // 构建查询条件
    if (action) {
      whereConditions.action = action;
    }
    if (module) {
      whereConditions.module = Like(`%${module}%`);
    }
    if (userId) {
      whereConditions.userId = userId;
    }
    if (username) {
      whereConditions.username = Like(`%${username}%`);
    }
    if (tableName) {
      whereConditions.tableName = tableName;
    }
    if (success !== undefined) {
      whereConditions.success = success;
    }
    if (startDate && endDate) {
      whereConditions.createdAt = Between(startDate, endDate);
    }

    const [list, total] = await this.auditLogRepository.findAndCount({
      where: whereConditions,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { list, total };
  }

  /**
   * 获取审计日志详情
   */
  async getLogById(id: string): Promise<AuditLog> {
    return this.auditLogRepository.findOne({ where: { id } });
  }

  /**
   * 获取用户的操作历史
   */
  async getUserActionHistory(
    userId: string,
    options?: { limit?: number; actions?: AuditAction[] },
  ): Promise<AuditLog[]> {
    const whereConditions: any = { userId };
    
    if (options?.actions && options.actions.length > 0) {
      whereConditions.action = In(options.actions);
    }

    return this.auditLogRepository.find({
      where: whereConditions,
      order: { createdAt: 'DESC' },
      take: options?.limit || 50,
    });
  }

  /**
   * 获取表的操作历史
   */
  async getTableActionHistory(
    tableName: string,
    options?: { limit?: number; recordId?: string },
  ): Promise<AuditLog[]> {
    const whereConditions: any = { tableName };
    
    if (options?.recordId) {
      whereConditions.recordId = options.recordId;
    }

    return this.auditLogRepository.find({
      where: whereConditions,
      order: { createdAt: 'DESC' },
      take: options?.limit || 100,
    });
  }

  /**
   * 统计操作次数
   */
  async getActionStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ action: AuditAction; count: number }[]> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.action');

    if (startDate && endDate) {
      queryBuilder.where('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return queryBuilder.getRawMany();
  }

  /**
   * 清理过期的审计日志
   * @param daysToKeep 保留天数
   */
  async cleanOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
