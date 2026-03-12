/**
 * AI模型管理控制器
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { AIModelService } from './ai-model.service';
import { AIChatService } from './ai-chat.service';
import { CreateAIModelDto, UpdateAIModelDto, TestConnectionDto, SendMessageDto, GetChatHistoryDto } from './dto';

@Controller('ai')
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
   * 获取模型详情
   * GET /api/ai/models/:modelId
   */
  @Get('models/:modelId')
  async findModelById(@Param('modelId') modelId: string) {
    const model = await this.modelService.findById(modelId);
    return {
      code: 0,
      message: 'success',
      data: model,
    };
  }

  /**
   * 创建模型
   * POST /api/ai/models
   */
  @Post('models')
  async createModel(@Body() dto: CreateAIModelDto) {
    const model = await this.modelService.create(dto);
    return {
      code: 0,
      message: '创建成功',
      data: model,
    };
  }

  /**
   * 更新模型
   * PUT /api/ai/models/:modelId
   */
  @Put('models/:modelId')
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
  async setDefaultModel(@Param('modelId') modelId: string) {
    const model = await this.modelService.setDefault(modelId);
    return {
      code: 0,
      message: '已设置为默认模型',
      data: model,
    };
  }

  /**
   * 测试模型连接
   * POST /api/ai/models/test-connection
   */
  @Post('models/test-connection')
  async testConnection(@Body() dto: TestConnectionDto) {
    const result = await this.modelService.testConnection(dto);
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
  async sendMessage(@Body() dto: SendMessageDto) {
    const result = await this.chatService.sendMessage(dto);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  /**
   * 获取对话历史
   * GET /api/ai/chat/history
   */
  @Get('chat/history')
  async getChatHistory() {
    const result = await this.chatService.getChatHistory({});
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
  async getSessionList() {
    const sessions = await this.chatService.getSessionList();
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
  async deleteSession(@Param('sessionId') sessionId: string) {
    await this.chatService.deleteSession(sessionId);
    return {
      code: 0,
      message: '删除成功',
    };
  }
}
