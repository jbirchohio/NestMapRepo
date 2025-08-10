import { Router } from 'express';
import { seoContentGenerator } from '../services/seoContentGenerator';
import { optimizedContentGenerator } from '../services/optimizedContentGenerator';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { db } from '../db-connection';
import { destinations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getCurrentWeather } from '../weather';

const router = Router();

// Get destination content from database
router.get('/:destination/content', async (req, res) => {
  try {
    const { destination } = req.params;
    
    // First, try to get from database
    const [destinationData] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.slug, destination))
      .limit(1);
    
    if (destinationData) {
      // Destination exists - check if it needs updating
      if (destinationData.status === 'published' && destinationData.overview && destinationData.overview.length > 100) {
        // Has good content - just increment view count and return
        await db
          .update(destinations)
          .set({ view_count: (destinationData.view_count || 0) + 1 })
          .where(eq(destinations.id, destinationData.id));
        
        // Set cache headers for browser caching
        res.set({
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'ETag': `"${destination}-${destinationData.updated_at?.toISOString().split('T')[0]}"` // Based on last update
        });
        
        // Return the stored content
        return res.json({
          title: destinationData.title,
          metaDescription: destinationData.meta_description,
          heroDescription: destinationData.hero_description,
          overview: destinationData.overview,
          bestTimeToVisit: destinationData.best_time_to_visit,
          topAttractions: destinationData.top_attractions as string[],
          localTips: destinationData.local_tips as string[],
          gettingAround: destinationData.getting_around,
          whereToStay: destinationData.where_to_stay,
          foodAndDrink: destinationData.food_and_drink,
          faqs: destinationData.faqs as Array<{question: string; answer: string}>,
          image: destinationData.cover_image,
          seasonalWeather: destinationData.seasonal_weather,
          imageAttribution: destinationData.image_attribution,
          lastUpdated: destinationData.updated_at?.toISOString()
        });
      }
      
      // Destination exists but needs better content - regenerate
    }
    
    // Generate fresh content (for new destinations or ones needing update)
    const destinationName = destinationData?.name || destination
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Use optimized generator for faster response times
    const content = await optimizedContentGenerator.generateDestinationContent(destinationName);
    
    // Save or update in database
    if (content.title && content.overview && content.overview.length > 100) {
      try {
        if (destinationData) {
          // UPDATE existing destination
          await db.update(destinations)
            .set({
              title: content.title,
              meta_description: content.metaDescription,
              hero_description: content.heroDescription,
              overview: content.overview,
              best_time_to_visit: content.bestTimeToVisit,
              top_attractions: content.topAttractions,
              local_tips: content.localTips,
              getting_around: content.gettingAround,
              where_to_stay: content.whereToStay,
              food_and_drink: content.foodAndDrink,
              faqs: content.faqs,
              seasonal_weather: content.seasonalWeather,
              cover_image: destinationData.cover_image || content.coverImage,
              thumbnail_image: destinationData.thumbnail_image || content.thumbnailImage,
              image_attribution: content.imageAttribution,
              status: 'published',
              ai_generated: true,
              updated_at: new Date()
            })
            .where(eq(destinations.id, destinationData.id));
          logger.info(`Updated destination: ${destination}`);
        } else {
          // INSERT new destination
          await db.insert(destinations).values({
            slug: destination,
            name: destinationName,
            country: content.country || 'World', // Use AI-inferred country
            activity_count: content.estimatedActivities || 100,
            title: content.title,
            meta_description: content.metaDescription,
            hero_description: content.heroDescription,
            overview: content.overview,
            best_time_to_visit: content.bestTimeToVisit,
            top_attractions: content.topAttractions,
            local_tips: content.localTips,
            getting_around: content.gettingAround,
            where_to_stay: content.whereToStay,
            food_and_drink: content.foodAndDrink,
            faqs: content.faqs,
            seasonal_weather: content.seasonalWeather,
            cover_image: content.coverImage,
            thumbnail_image: content.thumbnailImage,
            image_attribution: content.imageAttribution,
            status: 'published',
            ai_generated: true
          });
          logger.info(`Created destination: ${destination}`);
        }
      } catch (err) {
        logger.error(`Failed to save/update destination ${destination}:`, err);
      }
    }
    
    // Return the generated content with seasonal weather
    res.json({
      ...content,
      image: content.coverImage || content.contentImage,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Destination content error:', error);
    res.status(500).json({ error: 'Failed to load destination content' });
  }
});

// Get popular destinations from database
router.get('/popular', async (req, res) => {
  try {
    // Get featured/popular destinations from database
    const dbDestinations = await db
      .select()
      .from(destinations)
      .where(eq(destinations.status, 'published'))
      .orderBy(destinations.popularity_score)
      .limit(6);
    
    // If we have some destinations from DB, use them
    const dbDestinationsMapped = dbDestinations.map(dest => ({
      slug: dest.slug,
      name: dest.name,
      country: dest.country,
      image: dest.thumbnail_image || `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop&q=80`,
      description: dest.hero_description || dest.meta_description,
      activities: dest.activity_count || 0,
      templateCount: dest.template_count || 0
    }));
    
    // If we have less than 6 destinations, supplement with hardcoded popular ones
    if (dbDestinations.length < 6) {
      // Fallback to hardcoded list to ensure we always show destinations
      const popularDestinations = [
        { 
          slug: 'new-york',
          name: 'New York',
          country: 'USA',
          image: 'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=400&h=300&fit=crop',
          description: 'The city that never sleeps',
          activities: 1250,
          avgPrice: '$150',
          templateCount: 0
        },
        {
          slug: 'paris',
          name: 'Paris',
          country: 'France',
          image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop',
          description: 'City of lights and romance',
          activities: 980,
          avgPrice: '$120',
          templateCount: 0
        },
        {
          slug: 'tokyo',
          name: 'Tokyo',
          country: 'Japan',
          image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop',
          description: 'Where tradition meets future',
          activities: 1100,
          avgPrice: '$130',
          templateCount: 0
        },
        {
          slug: 'london',
          name: 'London',
          country: 'UK',
          image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop',
          description: 'History and modernity combined',
          activities: 890,
          avgPrice: '$140',
          templateCount: 0
        },
        {
          slug: 'dubai',
          name: 'Dubai',
          country: 'UAE',
          image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop',
          description: 'Luxury in the desert',
          activities: 650,
          avgPrice: '$180',
          templateCount: 0
        },
        {
          slug: 'barcelona',
          name: 'Barcelona',
          country: 'Spain',
          image: 'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=400&h=300&fit=crop',
          description: 'Art, architecture, and beaches',
          activities: 720,
          avgPrice: '$100',
          templateCount: 0
        }
      ];
      
      // Filter out any destinations we already have from DB
      const existingSlugs = dbDestinationsMapped.map(d => d.slug);
      const additionalDestinations = popularDestinations.filter(d => !existingSlugs.includes(d.slug));
      
      // Combine DB destinations with hardcoded ones
      const combinedDestinations = [...dbDestinationsMapped, ...additionalDestinations].slice(0, 6);
      res.json({ destinations: combinedDestinations });
    } else {
      // We have enough destinations from DB
      res.json({ destinations: dbDestinationsMapped });
    }
  } catch (error) {
    logger.error('Popular destinations error:', error);
    res.status(500).json({ error: 'Failed to load popular destinations' });
  }
});

// Search destinations - supports database and dynamic search
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    // First, search in database
    const dbResults = await db
      .select()
      .from(destinations)
      .where(eq(destinations.status, 'published'))
      .limit(10);
    
    const dbMatches = dbResults
      .filter(dest => 
        dest.name.toLowerCase().includes(q.toLowerCase()) ||
        dest.country?.toLowerCase().includes(q.toLowerCase()) ||
        dest.region?.toLowerCase().includes(q.toLowerCase())
      )
      .map(dest => ({
        slug: dest.slug,
        name: dest.name,
        country: dest.country,
        type: 'city',
        inDatabase: true,
        description: dest.hero_description || dest.meta_description
      }));
    
    // Extended list of worldwide destinations
    const popularDestinations = [
      // Europe
      { name: 'Madrid', country: 'Spain', region: 'Europe' },
      { name: 'Barcelona', country: 'Spain', region: 'Europe' },
      { name: 'Valencia', country: 'Spain', region: 'Europe' },
      { name: 'Seville', country: 'Spain', region: 'Europe' },
      { name: 'Paris', country: 'France', region: 'Europe' },
      { name: 'Nice', country: 'France', region: 'Europe' },
      { name: 'Lyon', country: 'France', region: 'Europe' },
      { name: 'London', country: 'UK', region: 'Europe' },
      { name: 'Edinburgh', country: 'UK', region: 'Europe' },
      { name: 'Rome', country: 'Italy', region: 'Europe' },
      { name: 'Milan', country: 'Italy', region: 'Europe' },
      { name: 'Venice', country: 'Italy', region: 'Europe' },
      { name: 'Florence', country: 'Italy', region: 'Europe' },
      { name: 'Amsterdam', country: 'Netherlands', region: 'Europe' },
      { name: 'Berlin', country: 'Germany', region: 'Europe' },
      { name: 'Munich', country: 'Germany', region: 'Europe' },
      { name: 'Vienna', country: 'Austria', region: 'Europe' },
      { name: 'Prague', country: 'Czech Republic', region: 'Europe' },
      { name: 'Budapest', country: 'Hungary', region: 'Europe' },
      { name: 'Lisbon', country: 'Portugal', region: 'Europe' },
      { name: 'Porto', country: 'Portugal', region: 'Europe' },
      { name: 'Athens', country: 'Greece', region: 'Europe' },
      { name: 'Dublin', country: 'Ireland', region: 'Europe' },
      { name: 'Copenhagen', country: 'Denmark', region: 'Europe' },
      { name: 'Stockholm', country: 'Sweden', region: 'Europe' },
      { name: 'Oslo', country: 'Norway', region: 'Europe' },
      { name: 'Helsinki', country: 'Finland', region: 'Europe' },
      { name: 'Zurich', country: 'Switzerland', region: 'Europe' },
      { name: 'Brussels', country: 'Belgium', region: 'Europe' },
      
      // North America
      { name: 'New York', country: 'USA', region: 'North America' },
      { name: 'Los Angeles', country: 'USA', region: 'North America' },
      { name: 'Chicago', country: 'USA', region: 'North America' },
      { name: 'Miami', country: 'USA', region: 'North America' },
      { name: 'San Francisco', country: 'USA', region: 'North America' },
      { name: 'Las Vegas', country: 'USA', region: 'North America' },
      { name: 'Boston', country: 'USA', region: 'North America' },
      { name: 'Seattle', country: 'USA', region: 'North America' },
      { name: 'Washington DC', country: 'USA', region: 'North America' },
      { name: 'San Diego', country: 'USA', region: 'North America' },
      { name: 'Denver', country: 'USA', region: 'North America' },
      { name: 'Austin', country: 'USA', region: 'North America' },
      { name: 'Toronto', country: 'Canada', region: 'North America' },
      { name: 'Vancouver', country: 'Canada', region: 'North America' },
      { name: 'Montreal', country: 'Canada', region: 'North America' },
      { name: 'Mexico City', country: 'Mexico', region: 'North America' },
      { name: 'Cancun', country: 'Mexico', region: 'North America' },
      
      // Asia
      { name: 'Tokyo', country: 'Japan', region: 'Asia' },
      { name: 'Kyoto', country: 'Japan', region: 'Asia' },
      { name: 'Osaka', country: 'Japan', region: 'Asia' },
      { name: 'Bangkok', country: 'Thailand', region: 'Asia' },
      { name: 'Phuket', country: 'Thailand', region: 'Asia' },
      { name: 'Singapore', country: 'Singapore', region: 'Asia' },
      { name: 'Bali', country: 'Indonesia', region: 'Asia' },
      { name: 'Jakarta', country: 'Indonesia', region: 'Asia' },
      { name: 'Seoul', country: 'South Korea', region: 'Asia' },
      { name: 'Hong Kong', country: 'China', region: 'Asia' },
      { name: 'Shanghai', country: 'China', region: 'Asia' },
      { name: 'Beijing', country: 'China', region: 'Asia' },
      { name: 'Mumbai', country: 'India', region: 'Asia' },
      { name: 'Delhi', country: 'India', region: 'Asia' },
      { name: 'Kuala Lumpur', country: 'Malaysia', region: 'Asia' },
      
      // Middle East
      { name: 'Dubai', country: 'UAE', region: 'Middle East' },
      { name: 'Abu Dhabi', country: 'UAE', region: 'Middle East' },
      { name: 'Istanbul', country: 'Turkey', region: 'Europe/Asia' },
      { name: 'Tel Aviv', country: 'Israel', region: 'Middle East' },
      { name: 'Jerusalem', country: 'Israel', region: 'Middle East' },
      
      // Oceania
      { name: 'Sydney', country: 'Australia', region: 'Oceania' },
      { name: 'Melbourne', country: 'Australia', region: 'Oceania' },
      { name: 'Auckland', country: 'New Zealand', region: 'Oceania' },
      
      // South America
      { name: 'Rio de Janeiro', country: 'Brazil', region: 'South America' },
      { name: 'São Paulo', country: 'Brazil', region: 'South America' },
      { name: 'Buenos Aires', country: 'Argentina', region: 'South America' },
      { name: 'Lima', country: 'Peru', region: 'South America' },
      { name: 'Santiago', country: 'Chile', region: 'South America' },
      
      // Africa
      { name: 'Cape Town', country: 'South Africa', region: 'Africa' },
      { name: 'Johannesburg', country: 'South Africa', region: 'Africa' },
      { name: 'Cairo', country: 'Egypt', region: 'Africa' },
      { name: 'Marrakech', country: 'Morocco', region: 'Africa' },
      { name: 'Nairobi', country: 'Kenya', region: 'Africa' }
    ];
    
    const additionalResults = popularDestinations
      .filter(dest => 
        dest.name.toLowerCase().includes(q.toLowerCase()) ||
        dest.country.toLowerCase().includes(q.toLowerCase()) ||
        dest.region.toLowerCase().includes(q.toLowerCase())
      )
      .filter(dest => !dbMatches.some(db => db.name === dest.name)) // Avoid duplicates
      .map(dest => ({
        slug: dest.name.toLowerCase().replace(/\s+/g, '-'),
        name: dest.name,
        country: dest.country,
        type: 'city',
        inDatabase: false,
        description: `Explore ${dest.name}, ${dest.country}`
      }));
    
    // Log for debugging
    logger.info(`Search query: ${q}, DB matches: ${dbMatches.length}, Additional: ${additionalResults.length}`);
    
    // Combine results, prioritizing database results
    const allResults = [...dbMatches, ...additionalResults].slice(0, 10);
    
    res.json({ results: allResults });
  } catch (error) {
    logger.error('Destination search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Admin: Regenerate destination content
router.post('/:destination/regenerate', async (req, res) => {
  try {
    const { destination } = req.params;
    
    // Get existing destination to preserve some data
    const [existingDest] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.slug, destination))
      .limit(1);
    
    if (!existingDest) {
      return res.status(404).json({ error: 'Destination not found' });
    }
    
    // Generate fresh content
    const content = await optimizedContentGenerator.generateDestinationContent(existingDest.name);
    
    // Update the destination with new content
    await db.update(destinations)
      .set({
        country: content.country || existingDest.country,
        activity_count: content.estimatedActivities || 100,
        title: content.title,
        meta_description: content.metaDescription,
        hero_description: content.heroDescription,
        overview: content.overview,
        best_time_to_visit: content.bestTimeToVisit,
        top_attractions: content.topAttractions,
        local_tips: content.localTips,
        getting_around: content.gettingAround,
        where_to_stay: content.whereToStay,
        food_and_drink: content.foodAndDrink,
        faqs: content.faqs,
        seasonal_weather: content.seasonalWeather,
        cover_image: content.coverImage,
        thumbnail_image: content.thumbnailImage,
        image_attribution: content.imageAttribution,
        last_regenerated: new Date(),
        updated_at: new Date()
      })
      .where(eq(destinations.id, existingDest.id));
    
    logger.info(`Regenerated destination: ${destination}`);
    res.json({ 
      success: true, 
      message: `Successfully regenerated content for ${existingDest.name}` 
    });
  } catch (error) {
    logger.error('Destination regeneration error:', error);
    res.status(500).json({ error: 'Failed to regenerate destination' });
  }
});

// Get activities for a destination
router.get('/:destination/activities/:type', async (req, res) => {
  try {
    const { destination, type } = req.params;
    
    // Convert to proper names
    const destinationName = destination
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Generate activity content
    const activities = [
      {
        id: 1,
        name: `${type} in ${destinationName}`,
        description: 'Experience the best of the city',
        price: '$45',
        duration: '3 hours',
        rating: 4.8,
        reviews: 234
      },
      // Add more mock activities
    ];
    
    res.json({ activities });
  } catch (error) {
    logger.error('Activities error:', error);
    res.status(500).json({ error: 'Failed to load activities' });
  }
});

export default router;
