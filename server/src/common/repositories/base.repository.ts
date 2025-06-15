import { Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository.interface';
import { PgTable } from 'drizzle-orm/pg-core';
import { db } from '../../../db';
import { eq, inArray } from 'drizzle-orm';

/**
 * Base repository implementation that provides common CRUD operations
 * This class can be extended by specific repository implementations
 */
export abstract class BaseRepositoryImpl<T, ID, CreateDTO, UpdateDTO> implements BaseRepository<T, ID, CreateDTO, UpdateDTO> {
  protected readonly logger: Logger;
  protected readonly tableName: string;
  protected readonly table: PgTable;
  protected readonly idColumn: any; // Column reference for the ID

  constructor(tableName: string, table: PgTable, idColumn: any) {
    this.tableName = tableName;
    this.table = table;
    this.idColumn = idColumn;
    this.logger = new Logger(`${this.tableName}Repository`);
  }

  async findById(id: ID): Promise<T | null> {
    try {
      const [result] = await db
        .select()
        .from(this.table)
        .where(eq(this.idColumn, id))
        .limit(1);
      
      return result || null;
    } catch (error) {
      this.logger.error(`Error finding ${this.tableName} by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async findAll(): Promise<T[]> {
    try {
      return await db
        .select()
        .from(this.table);
    } catch (error) {
      this.logger.error(`Error finding all ${this.tableName}s: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async create(data: CreateDTO): Promise<T> {
    try {
      const [result] = await db
        .insert(this.table)
        .values(data as any)
        .returning();
      
      return result;
    } catch (error) {
      this.logger.error(`Error creating ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async update(id: ID, data: UpdateDTO): Promise<T | null> {
    try {
      const [result] = await db
        .update(this.table)
        .set({
          ...data as any,
          updatedAt: new Date()
        })
        .where(eq(this.idColumn, id))
        .returning();
      
      return result || null;
    } catch (error) {
      this.logger.error(`Error updating ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async delete(id: ID): Promise<boolean> {
    try {
      const result = await db
        .delete(this.table)
        .where(eq(this.idColumn, id));
      
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error(`Error deleting ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async findByIds(ids: ID[]): Promise<T[]> {
    try {
      return await db
        .select()
        .from(this.table)
        .where(inArray(this.idColumn, ids));
    } catch (error) {
      this.logger.error(`Error finding ${this.tableName}s by IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async count(filter?: Partial<T>): Promise<number> {
    try {
      // If filter is provided, we would need to build a dynamic query
      // For simplicity, this implementation just counts all records
      const result = await db
        .select({ count: db.fn.count() })
        .from(this.table);
      
      return Number(result[0].count) || 0;
    } catch (error) {
      this.logger.error(`Error counting ${this.tableName}s: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async exists(id: ID): Promise<boolean> {
    try {
      const result = await this.findById(id);
      return result !== null;
    } catch (error) {
      this.logger.error(`Error checking if ${this.tableName} exists: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
