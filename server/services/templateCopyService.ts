import { storage } from '../storage';
import { logger } from '../utils/logger';
import { nanoid } from 'nanoid';

/**
 * Service to copy a purchased template to user's trips
 */
export class TemplateCopyService {
  /**
   * Copy a template to create a new trip for the user
   */
  async copyTemplateToTrip(templateId: number, userId: number): Promise<number> {
    try {
      // Get the template
      const template = await storage.getTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Verify user has purchased the template
      const hasPurchased = await storage.hasUserPurchasedTemplate(userId, templateId);
      if (!hasPurchased && template.price !== '0') {
        throw new Error('Template not purchased');
      }

      const tripData = template.trip_data as any;
      if (!tripData) {
        throw new Error('Template has no trip data');
      }

      // Create the new trip
      const newTrip = await storage.createTrip({
        title: tripData.title || template.title,
        start_date: new Date(), // Start from today
        end_date: new Date(Date.now() + (template.duration || 7) * 24 * 60 * 60 * 1000),
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
        // Add metadata about source template
        collaborators: [{
          source: 'template',
          templateId: templateId,
          templateTitle: template.title,
          copiedAt: new Date().toISOString()
        }]
      });

      // Copy activities if they exist
      if (tripData.activities && Array.isArray(tripData.activities)) {
        const startDate = new Date();
        
        for (let dayIndex = 0; dayIndex < tripData.activities.length; dayIndex++) {
          const dayActivities = Array.isArray(tripData.activities[dayIndex]) 
            ? tripData.activities[dayIndex] 
            : [tripData.activities[dayIndex]];
          
          for (const activity of dayActivities) {
            if (!activity || !activity.title) continue;
            
            const activityDate = new Date(startDate);
            activityDate.setDate(startDate.getDate() + dayIndex);
            
            await storage.createActivity({
              trip_id: newTrip.id,
              title: activity.title,
              date: activityDate,
              time: activity.time || null,
              location_name: activity.locationName || activity.location_name,
              latitude: activity.latitude,
              longitude: activity.longitude,
              notes: activity.notes,
              tag: activity.tag,
              order: activity.order || dayIndex,
              travel_mode: activity.travelMode || activity.travel_mode,
            });
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
      
      let order = 0;
      for (const activity of dayActivities) {
        await storage.createActivity({
          trip_id: tripId,
          title: activity.title,
          date: activityDate,
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