/**
* NestJS 根模块
* 创建者：dzh
* 创建时间：2026-03-11
* 更新时间：2026-03-13
*/
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
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
    TableMetaModule,
    DynamicDataModule,
    AIModelModule,
    TokenUsageModule,
    ViewConfigModule,
    KnowledgeBaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
