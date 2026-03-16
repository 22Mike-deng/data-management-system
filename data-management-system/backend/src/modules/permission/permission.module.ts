/**
 * 权限管理模块
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { SysPermission } from '../../database/entities/sys-permission.entity';
import { SysRolePermission } from '../../database/entities/sys-role-permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SysPermission, SysRolePermission])],
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
