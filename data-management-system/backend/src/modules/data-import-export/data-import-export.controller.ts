/**
 * 数据导入导出控制器
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DataImportExportService, ExportFormat } from './data-import-export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('data-import-export')
@UseGuards(JwtAuthGuard)
export class DataImportExportController {
  constructor(private readonly importExportService: DataImportExportService) {}

  /**
   * 导入数据
   */
  @Post('import/:tableId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 限制10MB
      },
    }),
  )
  async importData(
    @Param('tableId') tableId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('format') format: string,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    // 根据文件扩展名推断格式
    let importFormat = format;
    if (!importFormat) {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      importFormat = ext || 'csv';
    }

    return this.importExportService.importData(
      tableId,
      file,
      importFormat,
      req.user?.userId,
      req.user?.username,
      req.ip,
    );
  }

  /**
   * 导出数据
   */
  @Get('export/:tableId')
  async exportData(
    @Param('tableId') tableId: string,
    @Query('format') format: ExportFormat,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const result = await this.importExportService.exportData(
      tableId,
      format || 'xlsx',
      req.user?.userId,
      req.user?.username,
      req.ip,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename)}"`,
    );
    res.send(result.data);
  }

  /**
   * 下载导入模板
   */
  @Get('template/:tableId')
  async downloadTemplate(
    @Param('tableId') tableId: string,
    @Query('format') format: ExportFormat,
    @Res() res: Response,
  ) {
    // 导出空数据作为模板
    const result = await this.importExportService.exportData(
      tableId,
      format || 'xlsx',
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="template_${result.filename}"`,
    );
    res.send(result.data);
  }
}
