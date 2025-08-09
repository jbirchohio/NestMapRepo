import { storage } from '../storage';
import { logger } from '../utils/logger';
import { nanoid } from 'nanoid';
import { geocodingService } from './geocodingService';
import { geocodingBatchService } from './geocodingBatchService';
import crypto from 'crypto';
import { db } from '../db-connection';
import { trips, activities } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Service to copy a purchased template to user's trips with transaction safety
 */
export class TemplateCopyServiceV2 {
  /**
   * Copy a template to a user's trips with full transaction support
   */
  async copyTemplateToTrip(
    templateId: number, 
    userId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      // Use database transaction for atomicity
      return await db.transaction(async (tx) => {
        // Get template within transaction
        const template = await storage.getTemplate(templateId);
        if (!template) {
          throw new Error('Template not found');
        }

        // Verify user has purchased the template
        const hasPurchased = await storage.hasUserPurchasedTemplate(userId, templateId);
        if (!hasPurchased && parseFloat(template.price || '0') > 0) {
          throw new Error('Template not purchased');
        }

        const tripData = template.trip_data as any;
        
        // Calculate dates
        const defaultDuration = template.duration || 7;
        const tripStartDate = startDate || new Date();
        let tripEndDate = endDate;
        
        if (!tripEndDate) {
          tripEndDate = new Date(tripStartDate);
          tripEndDate.setDate(tripStartDate.getDate() + defaultDuration - 1);
        }
        
        // Create trip within transaction
        const [newTrip] = await tx.insert(trips).values({
          title: tripData.title || template.title,
          start_date: tripStartDate,
          end_date: tripEndDate,
          user_id: userId,
          city: tripData.city,
          country: tripData.country,
          location: tripData.location,
          city_latitude: tripData.cityLatitude,
          city_longitude: tripData.cityLongitude,
          hotel: tripData.hotel,
          hotel_latitude: tripData.hotelLatitude,
          hotel_longitude: tripData.hotelLongitude,
          is_public: false,
          sharing_enabled: false,
          trip_type: 'personal',
          // Add metadata about source template (for anti-piracy tracking) in collaborators field
          collaborators: [{
            source: 'template',
            templateId: templateId,
            templateTitle: template.title,
            templateSellerId: template.user_id,
            purchaserId: userId,
            copiedAt: new Date().toISOString(),
            watermark: `${templateId}-${userId}-${Date.now()}`,
            contentHash: this.generateContentHash(template)
          }]
        }).returning();

        // Track all activities to insert
        const activitiesToInsert = [];
        const activitiesToGeocode = [];

        // Copy activities if they exist
        if (tripData.days && Array.isArray(tripData.days)) {
          // New format: structured by days
          const actualStartDate = new Date(newTrip.start_date);
          
          for (const day of tripData.days) {
            if (!day.activities || !Array.isArray(day.activities)) continue;
            
            const dayNumber = parseInt(day.day) || 1;
            const activityDate = new Date(actualStartDate);
            activityDate.setDate(actualStartDate.getDate() + (dayNumber - 1));
            
            if (isNaN(activityDate.getTime())) {
              logger.error(`Invalid date calculated for day ${day.day}`);
              continue;
            }
            
            let order = 0;
            for (const activity of day.activities) {
              if (!activity || !activity.title) continue;
              
              const locationName = activity.location || activity.locationName || activity.location_name;
              let latitude = activity.latitude?.toString() || null;
              let longitude = activity.longitude?.toString() || null;
              
              const activityId = `${newTrip.id}-${dayNumber}-${order}`;
              
              // Collect activities that need geocoding
              if ((!latitude || !longitude) && locationName) {
                activitiesToGeocode.push({
                  id: activityId,
                  locationName,
                  cityContext: tripData.city || tripData.country
                });
              }
              
              activitiesToInsert.push({
                id: activityId,
                trip_id: newTrip.id,
                title: activity.title,
                date: activityDate.toISOString().split('T')[0],
                time: activity.time || null,
                location_name: locationName,
                latitude,
                longitude,
                notes: activity.notes,
                tag: activity.tag,
                order: order++,
                travel_mode: activity.travelMode || activity.travel_mode,
              });
            }
          }
        } else if (tripData.activities && Array.isArray(tripData.activities)) {
          // Old format: flat activities array
          const actualStartDate = new Date(newTrip.start_date);
          
          for (let i = 0; i < tripData.activities.length; i++) {
            const activity = tripData.activities[i];
            if (!activity || !activity.title) continue;
            
            const activityDate = new Date(actualStartDate);
            if (activity.date) {
              activityDate.setTime(new Date(activity.date).getTime());
            } else if (activity.day) {
              const dayNumber = parseInt(activity.day) || 1;
              activityDate.setDate(actualStartDate.getDate() + (dayNumber - 1));
            }
            
            const locationName = activity.locationName || activity.location_name || activity.location;
            let latitude = activity.latitude?.toString() || null;
            let longitude = activity.longitude?.toString() || null;
            
            const activityId = `${newTrip.id}-flat-${i}`;
            
            if ((!latitude || !longitude) && locationName) {
              activitiesToGeocode.push({
                id: activityId,
                locationName,
                cityContext: tripData.city || tripData.country
              });
            }
            
            activitiesToInsert.push({
              id: activityId,
              trip_id: newTrip.id,
              title: activity.title,
              date: activityDate.toISOString().split('T')[0],
              time: activity.time || null,
              location_name: locationName,
              latitude,
              longitude,
              notes: activity.notes,
              tag: activity.tag,
              order: activity.order ?? i,
              travel_mode: activity.travelMode || activity.travel_mode,
            });
          }
        }

        // Batch geocode all activities that need it
        if (activitiesToGeocode.length > 0) {
          logger.info(`Batch geocoding ${activitiesToGeocode.length} activities for trip ${newTrip.id}`);
          const geocodedResults = await geocodingBatchService.processBatch(activitiesToGeocode);
          
          // Update activities with geocoded coordinates
          for (const result of geocodedResults) {
            const activity = activitiesToInsert.find(a => a.id === result.id);
            if (activity && result.location) {
              activity.latitude = result.location.latitude;
              activity.longitude = result.location.longitude;
            }
          }
        }

        // Remove temporary IDs before inserting
        const finalActivities = activitiesToInsert.map(({ id, ...activity }) => activity);

        // Insert all activities in a single batch within transaction
        if (finalActivities.length > 0) {
          await tx.insert(activities).values(finalActivities);
          logger.info(`Created ${finalActivities.length} activities for trip ${newTrip.id}`);
        }

        logger.info(`Successfully copied template ${templateId} to trip ${newTrip.id} for user ${userId}`);
        return newTrip.id;
      });
    } catch (error) {
      logger.error(`Failed to copy template ${templateId} for user ${userId}:`, error);
      throw error; // Re-throw to maintain transaction rollback
    }
  }

  /**
   * Generate a content hash for anti-piracy tracking
   */
  private generateContentHash(template: any): string {
    const content = JSON.stringify({
      title: template.title,
      description: template.description,
      trip_data: template.trip_data,
      duration: template.duration,
      destinations: template.destinations
    });
    
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16);
  }
}

export const templateCopyServiceV2 = new TemplateCopyServiceV2();