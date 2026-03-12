/**
 * AI对话服务
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AIModelConfig, AIChatHistory, TokenUsage } from '@/database/entities';
import { AIModelService } from './ai-model.service';
import { SendMessageDto, GetChatHistoryDto } from './dto';

@Injectable()
export class AIChatService {
  constructor(
    @InjectRepository(AIChatHistory)
    private chatRepository: Repository<AIChatHistory>,
    @InjectRepository(TokenUsage)
    private tokenUsageRepository: Repository<TokenUsage>,
    private modelService: AIModelService,
  ) {}

  /**
   * 发送消息并获取AI回复
   */
  async sendMessage(dto: SendMessageDto): Promise<{ reply: string; sessionId: string; tokens: { input: number; output: number } }> {
    // 获取使用的模型
    let model: AIModelConfig;
    if (dto.modelId) {
      model = await this.modelService.findById(dto.modelId);
    } else {
      model = await this.modelService.findDefault();
      if (!model) {
        throw new NotFoundException('没有可用的AI模型，请先配置模型');
      }
    }

    // 生成或使用现有会话ID
    const sessionId = dto.sessionId || uuidv4();

    // 保存用户消息
    const userMessage = this.chatRepository.create({
      chatId: uuidv4(),
      modelId: model.modelId,
      sessionId,
      role: 'user',
      content: dto.content,
    });
    await this.chatRepository.save(userMessage);

    // 获取历史消息作为上下文
    const history = await this.getRecentMessages(sessionId, 10);

    // 调用AI模型获取回复
    const { reply, inputTokens, outputTokens } = await this.callAIModel(model, dto.content, history);

    // 保存AI回复
    const assistantMessage = this.chatRepository.create({
      chatId: uuidv4(),
      modelId: model.modelId,
      sessionId,
      role: 'assistant',
      content: reply,
    });
    await this.chatRepository.save(assistantMessage);

    // 记录Token消耗
    await this.recordTokenUsage(model.modelId, sessionId, inputTokens, outputTokens);

    return {
      reply,
      sessionId,
      tokens: { input: inputTokens, output: outputTokens },
    };
  }

  /**
   * 获取对话历史
   */
  async getChatHistory(dto: GetChatHistoryDto) {
    const query = this.chatRepository.createQueryBuilder('chat');

    if (dto.sessionId) {
      query.where('chat.sessionId = :sessionId', { sessionId: dto.sessionId });
    }

    query.orderBy('chat.createdAt', 'ASC');

    const total = await query.getCount();
    const list = await query.getMany();

    return { list, total };
  }

  /**
   * 获取会话列表
   */
  async getSessionList() {
    const sessions = await this.chatRepository
      .createQueryBuilder('chat')
      .select('chat.sessionId', 'sessionId')
      .addSelect('MIN(chat.createdAt)', 'createdAt')
      .addSelect('MIN(CASE WHEN chat.role = :userRole THEN chat.content END)', 'firstMessage')
      .setParameters({ userRole: 'user' })
      .groupBy('chat.sessionId')
      .orderBy('MIN(chat.createdAt)', 'DESC')
      .getRawMany();

    return sessions;
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.chatRepository.delete({ sessionId });
  }

  /**
   * 获取最近的消息
   */
  private async getRecentMessages(sessionId: string, limit: number): Promise<{ role: string; content: string }[]> {
    const messages = await this.chatRepository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return messages.reverse().map((m) => ({ role: m.role, content: m.content }));
  }

  /**
   * 调用AI模型
   */
  private async callAIModel(
    model: AIModelConfig,
    message: string,
    history: { role: string; content: string }[],
  ): Promise<{ reply: string; inputTokens: number; outputTokens: number }> {
    // TODO: 使用 LangChain 调用不同类型的模型
    // 这里简化处理，模拟AI回复
    
    // 构建消息历史
    const messages = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    // 模拟AI调用（实际应该调用 LangChain）
    const reply = `这是一个模拟的AI回复。您说: "${message}"\n\n请配置有效的API密钥以使用真实的AI对话功能。`;
    
    // 估算Token数量（实际应该从API响应获取）
    const inputTokens = Math.ceil(JSON.stringify(messages).length / 4);
    const outputTokens = Math.ceil(reply.length / 4);

    return { reply, inputTokens, outputTokens };
  }

  /**
   * 记录Token消耗
   */
  private async recordTokenUsage(
    modelId: string,
    sessionId: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<void> {
    const totalTokens = inputTokens + outputTokens;
    
    // TODO: 根据模型定价计算费用
    const estimatedCost = 0;

    const usage = this.tokenUsageRepository.create({
      usageId: uuidv4(),
      modelId,
      sessionId,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
    });

    await this.tokenUsageRepository.save(usage);
  }
}
