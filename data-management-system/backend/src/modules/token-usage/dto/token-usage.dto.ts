/**
 * Token统计相关DTO
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

// 查询统计DTO
export class QueryTokenUsageDto {
  @IsString()
  @IsOptional()
  modelId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}

// 创建定价配置DTO
export class CreatePricingDto {
  @IsString()
  modelId: string;

  @IsNumber()
  inputPrice: number;

  @IsNumber()
  outputPrice: number;

  @IsString()
  @IsOptional()
  currency?: string = 'CNY';

  @IsString()
  @IsOptional()
  effectiveDate?: string;
}

// 更新定价配置DTO
export class UpdatePricingDto {
  @IsNumber()
  @IsOptional()
  inputPrice?: number;

  @IsNumber()
  @IsOptional()
  outputPrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;
}
