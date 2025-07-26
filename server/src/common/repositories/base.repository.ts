import { logger } from '../../utils/logger';
import { BaseRepository } from './base.repository.interface';
import { eq } from '../../utils/drizzle-shim';
import { getDatabase } from '../../db/connection';
import { ServiceUnavailableError } from '../../common/errors';

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
    const db = getDatabase();
    if (!db) {
      this.logger.error('Database connection not available');
      throw new ServiceUnavailableError('Database connection not available');
    }
    
    try {
      const [result] = await db
        .select()
        .from(this.table)
        .where(eq(this.idColumn, id))
        .limit(1);
      return result as T || null;
    } catch (error) {
      this.logger.error(`Error finding ${this.entityName} by ID ${id}:`, { error });
      throw new ServiceUnavailableError(`Failed to find ${this.entityName} by ID`);
    }
  }

  async findAll(): Promise<T[]> {
    const db = getDatabase();
    if (!db) {
      this.logger.error('Database connection not available');
      throw new ServiceUnavailableError('Database connection not available');
    }
    
    try {
      const results = await db.select().from(this.table);
      return results as T[];
    } catch (error) {
      this.logger.error(`Error finding all ${this.entityName}:`, { error });
      throw new ServiceUnavailableError(`Failed to find all ${this.entityName}`);
    }
  }

  async create(data: CreateData): Promise<T> {
    const db = getDatabase();
    if (!db) {
      this.logger.error('Database connection not available');
      throw new ServiceUnavailableError('Database connection not available');
    }
    
    try {
      const [result] = await db
        .insert(this.table)
        .values(data as any)
        .returning();
      return result;
    } catch (error) {
      this.logger.error(`Error creating ${this.entityName}:`, { error });
      throw new ServiceUnavailableError(`Failed to create ${this.entityName}`, { cause: error });
    }
  }

  async update(id: ID, data: UpdateData): Promise<T | null> {
    const db = getDatabase();
    if (!db) {
      this.logger.error('Database connection not available');
      throw new ServiceUnavailableError('Database connection not available');
    }
    
    try {
      const [result] = await db
        .update(this.table)
        .set(data as any)
        .where(eq(this.idColumn, id))
        .returning();
      return result || null;
    } catch (error) {
      this.logger.error(`Error updating ${this.entityName} with ID ${id}:`, { error });
      throw new ServiceUnavailableError(`Failed to update ${this.entityName} with ID ${id}`, { cause: error });
    }
  }

  async delete(id: ID): Promise<boolean> {
    const db = getDatabase();
    if (!db) {
      this.logger.error('Database connection not available');
      throw new ServiceUnavailableError('Database connection not available');
    }
    
    try {
      const result = await db
        .delete(this.table)
        .where(eq(this.idColumn, id));
      // For Drizzle ORM with Postgres, check if any rows were affected
      return result && Object.keys(result).length > 0;
    } catch (error) {
      this.logger.error(`Error deleting ${this.entityName} with ID ${id}:`, { error });
      throw new ServiceUnavailableError(`Failed to delete ${this.entityName} with ID ${id}`, { cause: error });
    }
  }

  async count(_filter?: Partial<T>): Promise<number> {
    const db = getDatabase();
    if (!db) {
      this.logger.error('Database connection not available');
      throw new ServiceUnavailableError('Database connection not available');
    }
    
    try {
      // For now, return simple count - can be enhanced with filters
      const results = await db.select().from(this.table);
      return results.length;
    } catch (error) {
      this.logger.error(`Error counting ${this.entityName}:`, { error });
      throw new ServiceUnavailableError(`Failed to count ${this.entityName}`, { cause: error });
    }
  }

  async exists(id: ID): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }
}



