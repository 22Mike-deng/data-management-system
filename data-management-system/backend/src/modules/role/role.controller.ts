/**
 * 角色管理控制器
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('role')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // 获取角色列表
  @Get()
  @RequirePermission('role:manage')
  async findAll() {
    const data = await this.roleService.findAll();
    return { code: 0, message: 'success', data };
  }

  // 获取角色详情（包含权限）
  @Get(':id')
  @RequirePermission('role:manage')
  async findById(@Param('id') id: string) {
    const data = await this.roleService.getRoleWithPermissions(id);
    return { code: 0, message: 'success', data };
  }

  // 获取角色的权限列表
  @Get(':id/permissions')
  @RequirePermission('role:manage')
  async getRolePermissions(@Param('id') id: string) {
    const data = await this.roleService.getRolePermissions(id);
    return { code: 0, message: 'success', data };
  }

  // 创建角色
  @Post()
  @RequirePermission('role:manage')
  async create(@Body() data: any) {
    const result = await this.roleService.create(data);
    return { code: 0, message: '创建成功', data: result };
  }

  // 更新角色
  @Put(':id')
  @RequirePermission('role:manage')
  async update(@Param('id') id: string, @Body() data: any) {
    const result = await this.roleService.update(id, data);
    return { code: 0, message: '更新成功', data: result };
  }

  // 删除角色
  @Delete(':id')
  @RequirePermission('role:manage')
  async delete(@Param('id') id: string) {
    await this.roleService.delete(id);
    return { code: 0, message: '删除成功' };
  }

  // 分配权限给角色
  @Post(':id/permissions')
  @RequirePermission('role:manage')
  async assignPermissions(
    @Param('id') id: string,
    @Body() body: { permissionIds: string[] },
  ) {
    await this.roleService.assignPermissions(id, body.permissionIds);
    return { code: 0, message: '权限分配成功' };
  }
}
