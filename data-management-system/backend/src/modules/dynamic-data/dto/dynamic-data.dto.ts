/**
* 动态数据相关DTO
* 创建者：dzh
* 创建时间：2026-03-11
* 更新时间：2026-03-12
*/
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Transform, plainToInstance } from 'class-transformer';

// 筛选条件项
export class FilterCondition {
  // 字段名
  @IsString()
  @IsNotEmpty()
  field: string;

  // 操作符：eq(等于), ne(不等于), gt(大于), gte(大于等于), lt(小于), lte(小于等于), like(模糊匹配), in(包含)
  @IsString()
  @IsIn(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like', 'in'])
  operator: string;

  // 值
  value: string | number | string[] | number[];
}

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

  // 筛选条件数组（JSON字符串格式传入）
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value || [];
  })
  filters?: FilterCondition[];
}

// 创建数据DTO（动态字段）- 使用 Record 类型
export class CreateDataDto {
  [key: string]: any;
}

// 更新数据DTO（动态字段）
export class UpdateDataDto {
  [key: string]: any;
}

// 批量操作DTO
export class BatchDeleteDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];
}
