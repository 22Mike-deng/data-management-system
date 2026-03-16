/**
 * 用户管理控制器
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-16
 */
import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('user')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取用户列表
   * GET /api/user
   */
  @Get()
  @RequirePermission('user:view')
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('username') username?: string,
    @Query('email') email?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.userService.findAll({
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      username,
      email,
      status: status !== undefined ? parseInt(status) : undefined,
    });
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  /**
   * 获取用户详情
   * GET /api/user/:id
   */
  @Get(':id')
  @RequirePermission('user:view')
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findOne(id);
    return {
      code: 0,
      message: 'success',
      data: user,
    };
  }

  /**
   * 创建用户
   * POST /api/user
   */
  @Post()
  @RequirePermission('user:create')
  async create(
    @Body() body: {
      username: string;
      password: string;
      email: string;
      nickname?: string;
      avatar?: string;
      status?: number;
      roleId?: string;
    },
    @Req() req: any,
  ) {
    const user = await this.userService.create(body, req.user.id);
    return {
      code: 0,
      message: '创建成功',
      data: user,
    };
  }

  /**
   * 更新用户
   * PUT /api/user/:id
   */
  @Put(':id')
  @RequirePermission('user:edit')
  async update(
    @Param('id') id: string,
    @Body() body: {
      email?: string;
      nickname?: string;
      avatar?: string;
      status?: number;
      password?: string;
      roleId?: string;
    },
    @Req() req: any,
  ) {
    const user = await this.userService.update(id, body, req.user.id);
    return {
      code: 0,
      message: '更新成功',
      data: user,
    };
  }

  /**
   * 删除用户
   * DELETE /api/user/:id
   */
  @Delete(':id')
  @RequirePermission('user:delete')
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
    return {
      code: 0,
      message: '删除成功',
    };
  }

  /**
   * 重置密码
   * POST /api/user/:id/reset-password
   */
  @Post(':id/reset-password')
  @RequirePermission('user:edit')
  async resetPassword(
    @Param('id') id: string,
    @Body() body: { password: string },
    @Req() req: any,
  ) {
    await this.userService.resetPassword(id, body.password, req.user.id);
    return {
      code: 0,
      message: '密码重置成功',
    };
  }

  /**
   * 切换用户状态
   * POST /api/user/:id/toggle-status
   */
  @Post(':id/toggle-status')
  @RequirePermission('user:edit')
  async toggleStatus(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const user = await this.userService.toggleStatus(id, req.user.id);
    return {
      code: 0,
      message: '状态切换成功',
      data: user,
    };
  }
}
