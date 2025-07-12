import { logger } from '../../shared/src/schema.js';
import { BaseRepository } from './base.repository.interface.js';
import { eq } from 'drizzle-orm';
import { db } from '../../db.js';

/**
 * Base repository implementation with common CRUD operations
 */
export abstract class BaseRepositoryImpl<T, ID, CreateData extends Record<string, any>, UpdateData extends Record<string, any>> implements BaseRepository<T, ID, CreateData, UpdateData> {
  protected logger = logger;
  
  constructor(
    protected entityName: string,
    protected table: any,
    protected idColumn: any
  ) {}

  async findById(id: ID): Promise<T | null> {
    try {
      const [result] = await db
        .select()
        .from(this.table)
        .where(eq(this.idColumn, id))
        .limit(1);
      return result || null;
    } catch (error) {
      this.logger.error(`Error finding ${this.entityName} by ID ${id}:`, error);
      return null;
    }
  }

  async findAll(): Promise<T[]> {
    try {
      return await db.select().from(this.table);
    } catch (error) {
      this.logger.error(`Error finding all ${this.entityName}:`, error);
      return [];
    }
  }

  async create(data: CreateData): Promise<T> {
    try {
      const [result] = await db
        .insert(this.table)
        .values(data as any)
        .returning();
      return result;
    } catch (error) {
      this.logger.error(`Error creating ${this.entityName}:`, error);
      throw error;
    }
  }

  async update(id: ID, data: UpdateData): Promise<T | null> {
    try {
      const [result] = await db
        .update(this.table)
        .set(data as any)
        .where(eq(this.idColumn, id))
        .returning();
      return result || null;
    } catch (error) {
      this.logger.error(`Error updating ${this.entityName} with ID ${id}:`, error);
      return null;
    }
  }

  async delete(id: ID): Promise<boolean> {
    try {
      const result = await db
        .delete(this.table)
        .where(eq(this.idColumn, id));
      return result.rowsAffected > 0;
    } catch (error) {
      this.logger.error(`Error deleting ${this.entityName} with ID ${id}:`, error);
      return false;
    }
  }

  async count(_filter?: Partial<T>): Promise<number> {
    try {
      // For now, return simple count - can be enhanced with filters
      const results = await db.select().from(this.table);
      return results.length;
    } catch (error) {
      this.logger.error(`Error counting ${this.entityName}:`, error);
      return 0;
    }
  }

  async exists(id: ID): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }
}