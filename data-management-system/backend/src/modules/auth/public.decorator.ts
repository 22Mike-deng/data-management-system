/**
 * 公开接口装饰器
 * 创建者：dzh
 * 创建时间：2026-03-13
 * 更新时间：2026-03-13
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
