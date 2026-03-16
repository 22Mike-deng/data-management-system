/**
 * 权限守卫
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PermissionService } from '../../modules/permission/permission.service';
import { RoleService } from '../../modules/role/role.service';
import { SysUser } from '../../database/entities/sys-user.entity';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
    private roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取接口所需权限
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有标记权限要求，默认放行（由 JwtAuthGuard 处理认证）
    if (!requiredPermission) {
      return true;
    }

    // 获取当前用户
    const request = context.switchToHttp().getRequest();
    const user = request.user as SysUser;

    if (!user) {
      throw new ForbiddenException('用户信息获取失败');
    }

    // 检查用户是否有角色
    if (!user.roleId) {
      throw new ForbiddenException('用户未分配角色，请联系管理员');
    }

    // 超级管理员拥有所有权限
    const isSuperAdmin = await this.roleService.isSuperAdmin(user.roleId);
    if (isSuperAdmin) {
      return true;
    }

    // 获取用户角色拥有的权限
    const userPermissions = await this.permissionService.getPermissionCodesByRoleId(user.roleId);

    // 检查是否拥有所需权限
    if (!userPermissions.includes(requiredPermission)) {
      throw new ForbiddenException(`您没有权限执行此操作（需要权限：${requiredPermission}）`);
    }

    return true;
  }
}
