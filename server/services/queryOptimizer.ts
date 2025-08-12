import { db } from '../db-connection';
import { templates, users, creatorProfiles, templatePurchases, templateReviews } from '@shared/schema';
import { eq, inArray, and, sql, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Query optimizer to eliminate N+1 queries and batch database operations
 * Zero cost optimization - just smarter queries
 */
export class QueryOptimizer {
  private batchQueue = new Map<string, Promise<any>>();
  private batchTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Batch fetch templates with all related data in a single query
   * Eliminates N+1 queries completely
   */
  async getTemplatesWithAllData(templateIds: number[]) {
    if (templateIds.length === 0) return [];

    // Single query with all joins
    const results = await db
      .select({
        template: templates,
        user: users,
        creator: creatorProfiles,
        purchaseCount: sql<number>`COUNT(DISTINCT ${templatePurchases.id})`,
        avgRating: sql<number>`AVG(${templateReviews.rating})`,
        reviewCount: sql<number>`COUNT(DISTINCT ${templateReviews.id})`
      })
      .from(templates)
      .leftJoin(users, eq(templates.user_id, users.id))
      .leftJoin(creatorProfiles, eq(templates.user_id, creatorProfiles.user_id))
      .leftJoin(templatePurchases, and(
        eq(templatePurchases.template_id, templates.id),
        eq(templatePurchases.status, 'completed')
      ))
      .leftJoin(templateReviews, eq(templateReviews.template_id, templates.id))
      .where(inArray(templates.id, templateIds))
      .groupBy(templates.id, users.id, creatorProfiles.user_id);

    return results.map(row => ({
      ...row.template,
      creator: row.user ? {
        id: row.user.id,
        username: row.user.username,
        displayName: row.user.display_name,
        bio: row.creator?.bio,
        verified: row.creator?.verified || false,
        totalSales: row.creator?.total_sales || 0
      } : null,
      stats: {
        purchaseCount: Number(row.purchaseCount) || 0,
        avgRating: Number(row.avgRating) || 0,
        reviewCount: Number(row.reviewCount) || 0
      }
    }));
  }

  /**
   * Batch fetch user purchases with template data
   * Replaces multiple individual queries with one optimized query
   */
  async getUserPurchasesOptimized(userId: number) {
    const query = sql`
      SELECT
        tp.*,
        t.*,
        u.username as creator_username,
        u.display_name as creator_display_name,
        cp.verified as creator_verified,
        (SELECT COUNT(*) FROM template_reviews tr WHERE tr.template_id = t.id) as review_count,
        (SELECT AVG(rating) FROM template_reviews tr WHERE tr.template_id = t.id) as avg_rating
      FROM template_purchases tp
      INNER JOIN templates t ON tp.template_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN creator_profiles cp ON t.user_id = cp.user_id
      WHERE tp.buyer_id = ${userId}
        AND tp.status = 'completed'
      ORDER BY tp.purchased_at DESC
    `;

    const result = await db.execute(query);
    return result.rows;
  }

  /**
   * Get trip with all activities and related data in one query
   */
  async getTripWithAllData(tripId: number) {
    const query = sql`
      SELECT
        t.*,
        json_agg(
          json_build_object(
            'id', a.id,
            'title', a.title,
            'date', a.date,
            'time', a.time,
            'location_name', a.location_name,
            'latitude', a.latitude,
            'longitude', a.longitude,
            'notes', a.notes,
            'tag', a.tag,
            'order', a."order"
          ) ORDER BY a.date, a."order"
        ) as activities
      FROM trips t
      LEFT JOIN activities a ON t.id = a.trip_id
      WHERE t.id = ${tripId}
      GROUP BY t.id
    `;

    const result = await db.execute(query);
    if (result.rows.length === 0) return null;

    const trip = result.rows[0];
    trip.activities = trip.activities || [];
    return trip;
  }

  /**
   * Batch load related data for multiple entities
   * Useful for listing pages
   */
  async batchLoadRelatedData<T>(
    ids: number[],
    tableName: string,
    relatedTable: string,
    foreignKey: string
  ): Promise<Map<number, T[]>> {
    if (ids.length === 0) return new Map();

    const query = sql`
      SELECT * FROM ${sql.identifier(relatedTable)}
      WHERE ${sql.identifier(foreignKey)} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::int[])
    `;

    const result = await db.execute(query);

    // Group by foreign key
    const grouped = new Map<number, T[]>();
    for (const row of result.rows) {
      const key = row[foreignKey] as number;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(row as T);
    }

    return grouped;
  }

  /**
   * Request coalescing - batch similar requests together
   * Prevents duplicate queries when multiple components request same data
   */
  async coalesceRequest<T>(
    key: string,
    fn: () => Promise<T>,
    batchDelayMs: number = 10
  ): Promise<T> {
    // Check if we already have a pending request for this key
    if (this.batchQueue.has(key)) {
      return this.batchQueue.get(key) as Promise<T>;
    }

    // Create promise that will be shared by all callers
    const promise = new Promise<T>((resolve, reject) => {
      // Clear any existing timer
      if (this.batchTimers.has(key)) {
        clearTimeout(this.batchTimers.get(key)!);
      }

      // Set timer to execute after batch delay
      const timer = setTimeout(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.batchQueue.delete(key);
          this.batchTimers.delete(key);
        }
      }, batchDelayMs);

      this.batchTimers.set(key, timer);
    });

    this.batchQueue.set(key, promise);
    return promise;
  }

  /**
   * Optimized search with single query
   */
  async searchTemplatesOptimized(searchParams: any) {
    // Build conditions
    const conditions = [eq(templates.status, 'published')];
    
    if (searchParams.search) {
      conditions.push(sql`
        to_tsvector('english', ${templates.title} || ' ' || COALESCE(${templates.description}, ''))
        @@ plainto_tsquery('english', ${searchParams.search})
      `);
    }

    // Build query with all conditions
    const baseQuery = db
      .select({
        template: templates,
        creator: users,
        profile: creatorProfiles,
        salesCount: sql<number>`COALESCE(${templates.sales_count}, 0)`,
        viewCount: sql<number>`COALESCE(${templates.view_count}, 0)`,
        rating: sql<number>`COALESCE(${templates.rating}, 0)`
      })
      .from(templates)
      .leftJoin(users, eq(templates.user_id, users.id))
      .leftJoin(creatorProfiles, eq(users.id, creatorProfiles.user_id))
      .where(and(...conditions));

    // Sort optimization - always apply an orderBy
    const sortField = searchParams.sort;
    const query = sortField === 'popular' 
      ? baseQuery.orderBy(desc(templates.sales_count))
      : sortField === 'rating'
      ? baseQuery.orderBy(desc(templates.rating))
      : baseQuery.orderBy(desc(templates.created_at));

    const results = await query.limit(searchParams.limit || 20);

    return results.map(row => ({
      ...row.template,
      creator: row.creator ? {
        id: row.creator.id,
        username: row.creator.username,
        displayName: row.creator.display_name,
        verified: row.profile?.verified || false
      } : null,
      stats: {
        salesCount: Number(row.salesCount),
        viewCount: Number(row.viewCount),
        rating: Number(row.rating)
      }
    }));
  }

  /**
   * Preload commonly accessed data to eliminate queries entirely
   */
  async preloadCommonData() {
    const commonData = {
      topTemplates: await this.getTopTemplates(10),
      popularDestinations: await this.getPopularDestinations(),
      featuredCreators: await this.getFeaturedCreators()
    };

    return commonData;
  }

  private async getTopTemplates(limit: number) {
    return db.select()
      .from(templates)
      .where(eq(templates.status, 'published'))
      .orderBy(desc(templates.sales_count))
      .limit(limit);
  }

  private async getPopularDestinations() {
    const query = sql`
      SELECT destination, COUNT(*) as count
      FROM templates, unnest(destinations) as destination
      WHERE status = 'published'
      GROUP BY destination
      ORDER BY count DESC
      LIMIT 20
    `;

    const result = await db.execute(query);
    return result.rows;
  }

  private async getFeaturedCreators() {
    return db.select({
      user: users,
      profile: creatorProfiles,
      templateCount: sql<number>`COUNT(${templates.id})`,
      totalSales: sql<number>`SUM(${templates.sales_count})`
    })
    .from(creatorProfiles)
    .innerJoin(users, eq(creatorProfiles.user_id, users.id))
    .leftJoin(templates, eq(templates.user_id, users.id))
    .where(eq(creatorProfiles.featured, true))
    .groupBy(users.id, creatorProfiles.user_id)
    .limit(10);
  }
}

export const queryOptimizer = new QueryOptimizer();