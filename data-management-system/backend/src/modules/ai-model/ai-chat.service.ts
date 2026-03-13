/**
 * AI对话服务
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-13
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Observable, Subject } from 'rxjs';
import { AIModelConfig, AIChatHistory, TokenUsage, AIModelPricing } from '@/database/entities';
import { AIModelService } from './ai-model.service';
import { AIToolsService } from './ai-tools.service';
import { SendMessageDto, GetChatHistoryDto, ThinkingType } from './dto';

// 系统提示词（不带思考标签要求，用于原生支持 thinking 的模型）
const SYSTEM_PROMPT_SIMPLE = `你是一个数据管理助手，可以帮助用户管理数据库中的数据。你可以使用以下工具：

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

// 系统提示词（带思考标签要求，用于不支持原生 thinking 的模型）
const SYSTEM_PROMPT = `你是一个数据管理助手，可以帮助用户管理数据库中的数据。你可以使用以下工具：

1. list_tables - 列出所有数据表
2. describe_table - 查看表结构
3. query_data - 查询表数据
4. count_data - 统计数据总数
5. aggregate_data - 聚合统计（求和、平均、最大、最小）
6. group_by_field - 按字段分组统计
7. search_knowledge - 搜索系统知识库

## 回复格式要求
在回答用户问题之前，请先用 <thinking> 标签展示你的思考过程，格式如下：
<thinking>
1. 分析用户问题的意图
2. 确定需要使用的工具（如果有）
3. 规划查询步骤
4. 思考如何呈现结果
</thinking>

然后给出最终回答。

## 示例
用户：查询所有用户数据
<thinking>
1. 用户想要查看用户表的数据
2. 需要先确认表名，可能是 "user" 或 "users"
3. 使用 list_tables 工具列出所有表，找到用户表
4. 然后使用 query_data 工具查询数据
</thinking>

[调用工具获取数据后，最终回答]

当用户询问数据库相关问题时，你应该使用这些工具来获取信息并回答。
当用户询问业务规则、操作指南、系统说明等问题时，请优先使用search_knowledge工具查询相关知识库。
回答时请用中文，并且格式化输出数据，使用Markdown表格展示数据列表。
表名不需要带data_前缀，系统会自动处理。`;

// 知识库增强的系统提示词（带思考标签）
const SYSTEM_PROMPT_WITH_KNOWLEDGE = `你是一个数据管理助手，可以帮助用户管理数据库中的数据。你还可以查询系统知识库来回答用户问题。你可以使用以下工具：

1. list_tables - 列出所有数据表
2. describe_table - 查看表结构
3. query_data - 查询表数据
4. count_data - 统计数据总数
5. aggregate_data - 聚合统计（求和、平均、最大、最小）
6. group_by_field - 按字段分组统计
7. search_knowledge - 搜索系统知识库（重要：此工具已开启，请在回答问题时优先查询知识库）

## 回复格式要求
在回答用户问题之前，请先用 <thinking> 标签展示你的思考过程，格式如下：
<thinking>
1. 分析用户问题的意图
2. 确定需要使用的工具（如果有）
3. 规划查询步骤
4. 思考如何呈现结果
</thinking>

然后给出最终回答。

当用户询问任何问题时，请优先使用search_knowledge工具查询相关知识库，然后再根据查询结果回答。
如果知识库中没有相关信息，再使用数据库工具或你的通用知识回答。
回答时请用中文，并且格式化输出数据，使用Markdown表格展示数据列表。`;

// 知识库增强的系统提示词（不带思考标签）
const SYSTEM_PROMPT_WITH_KNOWLEDGE_SIMPLE = `你是一个数据管理助手，可以帮助用户管理数据库中的数据。你还可以查询系统知识库来回答用户问题。你可以使用以下工具：

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
    @InjectRepository(AIModelPricing)
    private pricingRepository: Repository<AIModelPricing>,
    private modelService: AIModelService,
    private toolsService: AIToolsService,
  ) {}

  /**
   * 发送消息并获取AI回复
   */
  async sendMessage(dto: SendMessageDto): Promise<{ reply: string; thinking?: string; sessionId: string; tokens: { input: number; output: number }; toolCalls?: any[] }> {
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

    // 根据是否开启思考模式选择不同的系统提示词
    // disabled: 关闭思考，使用简单提示词
    // enabled/auto: 开启思考，使用带思考标签的提示词（同时尝试原生 thinking）
    const enableThinking = dto.thinkingType && dto.thinkingType !== 'disabled';
    let systemPrompt: string;
    if (dto.useKnowledgeBase) {
      systemPrompt = enableThinking ? SYSTEM_PROMPT_WITH_KNOWLEDGE : SYSTEM_PROMPT_WITH_KNOWLEDGE_SIMPLE;
    } else {
      systemPrompt = enableThinking ? SYSTEM_PROMPT : SYSTEM_PROMPT_SIMPLE;
    }

    // 调用AI模型获取回复（支持工具调用）
    const { reply, thinking: nativeThinking, inputTokens, outputTokens, toolCalls } = await this.callAIModelWithTools(
      model,
      dto.content,
      history,
      systemPrompt,
      dto.useKnowledgeBase,
      dto.thinkingType,
    );

    // 解析思考步骤（优先使用原生 thinking，其次解析标签）
    let thinking = nativeThinking;
    let finalContent = reply;
    if (!thinking) {
      const parsed = this.parseThinking(reply);
      thinking = parsed.thinking;
      finalContent = parsed.content;
    }

    // 保存AI回复（包含思考步骤）
    const assistantMessage = this.chatRepository.create({
      chatId: uuidv4(),
      modelId: model.modelId,
      sessionId,
      role: 'assistant',
      content: finalContent,
      thinking: thinking,
    });
    await this.chatRepository.save(assistantMessage);

    // 记录Token消耗
    await this.recordTokenUsage(model.modelId, sessionId, inputTokens, outputTokens);

    return {
      reply: finalContent,
      thinking,
      sessionId,
      tokens: { input: inputTokens, output: outputTokens },
      toolCalls,
    };
  }

  /**
   * 解析思考步骤
   * 从回复内容中提取 <thinking> 标签包裹的内容
   */
  private parseThinking(content: string): { thinking?: string; content: string } {
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/;
    const match = content.match(thinkingRegex);
    
    if (match) {
      const thinking = match[1].trim();
      // 移除 thinking 标签，保留其他内容
      const finalContent = content.replace(thinkingRegex, '').trim();
      return { thinking, content: finalContent };
    }
    
    return { content };
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
    // 返回消息时，如果存在 thinking，则拼接为完整内容发送给 AI（帮助 AI 理解上下文）
    return messages.reverse().map((m) => {
      let content = m.content;
      // 如果有思考步骤，将其包含在历史消息中（用标签标记）
      if (m.thinking) {
        content = `<thinking>\n${m.thinking}\n</thinking>\n\n${m.content}`;
      }
      return { role: m.role, content };
    });
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
    thinkingType?: ThinkingType,
  ): Promise<{ reply: string; thinking?: string; inputTokens: number; outputTokens: number; toolCalls?: any[] }> {
    // 构建消息历史
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    // 根据是否开启知识库获取工具定义
    const tools = this.toolsService.getToolDefinitions(useKnowledgeBase);

    try {
      // 根据模型类型调用不同的API
      switch (model.modelType) {
        case 'openai':
        case 'qwen':
        case 'zhipu':
        case 'custom':
          return await this.callOpenAIWithTools(model, messages, tools, thinkingType);
        case 'claude':
          return await this.callClaudeWithTools(model, messages, tools, systemPrompt);
        case 'wenxin':
          throw new Error('文心一言暂不支持工具调用，请使用其他模型');
        default:
          return await this.callOpenAIWithTools(model, messages, tools, thinkingType);
      }
    } catch (error: any) {
      console.error('AI调用失败:', error);
      throw new Error(`AI调用失败: ${error.message}`);
    }
  }

  /**
   * 调用 OpenAI 兼容 API（支持工具调用和深度思考）
   */
  private async callOpenAIWithTools(
    model: AIModelConfig,
    messages: any[],
    tools: any[],
    thinkingType?: ThinkingType,
  ): Promise<{ reply: string; thinking?: string; inputTokens: number; outputTokens: number; toolCalls?: any[] }> {
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
    let nativeThinking: string | undefined;

    // 构建请求体
    const requestBody: any = {
      model: model.modelIdentifier,
      messages,
      temperature: parameters.temperature ?? 0.7,
      max_tokens: maxTokens,
      top_p: parameters.topP ?? 1,
      tools,
      tool_choice: 'auto',
    };

    // 添加 thinking 参数（用于豆包等支持原生深度思考的模型）
    // 只有 enabled 或 auto 时才发送 thinking 参数
    if (thinkingType && thinkingType !== 'disabled') {
      requestBody.thinking = { type: thinkingType };
    }

    // 最多允许3轮工具调用
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`${model.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`,
        },
        body: JSON.stringify(requestBody),
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

      // 提取原生 thinking 内容（豆包等模型返回格式）
      // reasoning_content 是豆包模型返回思考内容的字段
      if (assistantMessage?.reasoning_content && !nativeThinking) {
        nativeThinking = assistantMessage.reasoning_content;
      }

      // 检查是否有工具调用
      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        // 添加助手消息到历史
        messages.push({
          role: 'assistant',
          content: assistantMessage.content || '',
          tool_calls: assistantMessage.tool_calls,
          reasoning_content: assistantMessage.reasoning_content,
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
          thinking: nativeThinking,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        };
      }
    }

    // 超过最大轮数，返回当前状态
    return {
      reply: '工具调用次数已达上限，请尝试简化您的问题。',
      thinking: nativeThinking,
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
  /**
   * 记录 Token 使用情况
   * 根据模型定价配置计算实际费用
   */
  private async recordTokenUsage(
    modelId: string,
    sessionId: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<void> {
    const totalTokens = inputTokens + outputTokens;

    // 查询模型定价配置（取最新的有效配置）
    const pricing = await this.pricingRepository.findOne({
      where: { modelId },
      order: { effectiveDate: 'DESC' },
    });

    // 计算费用（元）
    let estimatedCost = 0;
    if (pricing) {
      // 输入费用 = (输入 tokens / 1000) * 输入单价
      const inputCost = (inputTokens / 1000) * pricing.inputPrice;
      // 输出费用 = (输出 tokens / 1000) * 输出单价
      const outputCost = (outputTokens / 1000) * pricing.outputPrice;
      estimatedCost = inputCost + outputCost;
    }

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

  // ==================== 流式响应方法 ====================

  /**
   * 流式发送消息（SSE）
   * 返回 Observable 用于 NestJS @Sse() 装饰器
   */
  async streamMessage(dto: SendMessageDto): Promise<Observable<MessageEvent>> {
    const subject = new Subject<MessageEvent>();

    // 异步处理流式响应
    this.processStreamMessage(dto, subject).catch((error) => {
      subject.next({
        type: 'error',
        data: JSON.stringify({ message: error.message || '流式响应失败' }),
      } as MessageEvent);
      subject.complete();
    });

    return subject.asObservable();
  }

  /**
   * 处理流式消息的核心逻辑
   */
  private async processStreamMessage(
    dto: SendMessageDto,
    subject: Subject<MessageEvent>,
  ): Promise<void> {
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

    // 发送会话ID事件
    subject.next({
      type: 'session',
      data: JSON.stringify({ sessionId }),
    } as MessageEvent);

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
    const contextLength = model.parameters?.contextLength || 20;
    const history = await this.getRecentMessages(sessionId, contextLength);

    // 选择系统提示词
    // disabled: 关闭思考，使用简单提示词
    // enabled/auto: 开启思考，使用带思考标签的提示词
    const enableThinking = dto.thinkingType && dto.thinkingType !== 'disabled';
    let systemPrompt: string;
    if (dto.useKnowledgeBase) {
      systemPrompt = enableThinking ? SYSTEM_PROMPT_WITH_KNOWLEDGE : SYSTEM_PROMPT_WITH_KNOWLEDGE_SIMPLE;
    } else {
      systemPrompt = enableThinking ? SYSTEM_PROMPT : SYSTEM_PROMPT_SIMPLE;
    }

    // 构建消息
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: dto.content },
    ];

    // 获取工具定义
    const tools = this.toolsService.getToolDefinitions(dto.useKnowledgeBase);

    // 收集完整响应用于保存
    let fullThinking = '';
    let fullContent = '';
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const allToolCalls: any[] = [];

    // 流式调用（最多3轮工具调用）
    for (let round = 0; round < 3; round++) {
      const result = await this.streamOpenAIRequest(
        model,
        messages,
        tools,
        dto.thinkingType,
        subject,
        (thinking, content, inputTokens, outputTokens) => {
          fullThinking += thinking;
          fullContent += content;
          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;
        },
      );

      // 检查是否有工具调用
      if (result.toolCalls && result.toolCalls.length > 0) {
        // 发送工具调用事件
        for (const toolCall of result.toolCalls) {
          subject.next({
            type: 'tool_call',
            data: JSON.stringify({
              name: toolCall.name,
              arguments: toolCall.arguments,
              success: toolCall.success,
            }),
          } as MessageEvent);
          allToolCalls.push(toolCall);
        }

        // 更新消息历史，继续下一轮
        messages.push({
          role: 'assistant',
          content: result.content || '',
          tool_calls: result.rawToolCalls,
        });

        for (const toolCall of result.toolCalls) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolCall.result),
          });
        }
      } else {
        // 没有工具调用，流式结束
        break;
      }
    }

    // 解析标签形式的思考内容（用于不支持原生 thinking 的模型）
    if (!fullThinking) {
      const parsed = this.parseThinking(fullContent);
      if (parsed.thinking) {
        fullThinking = parsed.thinking;
        fullContent = parsed.content;
      }
    }

    // 发送完成事件
    subject.next({
      type: 'done',
      data: JSON.stringify({
        sessionId,
        tokens: { input: totalInputTokens, output: totalOutputTokens },
      }),
    } as MessageEvent);

    // 保存AI回复
    const assistantMessage = this.chatRepository.create({
      chatId: uuidv4(),
      modelId: model.modelId,
      sessionId,
      role: 'assistant',
      content: fullContent,
      thinking: fullThinking || null,
    });
    await this.chatRepository.save(assistantMessage);

    // 记录Token消耗
    await this.recordTokenUsage(model.modelId, sessionId, totalInputTokens, totalOutputTokens);

    subject.complete();
  }

  /**
   * 流式请求 OpenAI 兼容 API
   */
  private async streamOpenAIRequest(
    model: AIModelConfig,
    messages: any[],
    tools: any[],
    thinkingType: ThinkingType | undefined,
    subject: Subject<MessageEvent>,
    onChunk: (thinking: string, content: string, inputTokens: number, outputTokens: number) => void,
  ): Promise<{ content: string; toolCalls?: any[]; rawToolCalls?: any[] }> {
    const parameters = model.parameters || {};
    let maxTokens = parameters.maxTokens ?? 8192;

    const modelMaxLimits: Record<string, number> = {
      'zhipu': 32768,
      'qwen': 32000,
      'wenxin': 8000,
      'openai': 128000,
      'claude': 128000,
    };

    const limit = modelMaxLimits[model.modelType];
    if (limit && maxTokens > limit) {
      maxTokens = limit;
    }

    // 构建请求体
    const requestBody: any = {
      model: model.modelIdentifier,
      messages,
      temperature: parameters.temperature ?? 0.7,
      max_tokens: maxTokens,
      top_p: parameters.topP ?? 1,
      stream: true, // 启用流式响应
    };

    // 添加工具定义
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    // 添加 thinking 参数（只有 enabled 或 auto 时才发送）
    if (thinkingType && thinkingType !== 'disabled') {
      requestBody.thinking = { type: thinkingType };
    }

    const response = await fetch(`${model.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
    }

    // 解析流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let fullThinking = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let toolCalls: any[] = [];
    let rawToolCalls: any[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留未完成的行

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
          if (!trimmedLine.startsWith('data: ')) continue;

          try {
            const jsonStr = trimmedLine.slice(6);
            const data = JSON.parse(jsonStr);

            // 处理 usage 信息
            if (data.usage) {
              inputTokens = data.usage.prompt_tokens || 0;
              outputTokens = data.usage.completion_tokens || 0;
            }

            const delta = data.choices?.[0]?.delta;
            if (!delta) continue;

            // 处理思考内容（豆包原生）
            if (delta.reasoning_content) {
              fullThinking += delta.reasoning_content;
              subject.next({
                type: 'thinking',
                data: JSON.stringify({ content: delta.reasoning_content }),
              } as MessageEvent);
            }

            // 处理正常内容
            if (delta.content) {
              fullContent += delta.content;
              subject.next({
                type: 'content',
                data: JSON.stringify({ content: delta.content }),
              } as MessageEvent);
            }

            // 处理工具调用（流式中可能分多次发送）
            if (delta.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;
                if (!rawToolCalls[index]) {
                  rawToolCalls[index] = {
                    id: toolCallDelta.id || '',
                    type: 'function',
                    function: { name: '', arguments: '' },
                  };
                }
                if (toolCallDelta.id) {
                  rawToolCalls[index].id = toolCallDelta.id;
                }
                if (toolCallDelta.function?.name) {
                  rawToolCalls[index].function.name = toolCallDelta.function.name;
                }
                if (toolCallDelta.function?.arguments) {
                  rawToolCalls[index].function.arguments += toolCallDelta.function.arguments;
                }
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // 回调收集的内容
    onChunk(fullThinking, fullContent, inputTokens, outputTokens);

    // 处理工具调用
    if (rawToolCalls.length > 0) {
      for (const rawTool of rawToolCalls) {
        if (rawTool.function.name) {
          const result = await this.toolsService.executeToolCall({
            id: rawTool.id,
            function: {
              name: rawTool.function.name,
              arguments: rawTool.function.arguments,
            },
          });
          toolCalls.push({
            id: rawTool.id,
            name: rawTool.function.name,
            arguments: JSON.parse(rawTool.function.arguments || '{}'),
            result: result.result,
            success: result.success,
          });
        }
      }
    }

    return {
      content: fullContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      rawToolCalls: rawToolCalls.length > 0 ? rawToolCalls : undefined,
    };
  }
}
