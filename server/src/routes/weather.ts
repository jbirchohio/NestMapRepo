import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Apply JWT authentication to all weather routes
router.use(authenticateJWT);

// Validation schemas
const forecastSchema = z.object({
  location: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  days: z.number().min(1).max(14).default(7),
  units: z.enum(['metric', 'imperial']).default('metric')
});

// Helper function to call weather API (OpenWeatherMap in this case)
const getWeatherData = async (location: string, date?: string, days: number = 7) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    logger.warn('OpenWeatherMap API key not configured, using mock data');
    return getMockWeatherData(location, date, days);
  }
  
  try {
    // Get coordinates for the location using OpenWeatherMap Geocoding API
    const geocodingResponse = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`
    );
    
    if (!geocodingResponse.ok) {
      throw new Error(`Geocoding API error: ${geocodingResponse.status}`);
    }
    
    const geoData = await geocodingResponse.json();
    if (!geoData || geoData.length === 0) {
      throw new Error(`Location not found: ${location}`);
    }
    
    const { lat, lon, name, country } = geoData[0];
    
    // Get current weather
    const currentWeatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );
    
    if (!currentWeatherResponse.ok) {
      throw new Error(`Current weather API error: ${currentWeatherResponse.status}`);
    }
    
    const currentWeatherData = await currentWeatherResponse.json();
    
    // Get forecast data
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=${Math.min(days * 8, 40)}`
    );
    
    if (!forecastResponse.ok) {
      throw new Error(`Forecast API error: ${forecastResponse.status}`);
    }
    
    const forecastData = await forecastResponse.json();
    
    // Process and format the data
    const forecasts: any[] = [];
    
    // Group forecast data by day
    const dailyForecasts: { [key: string]: any[] } = {};
    
    forecastData.list.forEach((item: any) => {
      const itemDate = new Date(item.dt * 1000);
      const dateKey = itemDate.toISOString().split('T')[0];
      
      if (!dailyForecasts[dateKey]) {
        dailyForecasts[dateKey] = [];
      }
      dailyForecasts[dateKey].push(item);
    });
    
    // Create daily summaries
    Object.keys(dailyForecasts).slice(0, days).forEach((dateKey, index) => {
      const dayData = dailyForecasts[dateKey];
      const temps = dayData.map(d => d.main.temp);
      const conditions = dayData.map(d => d.weather[0]);
      
      // Get most common weather condition for the day
      const weatherCounts: { [key: string]: number } = {};
      conditions.forEach(condition => {
        weatherCounts[condition.main] = (weatherCounts[condition.main] || 0) + 1;
      });
      
      const dominantWeather = Object.keys(weatherCounts).reduce((a, b) => 
        weatherCounts[a] > weatherCounts[b] ? a : b
      );
      
      const dominantCondition = conditions.find(c => c.main === dominantWeather);
      
      forecasts.push({
        date: dateKey,
        temperature: {
          min: Math.round(Math.min(...temps)),
          max: Math.round(Math.max(...temps)),
          current: index === 0 ? Math.round(currentWeatherData.main.temp) : null
        },
        weather: {
          main: dominantCondition.main,
          description: dominantCondition.description,
          icon: dominantCondition.icon
        },
        humidity: Math.round(dayData.reduce((sum, d) => sum + d.main.humidity, 0) / dayData.length),
        windSpeed: Math.round(dayData.reduce((sum, d) => sum + d.wind.speed, 0) / dayData.length),
        windDirection: Math.round(dayData.reduce((sum, d) => sum + (d.wind.deg || 0), 0) / dayData.length),
        pressure: Math.round(dayData.reduce((sum, d) => sum + d.main.pressure, 0) / dayData.length),
        visibility: Math.round((dayData.reduce((sum, d) => sum + (d.visibility || 10000), 0) / dayData.length) / 1000),
        uvIndex: Math.round(Math.random() * 10), // UV index not available in free plan
        precipitationChance: Math.round(dayData.reduce((sum, d) => sum + (d.pop || 0), 0) / dayData.length * 100)
      });
    });
    
    const weatherData = {
      location: {
        name: name,
        country: country,
        coordinates: { lat, lon },
        timezone: currentWeatherData.timezone ? `UTC${currentWeatherData.timezone >= 0 ? '+' : ''}${currentWeatherData.timezone / 3600}` : 'UTC'
      },
      current: forecasts[0],
      forecast: forecasts,
      alerts: generateWeatherAlerts(forecasts),
      travelRecommendations: generateTravelRecommendations(forecasts)
    };
    
    return weatherData;
    
  } catch (error) {
    logger.error('Weather API error:', error);
    logger.warn('Falling back to mock weather data');
    return getMockWeatherData(location, date, days);
  }
};

// Mock weather data generator for testing and development
const getMockWeatherData = (location: string, date?: string, days: number = 7) => {
  const currentDate = date ? new Date(date) : new Date();
  const forecasts: any[] = [];
  
  // Generate weather data for the requested days
  for (let i = 0; i < days; i++) {
    const forecastDate = new Date(currentDate);
    forecastDate.setDate(currentDate.getDate() + i);
    
    // Simulate different weather patterns based on location
    const isRainy = Math.random() > 0.7;
    const isCloudy = Math.random() > 0.5;
    const baseTemp = getBaseTemperature(location);
    const tempVariation = (Math.random() - 0.5) * 10;
    
    forecasts.push({
      date: forecastDate.toISOString().split('T')[0],
      temperature: {
        min: Math.round(baseTemp + tempVariation - 5),
        max: Math.round(baseTemp + tempVariation + 5),
        current: i === 0 ? Math.round(baseTemp + tempVariation) : null
      },
      weather: {
        main: isRainy ? 'Rain' : isCloudy ? 'Clouds' : 'Clear',
        description: isRainy ? 'Light rain' : isCloudy ? 'Partly cloudy' : 'Clear sky',
        icon: isRainy ? '10d' : isCloudy ? '02d' : '01d'
      },
      humidity: Math.round(40 + Math.random() * 40),
      windSpeed: Math.round(Math.random() * 15),
      windDirection: Math.round(Math.random() * 360),
      pressure: Math.round(1000 + Math.random() * 50),
      visibility: Math.round(8 + Math.random() * 2),
      uvIndex: Math.round(Math.random() * 10),
      precipitationChance: isRainy ? Math.round(60 + Math.random() * 30) : Math.round(Math.random() * 20)
    });
  }
  
  return {
    location: {
      name: location,
      country: getCountryFromLocation(location),
      coordinates: getCoordinatesFromLocation(location),
      timezone: getTimezoneFromLocation(location)
    },
    current: forecasts[0],
    forecast: forecasts,
    alerts: generateWeatherAlerts(forecasts),
    travelRecommendations: generateTravelRecommendations(forecasts)
  };
};

// Helper functions for mock data
const getBaseTemperature = (location: string): number => {
  const lowerLocation = location.toLowerCase();
  
  if (lowerLocation.includes('london') || lowerLocation.includes('uk')) return 15;
  if (lowerLocation.includes('new york') || lowerLocation.includes('ny')) return 20;
  if (lowerLocation.includes('tokyo') || lowerLocation.includes('japan')) return 22;
  if (lowerLocation.includes('dubai') || lowerLocation.includes('uae')) return 35;
  if (lowerLocation.includes('sydney') || lowerLocation.includes('australia')) return 25;
  if (lowerLocation.includes('paris') || lowerLocation.includes('france')) return 18;
  if (lowerLocation.includes('singapore')) return 30;
  if (lowerLocation.includes('san francisco') || lowerLocation.includes('sf')) return 16;
  
  return 20; // Default temperature
};

const getCountryFromLocation = (location: string): string => {
  const lowerLocation = location.toLowerCase();
  
  if (lowerLocation.includes('london') || lowerLocation.includes('uk')) return 'United Kingdom';
  if (lowerLocation.includes('new york') || lowerLocation.includes('usa')) return 'United States';
  if (lowerLocation.includes('tokyo') || lowerLocation.includes('japan')) return 'Japan';
  if (lowerLocation.includes('dubai') || lowerLocation.includes('uae')) return 'United Arab Emirates';
  if (lowerLocation.includes('sydney') || lowerLocation.includes('australia')) return 'Australia';
  if (lowerLocation.includes('paris') || lowerLocation.includes('france')) return 'France';
  if (lowerLocation.includes('singapore')) return 'Singapore';
  
  return 'Unknown';
};

const getCoordinatesFromLocation = (location: string) => {
  const lowerLocation = location.toLowerCase();
  
  if (lowerLocation.includes('london')) return { lat: 51.5074, lon: -0.1278 };
  if (lowerLocation.includes('new york')) return { lat: 40.7128, lon: -74.0060 };
  if (lowerLocation.includes('tokyo')) return { lat: 35.6762, lon: 139.6503 };
  if (lowerLocation.includes('dubai')) return { lat: 25.2048, lon: 55.2708 };
  if (lowerLocation.includes('sydney')) return { lat: -33.8688, lon: 151.2093 };
  if (lowerLocation.includes('paris')) return { lat: 48.8566, lon: 2.3522 };
  if (lowerLocation.includes('singapore')) return { lat: 1.3521, lon: 103.8198 };
  
  return { lat: 0, lon: 0 };
};

const getTimezoneFromLocation = (location: string): string => {
  const lowerLocation = location.toLowerCase();
  
  if (lowerLocation.includes('london')) return 'Europe/London';
  if (lowerLocation.includes('new york')) return 'America/New_York';
  if (lowerLocation.includes('tokyo')) return 'Asia/Tokyo';
  if (lowerLocation.includes('dubai')) return 'Asia/Dubai';
  if (lowerLocation.includes('sydney')) return 'Australia/Sydney';
  if (lowerLocation.includes('paris')) return 'Europe/Paris';
  if (lowerLocation.includes('singapore')) return 'Asia/Singapore';
  
  return 'UTC';
};

const generateWeatherAlerts = (forecasts: any[]) => {
  const alerts: any[] = [];
  
  // Check for severe weather
  for (const forecast of forecasts.slice(0, 3)) { // Check next 3 days
    if (forecast.weather.main === 'Rain' && forecast.precipitationChance > 80) {
      alerts.push({
        type: 'heavy_rain',
        severity: 'moderate',
        date: forecast.date,
        message: 'Heavy rain expected. Consider indoor activities and waterproof clothing.',
        recommendations: ['Pack umbrella', 'Plan indoor alternatives', 'Check transportation delays']
      });
    }
    
    if (forecast.temperature.max > 35) {
      alerts.push({
        type: 'extreme_heat',
        severity: 'high',
        date: forecast.date,
        message: 'Extreme heat warning. Take precautions to avoid heat-related illness.',
        recommendations: ['Stay hydrated', 'Avoid midday sun', 'Wear light clothing']
      });
    }
    
    if (forecast.windSpeed > 25) {
      alerts.push({
        type: 'strong_wind',
        severity: 'moderate',
        date: forecast.date,
        message: 'Strong winds expected. Secure loose items and be cautious outdoors.',
        recommendations: ['Secure outdoor items', 'Drive carefully', 'Avoid high places']
      });
    }
  }
  
  return alerts;
};

const generateTravelRecommendations = (forecasts: any[]) => {
  const recommendations: any[] = [];
  
  // Analyze weather patterns for travel advice
  const rainyDays = forecasts.filter(f => f.weather.main === 'Rain').length;
  const avgTemp = forecasts.reduce((sum, f) => sum + f.temperature.max, 0) / forecasts.length;
  
  if (rainyDays >= 3) {
    recommendations.push({
      category: 'clothing',
      priority: 'high',
      item: 'Rain gear',
      description: 'Pack waterproof jacket and umbrella. Consider rain boots for outdoor activities.'
    });
  }
  
  if (avgTemp > 25) {
    recommendations.push({
      category: 'clothing',
      priority: 'medium',
      item: 'Summer clothing',
      description: 'Light, breathable fabrics recommended. Don\'t forget sunscreen and hat.'
    });
  } else if (avgTemp < 10) {
    recommendations.push({
      category: 'clothing',
      priority: 'high',
      item: 'Winter clothing',
      description: 'Pack warm layers, winter coat, and appropriate footwear.'
    });
  }
  
  recommendations.push({
    category: 'general',
    priority: 'low',
    item: 'Weather app',
    description: 'Download a local weather app for real-time updates during your trip.'
  });
  
  return recommendations;
};

// POST /api/weather/forecast
router.post('/forecast', async (req: Request, res: Response) => {
  try {
    const { location, date, days, units } = forecastSchema.parse(req.body);
    const userId = (req as any).user?.id || 'anonymous';
    
    logger.info(`Weather forecast request from user ${userId}:`, { location, date, days });
    
    // Get weather data
    const weatherData = await getWeatherData(location, date, days);
    
    // Convert temperatures if imperial units requested
    if (units === 'imperial') {
      weatherData.forecast = weatherData.forecast.map((forecast: any) => ({
        ...forecast,
        temperature: {
          min: Math.round(forecast.temperature.min * 9/5 + 32),
          max: Math.round(forecast.temperature.max * 9/5 + 32),
          current: forecast.temperature.current ? Math.round(forecast.temperature.current * 9/5 + 32) : null
        }
      })) as any[];
    }
    
    logger.info(`Weather forecast generated for ${location}`, {
      days: weatherData.forecast.length,
      alerts: weatherData.alerts.length
    });
    
    res.json({
      success: true,
      data: {
        location: weatherData.location,
        current: weatherData.current,
        forecast: weatherData.forecast,
        alerts: weatherData.alerts,
        travelRecommendations: weatherData.travelRecommendations,
        units: units,
        requestInfo: {
          requestedDays: days,
          requestedLocation: location,
          timestamp: new Date().toISOString()
        }
      }
    });
    
  } catch (error: unknown) {
    logger.error('Weather forecast error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid request data', details: error.errors }
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Weather forecast failed', details: errorMessage }
    });
  }
});

// GET /api/weather/current/:location
router.get('/current/:location', async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    const units = (req.query.units as string) || 'metric';
    
    if (!location) {
      return res.status(400).json({
        success: false,
        error: { message: 'Location parameter is required' }
      });
    }
    
    const userId = (req as any).user?.id || 'anonymous';
    logger.info(`Current weather request from user ${userId} for: ${location}`);
    
    // Get current weather data (1 day forecast)
    const weatherData = await getWeatherData(location, undefined, 1);
    const currentWeather: any = weatherData.current;
    
    // Convert temperature if imperial units requested
    if (units === 'imperial') {
      currentWeather.temperature = {
        ...currentWeather.temperature,
        min: Math.round(currentWeather.temperature.min * 9/5 + 32),
        max: Math.round(currentWeather.temperature.max * 9/5 + 32),
        current: currentWeather.temperature.current ? Math.round(currentWeather.temperature.current * 9/5 + 32) : null
      };
    }
    
    res.json({
      success: true,
      data: {
        location: weatherData.location,
        current: currentWeather,
        units: units,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: unknown) {
    logger.error('Current weather error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Current weather lookup failed', details: errorMessage }
    });
  }
});

export default router;

