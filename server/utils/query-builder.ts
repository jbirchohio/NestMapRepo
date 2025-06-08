import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { dbService } from '../services/database.service';
import { logger } from './logger';

type OrderDirection = 'asc' | 'desc';

interface QueryOptions<T> {
  where?: Record<string, any>;
  orderBy?: { column: keyof T; direction: OrderDirection }[];
  limit?: number;
  offset?: number;
  relations?: string[];
  cache?: {
    ttl?: number;
    key?: string;
  };
}

export class QueryBuilder<T> {
  private table: any;
  private schema: any;
  private query: any;
  private options: QueryOptions<T>;
  private relationMappings: Record<string, any> = {};

  constructor(table: any, schema: any, options: QueryOptions<T> = {}) {
    this.table = table;
    this.schema = schema;
    this.options = options;
    this.query = dbService.getDrizzle().select().from(table);
  }

  /**
   * Apply where conditions
   */
  private applyWhere() {
    if (!this.options.where) return this;

    const conditions = Object.entries(this.options.where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const column = this.table[key as keyof typeof this.table];
        if (!column) {
          logger.warn(`Column ${key} not found in table ${this.table.getSQL().name}`);
          return undefined;
        }
        return Array.isArray(value)
          ? inArray(column, value)
          : eq(column, value);
      })
      .filter(Boolean);

    if (conditions.length > 0) {
      this.query = this.query.where(and(...conditions));
    }

    return this;
  }

  /**
   * Apply ordering
   */
  private applyOrder() {
    if (!this.options.orderBy?.length) return this;

    const orderByClauses = this.options.orderBy.map(({ column, direction }) => {
      const columnRef = this.table[column as string];
      if (!columnRef) {
        logger.warn(`Order column ${String(column)} not found in table`);
        return undefined;
      }
      return direction === 'asc' ? asc(columnRef) : desc(columnRef);
    }).filter(Boolean);

    if (orderByClauses.length > 0) {
      this.query = this.query.orderBy(...orderByClauses);
    }

    return this;
  }

  /**
   * Apply pagination
   */
  private applyPagination() {
    if (this.options.limit !== undefined) {
      this.query = this.query.limit(this.options.limit);
    }
    if (this.options.offset !== undefined) {
      this.query = this.query.offset(this.options.offset);
    }
    return this;
  }

  /**
   * Apply eager loading for relations
   */
  private async applyRelations(results: any[]) {
    if (!this.options.relations?.length || !results.length) {
      return results;
    }

    const relationResults = await Promise.all(
      this.options.relations.map(async (relation) => {
        const relationConfig = this.schema.relations?.[relation];
        if (!relationConfig) {
          logger.warn(`Relation ${relation} not found in schema`);
          return { [relation]: [] };
        }

        const { table, foreignKey, fields = ['*'] } = relationConfig;
        const ids = [...new Set(results.map(r => r.id))];

        if (ids.length === 0) {
          return { [relation]: [] };
        }

        const related = await dbService.getDrizzle()
          .select(fields.reduce((acc, field) => ({
            ...acc,
            [field]: table[field]
          }), {}))
          .from(table)
          .where(inArray(table[foreignKey], ids));

        // Group related items by foreign key
        const grouped = related.reduce((acc, item) => {
          const key = item[foreignKey];
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});

        return { [relation]: grouped };
      })
    );

    // Merge relation results back into main results
    return results.map(item => ({
      ...item,
      ...Object.assign({}, ...relationResults.map(r => ({
        [Object.keys(r)[0]]: r[Object.keys(r)[0]]?.[item.id] || []
      })))
    }));
  }

  /**
   * Execute the query and return results
   */
  public async getMany(): Promise<T[]> {
    try {
      // Apply query modifications
      this.applyWhere().applyOrder().applyPagination();

      // Execute the query
      const results = await this.query;

      // Apply relations if needed
      return this.options.relations?.length 
        ? this.applyRelations(results)
        : results;
    } catch (error) {
      logger.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Get a single result
   */
  public async getOne(): Promise<T | null> {
    this.options.limit = 1;
    const results = await this.getMany();
    return results[0] || null;
  }

  /**
   * Get the count of matching records
   */
  public async getCount(): Promise<number> {
    try {
      const countResult = await dbService.getDrizzle()
        .select({ count: sql<number>`count(*)` })
        .from(this.table);
      
      return Number(countResult[0]?.count) || 0;
    } catch (error) {
      logger.error('Count query failed:', error);
      throw error;
    }
  }

  /**
   * Check if any records match the conditions
   */
  public async exists(): Promise<boolean> {
    this.options.limit = 1;
    this.options.relations = [];
    const result = await this.getOne();
    return !!result;
  }
}

/**
 * Helper function to create a new query builder instance
 */
export function createQueryBuilder<T>(
  table: any,
  schema: any,
  options: QueryOptions<T> = {}
): QueryBuilder<T> {
  return new QueryBuilder<T>(table, schema, options);
}
