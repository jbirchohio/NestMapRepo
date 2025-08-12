import { storage } from '../storage';
import { db } from '../db-connection';
import { trips, activities, templatePurchases, templates } from '@shared/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface ActivityFingerprint {
  title: string;
  time?: string;
  locationName?: string;
  tag?: string;
  notes?: string;
}

interface TripFingerprint {
  city?: string;
  country?: string;
  duration: number;
  activityCount: number;
  activitySignature: string;
  dayStructure: string;
}

export class AntiPiracyService {
  /**
   * Check if a trip appears to be copied from a purchased template
   * Uses multiple detection methods to prevent piracy
   */
  async detectPiratedContent(tripId: number, userId: number): Promise<{
    isPirated: boolean;
    confidence: number;
    reason?: string;
    sourceTemplateId?: number;
  }> {
    try {
      const trip = await storage.getTrip(tripId);
      if (!trip || trip.user_id !== userId) {
        return { isPirated: false, confidence: 0 };
      }

      // Method 1: Check metadata (can be bypassed by clearing collaborators)
      const metadataCheck = await this.checkMetadata(trip);
      if (metadataCheck.isPirated) {
        return metadataCheck;
      }

      // Method 2: Check purchase history for similar content
      const purchaseCheck = await this.checkPurchaseHistory(trip, userId);
      if (purchaseCheck.isPirated) {
        return purchaseCheck;
      }

      // Method 3: Activity fingerprinting - compare with all purchased templates
      const fingerprintCheck = await this.checkActivityFingerprint(tripId, userId);
      if (fingerprintCheck.isPirated) {
        return fingerprintCheck;
      }

      // Method 4: Check for exact activity title sequences
      const sequenceCheck = await this.checkActivitySequences(tripId, userId);
      if (sequenceCheck.isPirated) {
        return sequenceCheck;
      }

      return { isPirated: false, confidence: 0 };
    } catch (error) {
      logger.error('Error in piracy detection:', error);
      // Err on the side of caution - don't block if detection fails
      return { isPirated: false, confidence: 0 };
    }
  }

  /**
   * Method 1: Check collaborators metadata (basic check)
   */
  private async checkMetadata(trip: any): Promise<any> {
    if (trip.collaborators && Array.isArray(trip.collaborators)) {
      const fromTemplate = trip.collaborators.find((c: any) => c.source === 'template');
      if (fromTemplate && fromTemplate.templateId) {
        const originalTemplate = await storage.getTemplate(fromTemplate.templateId);
        if (originalTemplate && originalTemplate.price !== '0') {
          logger.warn(`Metadata check: Trip ${trip.id} copied from paid template ${fromTemplate.templateId}`);
          return {
            isPirated: true,
            confidence: 100,
            reason: 'Trip metadata shows it was copied from a purchased template',
            sourceTemplateId: fromTemplate.templateId
          };
        }
      }
    }
    return { isPirated: false, confidence: 0 };
  }

  /**
   * Method 2: Check if user purchased any templates and if trip matches
   */
  private async checkPurchaseHistory(trip: any, userId: number): Promise<any> {
    // Get all templates this user has purchased
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
      return { isPirated: false, confidence: 0 };
    }

    // Check if trip was created shortly after any purchase
    for (const purchase of purchases) {
      const template = await storage.getTemplate(purchase.templateId);
      if (!template || parseFloat(template.price || '0') === 0) continue;

      // Check if trip was created within 24 hours of purchase
      const purchaseTime = new Date(purchase.purchasedAt).getTime();
      const tripCreationTime = new Date(trip.created_at).getTime();
      const hoursDiff = (tripCreationTime - purchaseTime) / (1000 * 60 * 60);

      if (hoursDiff >= 0 && hoursDiff <= 24) {
        // Trip created shortly after purchase - check similarity
        const similarity = await this.calculateTripSimilarity(trip, template);
        if (similarity > 0.8) {
          logger.warn(`Purchase history check: Trip ${trip.id} matches purchased template ${purchase.templateId}`);
          return {
            isPirated: true,
            confidence: Math.round(similarity * 100),
            reason: 'Trip closely matches a template you purchased',
            sourceTemplateId: purchase.templateId
          };
        }
      }
    }

    return { isPirated: false, confidence: 0 };
  }

  /**
   * Method 3: Activity fingerprinting
   */
  private async checkActivityFingerprint(tripId: number, userId: number): Promise<any> {
    const tripActivities = await storage.getActivitiesByTripId(tripId);
    if (tripActivities.length === 0) {
      return { isPirated: false, confidence: 0 };
    }

    // Create fingerprint of this trip's activities
    const tripFingerprint = this.createActivityFingerprint(tripActivities);

    // Get all templates the user has purchased
    const purchases = await db.select({
      templateId: templatePurchases.template_id
    })
    .from(templatePurchases)
    .where(and(
      eq(templatePurchases.buyer_id, userId),
      eq(templatePurchases.status, 'completed')
    ));

    for (const purchase of purchases) {
      const template = await storage.getTemplate(purchase.templateId);
      if (!template || parseFloat(template.price || '0') === 0) continue;

      const templateData = template.trip_data as any;
      if (!templateData) continue;

      // Extract activities from template
      const templateActivities = this.extractTemplateActivities(templateData);
      const templateFingerprint = this.createActivityFingerprint(templateActivities);

      // Compare fingerprints
      const similarity = this.compareFingerprints(tripFingerprint, templateFingerprint);
      if (similarity > 0.40) {  // Lowered from 0.85 to 0.40 for better detection
        logger.warn(`Fingerprint check: Trip ${tripId} matches template ${purchase.templateId} with ${similarity * 100}% similarity`);
        return {
          isPirated: true,
          confidence: Math.round(similarity * 100),
          reason: 'Activity pattern matches a purchased template',
          sourceTemplateId: purchase.templateId
        };
      }
    }

    return { isPirated: false, confidence: 0 };
  }

  /**
   * Method 4: Check for exact activity title sequences
   */
  private async checkActivitySequences(tripId: number, userId: number): Promise<any> {
    const tripActivities = await storage.getActivitiesByTripId(tripId);
    if (tripActivities.length < 3) {
      return { isPirated: false, confidence: 0 };
    }

    // Create sequence of activity titles (3-grams)
    const tripSequences = this.createActivitySequences(tripActivities);

    // Check against all purchased templates
    const purchases = await db.select({
      templateId: templatePurchases.template_id
    })
    .from(templatePurchases)
    .where(and(
      eq(templatePurchases.buyer_id, userId),
      eq(templatePurchases.status, 'completed')
    ));

    for (const purchase of purchases) {
      const template = await storage.getTemplate(purchase.templateId);
      if (!template || parseFloat(template.price || '0') === 0) continue;

      const templateData = template.trip_data as any;
      if (!templateData) continue;

      const templateActivities = this.extractTemplateActivities(templateData);
      const templateSequences = this.createActivitySequences(templateActivities);

      // Check for matching sequences
      const matchingSequences = this.findMatchingSequences(tripSequences, templateSequences);
      const matchRatio = matchingSequences / Math.min(tripSequences.length, templateSequences.length);

      if (matchRatio > 0.40) {  // Lowered from 0.7 to 0.40 for better detection
        logger.warn(`Sequence check: Trip ${tripId} has ${matchRatio * 100}% matching sequences with template ${purchase.templateId}`);
        return {
          isPirated: true,
          confidence: Math.round(matchRatio * 100),
          reason: 'Activity sequence matches a purchased template',
          sourceTemplateId: purchase.templateId
        };
      }
    }

    return { isPirated: false, confidence: 0 };
  }

  /**
   * Helper: Calculate similarity between trip and template
   */
  private async calculateTripSimilarity(trip: any, template: any): Promise<number> {
    const templateData = template.trip_data as any;
    if (!templateData) return 0;

    let similarityScore = 0;
    let factors = 0;

    // Check city match
    if (trip.city && templateData.city) {
      if (trip.city.toLowerCase() === templateData.city.toLowerCase()) {
        similarityScore += 1;
      }
      factors++;
    }

    // Check duration
    const tripDuration = Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const templateDuration = template.duration || 7;
    if (Math.abs(tripDuration - templateDuration) <= 1) {
      similarityScore += 1;
      factors++;
    }

    // Check activity count
    const tripActivities = await storage.getActivitiesByTripId(trip.id);
    const templateActivities = this.extractTemplateActivities(templateData);

    if (tripActivities.length > 0 && templateActivities.length > 0) {
      const countRatio = Math.min(tripActivities.length, templateActivities.length) / Math.max(tripActivities.length, templateActivities.length);
      if (countRatio > 0.8) {
        similarityScore += countRatio;
        factors++;
      }
    }

    return factors > 0 ? similarityScore / factors : 0;
  }

  /**
   * Helper: Extract activities from template data
   */
  private extractTemplateActivities(templateData: any): any[] {
    const activities: any[] = [];

    if (templateData.days && Array.isArray(templateData.days)) {
      templateData.days.forEach((day: any) => {
        if (day.activities && Array.isArray(day.activities)) {
          activities.push(...day.activities);
        }
      });
    } else if (templateData.activities && Array.isArray(templateData.activities)) {
      activities.push(...templateData.activities);
    }

    return activities;
  }

  /**
   * Helper: Create fingerprint from activities
   */
  private createActivityFingerprint(activities: any[]): string {
    const normalized = activities.map(a => ({
      title: a.title?.toLowerCase().trim(),
      time: a.time,
      tag: a.tag
    }));

    // Sort by title to make order-independent
    normalized.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    // Create hash
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(normalized));
    return hash.digest('hex');
  }

  /**
   * Helper: Compare two fingerprints
   */
  private compareFingerprints(fp1: string, fp2: string): number {
    // For exact fingerprint match
    return fp1 === fp2 ? 1 : 0;
  }

  /**
   * Helper: Create activity sequences (n-grams)
   */
  private createActivitySequences(activities: any[], n: number = 3): string[] {
    const sequences: string[] = [];
    const sortedActivities = [...activities].sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.time || '').localeCompare(b.time || '');
    });

    for (let i = 0; i <= sortedActivities.length - n; i++) {
      const sequence = sortedActivities
        .slice(i, i + n)
        .map(a => a.title?.toLowerCase().trim())
        .join('|');
      sequences.push(sequence);
    }

    return sequences;
  }

  /**
   * Helper: Find matching sequences
   */
  private findMatchingSequences(seq1: string[], seq2: string[]): number {
    const set2 = new Set(seq2);
    return seq1.filter(s => set2.has(s)).length;
  }

  /**
   * Check if content is too similar to existing templates (for new template creation)
   */
  async checkForDuplicateContent(tripId: number, userId: number): Promise<{
    isDuplicate: boolean;
    similarTemplateId?: number;
    similarity?: number;
  }> {
    const tripActivities = await storage.getActivitiesByTripId(tripId);
    if (tripActivities.length < 3) {
      return { isDuplicate: false };
    }

    // Check against ALL published templates (not just purchased ones)
    const publishedTemplates = await db.select()
      .from(templates)
      .where(eq(templates.status, 'published'));

    for (const template of publishedTemplates) {
      // Skip own templates
      if (template.user_id === userId) continue;

      const templateData = template.trip_data as any;
      if (!templateData) continue;

      const templateActivities = this.extractTemplateActivities(templateData);

      // Create and compare sequences
      const tripSequences = this.createActivitySequences(tripActivities);
      const templateSequences = this.createActivitySequences(templateActivities);

      const matchingSequences = this.findMatchingSequences(tripSequences, templateSequences);
      const matchRatio = matchingSequences / Math.min(tripSequences.length, templateSequences.length);

      // Threshold for duplicate detection
      if (matchRatio > 0.60) {  // Lowered from 0.9 to 0.60 for better duplicate detection
        logger.warn(`Duplicate content detected: Trip ${tripId} is ${matchRatio * 100}% similar to template ${template.id}`);
        return {
          isDuplicate: true,
          similarTemplateId: template.id,
          similarity: matchRatio
        };
      }
    }

    return { isDuplicate: false };
  }
}

export const antiPiracyService = new AntiPiracyService();