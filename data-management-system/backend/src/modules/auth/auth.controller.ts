/**
 * 认证控制器
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-14
 */
import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户登录
   * POST /api/auth/login
   * 【安全修复】登录接口限流：每分钟最多5次尝试
   * 支持用户名或邮箱登录
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() body: { account: string; password: string },
    @Req() req: any,
  ) {
    // 获取真实IP（支持代理场景）
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.ip 
      || req.connection.remoteAddress;
    const result = await this.authService.login(body.account, body.password, ip);
    return {
      code: 0,
      message: '登录成功',
      data: result,
    };
  }

  /**
   * 用户登出
   * POST /api/auth/logout
   * 将 Token 加入黑名单，实现安全退出
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any) {
    // 获取当前 Token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await this.authService.logout(token);
    }
    return {
      code: 0,
      message: '退出登录成功',
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
   * 【安全修复】修改密码接口限流：每小时最多3次尝试
   */
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
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

  /**
   * 发送邮箱验证码
   * POST /api/auth/send-code
   * 【安全修复】验证码接口限流：每分钟最多3次，防止滥用
   */
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('send-code')
  async sendEmailCode(@Body() body: { email: string }) {
    await this.authService.sendEmailCode(body.email);
    return {
      code: 0,
      message: '验证码已发送',
    };
  }

  /**
   * 测试邮件服务配置
   * POST /api/auth/test-mail
   * 【开发调试用】测试邮件服务是否正常
   */
  @Post('test-mail')
  async testMail() {
    const isConfigured = await this.authService.testMailConfiguration();
    return {
      code: 0,
      message: isConfigured ? '邮件服务配置正常' : '邮件服务配置异常',
      data: { configured: isConfigured },
    };
  }

  /**
   * 邮箱验证码登录
   * POST /api/auth/login-by-code
   * 【安全修复】验证码登录接口限流：每分钟最多5次尝试
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login-by-code')
  async loginByEmailCode(
    @Body() body: { email: string; code: string },
    @Req() req: any,
  ) {
    // 获取真实IP（支持代理场景）
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.ip 
      || req.connection.remoteAddress;
    const result = await this.authService.loginByEmailCode(body.email, body.code, ip);
    return {
      code: 0,
      message: '登录成功',
      data: result,
    };
  }
}
