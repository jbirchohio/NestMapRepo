import { logger } from '../../../utils/logger.js';
import { BaseRepository } from './base.repository.interface.js';

/**
 * Base repository implementation with common CRUD operations
 */
export abstract class BaseRepositoryImpl<T, ID, CreateData, UpdateData> implements BaseRepository<T, ID, CreateData, UpdateData> {
  protected logger = logger;
  
  constructor(
    protected entityName: string,
    protected table: any,
    protected idColumn: any
  ) {}

  abstract findById(id: ID): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract create(data: CreateData): Promise<T>;
  abstract update(id: ID, data: UpdateData): Promise<T | null>;
  abstract delete(id: ID): Promise<boolean>;
  abstract count(filter?: Partial<T>): Promise<number>;
  abstract exists(id: ID): Promise<boolean>;
}