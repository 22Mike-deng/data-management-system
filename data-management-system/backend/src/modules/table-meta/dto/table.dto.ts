/**
 * 数据表相关DTO
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsBoolean, IsEnum, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

// 字段类型枚举
export enum FieldTypeEnum {
  TEXT = 'text',
  VARCHAR = 'varchar',
  INT = 'int',
  BIGINT = 'bigint',
  FLOAT = 'float',
  DOUBLE = 'double',
  DECIMAL = 'decimal',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  RICHTEXT = 'richtext',
  IMAGE = 'image',
  FILE = 'file',
  RELATION = 'relation',
  JSON = 'json',
}

// 选项配置
export class FieldOptionDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsNotEmpty()
  value: string | number;
}

// 创建字段DTO
export class CreateFieldDto {
  @IsString()
  @IsNotEmpty({ message: '字段名称不能为空' })
  @MaxLength(100)
  fieldName: string;

  @IsString()
  @IsNotEmpty({ message: '显示名称不能为空' })
  @MaxLength(100)
  displayName: string;

  @IsEnum(FieldTypeEnum, { message: '字段类型不合法' })
  fieldType: FieldTypeEnum;

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsString()
  @IsOptional()
  defaultValue?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  @IsOptional()
  options?: FieldOptionDto[];

  @IsString()
  @IsOptional()
  relationTable?: string;

  @IsString()
  @IsOptional()
  relationTableId?: string;

  // 新增字段属性
  @IsNumber()
  @IsOptional()
  length?: number;

  @IsNumber()
  @IsOptional()
  decimalPlaces?: number;

  @IsBoolean()
  @IsOptional()
  isIndex?: boolean;

  @IsBoolean()
  @IsOptional()
  isUnique?: boolean;

  @IsBoolean()
  @IsOptional()
  isForeignKey?: boolean;

  @IsString()
  @IsOptional()
  foreignKeyTable?: string;

  @IsString()
  @IsOptional()
  foreignKeyField?: string;

  @IsEnum(['CASCADE', 'SET NULL', 'RESTRICT'])
  @IsOptional()
  foreignKeyOnDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';

  @IsBoolean()
  @IsOptional()
  isAutoIncrement?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

// 创建数据表DTO
export class CreateTableDto {
  @IsString()
  @IsNotEmpty({ message: '表名称不能为空' })
  @MaxLength(100)
  tableName: string;

  @IsString()
  @IsNotEmpty({ message: '显示名称不能为空' })
  @MaxLength(100)
  displayName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFieldDto)
  @IsOptional()
  fields?: CreateFieldDto[];
}

// 更新数据表DTO
export class UpdateTableDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

// 更新字段DTO
export class UpdateFieldDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @IsEnum(FieldTypeEnum)
  @IsOptional()
  fieldType?: FieldTypeEnum;

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsString()
  @IsOptional()
  defaultValue?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  @IsOptional()
  options?: FieldOptionDto[];

  @IsString()
  @IsOptional()
  relationTable?: string;

  @IsString()
  @IsOptional()
  relationTableId?: string;

  // 新增字段属性
  @IsNumber()
  @IsOptional()
  length?: number;

  @IsNumber()
  @IsOptional()
  decimalPlaces?: number;

  @IsBoolean()
  @IsOptional()
  isIndex?: boolean;

  @IsBoolean()
  @IsOptional()
  isUnique?: boolean;

  @IsBoolean()
  @IsOptional()
  isForeignKey?: boolean;

  @IsString()
  @IsOptional()
  foreignKeyTable?: string;

  @IsString()
  @IsOptional()
  foreignKeyField?: string;

  @IsEnum(['CASCADE', 'SET NULL', 'RESTRICT'])
  @IsOptional()
  foreignKeyOnDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';

  @IsBoolean()
  @IsOptional()
  isAutoIncrement?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
