/**
 * 认证服务
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { SysUser } from '../../database/entities/sys-user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(SysUser)
    private userRepository: Repository<SysUser>,
    private jwtService: JwtService,
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

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await this.userRepository.update(userId, {
      password: hashedPassword,
    });
  }
}
