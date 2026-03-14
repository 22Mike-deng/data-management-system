/**
 * Redis缓存模块
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { Module, Global } from '@nestjs/common';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get('REDIS_PASSWORD', '');
        const redisDb = configService.get<number>('REDIS_DB', 0);
        const ttl = configService.get<number>('CACHE_TTL', 3600);

        const store = await redisStore({
          host: redisHost,
          port: redisPort,
          password: redisPassword || undefined,
          db: redisDb,
          ttl: ttl * 1000, // 转换为毫秒
          // 连接超时和重试配置
          connectTimeout: 5000, // 5秒连接超时
          maxRetriesPerRequest: 3, // 每个请求最大重试次数
          retryStrategy: (times: number) => {
            if (times > 3) {
              console.warn('⚠️ Redis 连接失败，缓存功能可能无法使用');
              return null; // 超过3次放弃重试
            }
            return Math.min(times * 100, 2000); // 重试间隔，最大2秒
          },
        });

        return {
          store: store as unknown as CacheStore,
          ttl: ttl * 1000,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [RedisCacheService],
  exports: [RedisCacheService, CacheModule],
})
export class RedisCacheModule {}
