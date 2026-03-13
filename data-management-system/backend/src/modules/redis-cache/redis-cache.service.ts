/**
 * Redis缓存服务
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值，不存在返回null
   */
  async get<T>(key: string): Promise<T | null> {
    return this.cacheManager.get<T>(key);
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），不传使用默认值
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (ttl) {
      await this.cacheManager.set(key, value, ttl * 1000);
    } else {
      await this.cacheManager.set(key, value);
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * 重置所有缓存
   */
  async reset(): Promise<void> {
    await this.cacheManager.reset();
  }

  /**
   * 批量删除缓存（按前缀）
   * 注意：cache-manager不支持直接的keys操作，这里用替代方案
   * @param pattern 键前缀模式
   */
  async delByPattern(pattern: string): Promise<void> {
    // 由于cache-manager的抽象，这里需要直接操作底层store
    // 对于Redis，可以使用SCAN命令
    const store = this.cacheManager.store as any;
    if (store.keys) {
      const keys = await store.keys(`${pattern}*`);
      if (keys && keys.length > 0) {
        await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
      }
    }
  }

  /**
   * 获取或设置缓存（如果不存在则执行回调获取数据并缓存）
   * @param key 缓存键
   * @param factory 数据获取回调
   * @param ttl 过期时间（秒）
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * 构建缓存键
   * @param parts 键的各部分
   */
  static buildKey(...parts: string[]): string {
    return parts.filter(Boolean).join(':');
  }
}
