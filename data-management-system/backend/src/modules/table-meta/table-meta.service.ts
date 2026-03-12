/**
 * 数据表元数据服务
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TableDefinition, FieldDefinition } from '@/database/entities';
import { CreateTableDto, UpdateTableDto, CreateFieldDto, UpdateFieldDto } from './dto';

@Injectable()
export class TableMetaService {
  constructor(
    @InjectRepository(TableDefinition)
    private tableRepository: Repository<TableDefinition>,
    @InjectRepository(FieldDefinition)
    private fieldRepository: Repository<FieldDefinition>,
    private dataSource: DataSource,
  ) {}

  /**
   * 获取所有数据表列表
   */
  async findAllTables(): Promise<TableDefinition[]> {
    return this.tableRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取数据表详情（包含字段）
   */
  async findTableById(tableId: string): Promise<TableDefinition> {
    const table = await this.tableRepository.findOne({
      where: { tableId },
      relations: ['fields'],
      order: { fields: { sortOrder: 'ASC' } },
    });
    if (!table) {
      throw new NotFoundException(`数据表 ${tableId} 不存在`);
    }
    return table;
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

    return this.tableRepository.save(table);
  }

  /**
   * 更新数据表
   */
  async updateTable(tableId: string, dto: UpdateTableDto): Promise<TableDefinition> {
    const table = await this.findTableById(tableId);
    Object.assign(table, dto);
    return this.tableRepository.save(table);
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
        await manager.query(`DROP TABLE IF EXISTS data_${table.tableName} CASCADE`);
      } catch (e) {
        // 忽略表不存在的错误
      }
      
      // 删除元数据
      await manager.remove(table);
    });
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
      relationTableId: dto.relationTableId,
      sortOrder: dto.sortOrder || 0,
    });

    return this.fieldRepository.save(field);
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
    return this.fieldRepository.save(field);
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
    await this.fieldRepository.remove(field);
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
