/**
 * 认证控制器
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户登录
   * POST /api/auth/login
   */
  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Req() req: any,
  ) {
    const ip = req.ip || req.connection.remoteAddress;
    const result = await this.authService.login(body.username, body.password, ip);
    return {
      code: 0,
      message: '登录成功',
      data: result,
    };
  }

  /**
   * 获取当前用户信息
   * GET /api/auth/me
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Req() req: any) {
    const user = await this.authService.getUserInfo(req.user.id);
    return {
      code: 0,
      message: 'success',
      data: user,
    };
  }

  /**
   * 修改密码
   * POST /api/auth/change-password
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Body() body: { oldPassword: string; newPassword: string },
    @Req() req: any,
  ) {
    await this.authService.changePassword(
      req.user.id,
      body.oldPassword,
      body.newPassword,
    );
    return {
      code: 0,
      message: '密码修改成功',
    };
  }
}
