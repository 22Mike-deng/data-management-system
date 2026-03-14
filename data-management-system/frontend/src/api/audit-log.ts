/**
 * 审计日志API
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import request from '@/utils/request';
import type { ApiResponse } from '@/types';

/**
 * 查询审计日志参数
 */
export interface QueryAuditLogParams {
  page?: number;
  pageSize?: number;
  action?: string;
  module?: string;
  userId?: string;
  username?: string;
  tableName?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
}

/**
 * 审计日志项
 */
export interface AuditLogItem {
  id: string;
  action: string;
  module: string;
  description: string;
  userId: string;
  username: string;
  tableName: string;
  recordId: string;
  oldData: Record<string, any>;
  newData: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage: string;
  createdAt: string;
}

/**
 * 查询审计日志列表
 */
export function queryAuditLogs(params: QueryAuditLogParams): Promise<ApiResponse<{ list: AuditLogItem[]; total: number }>> {
  return request.get('/audit-log', { params });
}

/**
 * 获取审计日志详情
 */
export function getAuditLogById(id: string): Promise<ApiResponse<AuditLogItem>> {
  return request.get(`/audit-log/${id}`);
}

/**
 * 获取当前用户操作历史
 */
export function getUserHistory(limit?: number): Promise<ApiResponse<AuditLogItem[]>> {
  return request.get('/audit-log/user/history', {
    params: { limit },
  });
}

/**
 * 获取操作统计
 */
export function getActionStats(startDate?: string, endDate?: string): Promise<ApiResponse<{ action: string; count: number }[]>> {
  return request.get('/audit-log/stats/actions', {
    params: { startDate, endDate },
  });
}
