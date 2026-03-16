/**
 * 文件上传服务
 * 创建者：dzh
 * 创建时间：2026-03-16
 * 更新时间：2026-03-16
 */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class UploadService {
  // 静态资源根目录（与 main.ts 中 useStaticAssets 配置一致）
  // main.ts 在 src/ 目录，静态资源目录为 src/resource（开发）或 dist/resource（生产）
  // upload.service.ts 在 src/modules/upload/ 目录，需要向上两层到达 src/
  private readonly resourceDir = path.join(__dirname, '..', '..', 'resource');
  // 头像保存目录
  private readonly avatarDir = path.join(this.resourceDir, 'avatar');
  // 通用文件保存目录
  private readonly fileDir = path.join(this.resourceDir, 'files');
  // 静态资源访问前缀
  private readonly staticPrefix = '/static';

  constructor() {
    // 确保目录存在
    this.ensureDirectoryExists(this.avatarDir);
    this.ensureDirectoryExists(this.fileDir);
  }

  /**
   * 确保目录存在
   */
  private ensureDirectoryExists(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 生成文件名：日期 + UUID
   * 格式：2026-03-16_abc123def456.jpg
   */
  private generateFilename(originalName: string): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // 2026-03-16
    const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 12); // 12位UUID
    const ext = path.extname(originalName); // .jpg
    return `${dateStr}_${uuid}${ext}`;
  }

  /**
   * 保存头像
   */
  async saveAvatar(file: Express.Multer.File): Promise<string> {
    try {
      const filename = this.generateFilename(file.originalname);
      const filepath = path.join(this.avatarDir, filename);

      // 写入文件
      await fs.promises.writeFile(filepath, file.buffer);

      // 返回访问URL
      return `${this.staticPrefix}/avatar/${filename}`;
    } catch (error) {
      console.error('保存头像失败:', error);
      throw new InternalServerErrorException('保存文件失败');
    }
  }

  /**
   * 保存通用文件
   */
  async saveFile(file: Express.Multer.File): Promise<string> {
    try {
      const filename = this.generateFilename(file.originalname);
      const filepath = path.join(this.fileDir, filename);

      // 写入文件
      await fs.promises.writeFile(filepath, file.buffer);

      // 返回访问URL
      return `${this.staticPrefix}/files/${filename}`;
    } catch (error) {
      console.error('保存文件失败:', error);
      throw new InternalServerErrorException('保存文件失败');
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // 从URL中提取文件路径
      // /static/avatar/2026-03-16_abc123.jpg -> src/resource/avatar/2026-03-16_abc123.jpg
      const relativePath = fileUrl.replace(this.staticPrefix, 'src/resource');
      const filepath = path.join(process.cwd(), relativePath);

      if (fs.existsSync(filepath)) {
        await fs.promises.unlink(filepath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除文件失败:', error);
      return false;
    }
  }
}
