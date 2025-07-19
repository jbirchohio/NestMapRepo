import express from 'express';
import { z } from 'zod';
import IoTSmartCityIntegrationService from '../services/iotSmartCityIntegration.js';
import { secureAuth } from '../middleware/secureAuth.js';
import { organizationScoping } from '../middleware/organizationScoping.js';

const router = express.Router();
const iotService = new IoTSmartCityIntegrationService();

// Validation schemas
const navigationRouteSchema = z.object({
  airportCode: z.string().min(3).max(4),
  from: z.string(),
  to: z.string(),
  preferences: z.object({
    accessibility: z.boolean().optional(),
    fastest: z.boolean().optional()
  }).optional()
});

const hotelExperienceSchema = z.object({
  hotelId: z.string(),
  roomNumber: z.string(),
  guestId: z.string(),
  preferences: z.object({
    temperature: z.number().min(16).max(30),
    lighting: z.object({
      brightness: z.number().min(0).max(100),
      color: z.string()
    }),
    entertainment: z.object({
      volume: z.number().min(0).max(100),
      preferredChannels: z.array(z.string())
    }),
    wakeUpTime: z.string().optional(),
    roomService: z.object({
      dietary: z.array(z.string()),
      preferences: z.array(z.string())
    }),
    privacy: z.object({
      doNotDisturb: z.boolean(),
      dataSharing: z.boolean()
    })
  })
});

const smartRoomControlSchema = z.object({
  featureId: z.string(),
  action: z.string(),
  value: z.any().optional()
});

// Apply authentication and organization scoping to all routes
router.use(secureAuth);
router.use(organizationScoping);

// Smart Airport Navigation Routes
router.get('/airports/:airportCode/navigation', async (req, res) => {
  try {
    const { airportCode } = req.params;
    const userId = req.user.id;
    
    const navigation = await iotService.getAirportNavigation(airportCode, userId);
    
    res.json({
      success: true,
      data: navigation,
      message: 'Airport navigation data retrieved successfully'
    });
  } catch (error) {
    console.error('Get airport navigation error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get airport navigation'
    });
  }
});

router.post('/airports/navigation/route', async (req, res) => {
  try {
    const validatedData = navigationRouteSchema.parse(req.body);
    
    const route = await iotService.generateNavigationRoute(
      validatedData.airportCode,
      validatedData.from,
      validatedData.to,
      validatedData.preferences || {}
    );
    
    res.json({
      success: true,
      data: route,
      message: 'Navigation route generated successfully'
    });
  } catch (error) {
    console.error('Generate navigation route error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to generate navigation route'
    });
  }
});

router.get('/airports/:airportCode/wait-times', async (req, res) => {
  try {
    const { airportCode } = req.params;
    const userId = req.user.id;
    
    const navigation = await iotService.getAirportNavigation(airportCode, userId);
    
    res.json({
      success: true,
      data: navigation.waitTimes,
      message: 'Wait times retrieved successfully'
    });
  } catch (error) {
    console.error('Get wait times error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get wait times'
    });
  }
});

router.get('/airports/:airportCode/updates', async (req, res) => {
  try {
    const { airportCode } = req.params;
    const userId = req.user.id;
    
    const navigation = await iotService.getAirportNavigation(airportCode, userId);
    
    res.json({
      success: true,
      data: navigation.realTimeUpdates,
      message: 'Real-time updates retrieved successfully'
    });
  } catch (error) {
    console.error('Get real-time updates error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get real-time updates'
    });
  }
});

// Connected Hotel Experience Routes
router.post('/hotels/experience/initialize', async (req, res) => {
  try {
    const validatedData = hotelExperienceSchema.parse(req.body);
    
    const experience = await iotService.initializeHotelExperience(
      validatedData.hotelId,
      validatedData.roomNumber,
      validatedData.guestId,
      validatedData.preferences
    );
    
    res.status(201).json({
      success: true,
      data: experience,
      message: 'Hotel experience initialized successfully'
    });
  } catch (error) {
    console.error('Initialize hotel experience error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to initialize hotel experience'
    });
  }
});

router.get('/hotels/:hotelId/rooms/:roomNumber/experience', async (req, res) => {
  try {
    const { hotelId, roomNumber } = req.params;
    const experienceKey = `${hotelId}_${roomNumber}`;
    
    // This would typically fetch from the service's internal storage
    res.json({
      success: true,
      data: {
        hotelId,
        roomNumber,
        message: 'Hotel experience data retrieved successfully'
      }
    });
  } catch (error) {
    console.error('Get hotel experience error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get hotel experience'
    });
  }
});

router.post('/hotels/:hotelId/rooms/:roomNumber/control', async (req, res) => {
  try {
    const { hotelId, roomNumber } = req.params;
    const validatedData = smartRoomControlSchema.parse(req.body);
    
    const result = await iotService.controlSmartRoomFeature(
      hotelId,
      roomNumber,
      validatedData.featureId,
      validatedData.action,
      validatedData.value
    );
    
    res.json({
      success: true,
      data: result,
      message: 'Smart room feature controlled successfully'
    });
  } catch (error) {
    console.error('Control smart room feature error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to control smart room feature'
    });
  }
});

router.get('/hotels/:hotelId/rooms/:roomNumber/features', async (req, res) => {
  try {
    const { hotelId, roomNumber } = req.params;
    
    // Mock response for smart room features
    const features = [
      {
        id: 'lighting_main',
        name: 'Main Lighting',
        type: 'lighting',
        status: 'auto',
        value: { brightness: 75, color: 'warm' },
        voiceEnabled: true,
        mobileEnabled: true
      },
      {
        id: 'temperature_control',
        name: 'Climate Control',
        type: 'temperature',
        status: 'auto',
        value: { temperature: 22, mode: 'auto' },
        voiceEnabled: true,
        mobileEnabled: true
      }
    ];
    
    res.json({
      success: true,
      data: features,
      message: 'Smart room features retrieved successfully'
    });
  } catch (error) {
    console.error('Get smart room features error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get smart room features'
    });
  }
});

router.get('/hotels/:hotelId/rooms/:roomNumber/energy', async (req, res) => {
  try {
    const { hotelId, roomNumber } = req.params;
    
    // Mock energy metrics
    const energyMetrics = {
      currentUsage: 2.5,
      dailyUsage: 45.2,
      weeklyAverage: 42.8,
      efficiency: 85,
      carbonFootprint: 12.3,
      cost: 8.50,
      recommendations: [
        'Adjust thermostat to save energy',
        'Use natural light when possible',
        'Unplug devices when not in use'
      ]
    };
    
    res.json({
      success: true,
      data: energyMetrics,
      message: 'Energy metrics retrieved successfully'
    });
  } catch (error) {
    console.error('Get energy metrics error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get energy metrics'
    });
  }
});

// Device Integration Routes
router.get('/devices', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    
    // Mock connected devices
    const devices = [
      {
        id: 'device_1',
        type: 'smartwatch',
        name: 'Apple Watch Series 8',
        status: 'connected',
        lastSync: new Date(),
        batteryLevel: 85
      },
      {
        id: 'device_2',
        type: 'smartphone',
        name: 'iPhone 14 Pro',
        status: 'connected',
        lastSync: new Date(),
        batteryLevel: 92
      }
    ];
    
    res.json({
      success: true,
      data: devices,
      count: devices.length
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get devices'
    });
  }
});

router.post('/devices/:deviceId/sync', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { deviceType } = req.body;
    const userId = req.user.id;
    
    // Mock device sync
    const syncResult = {
      deviceId,
      deviceType,
      userId,
      syncedAt: new Date(),
      dataPoints: 150,
      status: 'success'
    };
    
    res.json({
      success: true,
      data: syncResult,
      message: 'Device synced successfully'
    });
  } catch (error) {
    console.error('Sync device error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to sync device'
    });
  }
});

// Smart City Integration Routes
router.get('/cities/:cityId/info', async (req, res) => {
  try {
    const { cityId } = req.params;
    
    // Mock smart city info
    const cityInfo = {
      cityId,
      cityName: `Smart City ${cityId}`,
      availableServices: [
        {
          id: 'transport_1',
          name: 'Public Transportation',
          category: 'transportation',
          availability: true,
          rating: 4.2
        }
      ],
      environmentalData: {
        airQuality: {
          index: 45,
          level: 'good',
          lastUpdated: new Date()
        },
        weather: {
          temperature: 22,
          humidity: 65,
          conditions: 'Partly cloudy'
        }
      }
    };
    
    res.json({
      success: true,
      data: cityInfo,
      message: 'Smart city information retrieved successfully'
    });
  } catch (error) {
    console.error('Get smart city info error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get smart city info'
    });
  }
});

router.get('/cities/:cityId/transportation', async (req, res) => {
  try {
    const { cityId } = req.params;
    
    // Mock transportation data
    const transportation = {
      modes: [
        {
          type: 'bus',
          available: true,
          coverage: 'City-wide',
          frequency: 10,
          cost: { base: 2.50, perKm: 0.15 }
        },
        {
          type: 'metro',
          available: true,
          coverage: 'Downtown and suburbs',
          frequency: 5,
          cost: { base: 3.00, perKm: 0.20 }
        }
      ],
      realTimeData: [
        {
          mode: 'bus',
          route: 'Route 42',
          status: 'on_time',
          nextArrival: new Date(Date.now() + 5 * 60 * 1000),
          location: 'Main Street Station'
        }
      ]
    };
    
    res.json({
      success: true,
      data: transportation,
      message: 'Transportation data retrieved successfully'
    });
  } catch (error) {
    console.error('Get transportation data error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get transportation data'
    });
  }
});

router.get('/cities/:cityId/environment', async (req, res) => {
  try {
    const { cityId } = req.params;
    
    // Mock environmental data
    const environment = {
      airQuality: {
        index: Math.floor(Math.random() * 100),
        level: 'good',
        pollutants: [],
        recommendations: ['Air quality is good for outdoor activities'],
        lastUpdated: new Date()
      },
      weather: {
        temperature: 20 + Math.random() * 15,
        humidity: 40 + Math.random() * 40,
        windSpeed: Math.random() * 20,
        visibility: 10 + Math.random() * 10,
        conditions: 'Clear'
      },
      sustainability: {
        carbonFootprint: 2.0 + Math.random() * 2,
        energyEfficiency: 70 + Math.random() * 20,
        renewableEnergy: 40 + Math.random() * 30
      }
    };
    
    res.json({
      success: true,
      data: environment,
      message: 'Environmental data retrieved successfully'
    });
  } catch (error) {
    console.error('Get environmental data error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get environmental data'
    });
  }
});

// Service Capabilities
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = iotService.getCapabilities();
    
    res.json({
      success: true,
      data: capabilities
    });
  } catch (error) {
    console.error('Get capabilities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get capabilities'
    });
  }
});

// Health Check
router.get('/health', async (req, res) => {
  try {
    const health = await iotService.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

export default router;
