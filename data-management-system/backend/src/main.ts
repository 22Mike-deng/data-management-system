/**
 * NestJS 主入口文件
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 启用全局验证管道
  // 注意：whitelist: false 允许动态字段通过验证
  app.useGlobalPipes(new ValidationPipe({
    whitelist: false,
    transform: true,
  }));
  
  // 启用CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });
  
  // 设置全局前缀
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 后端服务已启动: http://localhost:${port}`);
}
bootstrap();
