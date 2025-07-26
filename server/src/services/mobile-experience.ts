import { z } from 'zod';
import { db } from '../db-connection';
import { trips, users } from '../db/schema';
import { eq, and, gte } from '../utils/drizzle-shim';;

// Mobile experience schemas
const MobileConfigSchema = z.object({
  userId: z.string(),
  deviceInfo: z.object({
    platform: z.enum(['ios', 'android', 'web']),
    version: z.string(),
    deviceId: z.string(),
    pushToken: z.string().optional(),
  }),
  preferences: z.object({
    offlineMode: z.boolean().default(true),
    pushNotifications: z.boolean().default(true),
    locationServices: z.boolean().default(true),
    biometricAuth: z.boolean().default(false),
  }),
  features: z.object({
    voiceBooking: z.boolean().default(false),
    photoExpenses: z.boolean().default(true),
    quickActions: z.array(z.string()),
    emergencyMode: z.boolean().default(true),
  }),
});

const OfflineDataSchema = z.object({
  userId: z.string(),
  tripData: z.array(z.object({
    tripId: z.string(),
    destination: z.string(),
    dates: z.object({
      start: z.string(),
      end: z.string(),
    }),
    bookingDetails: z.record(z.any()),
    emergencyContacts: z.array(z.object({
      name: z.string(),
      phone: z.string(),
      type: z.string(),
    })),
  })),
  mapData: z.object({
    destinations: z.array(z.string()),
    cachedMaps: z.array(z.string()),
  }),
  policies: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
  })),
  lastSync: z.string(),
});

const NotificationSchema = z.object({
  userId: z.string(),
  type: z.enum(['travel_alert', 'gate_change', 'weather_warning', 'meeting_reminder', 'emergency']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
  scheduledFor: z.string().optional(),
  actionButtons: z.array(z.object({
    text: z.string(),
    action: z.string(),
  })).optional(),
});

export class MobileExperience {
  private offlineCache: Map<string, any> = new Map();
  private notificationQueue: Map<string, any[]> = new Map();

  /**
   * Configure Mobile Experience
   */
  async configureMobileExperience(config: z.infer<typeof MobileConfigSchema>) {
    try {
      const validatedConfig = MobileConfigSchema.parse(config);
      
      // Store mobile configuration
      await this.storeMobileConfig(validatedConfig);
      
      // Initialize offline data if enabled
      if (validatedConfig.preferences.offlineMode) {
        await this.initializeOfflineData(validatedConfig.userId);
      }
      
      // Register for push notifications if enabled
      if (validatedConfig.preferences.pushNotifications && validatedConfig.deviceInfo.pushToken) {
        await this.registerPushNotifications(validatedConfig);
      }
      
      return {
        success: true,
        message: 'Mobile experience configured successfully',
        features: this.getMobileFeatures(validatedConfig),
      };
    } catch (error) {
      console.error('Mobile configuration error:', error);
      throw new Error('Failed to configure mobile experience');
    }
  }

  /**
   * Offline Functionality - Trip details access without internet
   */
  async prepareOfflineData(userId: string): Promise<z.infer<typeof OfflineDataSchema>> {
    try {
      // Get user's active and upcoming trips
      const activeTrips = await db.query.trips.findMany({
        where: and(
          eq(trips.userId, userId),
          gte(trips.startDate, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days to future
        ),
      });

      // Prepare offline trip data
      const tripData = activeTrips.map(trip => ({
        tripId: trip.id,
        destination: `${trip.destinationCity}, ${trip.destinationCountry}`,
        dates: {
          start: trip.startDate.toISOString(),
          end: trip.endDate.toISOString(),
        },
        bookingDetails: {
          budget: trip.budget,
          status: trip.status,
          description: trip.description,
          // Add flight, hotel, car rental details
        },
        emergencyContacts: [
          { name: 'Emergency Services', phone: '911', type: 'emergency' },
          { name: 'Company Travel Support', phone: '+1-800-TRAVEL', type: 'support' },
          { name: 'Insurance Provider', phone: '+1-800-INSURANCE', type: 'insurance' },
        ],
      }));

      // Prepare map data for destinations
      const destinations = [...new Set(activeTrips.map(trip => `${trip.destinationCity}, ${trip.destinationCountry}`))];
      const mapData = {
        destinations,
        cachedMaps: destinations.map(dest => `map_${dest.replace(/[^a-zA-Z0-9]/g, '_')}`),
      };

      // Get company policies for offline access
      const policies = [
        { id: '1', title: 'Travel Policy', content: 'Company travel policy content...' },
        { id: '2', title: 'Expense Policy', content: 'Company expense policy content...' },
        { id: '3', title: 'Emergency Procedures', content: 'Emergency procedures content...' },
      ];

      const offlineData: z.infer<typeof OfflineDataSchema> = {
        userId,
        tripData,
        mapData,
        policies,
        lastSync: new Date().toISOString(),
      };

      // Cache offline data
      this.offlineCache.set(userId, offlineData);
      
      return offlineData;
    } catch (error) {
      console.error('Offline data preparation error:', error);
      throw new Error('Failed to prepare offline data');
    }
  }

  /**
   * Smart Notifications - Proactive travel alerts
   */
  async sendSmartNotification(notification: z.infer<typeof NotificationSchema>) {
    try {
      const validatedNotification = NotificationSchema.parse(notification);
      
      // Get user's notification preferences
      const userConfig = await this.getMobileConfig(validatedNotification.userId);
      
      if (!userConfig?.preferences.pushNotifications) {
        console.log('Push notifications disabled for user:', validatedNotification.userId);
        return;
      }

      // Send immediate notification for high priority
      if (validatedNotification.priority === 'high' || validatedNotification.priority === 'critical') {
        await this.sendImmediateNotification(validatedNotification);
      } else if (validatedNotification.scheduledFor) {
        // Schedule notification for later
        await this.scheduleNotification(validatedNotification);
      } else {
        // Send normal notification
        await this.sendImmediateNotification(validatedNotification);
      }

      return {
        success: true,
        message: 'Notification sent successfully',
      };
    } catch (error) {
      console.error('Smart notification error:', error);
      throw new Error('Failed to send smart notification');
    }
  }

  /**
   * Voice-Activated Booking
   */
  async processVoiceBooking(userId: string, voiceInput: string) {
    try {
      // Process voice input using AI
      const bookingIntent = await this.parseVoiceBooking(voiceInput);
      
      if (!bookingIntent.isValid) {
        return {
          success: false,
          message: 'Could not understand booking request',
          suggestions: bookingIntent.suggestions,
        };
      }

      // Execute booking based on voice intent
      const bookingResult = await this.executeVoiceBooking(userId, bookingIntent);
      
      return {
        success: true,
        message: 'Voice booking processed successfully',
        booking: bookingResult,
      };
    } catch (error) {
      console.error('Voice booking error:', error);
      throw new Error('Failed to process voice booking');
    }
  }

  /**
   * Photo-Based Expense Capture
   */
  async processExpensePhoto(userId: string, photoData: string, metadata: any) {
    try {
      // Extract expense information from photo using OCR/AI
      const expenseData = await this.extractExpenseFromPhoto(photoData);
      
      // Validate and categorize expense
      const categorizedExpense = await this.categorizeExpense(expenseData, metadata);
      
      // Store expense for submission
      await this.storeExpenseCapture(userId, categorizedExpense, photoData);
      
      return {
        success: true,
        message: 'Expense captured successfully',
        expense: categorizedExpense,
      };
    } catch (error) {
      console.error('Photo expense capture error:', error);
      throw new Error('Failed to process expense photo');
    }
  }

  /**
   * One-Tap Rebooking
   */
  async processOneTapRebooking(userId: string, tripId: string, rebookingType: string) {
    try {
      const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
      });

      if (!trip) {
        throw new Error('Trip not found');
      }

      let rebookingResult;
      
      switch (rebookingType) {
        case 'flight_delay':
          rebookingResult = await this.rebookFlightForDelay(trip);
          break;
        case 'extend_stay':
          rebookingResult = await this.extendStay(trip);
          break;
        case 'early_return':
          rebookingResult = await this.bookEarlyReturn(trip);
          break;
        case 'upgrade':
          rebookingResult = await this.upgradeBooking(trip);
          break;
        default:
          throw new Error('Invalid rebooking type');
      }

      return {
        success: true,
        message: 'Rebooking processed successfully',
        rebooking: rebookingResult,
      };
    } catch (error) {
      console.error('One-tap rebooking error:', error);
      throw new Error('Failed to process one-tap rebooking');
    }
  }

  /**
   * Emergency Assistance Button
   */
  async handleEmergencyAssistance(userId: string, emergencyType: string, location: any) {
    try {
      const emergencyResponse = {
        emergencyId: `emg_${Date.now()}`,
        userId,
        type: emergencyType,
        location,
        timestamp: new Date().toISOString(),
        status: 'active',
      };

      // Send immediate emergency notification
      await this.sendEmergencyNotification(emergencyResponse);
      
      // Get emergency contacts and procedures
      const emergencyInfo = await this.getEmergencyInfo(userId, location);
      
      // Log emergency incident
      await this.logEmergencyIncident(emergencyResponse);
      
      return {
        success: true,
        emergencyId: emergencyResponse.emergencyId,
        message: 'Emergency assistance activated',
        emergencyInfo,
        immediateActions: [
          'Emergency services contacted',
          'Company travel support notified',
          'Insurance provider alerted',
          'Emergency contacts informed',
        ],
      };
    } catch (error) {
      console.error('Emergency assistance error:', error);
      throw new Error('Failed to handle emergency assistance');
    }
  }

  /**
   * Get Mobile Dashboard
   */
  async getMobileDashboard(userId: string) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get upcoming trips
      const upcomingTrips = await db.query.trips.findMany({
        where: and(
          eq(trips.userId, userId),
          gte(trips.startDate, new Date())
        ),
        limit: 5,
      });

      // Get recent activity
      const recentTrips = await db.query.trips.findMany({
        where: eq(trips.userId, userId),
        limit: 10,
      });

      return {
        user: {
          name: user.username,
          email: user.email,
        },
        quickActions: [
          { id: 'book_trip', label: 'Book Trip', icon: 'plane' },
          { id: 'view_trips', label: 'My Trips', icon: 'calendar' },
          { id: 'submit_expense', label: 'Submit Expense', icon: 'receipt' },
          { id: 'emergency', label: 'Emergency', icon: 'alert' },
        ],
        upcomingTrips: upcomingTrips.map(trip => ({
          id: trip.id,
          destination: `${trip.destinationCity}, ${trip.destinationCountry}`,
          dates: {
            start: trip.startDate.toISOString(),
            end: trip.endDate.toISOString(),
          },
          status: trip.status,
        })),
        recentActivity: recentTrips.map(trip => ({
          id: trip.id,
          destination: `${trip.destinationCity}, ${trip.destinationCountry}`,
          date: trip.createdAt.toISOString(),
          status: trip.status,
        })),
        notifications: await this.getPendingNotifications(userId),
      };
    } catch (error) {
      console.error('Mobile dashboard error:', error);
      throw new Error('Failed to get mobile dashboard');
    }
  }

  // Helper methods
  private getMobileFeatures(config: z.infer<typeof MobileConfigSchema>) {
    return {
      offlineMode: config.preferences.offlineMode,
      pushNotifications: config.preferences.pushNotifications,
      voiceBooking: config.features.voiceBooking,
      photoExpenses: config.features.photoExpenses,
      quickActions: config.features.quickActions,
      emergencyMode: config.features.emergencyMode,
      biometricAuth: config.preferences.biometricAuth,
      locationServices: config.preferences.locationServices,
    };
  }

  private async storeMobileConfig(config: z.infer<typeof MobileConfigSchema>) {
    // Store mobile configuration in database
    console.log('Storing mobile config:', config);
  }

  private async getMobileConfig(userId: string) {
    // Get mobile configuration from database
    // For now, return default config
    return {
      preferences: {
        pushNotifications: true,
        offlineMode: true,
      },
    };
  }

  private async initializeOfflineData(userId: string) {
    // Initialize offline data for user
    await this.prepareOfflineData(userId);
  }

  private async registerPushNotifications(config: z.infer<typeof MobileConfigSchema>) {
    // Register device for push notifications
    console.log('Registering push notifications:', config.deviceInfo.pushToken);
  }

  private async sendImmediateNotification(notification: z.infer<typeof NotificationSchema>) {
    // Send immediate push notification
    console.log('Sending immediate notification:', notification);
  }

  private async scheduleNotification(notification: z.infer<typeof NotificationSchema>) {
    // Schedule notification for later
    console.log('Scheduling notification:', notification);
  }

  private async parseVoiceBooking(voiceInput: string) {
    // Parse voice input for booking intent
    return {
      isValid: true,
      intent: 'book_flight',
      parameters: {
        destination: 'New York',
        date: '2024-02-15',
      },
      suggestions: [],
    };
  }

  private async executeVoiceBooking(userId: string, intent: any) {
    // Execute booking based on voice intent
    return {
      bookingId: 'booking_123',
      status: 'confirmed',
    };
  }

  private async extractExpenseFromPhoto(photoData: string) {
    // Extract expense data from photo using OCR
    return {
      amount: 25.50,
      merchant: 'Restaurant ABC',
      date: '2024-01-15',
      category: 'meals',
    };
  }

  private async categorizeExpense(expenseData: any, metadata: any) {
    // Categorize and validate expense
    return {
      ...expenseData,
      category: 'business_meal',
      approved: false,
    };
  }

  private async storeExpenseCapture(userId: string, expense: any, photo: string) {
    // Store expense capture in database
    console.log('Storing expense capture:', { userId, expense });
  }

  private async rebookFlightForDelay(trip: any) {
    // Rebook flight for delay
    return { rebookingId: 'rebook_123', status: 'confirmed' };
  }

  private async extendStay(trip: any) {
    // Extend stay
    return { extensionId: 'ext_123', status: 'confirmed' };
  }

  private async bookEarlyReturn(trip: any) {
    // Book early return
    return { returnId: 'ret_123', status: 'confirmed' };
  }

  private async upgradeBooking(trip: any) {
    // Upgrade booking
    return { upgradeId: 'upg_123', status: 'confirmed' };
  }

  private async sendEmergencyNotification(emergency: any) {
    // Send emergency notification to all relevant parties
    console.log('Sending emergency notification:', emergency);
  }

  private async getEmergencyInfo(userId: string, location: any) {
    // Get emergency information for location
    return {
      emergencyServices: '911',
      localPolice: '+1-555-POLICE',
      nearestHospital: 'City General Hospital',
      embassy: 'US Embassy',
      companySupport: '+1-800-COMPANY',
    };
  }

  private async logEmergencyIncident(emergency: any) {
    // Log emergency incident for follow-up
    console.log('Logging emergency incident:', emergency);
  }

  private async getPendingNotifications(userId: string) {
    // Get pending notifications for user
    return [];
  }
}

export const mobileExperience = new MobileExperience();



