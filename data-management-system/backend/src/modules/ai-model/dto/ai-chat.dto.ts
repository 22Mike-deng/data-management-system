/**
* AI对话相关DTO
* 创建者：dzh
* 创建时间：2026-03-11
* 更新时间：2026-03-12
*/
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

// 发送消息DTO
export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: '消息内容不能为空' })
  content: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  modelId?: string;
}

// 获取对话历史DTO
export class GetChatHistoryDto {
  @IsString()
  @IsOptional()
  sessionId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number = 50;
}

// 创建会话DTO
export class CreateSessionDto {
  @IsString()
  @IsOptional()
  title?: string;
}
