import { storage } from '../storage';
import { db } from '../db-connection';
import { trips, activities, templatePurchases, templates, users } from '@shared/schema';
import { eq, and, or, sql, gte, lte, inArray } from 'drizzle-orm';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface SuspiciousPattern {
  userId: number;
  pattern: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  details: any;
}

/**
 * Enhanced Anti-Piracy Service for template marketplace
 * Focuses on practical detection methods for travel itinerary templates
 */
export class AntiPiracyServiceV2 {
  private suspiciousPatterns: Map<number, SuspiciousPattern[]> = new Map();
  
  /**
   * Track user behavior patterns for suspicious activity
   */
  async trackUserBehavior(userId: number): Promise<{
    riskScore: number;
    flags: string[];
    recommendations: string[];
  }> {
    const flags: string[] = [];
    let riskScore = 0;
    const recommendations: string[] = [];

    // Check 1: Template creation velocity
    const creationVelocity = await this.checkTemplateCreationVelocity(userId);
    if (creationVelocity.suspicious) {
      flags.push(creationVelocity.flag);
      riskScore += creationVelocity.score;
    }

    // Check 2: Purchase-to-creation ratio
    const purchaseRatio = await this.checkPurchaseToCreationRatio(userId);
    if (purchaseRatio.suspicious) {
      flags.push(purchaseRatio.flag);
      riskScore += purchaseRatio.score;
    }

    // Check 3: Content similarity across user's templates
    const similarity = await this.checkUserTemplateSimilarity(userId);
    if (similarity.suspicious) {
      flags.push(similarity.flag);
      riskScore += similarity.score;
    }

    // Check 4: Rapid price changes (price manipulation)
    const priceManipulation = await this.checkPriceManipulation(userId);
    if (priceManipulation.suspicious) {
      flags.push(priceManipulation.flag);
      riskScore += priceManipulation.score;
    }

    // Generate recommendations based on risk score
    if (riskScore >= 70) {
      recommendations.push('Block template creation temporarily');
      recommendations.push('Manual review required');
    } else if (riskScore >= 40) {
      recommendations.push('Require additional verification');
      recommendations.push('Limit template creation to 1 per day');
    } else if (riskScore >= 20) {
      recommendations.push('Monitor closely');
    }

    return { riskScore, flags, recommendations };
  }

  /**
   * Check if user is creating templates too quickly
   */
  private async checkTemplateCreationVelocity(userId: number): Promise<any> {
    const recentTemplates = await db.select({
      id: templates.id,
      created_at: templates.created_at
    })
    .from(templates)
    .where(and(
      eq(templates.user_id, userId),
      gte(templates.created_at, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
    ));

    const templatesPerDay = recentTemplates.length / 7;
    
    if (templatesPerDay > 3) {
      return {
        suspicious: true,
        flag: `Creating ${templatesPerDay.toFixed(1)} templates per day (suspicious volume)`,
        score: 30
      };
    } else if (templatesPerDay > 1) {
      return {
        suspicious: true,
        flag: `High template creation rate: ${templatesPerDay.toFixed(1)}/day`,
        score: 15
      };
    }

    return { suspicious: false, score: 0 };
  }

  /**
   * Check if user is creating templates right after purchases
   */
  private async checkPurchaseToCreationRatio(userId: number): Promise<any> {
    // Get user's purchases
    const purchases = await db.select({
      templateId: templatePurchases.template_id,
      purchasedAt: templatePurchases.purchased_at
    })
    .from(templatePurchases)
    .where(and(
      eq(templatePurchases.buyer_id, userId),
      eq(templatePurchases.status, 'completed')
    ));

    if (purchases.length === 0) {
      return { suspicious: false, score: 0 };
    }

    // Get user's created templates
    const userTemplates = await db.select({
      id: templates.id,
      created_at: templates.created_at,
      trip_data: templates.trip_data
    })
    .from(templates)
    .where(eq(templates.user_id, userId));

    // Check for templates created within 48 hours of purchases
    let suspiciousCreations = 0;
    for (const purchase of purchases) {
      const purchaseTime = new Date(purchase.purchasedAt).getTime();
      
      const nearbyTemplates = userTemplates.filter(t => {
        const creationTime = new Date(t.created_at || 0).getTime();
        const hoursDiff = Math.abs(creationTime - purchaseTime) / (1000 * 60 * 60);
        return hoursDiff <= 48;
      });

      if (nearbyTemplates.length > 0) {
        suspiciousCreations++;
      }
    }

    const ratio = suspiciousCreations / purchases.length;
    if (ratio > 0.5) {
      return {
        suspicious: true,
        flag: `${(ratio * 100).toFixed(0)}% of purchases followed by template creation`,
        score: 40
      };
    } else if (ratio > 0.2) {
      return {
        suspicious: true,
        flag: 'Pattern of creating templates after purchases',
        score: 20
      };
    }

    return { suspicious: false, score: 0 };
  }

  /**
   * Check if user's templates are too similar to each other
   */
  private async checkUserTemplateSimilarity(userId: number): Promise<any> {
    const userTemplates = await db.select({
      id: templates.id,
      trip_data: templates.trip_data,
      title: templates.title
    })
    .from(templates)
    .where(and(
      eq(templates.user_id, userId),
      eq(templates.status, 'published')
    ));

    if (userTemplates.length < 2) {
      return { suspicious: false, score: 0 };
    }

    // Compare templates pairwise
    let highSimilarityPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < userTemplates.length - 1; i++) {
      for (let j = i + 1; j < userTemplates.length; j++) {
        totalPairs++;
        const similarity = this.calculateTemplateSimilarity(
          userTemplates[i].trip_data,
          userTemplates[j].trip_data
        );
        
        if (similarity > 0.8) {
          highSimilarityPairs++;
        }
      }
    }

    const similarityRatio = highSimilarityPairs / totalPairs;
    if (similarityRatio > 0.5) {
      return {
        suspicious: true,
        flag: 'Multiple templates with high similarity (possible reselling)',
        score: 35
      };
    } else if (similarityRatio > 0.2) {
      return {
        suspicious: true,
        flag: 'Some templates are very similar',
        score: 15
      };
    }

    return { suspicious: false, score: 0 };
  }

  /**
   * Check for price manipulation patterns
   */
  private async checkPriceManipulation(userId: number): Promise<any> {
    // Get templates with price history
    const userTemplates = await db.select({
      id: templates.id,
      price: templates.price,
      created_at: templates.created_at,
      updated_at: templates.updated_at
    })
    .from(templates)
    .where(eq(templates.user_id, userId))
    .orderBy(templates.created_at);

    // Check for pattern: Create free/cheap, get reviews, then increase price
    let manipulationDetected = false;
    for (const template of userTemplates) {
      const initialPrice = parseFloat(template.price || '0');
      
      // Check if template had reviews when price was low
      const reviews = await db.select()
        .from(templates)
        .where(and(
          eq(templates.id, template.id),
          sql`review_count > 0`
        ));

      if (reviews.length > 0 && initialPrice < 5) {
        // Check current price
        const [current] = await db.select({ price: templates.price })
          .from(templates)
          .where(eq(templates.id, template.id));
        
        const currentPrice = parseFloat(current?.price || '0');
        if (currentPrice > initialPrice * 3) {
          manipulationDetected = true;
          break;
        }
      }
    }

    if (manipulationDetected) {
      return {
        suspicious: true,
        flag: 'Price manipulation pattern detected',
        score: 25
      };
    }

    return { suspicious: false, score: 0 };
  }

  /**
   * Calculate similarity between two templates
   */
  private calculateTemplateSimilarity(tripData1: any, tripData2: any): number {
    if (!tripData1 || !tripData2) return 0;

    const activities1 = this.extractActivities(tripData1);
    const activities2 = this.extractActivities(tripData2);

    if (activities1.length === 0 || activities2.length === 0) return 0;

    // Compare activity titles using Jaccard similarity
    const titles1 = new Set(activities1.map(a => a.title?.toLowerCase().trim()));
    const titles2 = new Set(activities2.map(a => a.title?.toLowerCase().trim()));

    const intersection = new Set([...titles1].filter(x => titles2.has(x)));
    const union = new Set([...titles1, ...titles2]);

    return intersection.size / union.size;
  }

  /**
   * Extract activities from trip data
   */
  private extractActivities(tripData: any): any[] {
    const activities: any[] = [];

    if (tripData?.days && Array.isArray(tripData.days)) {
      tripData.days.forEach((day: any) => {
        if (day.activities && Array.isArray(day.activities)) {
          activities.push(...day.activities);
        }
      });
    } else if (tripData?.activities && Array.isArray(tripData.activities)) {
      activities.push(...tripData.activities);
    }

    return activities;
  }

  /**
   * Advanced content fingerprinting using multiple features
   */
  async createAdvancedFingerprint(tripId: number): Promise<string> {
    const trip = await storage.getTrip(tripId);
    const activities = await storage.getActivitiesByTripId(tripId);

    if (!trip || activities.length === 0) {
      return '';
    }

    // Extract multiple features for fingerprinting
    const features = {
      // Location features
      city: trip.city?.toLowerCase().trim(),
      country: trip.country?.toLowerCase().trim(),
      
      // Temporal features
      duration: Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
      
      // Activity features
      activityCount: activities.length,
      activityTitles: activities.map(a => a.title?.toLowerCase().trim()).sort(),
      activityTags: [...new Set(activities.map(a => a.tag).filter(Boolean))].sort(),
      
      // Time distribution
      morningActivities: activities.filter(a => {
        const hour = parseInt(a.time?.split(':')[0] || '12');
        return hour >= 6 && hour < 12;
      }).length,
      afternoonActivities: activities.filter(a => {
        const hour = parseInt(a.time?.split(':')[0] || '12');
        return hour >= 12 && hour < 18;
      }).length,
      eveningActivities: activities.filter(a => {
        const hour = parseInt(a.time?.split(':')[0] || '12');
        return hour >= 18 || hour < 6;
      }).length,
      
      // Geographic spread (unique locations)
      uniqueLocations: [...new Set(activities.map(a => a.location_name?.toLowerCase().trim()).filter(Boolean))].length,
      
      // Activity patterns
      hasHotel: !!trip.hotel,
      hasFoodActivities: activities.some(a => a.tag === 'food' || a.title?.toLowerCase().includes('restaurant')),
      hasTransport: activities.some(a => a.travel_mode && a.travel_mode !== 'walking')
    };

    // Create hash from features
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(features));
    return hash.digest('hex');
  }

  /**
   * Log suspicious activity for manual review
   */
  async logSuspiciousActivity(userId: number, activity: string, details: any) {
    const pattern: SuspiciousPattern = {
      userId,
      pattern: activity,
      severity: this.calculateSeverity(details),
      timestamp: new Date(),
      details
    };

    if (!this.suspiciousPatterns.has(userId)) {
      this.suspiciousPatterns.set(userId, []);
    }
    
    this.suspiciousPatterns.get(userId)!.push(pattern);

    logger.warn(`Suspicious activity detected for user ${userId}: ${activity}`, details);

    // If high severity, could trigger immediate action
    if (pattern.severity === 'high') {
      await this.handleHighSeverityPattern(userId, pattern);
    }
  }

  /**
   * Calculate severity based on pattern details
   */
  private calculateSeverity(details: any): 'low' | 'medium' | 'high' {
    const riskScore = details.riskScore || 0;
    
    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Handle high severity patterns
   */
  private async handleHighSeverityPattern(userId: number, pattern: SuspiciousPattern) {
    // Update user's creator score negatively
    await db.update(users)
      .set({
        creator_score: sql`GREATEST(0, COALESCE(creator_score, 50) - 20)`
      })
      .where(eq(users.id, userId));

    // Could also:
    // - Send notification to admin
    // - Temporarily restrict template creation
    // - Flag for manual review
    logger.error(`HIGH SEVERITY: User ${userId} flagged for ${pattern.pattern}`, pattern.details);
  }

  /**
   * Get suspicious patterns for a user
   */
  getSuspiciousPatterns(userId: number): SuspiciousPattern[] {
    return this.suspiciousPatterns.get(userId) || [];
  }

  /**
   * Clear old suspicious patterns (cleanup)
   */
  cleanupOldPatterns() {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
    
    for (const [userId, patterns] of this.suspiciousPatterns.entries()) {
      const filtered = patterns.filter(p => p.timestamp.getTime() > cutoff);
      if (filtered.length === 0) {
        this.suspiciousPatterns.delete(userId);
      } else {
        this.suspiciousPatterns.set(userId, filtered);
      }
    }
  }
}

export const antiPiracyServiceV2 = new AntiPiracyServiceV2();