import { db } from "./db-connection";
import { users, templates, creatorProfiles } from "@shared/schema";
import { eq, inArray, and, sql } from "drizzle-orm";

/**
 * Optimized queries to prevent N+1 problems
 */
export class OptimizedQueries {
  /**
   * Get templates with creator profiles in a single query
   */
  async getTemplatesWithCreators(templateIds: number[]) {
    if (templateIds.length === 0) return [];

    // Join templates with users and creator profiles in one query
    const results = await db
      .select({
        template: templates,
        user: users,
        creatorProfile: creatorProfiles
      })
      .from(templates)
      .leftJoin(users, eq(templates.user_id, users.id))
      .leftJoin(creatorProfiles, eq(templates.user_id, creatorProfiles.user_id))
      .where(inArray(templates.id, templateIds));

    return results.map(row => ({
      ...row.template,
      creator: {
        id: row.user?.id,
        username: row.user?.username,
        displayName: row.user?.display_name,
        bio: row.creatorProfile?.bio,
        website: row.creatorProfile?.website_url,
        socialLinks: {
          twitter: row.creatorProfile?.social_twitter,
          instagram: row.creatorProfile?.social_instagram,
          youtube: row.creatorProfile?.social_youtube
        },
        verified: row.creatorProfile?.verified || false
      }
    }));
  }

  /**
   * Get templates with purchase status for a user in one query
   */
  async getTemplatesWithPurchaseStatus(userId: number, templateIds: number[]) {
    if (templateIds.length === 0) return [];

    const query = sql.raw(`
      SELECT
        t.*,
        CASE
          WHEN tp.id IS NOT NULL AND tp.status = 'completed' THEN true
          ELSE false
        END as has_purchased
      FROM templates t
      LEFT JOIN template_purchases tp
        ON t.id = tp.template_id
        AND tp.buyer_id = ${userId}
        AND tp.status = 'completed'
      WHERE t.id = ANY(ARRAY[${templateIds.join(',')}]::int[])
    `);

    const result = await db.execute(query);
    return result.rows;
  }

  /**
   * Get user's trips with activity counts in one query
   */
  async getUserTripsWithActivityCounts(userId: number) {
    const query = sql.raw(`
      SELECT
        t.*,
        COUNT(a.id) as activity_count,
        MIN(a.date) as first_activity_date,
        MAX(a.date) as last_activity_date
      FROM trips t
      LEFT JOIN activities a ON t.id = a.trip_id
      WHERE t.user_id = ${userId}
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);

    const result = await db.execute(query);
    return result.rows;
  }

  /**
   * Batch fetch user information
   */
  async batchGetUsers(userIds: number[]) {
    if (userIds.length === 0) return new Map();

    const userResults = await db
      .select()
      .from(users)
      .where(inArray(users.id, userIds));

    return new Map(userResults.map(u => [u.id, u]));
  }

  /**
   * Get template statistics in bulk
   */
  async getTemplateStats(templateIds: number[]) {
    if (templateIds.length === 0) return new Map();

    const query = sql.raw(`
      SELECT
        t.id,
        COUNT(DISTINCT tp.id) as purchase_count,
        COUNT(DISTINCT tr.id) as review_count,
        AVG(tr.rating) as avg_rating,
        SUM(tp.seller_earnings::numeric) as total_revenue
      FROM templates t
      LEFT JOIN template_purchases tp ON t.id = tp.template_id AND tp.status = 'completed'
      LEFT JOIN template_reviews tr ON t.id = tr.template_id
      WHERE t.id = ANY(ARRAY[${templateIds.join(',')}]::int[])
      GROUP BY t.id
    `);

    const result = await db.execute(query);
    return new Map(result.rows.map((r: any) => [r.id, r]));
  }
}

export const optimizedQueries = new OptimizedQueries();