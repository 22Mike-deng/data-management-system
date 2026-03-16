/**
* AI模型管理控制器
* 创建者：dzh
* 创建时间：2026-03-11
* 更新时间：2026-03-16
*/
import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AIModelService } from './ai-model.service';
import { AIChatService } from './ai-chat.service';
import { CreateAIModelDto, UpdateAIModelDto, TestConnectionDto, SendMessageDto, GetChatHistoryDto, CreateModelPricingDto, UpdateModelPricingDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AIModelController {
  constructor(
    private readonly modelService: AIModelService,
    private readonly chatService: AIChatService,
  ) {}

  // ==================== 模型管理 ====================

  /**
   * 获取所有模型列表
   * GET /api/ai/models
   */
  @Get('models')
  @RequirePermission('ai:model')
  async findAllModels() {
    const models = await this.modelService.findAll();
    return {
      code: 0,
      message: 'success',
      data: models,
    };
  }

  /**
   * 获取启用的模型列表
   * GET /api/ai/models/enabled
   */
  @Get('models/enabled')
  async findEnabledModels() {
    const models = await this.modelService.findEnabled();
    return {
      code: 0,
      message: 'success',
      data: models,
    };
  }

  /**
   * 创建模型
   * POST /api/ai/models
   */
  @Post('models')
  @RequirePermission('ai:model')
  async createModel(@Body() dto: CreateAIModelDto) {
    const model = await this.modelService.create(dto);
    return {
      code: 0,
      message: '创建成功',
      data: model,
    };
  }

  /**
   * 测试模型连接（使用表单数据）
   * POST /api/ai/models/test-connection
   * 注意：此路由必须在 models/:modelId 相关路由之前定义
   */
  @Post('models/test-connection')
  @RequirePermission('ai:model')
  async testConnection(@Body() dto: TestConnectionDto) {
    const result = await this.modelService.testConnection(dto);
    return {
      code: result.success ? 0 : -1,
      message: result.message,
      data: result,
    };
  }

  /**
   * 获取模型详情
   * GET /api/ai/models/:modelId
   */
  @Get('models/:modelId')
  @RequirePermission('ai:model')
  async findModelById(@Param('modelId') modelId: string) {
    const model = await this.modelService.findById(modelId);
    return {
      code: 0,
      message: 'success',
      data: model,
    };
  }

  /**
   * 更新模型
   * PUT /api/ai/models/:modelId
   */
  @Put('models/:modelId')
  @RequirePermission('ai:model')
  async updateModel(
    @Param('modelId') modelId: string,
    @Body() dto: UpdateAIModelDto,
  ) {
    const model = await this.modelService.update(modelId, dto);
    return {
      code: 0,
      message: '更新成功',
      data: model,
    };
  }

  /**
   * 删除模型
   * DELETE /api/ai/models/:modelId
   */
  @Delete('models/:modelId')
  @RequirePermission('ai:model')
  async deleteModel(@Param('modelId') modelId: string) {
    await this.modelService.delete(modelId);
    return {
      code: 0,
      message: '删除成功',
    };
  }

  /**
   * 切换启用状态
   * POST /api/ai/models/:modelId/toggle
   */
  @Post('models/:modelId/toggle')
  @RequirePermission('ai:model')
  async toggleModel(@Param('modelId') modelId: string) {
    const model = await this.modelService.toggleEnabled(modelId);
    return {
      code: 0,
      message: '状态切换成功',
      data: model,
    };
  }

  /**
   * 设置为默认模型
   * POST /api/ai/models/:modelId/set-default
   */
  @Post('models/:modelId/set-default')
  @RequirePermission('ai:model')
  async setDefaultModel(@Param('modelId') modelId: string) {
    const model = await this.modelService.setDefault(modelId);
    return {
      code: 0,
      message: '已设置为默认模型',
      data: model,
    };
  }

  /**
   * 通过模型ID测试连接（使用已保存的配置）
   * POST /api/ai/models/:modelId/test-connection
   */
  @Post('models/:modelId/test-connection')
  @RequirePermission('ai:model')
  async testConnectionById(@Param('modelId') modelId: string) {
    const result = await this.modelService.testConnectionById(modelId);
    return {
      code: result.success ? 0 : -1,
      message: result.message,
      data: result,
    };
  }

  // ==================== AI对话 ====================

  /**
   * 发送消息
   * POST /api/ai/chat/send
   */
  @Post('chat/send')
  @RequirePermission('ai:chat')
  async sendMessage(@Body() dto: SendMessageDto, @Req() req: any) {
    // 获取当前登录用户ID
    const userId = req.user?.id;
    const result = await this.chatService.sendMessage(dto, userId);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  /**
   * 流式发送消息（SSE）
   * POST /api/ai/chat/stream
   * 返回 Server-Sent Events 流
   * 注意：@Sse 装饰器只支持 GET 请求，需要手动处理 POST 的 SSE 响应
   */
  @Post('chat/stream')
  @RequirePermission('ai:chat')
  async streamChat(
    @Body() dto: SendMessageDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // 获取当前登录用户ID
    const userId = (req as any).user?.id;

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲

    // 获取流式 Observable
    const observable = await this.chatService.streamMessage(dto, userId);

    // 订阅 Observable 并写入响应
    const subscription = observable.subscribe({
      next: (event) => {
        // SSE 格式: data: {json}\n\n
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      error: (error) => {
        // 发送错误事件
        res.write(`data: ${JSON.stringify({ type: 'error', data: { message: error.message } })}\n\n`);
        res.end();
      },
      complete: () => {
        res.end();
      },
    });

    // 处理客户端断开连接
    req.on('close', () => {
      subscription.unsubscribe();
    });
  }

  /**
   * 获取对话历史
   * GET /api/ai/chat/history
   */
  @Get('chat/history')
  @RequirePermission('ai:chat')
  async getChatHistory(@Query() dto: GetChatHistoryDto, @Req() req: any) {
    // 获取当前登录用户ID，只显示该用户的对话
    const userId = req.user?.id;
    const result = await this.chatService.getChatHistory(dto, userId);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  /**
   * 获取会话列表
   * GET /api/ai/chat/sessions
   */
  @Get('chat/sessions')
  @RequirePermission('ai:chat')
  async getSessionList(@Req() req: any) {
    // 获取当前登录用户ID，只显示该用户的会话
    const userId = req.user?.id;
    const sessions = await this.chatService.getSessionList(userId);
    return {
      code: 0,
      message: 'success',
      data: sessions,
    };
  }

  /**
   * 删除会话
   * DELETE /api/ai/chat/sessions/:sessionId
   */
  @Delete('chat/sessions/:sessionId')
  @RequirePermission('ai:chat')
  async deleteSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    // 获取当前登录用户ID，确保只能删除自己的会话
    const userId = req.user?.id;
    await this.chatService.deleteSession(sessionId, userId);
    return {
      code: 0,
      message: '删除成功',
    };
  }

  // ==================== 模型定价管理 ====================

  /**
   * 获取所有模型定价配置
   * GET /api/ai/pricing
   */
  @Get('pricing')
  @RequirePermission('ai:model')
  async getAllPricing() {
    const pricingList = await this.modelService.getAllPricing();
    return {
      code: 0,
      message: 'success',
      data: pricingList,
    };
  }

  /**
   * 获取指定模型的定价配置
   * GET /api/ai/models/:modelId/pricing
   */
  @Get('models/:modelId/pricing')
  @RequirePermission('ai:model')
  async getModelPricing(@Param('modelId') modelId: string) {
    const pricing = await this.modelService.getPricing(modelId);
    return {
      code: 0,
      message: 'success',
      data: pricing,
    };
  }

  /**
   * 设置模型定价
   * POST /api/ai/models/:modelId/pricing
   */
  @Post('models/:modelId/pricing')
  @RequirePermission('ai:model')
  async setModelPricing(
    @Param('modelId') modelId: string,
    @Body() dto: CreateModelPricingDto,
  ) {
    const pricing = await this.modelService.setPricing(modelId, dto);
    return {
      code: 0,
      message: '定价设置成功',
      data: pricing,
    };
  }

  /**
   * 更新定价配置
   * PUT /api/ai/pricing/:pricingId
   */
  @Put('pricing/:pricingId')
  @RequirePermission('ai:model')
  async updatePricing(
    @Param('pricingId') pricingId: string,
    @Body() dto: UpdateModelPricingDto,
  ) {
    const pricing = await this.modelService.updatePricing(pricingId, dto);
    return {
      code: 0,
      message: '定价更新成功',
      data: pricing,
    };
  }
}
