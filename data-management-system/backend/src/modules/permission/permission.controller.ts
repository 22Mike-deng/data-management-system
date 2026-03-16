/**
 * 权限管理控制器
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
import { PermissionService } from './permission.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('permission')
@UseGuards(JwtAuthGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  // 获取权限列表
  @Get()
  @RequirePermission('permission:manage')
  async findAll() {
    const data = await this.permissionService.findAll();
    return { code: 0, message: 'success', data };
  }

  // 获取权限树形结构
  @Get('tree')
  @RequirePermission('permission:manage')
  async findTree() {
    const data = await this.permissionService.findTree();
    return { code: 0, message: 'success', data };
  }

  // 获取单个权限
  @Get(':id')
  @RequirePermission('permission:manage')
  async findById(@Param('id') id: string) {
    const data = await this.permissionService.findById(id);
    return { code: 0, message: 'success', data };
  }

  // 创建权限
  @Post()
  @RequirePermission('permission:manage')
  async create(@Body() data: any) {
    const result = await this.permissionService.create(data);
    return { code: 0, message: '创建成功', data: result };
  }

  // 更新权限
  @Put(':id')
  @RequirePermission('permission:manage')
  async update(@Param('id') id: string, @Body() data: any) {
    const result = await this.permissionService.update(id, data);
    return { code: 0, message: '更新成功', data: result };
  }

  // 删除权限
  @Delete(':id')
  @RequirePermission('permission:manage')
  async delete(@Param('id') id: string) {
    await this.permissionService.delete(id);
    return { code: 0, message: '删除成功' };
  }
}
