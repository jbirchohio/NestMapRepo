import type { QueryBuilder } from '../utils/query-builder.ts';
import { createQueryBuilder } from '../utils/query-builder.ts';
import { dbService } from '../services/database.service';
import { logger } from '../utils/logger.ts';
export abstract class BaseDAL<T> {
    protected abstract table: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
    protected abstract schema: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
    protected abstract cacheTtl: number;
    /**
     * Create a new query builder instance
     */
    protected queryBuilder(options: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ = {}): QueryBuilder<T> {
        return createQueryBuilder<T>(this.table, this.schema, {
            ...options,
            cache: { ttl: this.cacheTtl, ...options.cache },
        });
    }
    /**
     * Find all records matching the conditions
     */
    public async findAll(where: Record<string, any> = {}, options: {
        limit?: number;
        offset?: number;
        orderBy?: {
            column: string;
            direction: 'asc' | 'desc';
        }[];
        relations?: string[];
    } = {}): Promise<T[]> {
        return this.queryBuilder({
            where,
            ...options,
        }).getMany();
    }
    /**
     * Find a single record by ID
     */
    public async findById(id: string | number, options: {
        relations?: string[];
    } = {}): Promise<T | null> {
        return this.queryBuilder({
            where: { id },
            ...options,
        }).getOne();
    }
    /**
     * Find a single record matching the conditions
     */
    public async findOne(where: Record<string, any>, options: {
        relations?: string[];
    } = {}): Promise<T | null> {
        return this.queryBuilder({
            where,
            ...options,
        }).getOne();
    }
    /**
     * Create a new record
     */
    public async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
        try {
            const result = await dbService.getDrizzle()
                .insert(this.table)
                .values(data as any)
                .returning();
            // Invalidate relevant cache
            await this.invalidateCache();
            return result[0] as T;
        }
        catch (error) {
            logger.error('Create operation failed:', error);
            throw error;
        }
    }
    /**
     * Update records matching the conditions
     */
    public async update(where: Record<string, any>, data: Partial<T>, options: {
        returning?: string[];
    } = {}): Promise<T[]> {
        try {
            const result = await dbService.getDrizzle()
                .update(this.table)
                .set(data as any)
                .where(where)
                .returning(options.returning?.length ? options.returning : ['*']);
            // Invalidate relevant cache
            await this.invalidateCache();
            return result as T[];
        }
        catch (error) {
            logger.error('Update operation failed:', error);
            throw error;
        }
    }
    /**
     * Delete records matching the conditions
     */
    public async delete(where: Record<string, any>): Promise<number> {
        try {
            const result = await dbService.getDrizzle()
                .delete(this.table)
                .where(where);
            // Invalidate relevant cache
            await this.invalidateCache();
            return result.rowCount || 0;
        }
        catch (error) {
            logger.error('Delete operation failed:', error);
            throw error;
        }
    }
    /**
     * Count records matching the conditions
     */
    public async count(where: Record<string, any> = {}): Promise<number> {
        return this.queryBuilder({ where }).getCount();
    }
    /**
     * Check if any records match the conditions
     */
    public async exists(where: Record<string, any>): Promise<boolean> {
        return this.queryBuilder({ where }).exists();
    }
    /**
     * Invalidate cache for this model
     */
    protected async invalidateCache(pattern: string = '*'): Promise<void> {
        const cacheKey = `model:${this.table.getSQL().name}:${pattern}`;
        await dbService.invalidateCache(cacheKey);
    }
}
