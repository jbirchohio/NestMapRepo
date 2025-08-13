import { Router } from 'express';
import { viatorService } from '../services/viatorService';
import { geocodingService } from '../services/geocodingService';
import { db } from '../db-connection';
import { trips, activities } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

/**
 * Search for bookable activities based on location
 */
router.post('/search', async (req, res) => {
  try {
    // Removed verbose logging - was flooding Railway logs
    // console.log('Viator search request body:', req.body);
    
    const { latitude, longitude, activity_name, activityName, city, startDate, endDate } = req.body;
    
    // Handle both camelCase and snake_case
    const searchName = activityName || activity_name;

    if (!searchName) {
      // console.log('Missing activity name. Body keys:', Object.keys(req.body));
      return res.status(400).json({ error: 'Activity name is required' });
    }

    // Only search if we have a city - no fallback to wrong locations
    let activities = [];
    
    if (city) {
      console.log(`Searching Viator for "${searchName}" in ${city}`);
      
      // First, get the destination ID for the city
      const destId = await viatorService.getDestinationId(city);
      
      if (destId) {
        // Search activities for this specific destination
        activities = await viatorService.searchActivities({
          destId,
          searchQuery: searchName,
          topX: '1-10',
          sortOrder: 'TRAVELER_RATING'
        });
        
        // If we have coordinates, filter to only show activities within ~10 miles
        if (latitude && longitude && activities.length > 0) {
          console.log(`Filtering ${activities.length} activities by distance from coordinates`);
          // Note: Viator doesn't always provide coordinates for activities,
          // so we may not be able to filter by distance effectively
          // For now, we trust that activities with the destination ID are relevant
        }
      } else {
        console.log(`Could not find Viator destination ID for ${city} - no activities to show`);
        // Return empty array - don't show activities from wrong locations
        activities = [];
      }
    } else {
      console.log(`No city provided for Viator search - returning empty results`);
      // No city = no search. Don't guess wrong locations.
      activities = [];
    }

    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search activities' });
  }
});

/**
 * Get activity details
 */
router.get('/product/:productCode', async (req, res) => {
  try {
    const { productCode } = req.params;
    const details = await viatorService.getProductDetails(productCode);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get product details' });
  }
});

/**
 * Generate affiliate link
 */
router.post('/affiliate-link', async (req, res) => {
  try {
    const { productCode } = req.body;
    const link = viatorService.generateAffiliateLink(productCode);
    res.json({ affiliateLink: link });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate affiliate link' });
  }
});

/**
 * Search activities by city name (dynamically finds destination ID)
 */
router.get('/search/city/:cityName', async (req, res) => {
  try {
    const { cityName } = req.params;
    const { limit = 12 } = req.query;
    
    // Clean up the city name (remove dashes, normalize)
    const cleanCityName = cityName.replace(/-/g, ' ');
    
    // Dynamically search for the destination ID
    const destId = await viatorService.getDestinationId(cleanCityName);
    
    if (!destId) {
      // If city not found, return empty array with helpful message
      return res.json({ 
        activities: [],
        message: `No activities found for ${cleanCityName}. This destination might not be available on Viator yet.`,
        city: cleanCityName
      });
    }
    
    // Search for activities using the found destination ID
    const activities = await viatorService.searchActivities({
      destId,
      topX: `1-${limit}`,
      sortOrder: 'TRAVELER_RATING'
    });
    
    // Add affiliate links to each activity
    const activitiesWithLinks = activities.map(activity => ({
      ...activity,
      affiliateLink: viatorService.generateAffiliateLink(activity.productCode)
    }));
    
    res.json({ 
      activities: activitiesWithLinks,
      city: cleanCityName,
      destId,
      totalFound: activitiesWithLinks.length
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to search city activities',
      message: 'Unable to fetch activities at this time. Please try again later.'
    });
  }
});

/**
 * Save Viator activity to user's trip
 */
router.post('/save-activity', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Handle both camelCase and snake_case due to case conversion middleware
    const productCode = req.body.productCode || req.body.product_code;
    const productName = req.body.productName || req.body.product_name;
    const price = req.body.price;
    const duration = req.body.duration;
    const affiliateLink = req.body.affiliateLink || req.body.affiliate_link;
    const city = req.body.city;
    const tripId = req.body.tripId || req.body.trip_id;
    const activityDate = req.body.date;
    const activityTime = req.body.time;
    
    // Validate required fields
    
    // Validate required fields
    if (!productName || !productCode) {
      return res.status(400).json({ error: 'Activity name and product code are required' });
    }
    
    // Clean up city name
    const cleanCity = (city || 'Unknown').replace(/-/g, ' ');
    
    // TripId should always be provided now from the modal
    if (!tripId) {
      return res.status(400).json({ error: 'Trip ID is required' });
    }
    
    let targetTripId = tripId;
    
    // Build notes with available information
    const notes = [
      'Viator Activity',
      duration ? `Duration: ${duration}` : null,
      price ? `Price: From $${price}` : null,
      affiliateLink ? `Booking: ${affiliateLink}` : null,
      productCode ? `Product Code: ${productCode}` : null
    ].filter(Boolean).join('\n');
    
    // Try to geocode the activity location
    let activityCoords = null;
    try {
      // Use activity name + city for better geocoding results
      const locationQuery = `${productName}, ${cleanCity}`;
      activityCoords = await geocodingService.geocodeLocation(locationQuery, cleanCity);
    } catch (error) {
      // Could not geocode activity location
    }
    
    // Use provided time or determine a reasonable default based on activity type/duration
    let finalTime = activityTime;
    if (!finalTime) {
      // Default time based on activity type
      let defaultTime = '09:00'; // Default morning time
      if (duration) {
        // If it's a full day activity, start early
        if (duration.toLowerCase().includes('day') || duration.includes('8h')) {
          defaultTime = '08:00';
        } else if (duration.includes('evening') || duration.includes('night')) {
          defaultTime = '19:00';
        } else if (duration.includes('afternoon')) {
          defaultTime = '14:00';
        }
      }
      finalTime = defaultTime;
    }
    
    // Determine activity tag/type for better categorization
    let activityTag = 'activity'; // default
    const lowerName = (productName || '').toLowerCase();
    if (lowerName.includes('tour') || lowerName.includes('sightseeing')) {
      activityTag = 'tour';
    } else if (lowerName.includes('food') || lowerName.includes('dinner') || lowerName.includes('lunch')) {
      activityTag = 'food';
    } else if (lowerName.includes('transfer') || lowerName.includes('transport')) {
      activityTag = 'transport';
    }
    
    // Add the activity to the trip
    const [activity] = await db.insert(activities)
      .values({
        trip_id: targetTripId,
        title: productName || 'Viator Activity', // Ensure title is never null
        date: activityDate || null, // The specific date for the activity
        time: finalTime, // Add time field for timeline display
        notes: notes,
        tag: activityTag, // Better categorization
        location_name: cleanCity,
        latitude: activityCoords?.latitude || null,
        longitude: activityCoords?.longitude || null,
        provider: 'viator',
        booking_url: affiliateLink || '',
        booking_reference: productCode || '',
        price: price ? price.toString() : null,
        currency: 'USD',
        order: 0
      })
      .returning();
    
    res.json({ 
      success: true, 
      activityId: activity.id,
      tripId: targetTripId,
      message: 'Activity saved to your trip!'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to save activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Track affiliate link clicks for analytics
 */
router.post('/track-click', async (req, res) => {
  try {
    // Handle both camelCase and snake_case
    const productCode = req.body.productCode || req.body.product_code;
    const productName = req.body.productName || req.body.product_name;
    const city = req.body.city;
    const userId = req.user?.id || null;
    
    // You could create a viator_clicks table to track this data:
    // await db.insert(viatorClicks).values({
    //   product_code: productCode,
    //   product_name: productName,
    //   city,
    //   user_id: userId,
    //   clicked_at: new Date()
    // });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track click' });
  }
});

export default router;