/**
 * NestJS 主入口文件
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-16
 */
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { MailService } from './modules/mail';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 启用全局验证管道
  // 注意：whitelist: false 允许动态字段通过验证
  app.useGlobalPipes(new ValidationPipe({
    whitelist: false,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // 启用全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 配置静态资源目录
  // 开发环境使用 src/resource，生产环境使用 dist/resource
  // 由于开发时运行的是 dist/main.js，需要指向源码目录
  const resourceDir = process.env.NODE_ENV === 'production'
    ? join(__dirname, 'resource')
    : join(__dirname, '..', 'src', 'resource');
  app.useStaticAssets(resourceDir, {
    prefix: '/static/',
  });

  // 启用CORS（从环境变量读取允许的域名）
  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];
  
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 设置全局前缀
  app.setGlobalPrefix('api');

  // 先启动服务（不阻塞）
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 后端服务已启动: http://localhost:${port}`);
  console.log(`📝 CORS已启用，允许的域名: ${corsOrigins.join(', ')}`);
  console.log(`📁 静态资源目录已挂载: /static -> src/resource`);

  // 验证邮件服务（非阻塞，在后台进行）
  const mailService = app.get(MailService);
  mailService.verify().then(mailConnected => {
    if (!mailConnected) {
      console.warn('⚠️ 邮件服务连接失败，验证码功能可能无法使用');
      console.warn('请检查 .env 中的 SMTP 配置是否正确');
    } else {
      console.log('✅ 邮件服务连接成功');
    }
  });
}
bootstrap();
