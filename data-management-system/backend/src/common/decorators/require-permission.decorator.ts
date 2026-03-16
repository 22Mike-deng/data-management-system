/**
 * 权限装饰器
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import { SetMetadata } from '@nestjs/common';

// 权限元数据键
export const PERMISSION_KEY = 'permission';

/**
 * 权限装饰器 - 标记接口所需的权限
 * @param permission 权限编码（如 'user:view'）
 * 
 * 使用示例：
 * @RequirePermission('user:view')
 * @Get()
 * findAll() {
 *   return this.userService.findAll();
 * }
 */
export const RequirePermission = (permission: string) => 
  SetMetadata(PERMISSION_KEY, permission);

/**
 * 公开接口装饰器 - 不需要登录和权限验证
 * 使用示例：
 * @Public()
 * @Get('public-data')
 * getPublicData() {
 *   return { message: 'public' };
 * }
 */
export const Public = () => SetMetadata('isPublic', true);

/**
 * 超级管理员跳过权限检查装饰器
 * 使用示例：
 * @SkipPermissionCheck()
 * @Get('sensitive-data')
 * getSensitiveData() {
 *   return { data: 'sensitive' };
 * }
 */
export const SkipPermissionCheck = () => SetMetadata('skipPermissionCheck', true);
