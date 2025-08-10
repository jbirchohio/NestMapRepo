import { Router } from 'express';
import { viatorService } from '../services/viatorService';
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
    
    const { latitude, longitude, activity_name, activityName, startDate, endDate } = req.body;
    
    // Handle both camelCase and snake_case
    const searchName = activityName || activity_name;

    if (!searchName) {
      // console.log('Missing activity name. Body keys:', Object.keys(req.body));
      return res.status(400).json({ error: 'Activity name is required' });
    }

    const activities = await viatorService.searchByLocationAndActivity(
      latitude,
      longitude,
      searchName
    );

    res.json({ activities });
  } catch (error) {
    console.error('Viator search error:', error);
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
    console.error('Product details error:', error);
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
    console.error('Affiliate link error:', error);
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
    console.error('City activities search error:', error);
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
    
    const { productCode, productName, price, duration, affiliateLink, city, tripId } = req.body;
    
    // If no tripId provided, create a new "Ideas" trip or use existing one
    let targetTripId = tripId;
    
    if (!targetTripId) {
      // Check if user has an "Ideas" trip for this city
      const ideasTrip = await db.select()
        .from(trips)
        .where(
          and(
            eq(trips.user_id, req.user.id),
            eq(trips.title, `${city} Ideas`),
            eq(trips.status, 'active')
          )
        )
        .limit(1);
      
      if (ideasTrip.length > 0) {
        targetTripId = ideasTrip[0].id;
      } else {
        // Create a new ideas trip
        const [newTrip] = await db.insert(trips)
          .values({
            title: `${city} Ideas`,
            description: `Activities and ideas for ${city}`,
            user_id: req.user.id,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            city: city.replace(/-/g, ' '),
            status: 'active'
          })
          .returning();
        
        targetTripId = newTrip.id;
      }
    }
    
    // Add the activity to the trip
    const [activity] = await db.insert(activities)
      .values({
        trip_id: targetTripId,
        title: productName,
        notes: `Viator Activity - ${duration || 'Duration varies'}\nPrice: From $${price}\nBooking: ${affiliateLink}`,
        tag: 'activity',
        provider: 'viator',
        booking_url: affiliateLink,
        price: price?.toString(),
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
    console.error('Error saving activity:', error);
    res.status(500).json({ error: 'Failed to save activity' });
  }
});

/**
 * Track affiliate link clicks for analytics
 */
router.post('/track-click', async (req, res) => {
  try {
    const { productCode, productName, city } = req.body;
    const userId = req.user?.id || null;
    
    // Log the click for analytics (you could save this to a database table)
    console.log('Viator affiliate click tracked:', {
      productCode,
      productName,
      city,
      userId,
      timestamp: new Date().toISOString()
    });
    
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
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

export default router;