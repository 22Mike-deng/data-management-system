/**
 * 认证模块定义
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-16
 */
import { Module, Logger, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { SysUser } from '../../database/entities/sys-user.entity';
import { PermissionModule } from '../permission';
import { RoleModule } from '../role';

const logger = new Logger('AuthModule');

@Module({
  imports: [
    TypeOrmModule.forFeature([SysUser]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // 【安全修复】强制要求配置 JWT_SECRET 环境变量，不使用默认值
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          logger.error('❌ JWT_SECRET 环境变量未配置！请在 .env 文件中配置');
          logger.error('示例配置: JWT_SECRET=your-super-secret-key-at-least-32-characters');
          throw new Error('JWT_SECRET 环境变量未配置，应用无法启动');
        }
        
        // 验证密钥长度（建议至少32字符）
        if (secret.length < 32) {
          logger.warn(`⚠️ JWT_SECRET 长度建议至少32个字符，当前长度: ${secret.length}`);
        }
        
        const expiresInStr = configService.get<string>('JWT_EXPIRES_IN') || '24h';
        logger.log('✅ JWT 配置加载成功');
        return {
          secret,
          signOptions: {
            expiresIn: expiresInStr as '24h' | '1h' | '7d' | '30d',
          },
        };
      },
      inject: [ConfigService],
    }),
    // 使用 forwardRef 解决循环依赖
    forwardRef(() => PermissionModule),
    forwardRef(() => RoleModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
