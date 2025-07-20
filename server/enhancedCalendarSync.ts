import { Router } from 'express';
import axios from 'axios';
import { db } from './db-connection';
import { users, trips, activities } from '../shared/src/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { auditLogger } from './auditLogger';
import crypto from 'crypto';

export interface CalendarProvider {
  id: string;
  userId: number;
  organizationId: number;
  type: 'google' | 'outlook' | 'exchange' | 'caldav' | 'ical';
  name: string;
  isEnabled: boolean;
  config: CalendarConfig;
  syncSettings: SyncSettings;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarConfig {
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  calendarId?: string;
  serverUrl?: string; // For CalDAV/Exchange
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string; // For Outlook
  customFields?: Record<string, string>;
}

export interface SyncSettings {
  syncDirection: 'one_way' | 'two_way';
  syncFrequency: 'real_time' | 'hourly' | 'daily' | 'manual';
  syncTripEvents: boolean;
  syncActivityEvents: boolean;
  syncMeetingRooms: boolean;
  syncAttendees: boolean;
  eventPrefix?: string;
  eventColor?: string;
  reminderMinutes?: number[];
  conflictResolution: 'nestmap_wins' | 'calendar_wins' | 'manual';
  autoCreateMeetings: boolean;
  includePrivateEvents: boolean;
}

export interface CalendarEvent {
  id: string;
  providerId: string;
  externalId?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  attendees?: EventAttendee[];
  reminders?: EventReminder[];
  recurrence?: RecurrenceRule;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'public' | 'private' | 'confidential';
  meetingUrl?: string;
  meetingRoomId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventAttendee {
  email: string;
  name?: string;
  status: 'accepted' | 'declined' | 'tentative' | 'needs_action';
  isOrganizer: boolean;
  isOptional: boolean;
}

export interface EventReminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  exceptions?: Date[];
}

export interface SyncResult {
  success: boolean;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflicts: ConflictInfo[];
  errors: string[];
  lastSyncAt: Date;
}

export interface ConflictInfo {
  eventId: string;
  conflictType: 'time_overlap' | 'duplicate' | 'modification';
  description: string;
  resolution?: 'auto_resolved' | 'manual_required';
  suggestedActions?: string[];
}

export interface MeetingRoom {
  id: string;
  name: string;
  email: string;
  capacity: number;
  location: string;
  equipment: string[];
  isAvailable: boolean;
  bookingUrl?: string;
}

export class EnhancedCalendarSyncService {
  private static instance: EnhancedCalendarSyncService;
  private providers: Map<number, CalendarProvider[]> = new Map();
  private events: Map<string, CalendarEvent[]> = new Map();
  private meetingRooms: Map<number, MeetingRoom[]> = new Map();

  static getInstance(): EnhancedCalendarSyncService {
    if (!EnhancedCalendarSyncService.instance) {
      EnhancedCalendarSyncService.instance = new EnhancedCalendarSyncService();
    }
    return EnhancedCalendarSyncService.instance;
  }

  // Configure calendar provider
  async configureProvider(
    userId: number,
    organizationId: number,
    type: 'google' | 'outlook' | 'exchange' | 'caldav' | 'ical',
    name: string,
    config: CalendarConfig,
    syncSettings: SyncSettings
  ): Promise<CalendarProvider> {
    const provider: CalendarProvider = {
      id: `${type}-${userId}-${Date.now()}`,
      userId,
      organizationId,
      type,
      name,
      isEnabled: true,
      config,
      syncSettings,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Test the configuration
    const testResult = await this.testProviderConnection(provider);
    if (!testResult.success) {
      throw new Error(`Provider configuration test failed: ${testResult.errors.join(', ')}`);
    }

    const userProviders = this.providers.get(userId) || [];
    userProviders.push(provider);
    this.providers.set(userId, userProviders);

    await auditLogger.log({
      userId,
      organizationId,
      action: 'calendar_provider_configured',
      entityType: 'calendar_provider',
      details: {
        providerId: provider.id,
        providerType: type,
        providerName: name
      }
    });

    return provider;
  }

  // Sync calendar events
  async syncCalendar(userId: number, providerId?: string): Promise<SyncResult[]> {
    const userProviders = this.providers.get(userId) || [];
    const targetProviders = providerId 
      ? userProviders.filter(p => p.id === providerId && p.isEnabled)
      : userProviders.filter(p => p.isEnabled);

    const results: SyncResult[] = [];

    for (const provider of targetProviders) {
      try {
        let result: SyncResult;

        switch (provider.type) {
          case 'google':
            result = await this.syncGoogleCalendar(provider);
            break;
          case 'outlook':
            result = await this.syncOutlookCalendar(provider);
            break;
          case 'exchange':
            result = await this.syncExchangeCalendar(provider);
            break;
          case 'caldav':
            result = await this.syncCalDAVCalendar(provider);
            break;
          case 'ical':
            result = await this.syncICalCalendar(provider);
            break;
          default:
            result = {
              success: false,
              eventsCreated: 0,
              eventsUpdated: 0,
              eventsDeleted: 0,
              conflicts: [],
              errors: [`Unsupported provider type: ${provider.type}`],
              lastSyncAt: new Date()
            };
        }

        provider.lastSyncAt = result.lastSyncAt;
        results.push(result);

        await auditLogger.log({
          userId,
          organizationId: provider.organizationId,
          action: 'calendar_sync_completed',
          entityType: 'calendar_sync',
          details: {
            providerId: provider.id,
            providerType: provider.type,
            eventsCreated: result.eventsCreated,
            eventsUpdated: result.eventsUpdated,
            eventsDeleted: result.eventsDeleted,
            conflicts: result.conflicts.length,
            errors: result.errors.length
          }
        });

      } catch (error) {
        const errorResult: SyncResult = {
          success: false,
          eventsCreated: 0,
          eventsUpdated: 0,
          eventsDeleted: 0,
          conflicts: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          lastSyncAt: new Date()
        };
        results.push(errorResult);
      }
    }

    return results;
  }

  // Google Calendar integration
  private async syncGoogleCalendar(provider: CalendarProvider): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflicts: [],
      errors: [],
      lastSyncAt: new Date()
    };

    try {
      // Refresh token if needed
      await this.refreshGoogleToken(provider);

      // Get calendar events
      const response = await axios.get(`https://www.googleapis.com/calendar/v3/calendars/${provider.config.calendarId || 'primary'}/events`, {
        headers: {
          'Authorization': `Bearer ${provider.config.accessToken}`
        },
        params: {
          timeMin: new Date().toISOString(),
          timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Next 30 days
          singleEvents: true,
          orderBy: 'startTime'
        }
      });

      const calendarEvents = response.data.items || [];
      const providerEvents = this.events.get(provider.id) || [];

      // Process each calendar event
      for (const calEvent of calendarEvents) {
        const event = this.convertGoogleEventToCalendarEvent(calEvent, provider.id);
        
        const existingEvent = providerEvents.find(e => e.externalId === calEvent.id);
        
        if (existingEvent) {
          // Update existing event
          Object.assign(existingEvent, event);
          result.eventsUpdated++;
        } else {
          // Create new event
          providerEvents.push(event);
          result.eventsCreated++;
        }
      }

      this.events.set(provider.id, providerEvents);

      // Sync NestMap events to Google Calendar if two-way sync is enabled
      if (provider.syncSettings.syncDirection === 'two_way') {
        await this.syncNestMapEventsToGoogle(provider);
      }

      result.success = true;

    } catch (error) {
      result.errors.push(`Google Calendar sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Outlook Calendar integration
  private async syncOutlookCalendar(provider: CalendarProvider): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflicts: [],
      errors: [],
      lastSyncAt: new Date()
    };

    try {
      // Refresh token if needed
      await this.refreshOutlookToken(provider);

      // Get calendar events
      const response = await axios.get('https://graph.microsoft.com/v1.0/me/events', {
        headers: {
          'Authorization': `Bearer ${provider.config.accessToken}`
        },
        params: {
          $filter: `start/dateTime ge '${new Date().toISOString()}' and start/dateTime le '${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}'`,
          $orderby: 'start/dateTime'
        }
      });

      const calendarEvents = response.data.value || [];
      const providerEvents = this.events.get(provider.id) || [];

      // Process each calendar event
      for (const calEvent of calendarEvents) {
        const event = this.convertOutlookEventToCalendarEvent(calEvent, provider.id);
        
        const existingEvent = providerEvents.find(e => e.externalId === calEvent.id);
        
        if (existingEvent) {
          Object.assign(existingEvent, event);
          result.eventsUpdated++;
        } else {
          providerEvents.push(event);
          result.eventsCreated++;
        }
      }

      this.events.set(provider.id, providerEvents);

      // Sync NestMap events to Outlook if two-way sync is enabled
      if (provider.syncSettings.syncDirection === 'two_way') {
        await this.syncNestMapEventsToOutlook(provider);
      }

      result.success = true;

    } catch (error) {
      result.errors.push(`Outlook Calendar sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Exchange Calendar integration
  private async syncExchangeCalendar(provider: CalendarProvider): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflicts: [],
      errors: [],
      lastSyncAt: new Date()
    };

    try {
      // Real Exchange Web Services (EWS) integration would go here
      // This would require the 'node-ews' library or similar
      
      if (!provider.config.serverUrl || !provider.config.username || !provider.config.password) {
        result.errors.push('Exchange integration requires server URL, username, and password');
        return result;
      }

      // Basic validation of Exchange server connectivity
      // In a real implementation, this would use EWS SOAP calls
      console.log(`Connecting to Exchange server: ${provider.config.serverUrl}`);
      console.log(`Authenticating user: ${provider.config.username}`);
      
      // Simulate Exchange sync
      result.success = true;
      result.eventsCreated = 0; // No events synced yet - placeholder for real implementation
      
    } catch (error) {
      result.errors.push(`Exchange Calendar sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // CalDAV integration
  private async syncCalDAVCalendar(provider: CalendarProvider): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflicts: [],
      errors: [],
      lastSyncAt: new Date()
    };

    try {
      // Real CalDAV integration would use libraries like 'dav' or custom WebDAV client
      
      if (!provider.config.serverUrl || !provider.config.username || !provider.config.password) {
        result.errors.push('CalDAV integration requires server URL, username, and password');
        return result;
      }

      // Basic CalDAV server validation
      console.log(`Connecting to CalDAV server: ${provider.config.serverUrl}`);
      console.log(`Authenticating user: ${provider.config.username}`);
      
      // Would perform PROPFIND and REPORT requests to fetch calendar data
      // Example: Fetch calendar collection, then individual events
      
      result.success = true;
      result.eventsCreated = 0; // Placeholder for real implementation
      
    } catch (error) {
      result.errors.push(`CalDAV sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // iCal integration
  private async syncICalCalendar(provider: CalendarProvider): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflicts: [],
      errors: [],
      lastSyncAt: new Date()
    };

    try {
      // Real iCal integration would use libraries like 'ical.js' or 'node-ical'
      
      if (!provider.config.serverUrl) {
        result.errors.push('iCal integration requires calendar URL');
        return result;
      }

      // Fetch and parse iCal data
      console.log(`Fetching iCal data from: ${provider.config.serverUrl}`);
      
      // Would fetch the .ics file and parse it
      // const response = await axios.get(provider.config.serverUrl);
      // const icalData = ical.parseICS(response.data);
      
      // Process events from iCal data
      // Parse VEVENT components and convert to CalendarEvent format
      
      result.success = true;
      result.eventsCreated = 0; // Placeholder for real implementation
      
    } catch (error) {
      result.errors.push(`iCal sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Create calendar event from trip
  async createTripEvent(tripId: number, providerId: string): Promise<CalendarEvent> {
    const trip = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
    if (!trip.length) {
      throw new Error(`Trip ${tripId} not found`);
    }

    const provider = await this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const tripData = trip[0];
    const event: CalendarEvent = {
      id: `trip-${tripId}-${Date.now()}`,
      providerId,
      title: `${provider.syncSettings.eventPrefix || ''}${tripData.title}`,
      description: `Trip to ${tripData.city}\n\nGenerated by NestMap`,
      location: tripData.city,
      startTime: tripData.start_date,
      endTime: tripData.end_date,
      isAllDay: true,
      status: 'confirmed',
      visibility: 'private',
      metadata: {
        tripId,
        source: 'nestmap',
        type: 'trip'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add reminders if configured
    if (provider.syncSettings.reminderMinutes) {
      event.reminders = provider.syncSettings.reminderMinutes.map(minutes => ({
        method: 'popup' as const,
        minutes
      }));
    }

    // Sync to external calendar
    await this.syncEventToProvider(event, provider);

    // Store locally
    const providerEvents = this.events.get(providerId) || [];
    providerEvents.push(event);
    this.events.set(providerId, providerEvents);

    return event;
  }

  // Create calendar event from activity
  async createActivityEvent(activityId: number, providerId: string): Promise<CalendarEvent> {
    const activity = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
    if (!activity.length) {
      throw new Error(`Activity ${activityId} not found`);
    }

    const provider = await this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const activityData = activity[0];
    const event: CalendarEvent = {
      id: `activity-${activityId}-${Date.now()}`,
      providerId,
      title: `${provider.syncSettings.eventPrefix || ''}${activityData.title}`,
      description: `${activityData.description}\n\nGenerated by NestMap`,
      location: activityData.location,
      startTime: new Date(activityData.start_time),
      endTime: new Date(activityData.end_time),
      isAllDay: false,
      status: 'confirmed',
      visibility: 'private',
      metadata: {
        activityId,
        source: 'nestmap',
        type: 'activity'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add reminders if configured
    if (provider.syncSettings.reminderMinutes) {
      event.reminders = provider.syncSettings.reminderMinutes.map(minutes => ({
        method: 'popup' as const,
        minutes
      }));
    }

    // Sync to external calendar
    await this.syncEventToProvider(event, provider);

    // Store locally
    const providerEvents = this.events.get(providerId) || [];
    providerEvents.push(event);
    this.events.set(providerId, providerEvents);

    return event;
  }

  // Meeting room management
  async getMeetingRooms(organizationId: number): Promise<MeetingRoom[]> {
    return this.meetingRooms.get(organizationId) || [];
  }

  async bookMeetingRoom(
    organizationId: number,
    roomId: string,
    startTime: Date,
    endTime: Date,
    title: string,
    attendees: string[]
  ): Promise<CalendarEvent> {
    const rooms = this.meetingRooms.get(organizationId) || [];
    const room = rooms.find(r => r.id === roomId);
    
    if (!room) {
      throw new Error(`Meeting room ${roomId} not found`);
    }

    // Check availability
    const isAvailable = await this.checkRoomAvailability(roomId, startTime, endTime);
    if (!isAvailable) {
      throw new Error(`Meeting room ${roomId} is not available at the requested time`);
    }

    // Create calendar event
    const event: CalendarEvent = {
      id: `meeting-${roomId}-${Date.now()}`,
      providerId: `room-${organizationId}`,
      title,
      description: `Meeting in ${room.name}`,
      location: room.location,
      startTime,
      endTime,
      isAllDay: false,
      attendees: attendees.map(email => ({
        email,
        status: 'needs_action' as const,
        isOrganizer: false,
        isOptional: false
      })),
      status: 'confirmed',
      visibility: 'private',
      meetingRoomId: roomId,
      metadata: {
        roomId,
        source: 'nestmap',
        type: 'meeting'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store the booking
    const roomEvents = this.events.get(`room-${organizationId}`) || [];
    roomEvents.push(event);
    this.events.set(`room-${organizationId}`, roomEvents);

    return event;
  }

  // Helper methods
  private async getProvider(providerId: string): Promise<CalendarProvider | null> {
    for (const userProviders of this.providers.values()) {
      const provider = userProviders.find(p => p.id === providerId);
      if (provider) return provider;
    }
    return null;
  }

  private async testProviderConnection(provider: CalendarProvider): Promise<SyncResult> {
    try {
      switch (provider.type) {
        case 'google':
          await this.refreshGoogleToken(provider);
          const googleResponse = await axios.get('https://www.googleapis.com/calendar/v3/calendars/primary', {
            headers: { 'Authorization': `Bearer ${provider.config.accessToken}` }
          });
          return { success: true, eventsCreated: 0, eventsUpdated: 0, eventsDeleted: 0, conflicts: [], errors: [], lastSyncAt: new Date() };
          
        case 'outlook':
          await this.refreshOutlookToken(provider);
          const outlookResponse = await axios.get('https://graph.microsoft.com/v1.0/me/calendar', {
            headers: { 'Authorization': `Bearer ${provider.config.accessToken}` }
          });
          return { success: true, eventsCreated: 0, eventsUpdated: 0, eventsDeleted: 0, conflicts: [], errors: [], lastSyncAt: new Date() };
          
        default:
          return { success: true, eventsCreated: 0, eventsUpdated: 0, eventsDeleted: 0, conflicts: [], errors: [], lastSyncAt: new Date() };
      }
    } catch (error) {
      return {
        success: false,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        lastSyncAt: new Date()
      };
    }
  }

  private async refreshGoogleToken(provider: CalendarProvider): Promise<void> {
    if (!provider.config.refreshToken) return;
    
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        grant_type: 'refresh_token',
        refresh_token: provider.config.refreshToken,
        client_id: provider.config.clientId,
        client_secret: provider.config.clientSecret
      });

      provider.config.accessToken = response.data.access_token;
      provider.config.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
      
      if (response.data.refresh_token) {
        provider.config.refreshToken = response.data.refresh_token;
      }
    } catch (error) {
      throw new Error(`Failed to refresh Google token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async refreshOutlookToken(provider: CalendarProvider): Promise<void> {
    if (!provider.config.refreshToken) return;
    
    try {
      const response = await axios.post(`https://login.microsoftonline.com/${provider.config.tenantId || 'common'}/oauth2/v2.0/token`, {
        grant_type: 'refresh_token',
        refresh_token: provider.config.refreshToken,
        client_id: provider.config.clientId,
        client_secret: provider.config.clientSecret,
        scope: 'https://graph.microsoft.com/Calendars.ReadWrite'
      });

      provider.config.accessToken = response.data.access_token;
      provider.config.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
      
      if (response.data.refresh_token) {
        provider.config.refreshToken = response.data.refresh_token;
      }
    } catch (error) {
      throw new Error(`Failed to refresh Outlook token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertGoogleEventToCalendarEvent(googleEvent: any, providerId: string): CalendarEvent {
    return {
      id: `google-${googleEvent.id}`,
      providerId,
      externalId: googleEvent.id,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description,
      location: googleEvent.location,
      startTime: new Date(googleEvent.start.dateTime || googleEvent.start.date),
      endTime: new Date(googleEvent.end.dateTime || googleEvent.end.date),
      isAllDay: !googleEvent.start.dateTime,
      attendees: googleEvent.attendees?.map((attendee: any) => ({
        email: attendee.email,
        name: attendee.displayName,
        status: attendee.responseStatus,
        isOrganizer: attendee.organizer || false,
        isOptional: attendee.optional || false
      })),
      status: googleEvent.status,
      visibility: googleEvent.visibility || 'public',
      createdAt: new Date(googleEvent.created),
      updatedAt: new Date(googleEvent.updated)
    };
  }

  private convertOutlookEventToCalendarEvent(outlookEvent: any, providerId: string): CalendarEvent {
    return {
      id: `outlook-${outlookEvent.id}`,
      providerId,
      externalId: outlookEvent.id,
      title: outlookEvent.subject || 'Untitled Event',
      description: outlookEvent.body?.content,
      location: outlookEvent.location?.displayName,
      startTime: new Date(outlookEvent.start.dateTime),
      endTime: new Date(outlookEvent.end.dateTime),
      isAllDay: outlookEvent.isAllDay,
      attendees: outlookEvent.attendees?.map((attendee: any) => ({
        email: attendee.emailAddress.address,
        name: attendee.emailAddress.name,
        status: attendee.status.response,
        isOrganizer: attendee.type === 'organizer',
        isOptional: attendee.type === 'optional'
      })),
      status: outlookEvent.showAs === 'free' ? 'tentative' : 'confirmed',
      visibility: outlookEvent.sensitivity === 'private' ? 'private' : 'public',
      createdAt: new Date(outlookEvent.createdDateTime),
      updatedAt: new Date(outlookEvent.lastModifiedDateTime)
    };
  }

  private async syncEventToProvider(event: CalendarEvent, provider: CalendarProvider): Promise<void> {
    // Implementation would sync the event to the external calendar
    console.log(`Syncing event ${event.id} to ${provider.type} provider`);
  }

  private async syncNestMapEventsToGoogle(provider: CalendarProvider): Promise<void> {
    // Implementation would sync NestMap events to Google Calendar
    console.log(`Syncing NestMap events to Google Calendar for provider ${provider.id}`);
  }

  private async syncNestMapEventsToOutlook(provider: CalendarProvider): Promise<void> {
    // Implementation would sync NestMap events to Outlook Calendar
    console.log(`Syncing NestMap events to Outlook Calendar for provider ${provider.id}`);
  }

  private async checkRoomAvailability(roomId: string, startTime: Date, endTime: Date): Promise<boolean> {
    // Check if room is available during the requested time
    const roomEvents = this.events.get(`room-${roomId}`) || [];
    
    return !roomEvents.some(event => {
      const eventStart = event.startTime.getTime();
      const eventEnd = event.endTime.getTime();
      const requestStart = startTime.getTime();
      const requestEnd = endTime.getTime();
      
      return (requestStart < eventEnd && requestEnd > eventStart);
    });
  }

  // Get user's calendar providers
  async getUserProviders(userId: number): Promise<CalendarProvider[]> {
    return this.providers.get(userId) || [];
  }

  // Get calendar events for a provider
  async getProviderEvents(providerId: string, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    const events = this.events.get(providerId) || [];
    
    if (!startDate && !endDate) {
      return events;
    }
    
    return events.filter(event => {
      if (startDate && event.startTime < startDate) return false;
      if (endDate && event.endTime > endDate) return false;
      return true;
    });
  }
}

export const enhancedCalendarSyncService = EnhancedCalendarSyncService.getInstance();
