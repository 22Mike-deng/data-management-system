/**
 * 角色管理模块
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { SysRole } from '../../database/entities/sys-role.entity';
import { SysPermission } from '../../database/entities/sys-permission.entity';
import { SysRolePermission } from '../../database/entities/sys-role-permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SysRole, SysPermission, SysRolePermission])],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
