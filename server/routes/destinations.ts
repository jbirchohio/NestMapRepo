import { Router } from 'express';
import { seoContentGenerator } from '../services/seoContentGenerator';
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
        
        // Get real weather data
        const weatherData = await getCurrentWeather(destinationData.name);
        
        // Set cache headers for browser caching
        res.set({
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'ETag': `"${destination}-${destinationData.updated_at?.toISOString().split('T')[0]}"` // Based on last update
        });
        
        // Return the stored content with real weather
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
          image: destinationData.cover_image || `https://source.unsplash.com/800x450/?${destinationData.name},travel,landscape`,
          weather: weatherData ? {
            current: weatherData.description,
            temperature: weatherData.temperature,
            humidity: weatherData.humidity,
            windSpeed: weatherData.windSpeed,
            unit: weatherData.unit,
            forecast: `${weatherData.condition} with ${weatherData.temperature}°${weatherData.unit}`
          } : {
            current: 'Clear',
            temperature: 72,
            unit: 'F',
            forecast: 'Pleasant weather expected'
          },
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
    
    const content = await seoContentGenerator.generateDestinationContent(destinationName);
    
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
            country: 'Unknown', // Would need geocoding to determine
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
            status: 'published',
            ai_generated: true
          });
          logger.info(`Created destination: ${destination}`);
        }
      } catch (err) {
        logger.error(`Failed to save/update destination ${destination}:`, err);
      }
    }
    
    // Try to get real weather for the destination
    const weatherData = await getCurrentWeather(destinationName);
    
    // Return the generated content
    res.json({
      ...content,
      weather: weatherData ? {
        current: weatherData.description,
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        unit: weatherData.unit,
        forecast: `${weatherData.condition} with ${weatherData.temperature}°${weatherData.unit}`
      } : {
        current: 'Clear',
        temperature: 72,
        unit: 'F',
        forecast: 'Pleasant weather expected'
      },
      image: `https://source.unsplash.com/800x450/?${destinationName},travel,landscape`,
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
    
    if (dbDestinations.length > 0) {
      const popularDestinations = dbDestinations.map(dest => ({
        slug: dest.slug,
        name: dest.name,
        country: dest.country,
        image: dest.thumbnail_image || `https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=400&h=300&fit=crop`,
        description: dest.hero_description || dest.meta_description,
        activities: dest.activity_count || 0,
        avgPrice: dest.avg_daily_cost ? `$${dest.avg_daily_cost}` : '$100',
        templateCount: dest.template_count || 0
      }));
      
      res.json({ destinations: popularDestinations });
    } else {
      // Fallback to hardcoded list if no destinations in database
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
      
      res.json({ destinations: popularDestinations });
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
    
    // If we have enough database results, return them
    if (dbMatches.length >= 5) {
      return res.json({ results: dbMatches.slice(0, 10) });
    }
    
    // Otherwise, include some popular worldwide destinations
    const popularDestinations = [
      { name: 'New York', country: 'USA', region: 'North America' },
      { name: 'Los Angeles', country: 'USA', region: 'North America' },
      { name: 'Chicago', country: 'USA', region: 'North America' },
      { name: 'Miami', country: 'USA', region: 'North America' },
      { name: 'San Francisco', country: 'USA', region: 'North America' },
      { name: 'Las Vegas', country: 'USA', region: 'North America' },
      { name: 'London', country: 'UK', region: 'Europe' },
      { name: 'Paris', country: 'France', region: 'Europe' },
      { name: 'Rome', country: 'Italy', region: 'Europe' },
      { name: 'Barcelona', country: 'Spain', region: 'Europe' },
      { name: 'Amsterdam', country: 'Netherlands', region: 'Europe' },
      { name: 'Berlin', country: 'Germany', region: 'Europe' },
      { name: 'Tokyo', country: 'Japan', region: 'Asia' },
      { name: 'Bangkok', country: 'Thailand', region: 'Asia' },
      { name: 'Singapore', country: 'Singapore', region: 'Asia' },
      { name: 'Dubai', country: 'UAE', region: 'Middle East' },
      { name: 'Sydney', country: 'Australia', region: 'Oceania' },
      { name: 'Toronto', country: 'Canada', region: 'North America' },
      { name: 'Mexico City', country: 'Mexico', region: 'North America' },
      { name: 'Rio de Janeiro', country: 'Brazil', region: 'South America' },
      { name: 'Buenos Aires', country: 'Argentina', region: 'South America' },
      { name: 'Cape Town', country: 'South Africa', region: 'Africa' },
      { name: 'Cairo', country: 'Egypt', region: 'Africa' },
      { name: 'Istanbul', country: 'Turkey', region: 'Europe/Asia' }
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
    
    // Combine results, prioritizing database results
    const allResults = [...dbMatches, ...additionalResults].slice(0, 10);
    
    res.json({ results: allResults });
  } catch (error) {
    logger.error('Destination search error:', error);
    res.status(500).json({ error: 'Search failed' });
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