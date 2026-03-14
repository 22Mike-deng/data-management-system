/**
 * 认证服务
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-14
 */
import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { SysUser } from '../../database/entities/sys-user.entity';
import { validatePassword } from '../../common/utils/password.util';
import { RedisCacheService } from '../redis-cache';

// Token 黑名单缓存键前缀
const TOKEN_BLACKLIST_PREFIX = 'token_blacklist';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(SysUser)
    private userRepository: Repository<SysUser>,
    private jwtService: JwtService,
    private cacheService: RedisCacheService,
  ) {}

  /**
   * 用户登录验证
   * @param username 用户名
   * @param password 密码
   * @param ip 登录IP
   * @returns JWT令牌和用户信息
   */
  async login(
    username: string,
    password: string,
    ip: string,
  ): Promise<{ token: string; user: Partial<SysUser> }> {
    // 查找用户
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查用户状态
    if (user.status !== 0) {
      throw new UnauthorizedException('账号已被禁用');
    }

    // 更新最后登录信息
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    });

    // 生成JWT令牌
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };
    const token = this.jwtService.sign(payload);

    // 返回用户信息（不包含密码）
    const { password: _, ...userInfo } = user;
    return {
      token,
      user: userInfo,
    };
  }

  /**
   * 验证JWT令牌
   * @param payload JWT载荷
   * @returns 用户信息
   */
  async validateUser(payload: {
    sub: string;
    username: string;
  }): Promise<SysUser | null> {
    return this.userRepository.findOne({
      where: { id: payload.sub, status: 0 },
    });
  }

  /**
   * 用户登出
   * 将 Token 加入黑名单，实现安全退出
   * @param token JWT令牌
   */
  async logout(token: string): Promise<void> {
    try {
      // 解析 Token 获取过期时间
      const decoded = this.jwtService.decode(token) as { exp?: number };
      if (decoded?.exp) {
        // 计算剩余有效时间（秒）
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.exp - now;
        
        if (ttl > 0) {
          // 将 Token 加入黑名单，过期时间与 Token 剩余有效期一致
          const cacheKey = RedisCacheService.buildKey(TOKEN_BLACKLIST_PREFIX, token);
          await this.cacheService.set(cacheKey, '1', ttl);
        }
      }
    } catch {
      // Token 解析失败，忽略
    }
  }

  /**
   * 检查 Token 是否在黑名单中
   * @param token JWT令牌
   * @returns 是否在黑名单中
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const cacheKey = RedisCacheService.buildKey(TOKEN_BLACKLIST_PREFIX, token);
    const blacklisted = await this.cacheService.get(cacheKey);
    return !!blacklisted;
  }

  /**
   * 获取用户信息
   * @param userId 用户ID
   * @returns 用户信息
   */
  async getUserInfo(userId: string): Promise<Partial<SysUser>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      return null;
    }
    const { password: _, ...userInfo } = user;
    return userInfo;
  }

  /**
   * 修改密码
   * @param userId 用户ID
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('旧密码错误');
    }

    // 【安全修复】验证新密码复杂度
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestException(`密码不符合要求: ${passwordValidation.message}`);
    }

    // 检查新密码不能与旧密码相同
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('新密码不能与旧密码相同');
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await this.userRepository.update(userId, {
      password: hashedPassword,
    });
  }
}
