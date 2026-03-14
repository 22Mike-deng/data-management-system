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
    });
  }

  /**
   * 验证JWT载荷
   * @param payload JWT载荷数据
   * @returns 用户实体
   */
  async validate(payload: { sub: string; username: string }): Promise<SysUser> {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('无效的认证令牌');
    }
    return user;
  }
}
