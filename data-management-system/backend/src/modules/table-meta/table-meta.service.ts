/**
* 数据表元数据服务
* 创建者：dzh
* 创建时间：2026-03-11
* 更新时间：2026-03-14
*/
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TableDefinition, FieldDefinition } from '@/database/entities';
import { CreateTableDto, UpdateTableDto, CreateFieldDto, UpdateFieldDto } from './dto';
import { RedisCacheService } from '../redis-cache';

// 动态数据服务接口，用于解决循环依赖
export interface IDynamicDataService {
  createDynamicTable(tableId: string): Promise<void>;
}

// 缓存键前缀
const CACHE_PREFIX = 'table_meta';

// 【防缓存穿透】空结果标记
const NULL_CACHE_MARKER = '__NULL__';

@Injectable()
export class TableMetaService {
  private dynamicDataService: IDynamicDataService | null = null;

  constructor(
    @InjectRepository(TableDefinition)
    private tableRepository: Repository<TableDefinition>,
    @InjectRepository(FieldDefinition)
    private fieldRepository: Repository<FieldDefinition>,
    private dataSource: DataSource,
    private readonly cacheService: RedisCacheService,
  ) {}

  /**
   * 设置动态数据服务实例（用于解决循环依赖）
   */
  setDynamicDataService(service: IDynamicDataService) {
    this.dynamicDataService = service;
  }

  /**
   * 获取所有数据表列表（带缓存）
   */
  async findAllTables(): Promise<TableDefinition[]> {
    const cacheKey = RedisCacheService.buildKey(CACHE_PREFIX, 'all_tables');
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.tableRepository.find({
          order: { createdAt: 'DESC' },
        });
      },
      300, // 缓存5分钟
    );
  }

  /**
   * 获取数据表详情（包含字段，带缓存）
   * 【性能优化】缓存空结果防止缓存穿透
   */
  async findTableById(tableId: string): Promise<TableDefinition> {
    const cacheKey = RedisCacheService.buildKey(CACHE_PREFIX, 'table', tableId);
    
    const cached = await this.cacheService.get<TableDefinition | string>(cacheKey);
    
    // 【防缓存穿透】检查是否为空结果标记
    if (cached === NULL_CACHE_MARKER) {
      throw new NotFoundException(`数据表 ${tableId} 不存在`);
    }
    
    if (cached && cached !== NULL_CACHE_MARKER) {
      return cached as TableDefinition;
    }

    const table = await this.tableRepository.findOne({
      where: { tableId },
      relations: ['fields'],
      order: { fields: { sortOrder: 'ASC' } },
    });
    
    if (!table) {
      // 【防缓存穿透】缓存空结果，使用较短时间（60秒）
      await this.cacheService.set(cacheKey, NULL_CACHE_MARKER, 60);
      throw new NotFoundException(`数据表 ${tableId} 不存在`);
    }
    
    // 缓存表结构，10分钟
    await this.cacheService.set(cacheKey, table, 600);
    return table;
  }

  /**
   * 清除表相关缓存
   */
  private async clearTableCache(tableId?: string): Promise<void> {
    // 清除表列表缓存
    await this.cacheService.del(RedisCacheService.buildKey(CACHE_PREFIX, 'all_tables'));
    
    // 清除特定表缓存
    if (tableId) {
      await this.cacheService.del(RedisCacheService.buildKey(CACHE_PREFIX, 'table', tableId));
    }
  }

  /**
   * 创建数据表
   */
  async createTable(dto: CreateTableDto): Promise<TableDefinition> {
    // 检查表名是否已存在
    const existing = await this.tableRepository.findOne({
      where: { tableName: dto.tableName },
    });
    if (existing) {
      throw new ConflictException(`表名称 ${dto.tableName} 已存在`);
    }

    const tableId = uuidv4();
    const table = this.tableRepository.create({
      tableId,
      tableName: dto.tableName,
      displayName: dto.displayName,
      description: dto.description,
    });

    // 创建字段
    if (dto.fields && dto.fields.length > 0) {
      table.fields = dto.fields.map((field, index) =>
        this.fieldRepository.create({
          fieldId: uuidv4(),
          tableId,
          fieldName: field.fieldName,
          displayName: field.displayName,
          fieldType: field.fieldType,
          required: field.required || false,
          defaultValue: field.defaultValue,
          options: field.options,
          relationTableId: field.relationTableId,
          sortOrder: field.sortOrder || index,
        }),
      );
    }

    const savedTable = await this.tableRepository.save(table);
    // 清除表列表缓存
    await this.clearTableCache();
    return savedTable;
  }

  /**
   * 更新数据表
   */
  async updateTable(tableId: string, dto: UpdateTableDto): Promise<TableDefinition> {
    const table = await this.findTableById(tableId);
    Object.assign(table, dto);
    const savedTable = await this.tableRepository.save(table);
    // 清除该表缓存
    await this.clearTableCache(tableId);
    return savedTable;
  }

  /**
   * 删除数据表
   */
  async deleteTable(tableId: string): Promise<void> {
    const table = await this.findTableById(tableId);

    // 使用事务删除表和关联数据
    await this.dataSource.transaction(async (manager) => {
      // 删除动态数据表（如果存在）
      try {
        await manager.query(`DROP TABLE IF EXISTS data_${table.tableName}`);
      } catch (e) {
        // 忽略表不存在的错误
      }

      // 先删除关联字段
      await manager.delete(FieldDefinition, { tableId });

      // 再删除表元数据
      await manager.delete(TableDefinition, { tableId });
    });
    
    // 清除缓存
    await this.clearTableCache(tableId);
  }

  /**
   * 添加字段
   */
  async addField(tableId: string, dto: CreateFieldDto): Promise<FieldDefinition> {
    await this.findTableById(tableId);

    const field = this.fieldRepository.create({
      fieldId: uuidv4(),
      tableId,
      fieldName: dto.fieldName,
      displayName: dto.displayName,
      fieldType: dto.fieldType,
      required: dto.required || false,
      defaultValue: dto.defaultValue,
      options: dto.options,
      relationTable: dto.relationTable,
      relationTableId: dto.relationTableId,
      // 新增字段属性
      length: dto.length,
      decimalPlaces: dto.decimalPlaces,
      isIndex: dto.isIndex || false,
      isUnique: dto.isUnique || false,
      isForeignKey: dto.isForeignKey || false,
      foreignKeyTable: dto.foreignKeyTable,
      foreignKeyField: dto.foreignKeyField,
      foreignKeyOnDelete: dto.foreignKeyOnDelete,
      isAutoIncrement: dto.isAutoIncrement || false,
      comment: dto.comment,
      sortOrder: dto.sortOrder || 0,
    });

    const savedField = await this.fieldRepository.save(field);
    // 清除该表缓存
    await this.clearTableCache(tableId);
    return savedField;
  }

  /**
   * 更新字段
   */
  async updateField(fieldId: string, dto: UpdateFieldDto): Promise<FieldDefinition> {
    const field = await this.fieldRepository.findOne({
      where: { fieldId },
    });
    if (!field) {
      throw new NotFoundException(`字段 ${fieldId} 不存在`);
    }
    Object.assign(field, dto);
    const savedField = await this.fieldRepository.save(field);

    // 清除该表缓存
    await this.clearTableCache(field.tableId);

    // 同步表结构（如果字段类型等关键属性变更）
    if (this.dynamicDataService && (dto.fieldType || dto.length || dto.decimalPlaces || dto.required)) {
      await this.dynamicDataService.createDynamicTable(field.tableId);
    }

    return savedField;
  }

  /**
   * 删除字段
   */
  async deleteField(fieldId: string): Promise<void> {
    const field = await this.fieldRepository.findOne({
      where: { fieldId },
    });
    if (!field) {
      throw new NotFoundException(`字段 ${fieldId} 不存在`);
    }
    const tableId = field.tableId;
    await this.fieldRepository.remove(field);
    // 清除该表缓存
    await this.clearTableCache(tableId);
  }

  /**
   * 获取表的所有字段
   */
  async getTableFields(tableId: string): Promise<FieldDefinition[]> {
    return this.fieldRepository.find({
      where: { tableId },
      order: { sortOrder: 'ASC' },
    });
  }
}
