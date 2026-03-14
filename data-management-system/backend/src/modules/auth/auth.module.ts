/**
 * 认证模块定义
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { SysUser } from '../../database/entities/sys-user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SysUser]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET') || 'data-management-secret-key';
        const expiresInStr = configService.get<string>('JWT_EXPIRES_IN') || '24h';
        return {
          secret,
          signOptions: {
            expiresIn: expiresInStr as '24h' | '1h' | '7d' | '30d',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
