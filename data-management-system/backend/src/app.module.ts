/**
* NestJS 根模块
* 创建者：dzh
* 创建时间：2026-03-11
* 更新时间：2026-03-14
*/
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TableMetaModule } from './modules/table-meta';
import { DynamicDataModule } from './modules/dynamic-data';
import { AIModelModule } from './modules/ai-model';
import { TokenUsageModule } from './modules/token-usage';
import { ViewConfigModule } from './modules/view-config';
import { KnowledgeBaseModule } from './modules/knowledge-base';
import { RedisCacheModule } from './modules/redis-cache';
import { AuthModule } from './modules/auth';
import { UserModule } from './modules/user';
import { MailModule } from './modules/mail';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // 【安全修复】全局速率限制配置
    // 默认：每分钟最多60次请求
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,    // 1秒
        limit: 3,     // 最多3次请求
      },
      {
        name: 'medium',
        ttl: 10000,   // 10秒
        limit: 20,    // 最多20次请求
      },
      {
        name: 'long',
        ttl: 60000,   // 1分钟
        limit: 60,    // 最多60次请求
      },
    ]),
    
    // 邮件服务模块
    MailModule,
    
    // Redis缓存模块
    RedisCacheModule,
    
    // 数据库连接
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get('DB_USERNAME', 'root'),
        password: configService.get('DB_PASSWORD', '123456'),
        database: configService.get('DB_DATABASE', 'data_management'),
        entities: [__dirname + '/database/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        // 开发环境：只输出错误和警告；生产环境：关闭所有日志
        logging: configService.get('NODE_ENV') === 'production' ? false : ['error'],
      }),
      inject: [ConfigService],
    }),
    
    // 业务模块
    AuthModule,
    UserModule,
    TableMetaModule,
    DynamicDataModule,
    AIModelModule,
    TokenUsageModule,
    ViewConfigModule,
    KnowledgeBaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 【安全修复】全局启用速率限制守卫
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
