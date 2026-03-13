/**
 * AI模型相关DTO
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-13
 */
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, MaxLength, IsUrl, IsDateString } from 'class-validator';

// 模型类型枚举
export enum ModelTypeEnum {
  OPENAI = 'openai',
  QWEN = 'qwen',
  WENXIN = 'wenxin',
  SPARK = 'spark',
  ZHIPU = 'zhipu',
  CUSTOM = 'custom',
}

// 模型参数DTO
export class ModelParametersDto {
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  maxTokens?: number;

  @IsNumber()
  @IsOptional()
  topP?: number;

  @IsNumber()
  @IsOptional()
  contextLength?: number; // 上下文记忆消息数量
}

// 创建AI模型DTO
export class CreateAIModelDto {
  @IsString()
  @IsNotEmpty({ message: '模型名称不能为空' })
  @MaxLength(100)
  modelName: string;

  @IsString()
  @IsNotEmpty()
  modelType: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'API地址格式不正确' })
  apiEndpoint: string;

  @IsString()
  @IsNotEmpty({ message: 'API密钥不能为空' })
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  modelIdentifier: string;

  @IsOptional()
  parameters?: ModelParametersDto;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

// 更新AI模型DTO
export class UpdateAIModelDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  modelName?: string;

  @IsString()
  @IsOptional()
  apiEndpoint?: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  modelIdentifier?: string;

  @IsOptional()
  parameters?: ModelParametersDto;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

// 测试连接DTO
export class TestConnectionDto {
  @IsString()
  @IsNotEmpty()
  apiEndpoint: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  modelIdentifier: string;
}

// 通过模型ID测试连接DTO
export class TestConnectionByIdDto {
  @IsString()
  @IsNotEmpty()
  modelId: string;
}

// 创建模型定价DTO
export class CreateModelPricingDto {
  @IsNumber()
  @IsNotEmpty({ message: '输入价格不能为空' })
  inputPrice: number;

  @IsNumber()
  @IsNotEmpty({ message: '输出价格不能为空' })
  outputPrice: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;
}

// 更新模型定价DTO
export class UpdateModelPricingDto {
  @IsNumber()
  @IsOptional()
  inputPrice?: number;

  @IsNumber()
  @IsOptional()
  outputPrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;
}
