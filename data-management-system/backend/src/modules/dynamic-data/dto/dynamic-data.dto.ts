/**
 * 动态数据相关DTO
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

// 查询参数DTO
export class QueryDataDto {
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

  @IsString()
  @IsOptional()
  keyword?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}

// 创建数据DTO（动态字段）
export class CreateDataDto {
  [key: string]: unknown;
}

// 更新数据DTO（动态字段）
export class UpdateDataDto {
  [key: string]: unknown;
}

// 批量操作DTO
export class BatchDeleteDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];
}
