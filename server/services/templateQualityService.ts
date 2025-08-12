import { db } from "../db-connection";
import { templates, users } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import { logger } from "../utils/logger";

interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: string[];
  rejectionReason?: string;
}

interface TemplateData {
  title: string;
  description: string;
  price: number;
  tripData: any;
  tags: string[];
  destinations: string[];
  duration: number;
  userId: number;
}

// Spam keywords that indicate low quality
const SPAM_KEYWORDS = [
  'free money', 'get rich', 'xxx', 'porn', 'viagra', 'casino',
  'crypto pump', 'guaranteed profit', 'mlm', 'pyramid scheme'
];

// Quality scoring service
export class TemplateQualityService {

  // Main quality check function
  async checkTemplateQuality(template: TemplateData): Promise<QualityCheckResult> {
    const issues: string[] = [];
    let score = 0;

    // 1. Auto-rejection checks (instant fail)
    const autoRejectResult = this.performAutoRejectChecks(template);
    if (!autoRejectResult.passed) {
      return {
        passed: false,
        score: 0,
        issues: autoRejectResult.issues,
        rejectionReason: autoRejectResult.issues[0] // First issue is the main reason
      };
    }

    // 2. Calculate quality score
    score = await this.calculateQualityScore(template);

    // 3. Determine if template passes minimum threshold
    const passed = score >= 40; // Minimum score to publish

    if (!passed) {
      issues.push(`Quality score too low: ${score}/100. Minimum required: 40`);
    }

    return {
      passed,
      score,
      issues,
      rejectionReason: issues.length > 0 ? issues[0] : undefined
    };
  }

  // Auto-rejection checks that instantly fail a template
  private performAutoRejectChecks(template: TemplateData): { passed: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check title and description length
    if (!template.title || template.title.length < 10) {
      issues.push("Title must be at least 10 characters long");
    }

    if (!template.description || template.description.length < 50) {
      issues.push("Description must be at least 50 characters long");
    }

    // Check for spam keywords
    const combinedText = `${template.title} ${template.description}`.toLowerCase();
    for (const keyword of SPAM_KEYWORDS) {
      if (combinedText.includes(keyword)) {
        issues.push(`Prohibited content detected: ${keyword}`);
        break;
      }
    }

    // Check trip data validity
    if (!template.tripData || !template.tripData.days) {
      issues.push("Template must include trip itinerary data");
    } else {
      const days = template.tripData.days;

      // Check minimum activities per day
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        if (!day.activities || day.activities.length < 3) {
          issues.push(`Day ${i + 1} must have at least 3 activities`);
        }

        // Check if activities have required fields
        if (day.activities) {
          for (const activity of day.activities) {
            if (!activity.title || activity.title.length < 5) {
              issues.push(`All activities must have descriptive titles`);
              break;
            }

            // Check for location data
            if (!activity.location && !activity.locationName) {
              issues.push(`Activities must include location information`);
              break;
            }
          }
        }
      }

      // Check that duration matches days
      if (days.length !== template.duration) {
        issues.push(`Duration (${template.duration} days) must match number of days in itinerary (${days.length})`);
      }
    }

    // Check price limits for unverified creators
    if (template.price > 100) {
      issues.push("New creators cannot price templates above $100");
    }

    // Check for minimum destinations
    if (!template.destinations || template.destinations.length === 0) {
      issues.push("Template must include at least one destination");
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }

  // Calculate quality score (0-100)
  private async calculateQualityScore(template: TemplateData): Promise<number> {
    let score = 0;

    // Content Quality (40 points max)
    score += this.scoreContentQuality(template);

    // Completeness (30 points max)
    score += this.scoreCompleteness(template);

    // Creator Trust (30 points max)
    score += await this.scoreCreatorTrust(template.userId);

    return Math.min(100, Math.max(0, score));
  }

  // Score content quality (40 points max)
  private scoreContentQuality(template: TemplateData): number {
    let score = 0;
    const tripData = template.tripData;

    if (!tripData || !tripData.days) return 0;

    // Check for detailed descriptions (10 points)
    const hasDetailedDescriptions = tripData.days.every((day: any) =>
      day.activities && day.activities.every((act: any) =>
        act.description && act.description.length > 50
      )
    );
    if (hasDetailedDescriptions) score += 10;
    else if (tripData.days.some((day: any) =>
      day.activities?.some((act: any) => act.description?.length > 30)
    )) score += 5;

    // Check for times/schedule (10 points)
    const hasSchedule = tripData.days.some((day: any) =>
      day.activities?.some((act: any) => act.time || act.startTime)
    );
    if (hasSchedule) score += 10;

    // Check for transportation info (10 points)
    const hasTransport = tripData.days.some((day: any) =>
      day.activities?.some((act: any) =>
        act.transportation || act.travelTime || act.travelMode
      )
    );
    if (hasTransport) score += 10;

    // Check for local tips/notes (10 points)
    const hasLocalTips = tripData.days.some((day: any) =>
      day.activities?.some((act: any) => act.tips || act.notes)
    ) || template.description.length > 200;
    if (hasLocalTips) score += 10;

    return score;
  }

  // Score completeness (30 points max)
  private scoreCompleteness(template: TemplateData): number {
    let score = 0;
    const tripData = template.tripData;

    if (!tripData || !tripData.days) return 0;

    // Activities per day (15 points)
    const avgActivities = tripData.days.reduce((sum: number, day: any) =>
      sum + (day.activities?.length || 0), 0
    ) / tripData.days.length;

    if (avgActivities >= 5) score += 15;
    else if (avgActivities >= 4) score += 10;
    else if (avgActivities >= 3) score += 5;

    // Has cover image (10 points)
    // Note: We'd check this after upload
    if (tripData.coverImage || template.destinations.length > 2) score += 10;

    // Has coordinates for activities (5 points)
    const hasCoordinates = tripData.days.some((day: any) =>
      day.activities?.some((act: any) =>
        act.latitude && act.longitude
      )
    );
    if (hasCoordinates) score += 5;

    return score;
  }

  // Score creator trust (30 points max)
  private async scoreCreatorTrust(userId: number): Promise<number> {
    let score = 0;

    try {
      // Get creator info
      const [creator] = await db.select()
        .from(users)
        .where(eq(users.id, userId));

      if (!creator) return 0;

      // Verified creator (20 points)
      if (creator.creator_status === 'verified') {
        score += 20;
      } else if (creator.creator_status === 'approved') {
        score += 10;
      }

      // Previous templates score (10 points based on average quality)
      if (creator.templates_published && creator.templates_published > 0) {
        // Get average quality score of previous templates
        const previousTemplates = await db.select()
          .from(templates)
          .where(eq(templates.user_id, userId));

        if (previousTemplates.length > 0) {
          const avgQuality = previousTemplates.reduce((sum, t) =>
            sum + (t.quality_score || 0), 0
          ) / previousTemplates.length;

          score += Math.min(10, Math.floor(avgQuality / 10));
        }
      }

    } catch (error) {
      logger.error('Error calculating creator trust score:', error);
    }

    return score;
  }

  // Update template quality score in database
  async updateTemplateQuality(
    templateId: number,
    qualityResult: QualityCheckResult
  ): Promise<void> {
    await db.update(templates)
      .set({
        quality_score: qualityResult.score,
        auto_checks_passed: qualityResult.passed,
        moderation_status: qualityResult.passed ? 'pending' : 'rejected',
        rejection_reason: qualityResult.rejectionReason,
        updated_at: new Date()
      })
      .where(eq(templates.id, templateId));
  }

  // Get templates needing review
  async getTemplatesForReview(limit = 10): Promise<any[]> {
    return await db.select()
      .from(templates)
      .where(eq(templates.moderation_status, 'pending'))
      .limit(limit);
  }

  // Auto-moderation for trusted creators
  async autoModerateTemplate(templateId: number, userId: number): Promise<{
    autoApproved: boolean;
    reason?: string;
  }> {
    try {
      // Get creator info
      const [creator] = await db.select()
        .from(users)
        .where(eq(users.id, userId));

      if (!creator) {
        return { autoApproved: false, reason: 'Creator not found' };
      }

      // Get template info
      const [template] = await db.select()
        .from(templates)
        .where(eq(templates.id, templateId));

      if (!template) {
        return { autoApproved: false, reason: 'Template not found' };
      }

      // Auto-approve criteria for verified creators
      if (creator.creator_status === 'verified') {
        // Check if template meets minimum quality for auto-approval
        if (template.quality_score && template.quality_score >= 70) {
          // Auto-approve high-quality templates from verified creators
          await this.approveTemplate(templateId, 'Auto-approved: Verified creator with high quality score');

          logger.info(`Template ${templateId} auto-approved for verified creator ${userId}`);
          return { autoApproved: true, reason: 'Verified creator with high quality score' };
        }

        // For verified creators with moderate quality, still auto-approve but flag for review
        if (template.quality_score && template.quality_score >= 50) {
          await db.update(templates)
            .set({
              moderation_status: 'approved',
              status: 'published',
              moderation_notes: 'Auto-approved: Verified creator (flagged for quality review)',
              verified_at: new Date(),
              updated_at: new Date()
            })
            .where(eq(templates.id, templateId));

          logger.info(`Template ${templateId} auto-approved with review flag for verified creator ${userId}`);
          return { autoApproved: true, reason: 'Verified creator (moderate quality)' };
        }
      }

      // Auto-approve for creators with strong track record
      if (creator.creator_score && creator.creator_score >= 80) {
        // Get their previous template performance
        const previousTemplates = await db.select({
          avgQuality: sql<number>`avg(quality_score)`,
          count: sql<number>`count(*)`
        })
        .from(templates)
        .where(
          and(
            eq(templates.user_id, userId),
            eq(templates.status, 'published')
          )
        );

        const avgQuality = previousTemplates[0]?.avgQuality || 0;
        const count = previousTemplates[0]?.count || 0;

        // If they have 5+ templates with average quality > 75, auto-approve
        if (count >= 5 && avgQuality >= 75 && template.quality_score && template.quality_score >= 60) {
          await this.approveTemplate(templateId, 'Auto-approved: Trusted creator with consistent quality');

          logger.info(`Template ${templateId} auto-approved for trusted creator ${userId}`);
          return { autoApproved: true, reason: 'Trusted creator with consistent quality' };
        }
      }

      // Update creator score based on submission
      await this.updateCreatorScore(userId);

      return { autoApproved: false, reason: 'Requires manual review' };
    } catch (error) {
      logger.error('Auto-moderation error:', error);
      return { autoApproved: false, reason: 'Auto-moderation failed' };
    }
  }

  // Update creator score based on their templates
  private async updateCreatorScore(userId: number): Promise<void> {
    const stats = await db.select({
      avgQuality: sql<number>`avg(quality_score)`,
      count: sql<number>`count(*)`,
      published: sql<number>`count(*) filter (where status = 'published')`,
      rejected: sql<number>`count(*) filter (where moderation_status = 'rejected')`
    })
    .from(templates)
    .where(eq(templates.user_id, userId));

    const stat = stats[0];
    if (!stat) return;

    // Calculate creator score (0-100)
    let score = 0;

    // Average quality contributes 50%
    score += (stat.avgQuality || 0) * 0.5;

    // Published ratio contributes 30%
    if (stat.count > 0) {
      const publishRatio = stat.published / stat.count;
      score += publishRatio * 30;
    }

    // Quantity bonus (up to 20 points)
    score += Math.min(stat.published * 2, 20);

    // Penalty for rejections
    score -= stat.rejected * 5;

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, Math.round(score)));

    await db.update(users)
      .set({ creator_score: score })
      .where(eq(users.id, userId));
  }

  // Approve template
  async approveTemplate(templateId: number, notes?: string): Promise<void> {
    await db.update(templates)
      .set({
        moderation_status: 'approved',
        status: 'published',
        moderation_notes: notes,
        verified_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(templates.id, templateId));
  }

  // Reject template
  async rejectTemplate(
    templateId: number,
    reason: string,
    notes?: string
  ): Promise<void> {
    await db.update(templates)
      .set({
        moderation_status: 'rejected',
        status: 'draft',
        rejection_reason: reason,
        moderation_notes: notes,
        updated_at: new Date()
      })
      .where(eq(templates.id, templateId));
  }
}

export const templateQualityService = new TemplateQualityService();