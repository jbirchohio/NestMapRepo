/**
 * Autonomous Vehicle Routes
 * API endpoints for autonomous vehicle booking and management
 */

import express from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { autonomousVehicles, vehicleBookings } from '../db/schema.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import AutonomousVehicleIntegrationService from '../services/autonomousVehicleIntegration';

const router = express.Router();
const autonomousVehicleService = new AutonomousVehicleIntegrationService();

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};

// Validation schemas
const VehicleSearchSchema = z.object({
  pickup: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }),
  destination: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }),
  scheduledTime: z.string().datetime().optional(),
  passengers: z.number().min(1).max(8).default(1),
  accessibility: z.boolean().default(false),
  vehicleType: z.enum(['sedan', 'suv', 'van', 'luxury']).default('sedan')
});

const BookingRequestSchema = z.object({
  vehicleId: z.string(),
  pickup: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }),
  destination: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }),
  scheduledTime: z.string().datetime().optional(),
  passengers: z.number().min(1).max(8),
  vehicleType: z.enum(['sedan', 'suv', 'van', 'luxury']).optional(),
  preferences: z.object({
    accessibility: z.boolean().optional(),
    luxury: z.boolean().optional(),
    eco: z.boolean().optional()
  }).optional(),
  specialRequests: z.string().optional(),
  paymentMethod: z.string().optional()
});

/**
 * @route GET /api/autonomous-vehicles/search
 * @desc Search for available autonomous vehicles
 * @access Private
 */
router.get('/search', async (req, res) => {
  try {
    const searchParams = VehicleSearchSchema.parse(req.query);
    
    // Get available vehicles from database
    const db = getDB();
    let availableVehicles = await db
      .select()
      .from(autonomousVehicles)
      .where(eq(autonomousVehicles.status, 'available'));

    // Filter by vehicle type if specified
    if (searchParams.vehicleType && searchParams.vehicleType !== 'sedan') {
      availableVehicles = availableVehicles.filter(v => v.vehicleType === searchParams.vehicleType);
    }

    // Filter by passenger capacity
    availableVehicles = availableVehicles.filter(v => v.capacity >= searchParams.passengers);

    // Calculate estimated arrival and cost for each vehicle
    const enhancedVehicles = await Promise.all(availableVehicles.map(async (vehicle) => {
      const route = await autonomousVehicleService.calculateVehicleRoute(
        searchParams.pickup,
        searchParams.destination
      );

      return {
        id: vehicle.id,
        vehicleId: vehicle.vehicleId,
        model: `${vehicle.provider} ${vehicle.vehicleType}`,
        type: vehicle.vehicleType,
        capacity: vehicle.capacity,
        autonomyLevel: parseInt(vehicle.autonomyLevel.replace('level_', '')),
        features: Object.keys(vehicle.features || {}).filter(key => vehicle.features?.[key]),
        location: vehicle.currentLocation || { lat: 0, lng: 0, address: 'Unknown' },
        batteryLevel: vehicle.batteryLevel || 85,
        status: vehicle.status,
        pricePerKm: 2.50, // Mock pricing - in real implementation this would be from provider
        estimatedArrival: Math.ceil(route.estimatedTime),
        rating: 4.5, // Mock rating
        provider: vehicle.provider,
        distance: route.distance,
        estimatedCost: Math.ceil(route.distance * 2.50)
      };
    }));

    res.json({
      success: true,
      data: {
        vehicles: enhancedVehicles,
        searchCriteria: searchParams,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Vehicle search error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search parameters',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to search for vehicles'
    });
  }
});

/**
 * @route POST /api/autonomous-vehicles/book
 * @desc Book an autonomous vehicle
 * @access Private
 */
router.post('/book', async (req, res) => {
  try {
    const bookingData = BookingRequestSchema.parse(req.body);
    const user = (req as any).user;

    const db = getDB();

    // Verify vehicle exists and is available
    const [vehicle] = await db
      .select()
      .from(autonomousVehicles)
      .where(and(
        eq(autonomousVehicles.vehicleId, bookingData.vehicleId),
        eq(autonomousVehicles.status, 'available')
      ));

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not available'
      });
    }

    // Calculate route and pricing
    const route = await autonomousVehicleService.calculateVehicleRoute(
      bookingData.pickup,
      bookingData.destination
    );

    const estimatedCost = Math.ceil(route.distance * 2.50 * 100); // Convert to cents
    const scheduledTime = bookingData.scheduledTime ? new Date(bookingData.scheduledTime) : new Date();

    // Create booking in database  
    const bookingValues = {
      userId: user.userId,
      organizationId: user.organizationId,
      vehicleId: vehicle.id,
      status: 'confirmed' as const,
      pickupLocation: {
        lat: bookingData.pickup.lat,
        lng: bookingData.pickup.lng,
        address: bookingData.pickup.address || 'Pickup Location'
      },
      dropoffLocation: {
        lat: bookingData.destination.lat,
        lng: bookingData.destination.lng,
        address: bookingData.destination.address || 'Destination'
      },
      scheduledPickup: scheduledTime,
      estimatedDuration: route.estimatedTime,
      estimatedCost: estimatedCost,
      passengerCount: bookingData.passengers,
      specialRequirements: {
        accessibility: bookingData.preferences?.accessibility || false,
        childSeat: false,
        pet: false,
        luggage: 1
      },
      routeData: {
        distance: route.distance,
        waypoints: route.waypoints,
        trafficConditions: route.traffic
      }
    };

    const [newBooking] = await db
      .insert(vehicleBookings)
      .values(bookingValues)
      .returning();

    // Update vehicle status to booked
    await db
      .update(autonomousVehicles)
      .set({ status: 'booked' })
      .where(eq(autonomousVehicles.id, vehicle.id));

    // Start tracking with the service
    await autonomousVehicleService.startVehicleTracking(vehicle.vehicleId, {
      lat: bookingData.pickup.lat,
      lng: bookingData.pickup.lng,
      address: bookingData.pickup.address || ''
    });

    logger.info(`Autonomous vehicle booked: ${newBooking.id} by user ${user.userId}`);

    res.status(201).json({
      success: true,
      data: {
        booking: {
          id: newBooking.id,
          vehicleId: vehicle.vehicleId,
          status: newBooking.status,
          pickupLocation: newBooking.pickupLocation,
          dropoffLocation: newBooking.dropoffLocation,
          scheduledPickup: newBooking.scheduledPickup,
          estimatedCost: newBooking.estimatedCost,
          estimatedDuration: newBooking.estimatedDuration
        },
        estimatedArrival: '5-10 minutes',
        trackingUrl: `/api/autonomous-vehicles/${newBooking.id}/track`
      }
    });

  } catch (error) {
    logger.error('Vehicle booking error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking data',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to book vehicle'
    });
  }
});

/**
 * @route GET /api/autonomous-vehicles/:id/track
 * @desc Track an autonomous vehicle booking
 * @access Private
 */
router.get('/:id/track', async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const db = getDB();
    
    // Get booking with vehicle details
    const [booking] = await db
      .select({
        booking: vehicleBookings,
        vehicle: autonomousVehicles
      })
      .from(vehicleBookings)
      .leftJoin(autonomousVehicles, eq(vehicleBookings.vehicleId, autonomousVehicles.id))
      .where(and(
        eq(vehicleBookings.id, id),
        eq(vehicleBookings.userId, user.userId)
      ));

    if (!booking || !booking.vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Get real-time tracking data from service
    const trackingData = await autonomousVehicleService.trackVehicle(booking.vehicle.vehicleId);

    res.json({
      success: true,
      data: {
        booking: booking.booking,
        vehicle: {
          id: booking.vehicle.vehicleId,
          type: booking.vehicle.vehicleType,
          provider: booking.vehicle.provider,
          currentLocation: booking.vehicle.currentLocation,
          batteryLevel: booking.vehicle.batteryLevel
        },
        realTimeLocation: {
          lat: trackingData.location.lat,
          lng: trackingData.location.lng,
          heading: Math.floor(Math.random() * 360), // Mock heading
          speed: Math.floor(Math.random() * 60) // Mock speed in mph
        },
        estimatedArrival: '3-7 minutes',
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Vehicle tracking error:', error);
    res.status(404).json({
      success: false,
      message: 'Vehicle not found or tracking unavailable'
    });
  }
});

/**
 * @route GET /api/autonomous-vehicles/bookings
 * @desc Get user's autonomous vehicle bookings
 * @access Private
 */
router.get('/bookings', async (req, res) => {
  try {
    const user = (req as any).user;
    const db = getDB();
    
    // Get user's bookings with vehicle details
    const userBookings = await db
      .select({
        booking: vehicleBookings,
        vehicle: autonomousVehicles
      })
      .from(vehicleBookings)
      .leftJoin(autonomousVehicles, eq(vehicleBookings.vehicleId, autonomousVehicles.id))
      .where(eq(vehicleBookings.userId, user.userId))
      .orderBy(desc(vehicleBookings.createdAt));

    const formattedBookings = userBookings.map(item => ({
      id: item.booking.id,
      status: item.booking.status,
      pickup: item.booking.pickupLocation,
      destination: item.booking.dropoffLocation,
      scheduledTime: item.booking.scheduledPickup,
      completedTime: item.booking.actualDropoff,
      cost: item.booking.actualCost || item.booking.estimatedCost,
      vehicleType: item.vehicle?.vehicleType || 'sedan',
      provider: item.vehicle?.provider || 'unknown',
      vehicle: {
        model: `${item.vehicle?.provider} ${item.vehicle?.vehicleType}` || 'Unknown Vehicle'
      },
      totalCost: ((item.booking.actualCost || item.booking.estimatedCost || 0) / 100).toFixed(2),
      createdAt: item.booking.createdAt
    }));

    res.json({
      success: true,
      data: {
        bookings: formattedBookings,
        total: formattedBookings.length,
        upcoming: formattedBookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length,
        inProgress: formattedBookings.filter(b => b.status === 'in_progress').length,
        completed: formattedBookings.filter(b => b.status === 'completed').length
      }
    });

  } catch (error) {
    logger.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings'
    });
  }
});

/**
 * @route PUT /api/autonomous-vehicles/:id/cancel
 * @desc Cancel an autonomous vehicle booking
 * @access Private
 */
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = (req as any).user;
    const db = getDB();
    
    // Get booking to verify ownership and current status
    const [booking] = await db
      .select({
        booking: vehicleBookings,
        vehicle: autonomousVehicles
      })
      .from(vehicleBookings)
      .leftJoin(autonomousVehicles, eq(vehicleBookings.vehicleId, autonomousVehicles.id))
      .where(and(
        eq(vehicleBookings.id, id),
        eq(vehicleBookings.userId, user.userId)
      ));

    if (!booking || !booking.vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.booking.status === 'completed' || booking.booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel this booking'
      });
    }

    // Calculate refund amount
    const refundAmount = await autonomousVehicleService.calculateCancellationRefund(
      booking.booking, 
      reason
    );

    // Update booking status
    await db
      .update(vehicleBookings)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(vehicleBookings.id, id));

    // Update vehicle status back to available
    if (booking.vehicle) {
      await db
        .update(autonomousVehicles)
        .set({ status: 'available' })
        .where(eq(autonomousVehicles.id, booking.vehicle.id));
    }

    // Cancel with service
    await autonomousVehicleService.cancelBooking(booking.vehicle.vehicleId, reason);

    logger.info(`Autonomous vehicle booking cancelled: ${id} by user ${user.userId}`);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      refundAmount: refundAmount / 100, // Convert from cents to dollars
      refundProcessingTime: '3-5 business days'
    });

  } catch (error) {
    logger.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking'
    });
  }
});

/**
 * @route GET /api/autonomous-vehicles/providers
 * @desc Get available autonomous vehicle providers
 * @access Private
 */
router.get('/providers', async (_req, res) => {
  try {
    const db = getDB();
    
    // Get actual providers from database
    const providersData = await db
      .select({
        provider: autonomousVehicles.provider,
        count: autonomousVehicles.id
      })
      .from(autonomousVehicles)
      .where(eq(autonomousVehicles.status, 'available'));

    // Group by provider and count vehicles
    const providerStats = providersData.reduce((acc: any, curr) => {
      if (!acc[curr.provider]) {
        acc[curr.provider] = 0;
      }
      acc[curr.provider]++;
      return acc;
    }, {});

    // Get vehicle types per provider
    const vehiclesByProvider = await db
      .select({
        provider: autonomousVehicles.provider,
        vehicleType: autonomousVehicles.vehicleType,
        autonomyLevel: autonomousVehicles.autonomyLevel
      })
      .from(autonomousVehicles);

    const providerVehicleTypes = vehiclesByProvider.reduce((acc: any, curr) => {
      if (!acc[curr.provider]) {
        acc[curr.provider] = {
          vehicleTypes: new Set(),
          autonomyLevels: new Set()
        };
      }
      acc[curr.provider].vehicleTypes.add(curr.vehicleType);
      acc[curr.provider].autonomyLevels.add(curr.autonomyLevel);
      return acc;
    }, {});

    // Build provider information
    const providers = Object.keys(providerStats).map(providerName => {
      const types = providerVehicleTypes[providerName] || { vehicleTypes: new Set(), autonomyLevels: new Set() };
      
      return {
        id: providerName.toLowerCase(),
        name: providerName.charAt(0).toUpperCase() + providerName.slice(1),
        description: getProviderDescription(providerName),
        coverage: getProviderCoverage(providerName),
        vehicleTypes: Array.from(types.vehicleTypes),
        features: getProviderFeatures(providerName),
        availability: 'available',
        vehicleCount: providerStats[providerName],
        autonomyLevels: Array.from(types.autonomyLevels)
      };
    });

    res.json({
      success: true,
      data: {
        providers,
        totalProviders: providers.length,
        availableNow: providers.filter(p => p.availability === 'available').length,
        totalVehicles: Object.values(providerStats).reduce((sum: number, count: any) => sum + count, 0)
      }
    });

  } catch (error) {
    logger.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve providers'
    });
  }
});

// Helper functions for provider information
function getProviderDescription(provider: string): string {
  const descriptions: Record<string, string> = {
    waymo: "Google's autonomous vehicle service with advanced self-driving technology",
    uber: "Uber's autonomous rideshare service",
    lyft: "Lyft's self-driving vehicle platform",
    tesla: "Tesla's Full Self-Driving (FSD) service",
    cruise: "GM's autonomous rideshare service"
  };
  return descriptions[provider.toLowerCase()] || `${provider} autonomous vehicle service`;
}

function getProviderCoverage(provider: string): string[] {
  const coverage: Record<string, string[]> = {
    waymo: ['San Francisco', 'Phoenix', 'Austin'],
    uber: ['Pittsburgh', 'San Francisco', 'Phoenix'],
    lyft: ['Las Vegas', 'Boston'],
    tesla: ['Beta Testing Nationwide'],
    cruise: ['San Francisco']
  };
  return coverage[provider.toLowerCase()] || ['Limited Coverage'];
}

function getProviderFeatures(provider: string): string[] {
  const features: Record<string, string[]> = {
    waymo: ['Level 4 Autonomy', 'Safety Driver Optional', 'LiDAR Technology'],
    uber: ['Level 3 Autonomy', 'Safety Driver Required', 'Real-time Monitoring'],
    lyft: ['Level 3 Autonomy', 'Trained Safety Operators', 'Emergency Override'],
    tesla: ['Level 3 Autonomy', 'Regular Updates', 'Neural Network AI'],
    cruise: ['Level 4 Autonomy', 'Fully Driverless', 'Remote Assistance']
  };
  return features[provider.toLowerCase()] || ['Self-Driving Capability', 'GPS Navigation'];
}

export default router;
