/**
 * JWT策略
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-14
 */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SysUser } from '../../database/entities/sys-user.entity';

const logger = new Logger('JwtStrategy');

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // 【安全修复】强制要求配置 JWT_SECRET 环境变量
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      logger.error('❌ JWT_SECRET 环境变量未配置！');
      throw new Error('JWT_SECRET 环境变量未配置');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true, // 允许在 validate 中访问 request
    });
  }

  /**
   * 验证JWT载荷
   * @param req 请求对象
   * @param payload JWT载荷数据
   * @returns 用户实体
   */
  async validate(req: any, payload: { sub: string; username: string }): Promise<SysUser> {
    // 【安全修复】检查 Token 是否在黑名单中
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const isBlacklisted = await this.authService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('登录已失效，请重新登录');
      }
    }

    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('无效的认证令牌');
    }
    return user;
  }
}
