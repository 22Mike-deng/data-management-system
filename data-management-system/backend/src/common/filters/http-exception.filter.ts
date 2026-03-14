/**
 * 全局HTTP异常过滤器
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 获取状态码
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 获取错误信息
    let message = '服务器内部错误';
    let errorData: any = null;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errorData = (exceptionResponse as any).error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 处理限流错误（Throttler 返回 429）
    if (status === 429) {
      message = '请求过于频繁，请稍后再试';
    }

    // 记录错误日志
    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error: ${message}`,
        exception instanceof Error ? exception.stack : '',
      );
    } else {
      this.logger.warn(`HTTP ${status} Error: ${message}`);
    }

    // 返回统一格式的错误响应
    response.status(status).json({
      code: status,
      message: message,
      data: null,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
