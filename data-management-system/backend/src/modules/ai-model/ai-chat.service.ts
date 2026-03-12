/**
 * AI对话服务
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-12
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AIModelConfig, AIChatHistory, TokenUsage } from '@/database/entities';
import { AIModelService } from './ai-model.service';
import { AIToolsService } from './ai-tools.service';
import { SendMessageDto, GetChatHistoryDto } from './dto';

// 系统提示词
const SYSTEM_PROMPT = `你是一个数据管理助手，可以帮助用户管理数据库中的数据。你可以使用以下工具：

1. list_tables - 列出所有数据表
2. describe_table - 查看表结构
3. query_data - 查询表数据
4. count_data - 统计数据总数
5. aggregate_data - 聚合统计（求和、平均、最大、最小）
6. group_by_field - 按字段分组统计
7. search_knowledge - 搜索系统知识库

当用户询问数据库相关问题时，你应该使用这些工具来获取信息并回答。
当用户询问业务规则、操作指南、系统说明等问题时，请优先使用search_knowledge工具查询相关知识库。
回答时请用中文，并且格式化输出数据，使用Markdown表格展示数据列表。
表名不需要带data_前缀，系统会自动处理。`;

// 知识库增强的系统提示词
const SYSTEM_PROMPT_WITH_KNOWLEDGE = `你是一个数据管理助手，可以帮助用户管理数据库中的数据。你还可以查询系统知识库来回答用户问题。你可以使用以下工具：

1. list_tables - 列出所有数据表
2. describe_table - 查看表结构
3. query_data - 查询表数据
4. count_data - 统计数据总数
5. aggregate_data - 聚合统计（求和、平均、最大、最小）
6. group_by_field - 按字段分组统计
7. search_knowledge - 搜索系统知识库（重要：此工具已开启，请在回答问题时优先查询知识库）

当用户询问任何问题时，请优先使用search_knowledge工具查询相关知识库，然后再根据查询结果回答。
如果知识库中没有相关信息，再使用数据库工具或你的通用知识回答。
回答时请用中文，并且格式化输出数据，使用Markdown表格展示数据列表。`;

@Injectable()
export class AIChatService {
  constructor(
    @InjectRepository(AIChatHistory)
    private chatRepository: Repository<AIChatHistory>,
    @InjectRepository(TokenUsage)
    private tokenUsageRepository: Repository<TokenUsage>,
    private modelService: AIModelService,
    private toolsService: AIToolsService,
  ) {}

  /**
   * 发送消息并获取AI回复
   */
  async sendMessage(dto: SendMessageDto): Promise<{ reply: string; sessionId: string; tokens: { input: number; output: number }; toolCalls?: any[] }> {
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

    // 获取历史消息作为上下文（根据模型配置的上下文长度，默认20条）
    const contextLength = model.parameters?.contextLength || 20;
    const history = await this.getRecentMessages(sessionId, contextLength);

    // 根据是否开启知识库选择不同的系统提示词
    const systemPrompt = dto.useKnowledgeBase ? SYSTEM_PROMPT_WITH_KNOWLEDGE : SYSTEM_PROMPT;

    // 调用AI模型获取回复（支持工具调用）
    const { reply, inputTokens, outputTokens, toolCalls } = await this.callAIModelWithTools(model, dto.content, history, systemPrompt, dto.useKnowledgeBase);

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
      toolCalls,
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
      .addSelect('MAX(chat.createdAt)', 'updatedAt')
      .setParameters({ userRole: 'user' })
      .groupBy('chat.sessionId')
      .orderBy('MAX(chat.createdAt)', 'DESC')
      .getRawMany();

    // 为每个会话获取模型名称
    for (const session of sessions) {
      // 获取该会话的一条记录来获取模型信息
      const chatRecord = await this.chatRepository.findOne({
        where: { sessionId: session.sessionId },
        select: ['modelId'],
      });
      if (chatRecord?.modelId) {
        try {
          const model = await this.modelService.findById(chatRecord.modelId);
          session.modelName = model.modelName;
        } catch {
          session.modelName = '未知模型';
        }
      }
      // 使用 firstMessage 作为显示内容
      session.lastMessage = session.firstMessage;
    }

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
   * 调用AI模型（支持工具调用）
   */
  private async callAIModelWithTools(
    model: AIModelConfig,
    message: string,
    history: { role: string; content: string }[],
    systemPrompt: string = SYSTEM_PROMPT,
    useKnowledgeBase: boolean = false,
  ): Promise<{ reply: string; inputTokens: number; outputTokens: number; toolCalls?: any[] }> {
    // 构建消息历史
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    // 根据是否开启知识库获取工具定义
    const tools = this.toolsService.getToolDefinitions(useKnowledgeBase);
    const allToolCalls: any[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    try {
      // 根据模型类型调用不同的API
      switch (model.modelType) {
        case 'openai':
        case 'qwen':
        case 'zhipu':
        case 'custom':
          return await this.callOpenAIWithTools(model, messages, tools);
        case 'claude':
          return await this.callClaudeWithTools(model, messages, tools, systemPrompt);
        case 'wenxin':
          throw new Error('文心一言暂不支持工具调用，请使用其他模型');
        default:
          return await this.callOpenAIWithTools(model, messages, tools);
      }
    } catch (error: any) {
      console.error('AI调用失败:', error);
      throw new Error(`AI调用失败: ${error.message}`);
    }
  }

  /**
   * 调用 OpenAI 兼容 API（支持工具调用）
   */
  private async callOpenAIWithTools(
    model: AIModelConfig,
    messages: any[],
    tools: any[],
  ): Promise<{ reply: string; inputTokens: number; outputTokens: number; toolCalls?: any[] }> {
    const parameters = model.parameters || {};
    // 根据模型类型限制 maxTokens，默认8192
    let maxTokens = parameters.maxTokens ?? 8192;
    
    // 不同模型的 max_tokens 实际上限（API硬限制）
    // custom 类型不做限制，由 API 服务端自行处理
    const modelMaxLimits: Record<string, number> = {
      'zhipu': 32768,      // 智谱 API 限制 max_tokens <= 32768
      'qwen': 32000,       // 通义千问
      'wenxin': 8000,      // 文心一言
      'openai': 128000,    // OpenAI GPT-4-turbo/4o 支持 128K
      'claude': 128000,    // Claude 3 支持高输出
    };
    
    const limit = modelMaxLimits[model.modelType];
    // 只有已知类型才做限制，custom 类型不做限制，由 API 自己处理
    if (limit && maxTokens > limit) {
      maxTokens = limit;
    }
    
    const allToolCalls: any[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // 最多允许3轮工具调用
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`${model.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`,
        },
        body: JSON.stringify({
          model: model.modelIdentifier,
          messages,
          temperature: parameters.temperature ?? 0.7,
          max_tokens: maxTokens,
          top_p: parameters.topP ?? 1,
          tools,
          tool_choice: 'auto',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
      }

      const data = await response.json();
      totalInputTokens += data.usage?.prompt_tokens || 0;
      totalOutputTokens += data.usage?.completion_tokens || 0;

      const choice = data.choices?.[0];
      const assistantMessage = choice?.message;

      // 检查是否有工具调用
      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        // 添加助手消息到历史
        messages.push({
          role: 'assistant',
          content: assistantMessage.content || '',
          tool_calls: assistantMessage.tool_calls,
        });

        // 执行每个工具调用
        for (const toolCall of assistantMessage.tool_calls) {
          const result = await this.toolsService.executeToolCall(toolCall);
          allToolCalls.push(result);

          // 添加工具结果到消息历史
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result.result),
          });
        }
      } else {
        // 没有工具调用，返回最终回复
        return {
          reply: assistantMessage?.content || '抱歉，没有获取到回复',
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        };
      }
    }

    // 超过最大轮数，返回当前状态
    return {
      reply: '工具调用次数已达上限，请尝试简化您的问题。',
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      toolCalls: allToolCalls,
    };
  }

  /**
   * 调用 Claude API（支持工具调用）
   */
  private async callClaudeWithTools(
    model: AIModelConfig,
    messages: any[],
    tools: any[],
    systemPrompt: string = SYSTEM_PROMPT,
  ): Promise<{ reply: string; inputTokens: number; outputTokens: number; toolCalls?: any[] }> {
    const parameters = model.parameters || {};
    const allToolCalls: any[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // 转换工具定义为Claude格式
    const claudeTools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));

    // 转换消息格式
    const claudeMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => {
        if (m.role === 'tool') {
          return {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: m.tool_call_id,
              content: m.content,
            }],
          };
        }
        return {
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        };
      });

    // 最多允许3轮工具调用
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`${model.apiEndpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': model.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model.modelIdentifier,
          system: SYSTEM_PROMPT,
          messages: claudeMessages,
          max_tokens: parameters.maxTokens ?? 2000,
          temperature: parameters.temperature ?? 0.7,
          tools: claudeTools,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
      }

      const data = await response.json();
      totalInputTokens += data.usage?.input_tokens || 0;
      totalOutputTokens += data.usage?.output_tokens || 0;

      // 检查是否有工具调用
      const toolUseBlocks = data.content?.filter((c: any) => c.type === 'tool_use') || [];
      const textBlock = data.content?.find((c: any) => c.type === 'text');

      if (toolUseBlocks.length > 0) {
        // 执行工具调用
        for (const toolBlock of toolUseBlocks) {
          const toolCall = {
            id: toolBlock.id,
            function: {
              name: toolBlock.name,
              arguments: JSON.stringify(toolBlock.input),
            },
          };
          const result = await this.toolsService.executeToolCall(toolCall);
          allToolCalls.push(result);

          // 添加工具结果
          claudeMessages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: JSON.stringify(result.result),
            }],
          });
        }
      } else {
        // 返回最终回复
        return {
          reply: textBlock?.text || '抱歉，没有获取到回复',
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        };
      }
    }

    return {
      reply: '工具调用次数已达上限，请尝试简化您的问题。',
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      toolCalls: allToolCalls,
    };
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
    
    const usage = this.tokenUsageRepository.create({
      usageId: uuidv4(),
      modelId,
      sessionId,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost: 0,
    });

    await this.tokenUsageRepository.save(usage);
  }
}
