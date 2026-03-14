/**
 * 邮件发送服务
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

/**
 * 邮件发送选项
 */
export interface SendMailOptions {
  to: string | string[];      // 收件人
  subject: string;            // 邮件主题
  text?: string;              // 纯文本内容
  html?: string;              // HTML内容
  attachments?: Array<{       // 附件
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * 邮件发送结果
 */
export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private fromName: string;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    this.fromName = this.configService.get<string>('SMTP_FROM_NAME') || '数据管理系统';
    this.fromEmail = this.configService.get<string>('SMTP_USER') || '';
    this.initTransporter();
  }

  /**
   * 初始化邮件传输器
   */
  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    // 检查配置是否完整
    if (!host || !port || !user || !pass) {
      this.logger.warn('⚠️ 邮件服务配置不完整，邮件发送功能将不可用');
      this.logger.warn('请在 .env 文件中配置 SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
      this.logger.warn(`当前配置: host=${host}, port=${port}, user=${user}, pass=${pass ? '已设置' : '未设置'}`);
      return;
    }

    this.logger.log(`📧 正在配置邮件服务: ${host}:${port}, secure=${secure}, user=${user}`);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // 163邮箱使用465端口时需要设置为true
      auth: {
        user,
        pass,
      },
      // 连接超时设置
      connectionTimeout: 10000,
      socketTimeout: 10000,
      // 调试模式（开发环境）
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    });

    this.logger.log('✅ 邮件传输器创建成功');
  }

  /**
   * 验证邮件服务是否可用
   */
  async verify(): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error('❌ 邮件服务未配置');
      return false;
    }

    try {
      const result = await this.transporter.verify();
      this.logger.log('✅ 邮件服务连接验证成功');
      return result;
    } catch (error: any) {
      this.logger.error(`❌ 邮件服务连接验证失败: ${error.message}`);
      this.logger.error(`错误详情: ${JSON.stringify(error)}`);
      return false;
    }
  }

  /**
   * 发送邮件
   * @param options 邮件选项
   * @returns 发送结果
   */
  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    if (!this.transporter) {
      this.logger.error('❌ 邮件服务未配置，无法发送邮件');
      return {
        success: false,
        error: '邮件服务未配置',
      };
    }

    const { to, subject, text, html, attachments } = options;
    const toList = Array.isArray(to) ? to.join(', ') : to;

    try {
      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: toList,
        subject,
        text,
        html,
        attachments,
      });

      this.logger.log(`✅ 邮件发送成功: ${toList} - ${subject}`);
      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      this.logger.error(`❌ 邮件发送失败: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 发送验证码邮件
   * @param to 收件人邮箱
   * @param code 验证码
   * @param expireMinutes 过期时间（分钟）
   */
  async sendVerificationCode(to: string, code: string, expireMinutes: number = 10): Promise<SendMailResult> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0;">数据管理系统</h2>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
          <p style="font-size: 16px; color: #333;">您好！</p>
          <p style="font-size: 16px; color: #333;">您的验证码是：</p>
          <div style="background: #fff; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #666;">验证码将在 ${expireMinutes} 分钟后失效，请尽快使用。</p>
          <p style="font-size: 14px; color: #999; margin-top: 30px;">如果这不是您的操作，请忽略此邮件。</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          此邮件由系统自动发送，请勿回复
        </div>
      </div>
    `;

    return this.sendMail({
      to,
      subject: '【数据管理系统】验证码',
      html,
    });
  }

  /**
   * 发送密码重置邮件
   * @param to 收件人邮箱
   * @param resetLink 重置链接
   * @param expireMinutes 过期时间（分钟）
   */
  async sendPasswordReset(to: string, resetLink: string, expireMinutes: number = 30): Promise<SendMailResult> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0;">数据管理系统 - 密码重置</h2>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
          <p style="font-size: 16px; color: #333;">您好！</p>
          <p style="font-size: 16px; color: #333;">我们收到了重置您账户密码的请求。请点击下方按钮重置密码：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">重置密码</a>
          </div>
          <p style="font-size: 14px; color: #666;">链接将在 ${expireMinutes} 分钟后失效。</p>
          <p style="font-size: 14px; color: #999; margin-top: 20px;">如果按钮无法点击，请复制以下链接到浏览器：<br><a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a></p>
          <p style="font-size: 14px; color: #999; margin-top: 30px;">如果这不是您的操作，请忽略此邮件，您的密码不会被更改。</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          此邮件由系统自动发送，请勿回复
        </div>
      </div>
    `;

    return this.sendMail({
      to,
      subject: '【数据管理系统】密码重置',
      html,
    });
  }

  /**
   * 发送新用户欢迎邮件
   * @param to 收件人邮箱
   * @param username 用户名
   * @param password 初始密码
   */
  async sendWelcomeEmail(to: string, username: string, password: string): Promise<SendMailResult> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0;">欢迎使用数据管理系统</h2>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
          <p style="font-size: 16px; color: #333;">您好，${username}！</p>
          <p style="font-size: 16px; color: #333;">您的账户已创建成功，以下是您的登录信息：</p>
          <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 10px 0; font-size: 14px; color: #666;">用户名：<strong style="color: #333;">${username}</strong></p>
            <p style="margin: 10px 0; font-size: 14px; color: #666;">初始密码：<strong style="color: #333;">${password}</strong></p>
          </div>
          <p style="font-size: 14px; color: #e74c3c; font-weight: bold;">⚠️ 请在首次登录后立即修改密码！</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          此邮件由系统自动发送，请勿回复
        </div>
      </div>
    `;

    return this.sendMail({
      to,
      subject: '【数据管理系统】账户创建成功',
      html,
    });
  }

  /**
   * 发送系统通知邮件
   * @param to 收件人邮箱
   * @param title 通知标题
   * @param content 通知内容
   */
  async sendNotification(to: string, title: string, content: string): Promise<SendMailResult> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0;">数据管理系统 - 系统通知</h2>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
          <h3 style="color: #333; margin-top: 0;">${title}</h3>
          <div style="font-size: 16px; color: #333; line-height: 1.6;">${content}</div>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          此邮件由系统自动发送，请勿回复
        </div>
      </div>
    `;

    return this.sendMail({
      to,
      subject: `【数据管理系统】${title}`,
      html,
    });
  }
}
