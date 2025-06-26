import type { NodePgTransaction } from 'drizzle-orm/node-postgres';
import type { TablesRelationalConfig } from 'drizzle-orm/relations';

/**
 * Base repository interface defining common CRUD operations
 */
export interface BaseRepository<T, ID, CreateData, UpdateData> {
    findById(id: ID): Promise<T | null>;
    findAll(): Promise<T[]>;
    create(data: CreateData): Promise<T>;
    update(id: ID, data: UpdateData): Promise<T | null>;
    delete(id: ID): Promise<boolean>;
    count(filter?: Partial<T>): Promise<number>;
    exists(id: ID): Promise<boolean>;
    /**
     * Execute multiple operations within a single database transaction.
     *
     * @param fn - Callback containing transactional operations using the
     *   provided transaction instance.
     */
    withTransaction<R>(fn: (tx: NodePgTransaction<Record<string, unknown>, TablesRelationalConfig>) => Promise<R>): Promise<R>;
    
    /**
     * Maps a database record to a domain model
     * @param data - Raw database record
     * @returns Mapped domain model or a Promise that resolves to one
     */
    mapToModel(data: any): T | Promise<T>;
}
