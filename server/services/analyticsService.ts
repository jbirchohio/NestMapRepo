import { db } from '../db-connection';
import { templates, templatePurchases, users, templateReviews, templateShares } from '@shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface TemplateAnalytics {
  templateId: number;
  views: number;
  sales: number;
  revenue: number;
  conversionRate: number;
  averageRating: number | null;
  reviewCount: number;
  shareCount: number;
  dailyStats: DailyStats[];
}

interface DailyStats {
  date: string;
  views: number;
  sales: number;
  revenue: number;
}

interface CreatorAnalytics {
  userId: number;
  totalTemplates: number;
  totalSales: number;
  totalRevenue: number;
  averagePrice: number;
  averageRating: number;
  topTemplates: TemplatePerformance[];
  revenueByMonth: MonthlyRevenue[];
}

interface TemplatePerformance {
  templateId: number;
  title: string;
  sales: number;
  revenue: number;
  rating: number | null;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  sales: number;
}

interface MarketplaceAnalytics {
  totalTemplates: number;
  totalSales: number;
  totalRevenue: number;
  averagePrice: number;
  topCategories: CategoryStats[];
  topDestinations: DestinationStats[];
  priceDistribution: PriceBucket[];
}

interface CategoryStats {
  category: string;
  count: number;
  revenue: number;
}

interface DestinationStats {
  destination: string;
  templateCount: number;
  totalSales: number;
}

interface PriceBucket {
  range: string;
  count: number;
  sales: number;
}

/**
 * Analytics service for tracking template and creator performance
 */
export class AnalyticsService {
  /**
   * Get comprehensive analytics for a template
   */
  async getTemplateAnalytics(
    templateId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<TemplateAnalytics | null> {
    const template = await db.select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    if (!template[0]) {
      return null;
    }

    const t = template[0];

    // Get purchases within date range
    const purchaseConditions = [
      eq(templatePurchases.template_id, templateId),
      eq(templatePurchases.status, 'completed')
    ];

    if (startDate) {
      purchaseConditions.push(gte(templatePurchases.purchased_at, startDate));
    }
    if (endDate) {
      purchaseConditions.push(lte(templatePurchases.purchased_at, endDate));
    }

    const purchases = await db.select({
      id: templatePurchases.id,
      purchasedAt: templatePurchases.purchased_at,
      sellerEarnings: templatePurchases.seller_earnings
    })
    .from(templatePurchases)
    .where(and(...purchaseConditions));

    // Calculate revenue
    const revenue = purchases.reduce((sum, p) =>
      sum + parseFloat(p.sellerEarnings || '0'), 0
    );

    // Get shares count
    const shares = await db.select({ count: sql`count(*)::integer` })
      .from(templateShares)
      .where(eq(templateShares.template_id, templateId));

    // Calculate daily stats
    const dailyStats = this.calculateDailyStats(purchases);

    // Calculate conversion rate
    const views = t.view_count || 0;
    const sales = t.sales_count || 0;
    const conversionRate = views > 0 ? (sales / views) * 100 : 0;

    return {
      templateId,
      views,
      sales,
      revenue,
      conversionRate,
      averageRating: parseFloat(t.rating || '0') || null,
      reviewCount: t.review_count || 0,
      shareCount: Number(shares[0]?.count || 0),
      dailyStats
    };
  }

  /**
   * Get analytics for a creator
   */
  async getCreatorAnalytics(
    userId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<CreatorAnalytics> {
    // Get all templates by creator
    const creatorTemplates = await db.select()
      .from(templates)
      .where(eq(templates.user_id, userId));

    const templateIds = creatorTemplates.map(t => t.id);

    if (templateIds.length === 0) {
      return {
        userId,
        totalTemplates: 0,
        totalSales: 0,
        totalRevenue: 0,
        averagePrice: 0,
        averageRating: 0,
        topTemplates: [],
        revenueByMonth: []
      };
    }

    // Get all purchases for creator's templates
    const purchaseConditions = [
      eq(templatePurchases.seller_id, userId),
      eq(templatePurchases.status, 'completed')
    ];

    if (startDate) {
      purchaseConditions.push(gte(templatePurchases.purchased_at, startDate));
    }
    if (endDate) {
      purchaseConditions.push(lte(templatePurchases.purchased_at, endDate));
    }

    const purchases = await db.select()
      .from(templatePurchases)
      .where(and(...purchaseConditions));

    // Calculate totals
    const totalRevenue = purchases.reduce((sum, p) =>
      sum + parseFloat(p.seller_earnings || '0'), 0
    );

    const totalSales = purchases.length;

    // Calculate average price
    const prices = creatorTemplates
      .map(t => parseFloat(t.price || '0'))
      .filter(p => p > 0);
    const averagePrice = prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : 0;

    // Calculate average rating
    const ratings = creatorTemplates
      .map(t => parseFloat(t.rating || '0'))
      .filter(r => r > 0);
    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

    // Get top performing templates
    const topTemplates = await this.getTopTemplates(templateIds, 5);

    // Calculate revenue by month
    const revenueByMonth = this.calculateMonthlyRevenue(purchases);

    return {
      userId,
      totalTemplates: creatorTemplates.length,
      totalSales,
      totalRevenue,
      averagePrice,
      averageRating,
      topTemplates,
      revenueByMonth
    };
  }

  /**
   * Get marketplace-wide analytics
   */
  async getMarketplaceAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<MarketplaceAnalytics> {
    // Get all published templates
    const allTemplates = await db.select()
      .from(templates)
      .where(eq(templates.status, 'published'));

    // Get all completed purchases
    const purchaseConditions = [
      eq(templatePurchases.status, 'completed')
    ];

    if (startDate) {
      purchaseConditions.push(gte(templatePurchases.purchased_at, startDate));
    }
    if (endDate) {
      purchaseConditions.push(lte(templatePurchases.purchased_at, endDate));
    }

    const allPurchases = await db.select()
      .from(templatePurchases)
      .where(and(...purchaseConditions));

    // Calculate totals
    const totalRevenue = allPurchases.reduce((sum, p) =>
      sum + parseFloat(p.price || '0'), 0
    );

    // Calculate average price
    const prices = allTemplates
      .map(t => parseFloat(t.price || '0'))
      .filter(p => p > 0);
    const averagePrice = prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : 0;

    // Get top categories (by tags)
    const topCategories = this.calculateTopCategories(allTemplates);

    // Get top destinations
    const topDestinations = this.calculateTopDestinations(allTemplates);

    // Calculate price distribution
    const priceDistribution = this.calculatePriceDistribution(allTemplates, allPurchases);

    return {
      totalTemplates: allTemplates.length,
      totalSales: allPurchases.length,
      totalRevenue,
      averagePrice,
      topCategories,
      topDestinations,
      priceDistribution
    };
  }

  /**
   * Track template view
   */
  async trackView(templateId: number, userId?: number) {
    // Increment view count
    await db.update(templates)
      .set({
        view_count: sql`COALESCE(view_count, 0) + 1`
      })
      .where(eq(templates.id, templateId));

    // Could also log to analytics table for more detailed tracking
    logger.debug(`Template ${templateId} viewed by user ${userId || 'anonymous'}`);
  }

  /**
   * Get conversion funnel analytics
   */
  async getConversionFunnel(templateId: number, days: number = 30): Promise<{
    views: number;
    uniqueViewers: number;
    addedToCart: number;
    purchased: number;
    reviewed: number;
    viewToCartRate: number;
    cartToPurchaseRate: number;
    purchaseToReviewRate: number;
  }> {
    const template = await db.select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    if (!template[0]) {
      return {
        views: 0,
        uniqueViewers: 0,
        addedToCart: 0,
        purchased: 0,
        reviewed: 0,
        viewToCartRate: 0,
        cartToPurchaseRate: 0,
        purchaseToReviewRate: 0
      };
    }

    const views = template[0].view_count || 0;
    const purchased = template[0].sales_count || 0;
    const reviewed = template[0].review_count || 0;

    // For now, we don't track cart additions, so estimate
    const addedToCart = Math.floor(purchased * 1.5);
    const uniqueViewers = Math.floor(views * 0.7); // Estimate 70% unique

    return {
      views,
      uniqueViewers,
      addedToCart,
      purchased,
      reviewed,
      viewToCartRate: views > 0 ? (addedToCart / views) * 100 : 0,
      cartToPurchaseRate: addedToCart > 0 ? (purchased / addedToCart) * 100 : 0,
      purchaseToReviewRate: purchased > 0 ? (reviewed / purchased) * 100 : 0
    };
  }

  /**
   * Private helper methods
   */
  private calculateDailyStats(purchases: any[]): DailyStats[] {
    const statsMap = new Map<string, DailyStats>();

    for (const purchase of purchases) {
      const date = new Date(purchase.purchasedAt).toISOString().split('T')[0];

      if (!statsMap.has(date)) {
        statsMap.set(date, {
          date,
          views: 0,
          sales: 0,
          revenue: 0
        });
      }

      const stats = statsMap.get(date)!;
      stats.sales++;
      stats.revenue += parseFloat(purchase.sellerEarnings || '0');
    }

    return Array.from(statsMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  private calculateMonthlyRevenue(purchases: any[]): MonthlyRevenue[] {
    const revenueMap = new Map<string, MonthlyRevenue>();

    for (const purchase of purchases) {
      const date = new Date(purchase.purchased_at);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!revenueMap.has(month)) {
        revenueMap.set(month, {
          month,
          revenue: 0,
          sales: 0
        });
      }

      const stats = revenueMap.get(month)!;
      stats.sales++;
      stats.revenue += parseFloat(purchase.seller_earnings || '0');
    }

    return Array.from(revenueMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );
  }

  private async getTopTemplates(templateIds: number[], limit: number): Promise<TemplatePerformance[]> {
    if (templateIds.length === 0) return [];

    const templateResults = await db.select({
      id: templates.id,
      title: templates.title,
      salesCount: templates.sales_count,
      rating: templates.rating
    })
    .from(templates)
    .where(sql`id = ANY(${templateIds})`)
    .orderBy(desc(templates.sales_count))
    .limit(limit);

    // Get revenue for each template
    const performances: TemplatePerformance[] = [];

    for (const template of templateResults) {
      const purchases = await db.select({
        earnings: templatePurchases.seller_earnings
      })
      .from(templatePurchases)
      .where(and(
        eq(templatePurchases.template_id, template.id),
        eq(templatePurchases.status, 'completed')
      ));

      const revenue = purchases.reduce((sum, p) =>
        sum + parseFloat(p.earnings || '0'), 0
      );

      performances.push({
        templateId: template.id,
        title: template.title,
        sales: template.salesCount || 0,
        revenue,
        rating: template.rating ? parseFloat(template.rating) : null
      });
    }

    return performances;
  }

  private calculateTopCategories(templates: any[]): CategoryStats[] {
    const categoryMap = new Map<string, CategoryStats>();

    for (const template of templates) {
      const tags = template.tags as string[] || [];

      for (const tag of tags) {
        if (!categoryMap.has(tag)) {
          categoryMap.set(tag, {
            category: tag,
            count: 0,
            revenue: 0
          });
        }

        const stats = categoryMap.get(tag)!;
        stats.count++;
        // Revenue calculation would need purchase data
      }
    }

    return Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateTopDestinations(templates: any[]): DestinationStats[] {
    const destMap = new Map<string, DestinationStats>();

    for (const template of templates) {
      const destinations = template.destinations as string[] || [];

      for (const dest of destinations) {
        if (!destMap.has(dest)) {
          destMap.set(dest, {
            destination: dest,
            templateCount: 0,
            totalSales: 0
          });
        }

        const stats = destMap.get(dest)!;
        stats.templateCount++;
        stats.totalSales += template.sales_count || 0;
      }
    }

    return Array.from(destMap.values())
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);
  }

  private calculatePriceDistribution(templates: any[], purchases: any[]): PriceBucket[] {
    const buckets: PriceBucket[] = [
      { range: 'Free', count: 0, sales: 0 },
      { range: '$1-10', count: 0, sales: 0 },
      { range: '$11-25', count: 0, sales: 0 },
      { range: '$26-50', count: 0, sales: 0 },
      { range: '$51-100', count: 0, sales: 0 },
      { range: '$100+', count: 0, sales: 0 }
    ];

    // Count templates in each bucket
    for (const template of templates) {
      const price = parseFloat(template.price || '0');

      if (price === 0) {
        buckets[0].count++;
        buckets[0].sales += template.sales_count || 0;
      } else if (price <= 10) {
        buckets[1].count++;
        buckets[1].sales += template.sales_count || 0;
      } else if (price <= 25) {
        buckets[2].count++;
        buckets[2].sales += template.sales_count || 0;
      } else if (price <= 50) {
        buckets[3].count++;
        buckets[3].sales += template.sales_count || 0;
      } else if (price <= 100) {
        buckets[4].count++;
        buckets[4].sales += template.sales_count || 0;
      } else {
        buckets[5].count++;
        buckets[5].sales += template.sales_count || 0;
      }
    }

    return buckets;
  }
}

export const analyticsService = new AnalyticsService();