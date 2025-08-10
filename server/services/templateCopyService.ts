import { storage } from '../storage';
import { logger } from '../utils/logger';
import { nanoid } from 'nanoid';
import { geocodingService } from './geocodingService';
import crypto from 'crypto';
import { db } from '../db-connection';
import { trips, activities } from '@shared/schema';

/**
 * Service to copy a purchased template to user's trips
 */
export class TemplateCopyService {
  /**
   * Copy a template to create a new trip for the user
   * @param templateId - The template to copy
   * @param userId - The user who will own the new trip
   * @param startDate - Optional custom start date (defaults to today)
   * @param endDate - Optional custom end date (defaults to startDate + template duration)
   */
  async copyTemplateToTrip(
    templateId: number, 
    userId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      // Get the template
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
      if (!tripData) {
        throw new Error('Template has no trip data');
      }

      // Use provided dates or create default dates
      const tripStartDate = startDate || new Date();
      const defaultDuration = template.duration || 7;
      
      // Calculate end date if not provided
      let tripEndDate = endDate;
      if (!tripEndDate) {
        tripEndDate = new Date(tripStartDate);
        tripEndDate.setDate(tripStartDate.getDate() + defaultDuration - 1);
      }
      
      const newTrip = await storage.createTrip({
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
        // Add metadata about source template (for anti-piracy tracking)
        collaborators: [{
          source: 'template',
          templateId: templateId,
          templateTitle: template.title,
          templateSellerId: template.user_id,
          purchaserId: userId,
          copiedAt: new Date().toISOString(),
          // Add a unique watermark for tracking
          watermark: `${templateId}-${userId}-${Date.now()}`,
          // Hash of the original template content for verification
          contentHash: this.generateContentHash(template)
        }]
      });

      // Copy activities if they exist
      // Handle both formats: new format (days array) and old format (flat activities array)
      if (tripData.days && Array.isArray(tripData.days)) {
        // New format: structured by days
        const actualStartDate = new Date(newTrip.start_date);
        
        for (const day of tripData.days) {
          if (!day.activities || !Array.isArray(day.activities)) continue;
          
          // Validate day number
          const dayNumber = parseInt(day.day) || 1;
          const activityDate = new Date(actualStartDate);
          activityDate.setDate(actualStartDate.getDate() + (dayNumber - 1));
          
          // Validate the date is valid
          if (isNaN(activityDate.getTime())) {
            logger.error(`Invalid date calculated for day ${day.day}:`, { actualStartDate, dayNumber });
            continue;
          }
          
          let order = 0;
          for (const activity of day.activities) {
            if (!activity || !activity.title) continue;
            
            const locationName = activity.location || activity.locationName || activity.location_name;
            let latitude = activity.latitude?.toString() || null;
            let longitude = activity.longitude?.toString() || null;
            
            // If coordinates are missing but we have a location name, geocode it
            if (!latitude || !longitude) {
              if (locationName) {
                const geocoded = await geocodingService.geocodeWithFallback(
                  locationName, 
                  tripData.city || tripData.country
                );
                if (geocoded) {
                  latitude = geocoded.latitude;
                  longitude = geocoded.longitude;
                  logger.info(`Geocoded activity location: ${locationName} -> ${latitude}, ${longitude}`);
                }
              }
            }
            
            // Generate smart default time if not provided
            let activityTime = activity.time;
            if (!activityTime) {
              // Assign times based on order in the day
              // First activity: 9am, then 11am, 2pm, 4pm, 7pm, etc.
              const timeSlots = ['09:00', '11:00', '14:00', '16:00', '19:00', '21:00'];
              activityTime = timeSlots[order % timeSlots.length];
              
              // Adjust based on activity type/tag if available
              const tag = (activity.tag || '').toLowerCase();
              const title = (activity.title || '').toLowerCase();
              
              if (tag === 'breakfast' || title.includes('breakfast')) {
                activityTime = '08:00';
              } else if (tag === 'lunch' || title.includes('lunch')) {
                activityTime = '12:30';
              } else if (tag === 'dinner' || title.includes('dinner')) {
                activityTime = '19:00';
              } else if (tag === 'hotel' && title.includes('check-in')) {
                activityTime = '15:00';
              } else if (tag === 'hotel' && title.includes('check-out')) {
                activityTime = '11:00';
              } else if (tag === 'flight' || tag === 'transport') {
                activityTime = order === 0 ? '08:00' : '10:00';
              }
            }
            
            try {
              await storage.createActivity({
                trip_id: newTrip.id,
                title: activity.title,
                date: activityDate.toISOString().split('T')[0],
              time: activityTime,
              location_name: locationName,
              latitude,
              longitude,
              notes: activity.notes,
              tag: activity.tag,
              order: order++,
              travel_mode: activity.travelMode || activity.travel_mode,
            });
            } catch (activityError) {
              logger.error(`Failed to create activity "${activity.title}":`, activityError);
              // Continue with other activities
            }
          }
        }
      } else if (tripData.activities && Array.isArray(tripData.activities)) {
        // Old format: flat activities array (for backwards compatibility)
        const actualStartDate = new Date(newTrip.start_date);
        
        for (const activity of tripData.activities) {
          if (!activity || !activity.title) continue;
          
          // Use the activity's date if available, otherwise calculate from day number
          let activityDate = new Date(actualStartDate);
          if (activity.date) {
            activityDate = new Date(activity.date);
          } else if (activity.day) {
            const dayNumber = parseInt(activity.day) || 1;
            activityDate.setDate(actualStartDate.getDate() + (dayNumber - 1));
          }
          
          // Validate the date is valid
          if (isNaN(activityDate.getTime())) {
            logger.error(`Invalid date for activity "${activity.title}"`);
            continue;
          }
          
          const locationName = activity.location || activity.locationName || activity.location_name;
          let latitude = activity.latitude?.toString() || null;
          let longitude = activity.longitude?.toString() || null;
          
          // If coordinates are missing but we have a location name, geocode it
          if (!latitude || !longitude) {
            if (locationName) {
              const geocoded = await geocodingService.geocodeWithFallback(
                locationName, 
                tripData.city || tripData.country
              );
              if (geocoded) {
                latitude = geocoded.latitude;
                longitude = geocoded.longitude;
                logger.info(`Geocoded activity location: ${locationName} -> ${latitude}, ${longitude}`);
              }
            }
          }
          
          // Generate smart default time if not provided
          let activityTime = activity.time;
          if (!activityTime) {
            // Assign times based on order
            const order = activity.order || 0;
            const timeSlots = ['09:00', '11:00', '14:00', '16:00', '19:00', '21:00'];
            activityTime = timeSlots[order % timeSlots.length];
            
            // Adjust based on activity type/tag if available
            const tag = (activity.tag || '').toLowerCase();
            const title = (activity.title || '').toLowerCase();
            
            if (tag === 'breakfast' || title.includes('breakfast')) {
              activityTime = '08:00';
            } else if (tag === 'lunch' || title.includes('lunch')) {
              activityTime = '12:30';
            } else if (tag === 'dinner' || title.includes('dinner')) {
              activityTime = '19:00';
            } else if (tag === 'hotel' && title.includes('check-in')) {
              activityTime = '15:00';
            } else if (tag === 'hotel' && title.includes('check-out')) {
              activityTime = '11:00';
            } else if (tag === 'flight' || tag === 'transport') {
              activityTime = order === 0 ? '08:00' : '10:00';
            }
          }
          
          try {
            await storage.createActivity({
              trip_id: newTrip.id,
              title: activity.title,
              date: activityDate.toISOString().split('T')[0],
            time: activityTime,
            location_name: locationName,
            latitude,
            longitude,
            notes: activity.notes,
            tag: activity.tag,
            order: activity.order || 0,
            travel_mode: activity.travelMode || activity.travel_mode,
          });
          } catch (activityError) {
            logger.error(`Failed to create activity "${activity.title}":`, activityError);
            // Continue with other activities
          }
        }
      }

      logger.info(`Copied template ${templateId} to trip ${newTrip.id} for user ${userId}`);
      return newTrip.id;
    } catch (error) {
      logger.error('Error copying template to trip:', error);
      throw error;
    }
  }

  /**
   * Generate a content hash for anti-piracy tracking
   */
  private generateContentHash(template: any): string {
    const content = {
      title: template.title,
      duration: template.duration,
      tripData: template.trip_data
    };
    
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(content));
    return hash.digest('hex').substring(0, 16); // Use first 16 chars for brevity
  }

  /**
   * Batch copy activities from template data
   */
  private async copyActivities(
    tripId: number, 
    activities: any[], 
    startDate: Date
  ): Promise<void> {
    // Group activities by day
    const activitiesByDay = new Map<number, any[]>();
    
    activities.forEach((activity) => {
      const dayNumber = activity.dayNumber || 0;
      if (!activitiesByDay.has(dayNumber)) {
        activitiesByDay.set(dayNumber, []);
      }
      activitiesByDay.get(dayNumber)!.push(activity);
    });

    // Create activities for each day
    for (const [dayNumber, dayActivities] of activitiesByDay) {
      const activityDate = new Date(startDate);
      activityDate.setDate(startDate.getDate() + dayNumber);
      
      // Validate the date is valid
      if (isNaN(activityDate.getTime())) {
        logger.error(`Invalid date calculated for day ${dayNumber}:`, { startDate, dayNumber });
        continue;
      }
      
      let order = 0;
      for (const activity of dayActivities) {
        await storage.createActivity({
          trip_id: tripId,
          title: activity.title,
          date: activityDate.toISOString().split('T')[0],
          time: activity.time,
          location_name: activity.locationName || activity.location_name,
          latitude: activity.latitude,
          longitude: activity.longitude,
          notes: activity.notes,
          tag: activity.tag || 'activity',
          order: order++,
          travel_mode: activity.travelMode || activity.travel_mode || 'driving',
        });
      }
    }
  }
}

export const templateCopyService = new TemplateCopyService();