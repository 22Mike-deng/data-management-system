/**
 * JWT策略
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SysUser } from '../../database/entities/sys-user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'data-management-secret-key'),
    });
  }

  /**
   * 验证JWT载荷
   */
  async validate(payload: { sub: string; username: string }): Promise<SysUser> {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('无效的认证令牌');
    }
    return user;
  }
}
