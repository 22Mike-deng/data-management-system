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
  async testConnection(dto: TestConnectionDto): Promise<{ success: boolean; message: string }> {
    try {
      // TODO: 实际调用AI API测试连接
      // 这里简化处理，实际应该调用 LangChain 进行测试
      const response = await fetch(`${dto.apiEndpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${dto.apiKey}`,
        },
      });

      if (response.ok) {
        return { success: true, message: '连接测试成功' };
      } else {
        return { success: false, message: `连接失败: ${response.statusText}` };
      }
    } catch (error) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
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
