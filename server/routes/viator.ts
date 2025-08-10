import { Router } from 'express';
import { viatorService } from '../services/viatorService';

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

export default router;