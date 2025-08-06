import { Router } from 'express';
import { seoContentGenerator } from '../services/seoContentGenerator';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// Get destination content (with AI generation fallback)
router.get('/:destination/content', async (req, res) => {
  try {
    const { destination } = req.params;
    
    // Convert slug to proper destination name
    const destinationName = destination
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Generate or retrieve content
    const content = await seoContentGenerator.generateDestinationContent(destinationName);
    
    // Add weather data (mock for now, could integrate weather API)
    const weatherData = {
      current: 'Sunny',
      temperature: 75,
      forecast: 'Clear skies expected all week'
    };
    
    // Add image URL
    const imageUrl = `https://source.unsplash.com/1600x900/?${destinationName},travel,landscape`;
    
    res.json({
      ...content,
      weather: weatherData,
      image: imageUrl,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Destination content error:', error);
    res.status(500).json({ error: 'Failed to load destination content' });
  }
});

// Get popular destinations
router.get('/popular', async (req, res) => {
  try {
    const popularDestinations = [
      { 
        slug: 'new-york',
        name: 'New York',
        country: 'USA',
        image: 'https://source.unsplash.com/400x300/?new-york-city',
        description: 'The city that never sleeps',
        activities: 1250,
        avgPrice: '$150'
      },
      {
        slug: 'paris',
        name: 'Paris',
        country: 'France',
        image: 'https://source.unsplash.com/400x300/?paris,eiffel-tower',
        description: 'City of lights and romance',
        activities: 980,
        avgPrice: '$120'
      },
      {
        slug: 'tokyo',
        name: 'Tokyo',
        country: 'Japan',
        image: 'https://source.unsplash.com/400x300/?tokyo,japan',
        description: 'Where tradition meets future',
        activities: 1100,
        avgPrice: '$130'
      },
      {
        slug: 'london',
        name: 'London',
        country: 'UK',
        image: 'https://source.unsplash.com/400x300/?london,big-ben',
        description: 'History and modernity combined',
        activities: 890,
        avgPrice: '$140'
      },
      {
        slug: 'dubai',
        name: 'Dubai',
        country: 'UAE',
        image: 'https://source.unsplash.com/400x300/?dubai,burj-khalifa',
        description: 'Luxury in the desert',
        activities: 650,
        avgPrice: '$180'
      },
      {
        slug: 'barcelona',
        name: 'Barcelona',
        country: 'Spain',
        image: 'https://source.unsplash.com/400x300/?barcelona,sagrada-familia',
        description: 'Art, architecture, and beaches',
        activities: 720,
        avgPrice: '$100'
      }
    ];
    
    res.json({ destinations: popularDestinations });
  } catch (error) {
    logger.error('Popular destinations error:', error);
    res.status(500).json({ error: 'Failed to load popular destinations' });
  }
});

// Search destinations
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    // Mock search results (in production, use a proper search service)
    const allDestinations = [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
      'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Miami',
      'London', 'Paris', 'Rome', 'Barcelona', 'Amsterdam',
      'Tokyo', 'Bangkok', 'Singapore', 'Dubai', 'Sydney'
    ];
    
    const results = allDestinations
      .filter(dest => dest.toLowerCase().includes(q.toLowerCase()))
      .map(dest => ({
        slug: dest.toLowerCase().replace(/\s+/g, '-'),
        name: dest,
        type: 'city'
      }));
    
    res.json({ results });
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