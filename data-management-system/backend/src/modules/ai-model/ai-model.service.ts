/**
 * AI模型管理服务
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AIModelConfig } from '@/database/entities';
import { CreateAIModelDto, UpdateAIModelDto, TestConnectionDto } from './dto';

@Injectable()
export class AIModelService {
  constructor(
    @InjectRepository(AIModelConfig)
    private modelRepository: Repository<AIModelConfig>,
  ) {}

  /**
   * 获取所有模型列表
   */
  async findAll(): Promise<AIModelConfig[]> {
    return this.modelRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取启用的模型列表
   */
  async findEnabled(): Promise<AIModelConfig[]> {
    return this.modelRepository.find({
      where: { isEnabled: true },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * 获取默认模型
   */
  async findDefault(): Promise<AIModelConfig | null> {
    return this.modelRepository.findOne({
      where: { isDefault: true, isEnabled: true },
    });
  }

  /**
   * 获取模型详情
   */
  async findById(modelId: string): Promise<AIModelConfig> {
    const model = await this.modelRepository.findOne({
      where: { modelId },
    });
    if (!model) {
      throw new NotFoundException(`模型 ${modelId} 不存在`);
    }
    return model;
  }

  /**
   * 创建模型
   */
  async create(dto: CreateAIModelDto): Promise<AIModelConfig> {
    // 如果设置为默认，先取消其他默认
    if (dto.isDefault) {
      await this.clearDefaultFlag();
    }

    const model = this.modelRepository.create({
      modelId: uuidv4(),
      modelName: dto.modelName,
      modelType: dto.modelType,
      apiEndpoint: dto.apiEndpoint,
      apiKey: dto.apiKey, // TODO: 加密存储
      modelIdentifier: dto.modelIdentifier,
      parameters: dto.parameters || {},
      isEnabled: dto.isEnabled ?? true,
      isDefault: dto.isDefault ?? false,
    });

    return this.modelRepository.save(model);
  }

  /**
   * 更新模型
   */
  async update(modelId: string, dto: UpdateAIModelDto): Promise<AIModelConfig> {
    const model = await this.findById(modelId);

    // 如果设置为默认，先取消其他默认
    if (dto.isDefault) {
      await this.clearDefaultFlag();
    }

    // 如果 apiKey 为空或未提供，保留原有值
    if (!dto.apiKey) {
      delete dto.apiKey;
    }

    Object.assign(model, dto);
    return this.modelRepository.save(model);
  }

  /**
   * 删除模型
   */
  async delete(modelId: string): Promise<void> {
    const model = await this.findById(modelId);
    await this.modelRepository.remove(model);
  }

  /**
   * 切换启用状态
   */
  async toggleEnabled(modelId: string): Promise<AIModelConfig> {
    const model = await this.findById(modelId);
    model.isEnabled = !model.isEnabled;
    return this.modelRepository.save(model);
  }

  /**
   * 设置为默认模型
   */
  async setDefault(modelId: string): Promise<AIModelConfig> {
    const model = await this.findById(modelId);
    
    // 取消其他默认
    await this.clearDefaultFlag();
    
    model.isDefault = true;
    model.isEnabled = true;
    return this.modelRepository.save(model);
  }

  /**
   * 测试模型连接
   */
  async testConnection(dto: TestConnectionDto): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const startTime = Date.now();
    try {
      // 尝试获取模型列表来验证API Key（某些API不支持此端点）
      const modelsResponse = await fetch(`${dto.apiEndpoint}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${dto.apiKey}`,
        },
      });

      const responseTime = Date.now() - startTime;

      if (modelsResponse.ok) {
        return { success: true, message: 'API连接测试成功', responseTime };
      }

      // 如果 /models 端点不可用，尝试发送一个最小化请求来测试
      if (modelsResponse.status === 404 || modelsResponse.status === 405) {
        return await this.testConnectionByChat(dto, startTime);
      }

      const errorData = await modelsResponse.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.error?.message || `连接失败: ${modelsResponse.status} ${modelsResponse.statusText}`,
        responseTime,
      };
    } catch (error: any) {
      // 网络错误时尝试聊天接口测试
      return await this.testConnectionByChat(dto, startTime);
    }
  }

  /**
   * 通过发送最小聊天请求测试连接
   */
  private async testConnectionByChat(
    dto: TestConnectionDto, 
    startTime: number
  ): Promise<{ success: boolean; message: string; responseTime?: number }> {
    try {
      const response = await fetch(`${dto.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dto.apiKey}`,
        },
        body: JSON.stringify({
          model: dto.modelIdentifier,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return { success: true, message: 'API连接测试成功', responseTime };
      }

      const errorData = await response.json().catch(() => ({}));
      
      // 如果是模型不存在的错误，但API Key有效
      if (response.status === 400 || response.status === 404) {
        const errorMsg = errorData.error?.message || '';
        if (errorMsg.includes('model') || errorMsg.includes('Model')) {
          return { 
            success: true, 
            message: 'API Key有效，但模型标识符可能不正确', 
            responseTime 
          };
        }
      }

      return {
        success: false,
        message: errorData.error?.message || `连接失败: ${response.status}`,
        responseTime,
      };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}`, responseTime: Date.now() - startTime };
    }
  }

  /**
   * 通过模型ID测试连接（使用已保存的配置）
   */
  async testConnectionById(modelId: string): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const model = await this.findById(modelId);
    return this.testConnection({
      apiEndpoint: model.apiEndpoint,
      apiKey: model.apiKey,
      modelIdentifier: model.modelIdentifier,
    });
  }

  /**
   * 清除默认标记
   */
  private async clearDefaultFlag(): Promise<void> {
    await this.modelRepository.update(
      { isDefault: true },
      { isDefault: false },
    );
  }
}
