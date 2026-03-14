/**
 * 用户管理服务
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { SysUser } from '../../database/entities/sys-user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(SysUser)
    private userRepository: Repository<SysUser>,
  ) {}

  /**
   * 获取用户列表
   */
  async findAll(params: {
    page?: number;
    pageSize?: number;
    username?: string;
    email?: string;
    status?: number;
  }) {
    const { page = 1, pageSize = 10, username, email, status } = params;
    const where: any = {};

    if (username) {
      where.username = Like(`%${username}%`);
    }
    if (email) {
      where.email = Like(`%${email}%`);
    }
    if (status !== undefined) {
      where.status = status;
    }

    const [list, total] = await this.userRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: ['id', 'username', 'email', 'nickname', 'avatar', 'status', 'lastLoginAt', 'lastLoginIp', 'createdBy', 'createdAt', 'updatedAt'],
    });

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取用户详情
   */
  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'nickname', 'avatar', 'status', 'lastLoginAt', 'lastLoginIp', 'createdBy', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  /**
   * 创建用户
   */
  async create(data: {
    username: string;
    password: string;
    email: string;
    nickname?: string;
    avatar?: string;
    status?: number;
  }, createdBy: string) {
    // 检查用户名是否已存在
    const existingUsername = await this.userRepository.findOne({
      where: { username: data.username },
    });
    if (existingUsername) {
      throw new BadRequestException('用户名已存在');
    }

    // 检查邮箱是否已存在
    const existingEmail = await this.userRepository.findOne({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new BadRequestException('邮箱已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = this.userRepository.create({
      ...data,
      password: hashedPassword,
      createdBy,
    });

    const savedUser = await this.userRepository.save(user);

    // 返回时排除密码
    const { password: _, ...result } = savedUser;
    return result;
  }

  /**
   * 更新用户
   */
  async update(id: string, data: {
    email?: string;
    nickname?: string;
    avatar?: string;
    status?: number;
    password?: string;
  }, updatedBy: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 如果更新邮箱，检查是否与其他用户重复
    if (data.email && data.email !== user.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: data.email },
      });
      if (existingEmail) {
        throw new BadRequestException('邮箱已被使用');
      }
    }

    // 如果更新密码，需要加密
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    await this.userRepository.update(id, {
      ...data,
      updatedBy,
    });

    return this.findOne(id);
  }

  /**
   * 删除用户
   */
  async remove(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.userRepository.delete(id);
    return { message: '删除成功' };
  }

  /**
   * 重置密码
   */
  async resetPassword(id: string, newPassword: string, updatedBy: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(id, {
      password: hashedPassword,
      updatedBy,
    });

    return { message: '密码重置成功' };
  }

  /**
   * 切换用户状态
   */
  async toggleStatus(id: string, updatedBy: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const newStatus = user.status === 0 ? 1 : 0;
    await this.userRepository.update(id, {
      status: newStatus,
      updatedBy,
    });

    return this.findOne(id);
  }
}
