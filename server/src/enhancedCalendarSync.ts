import { Router } from 'express';
import axios from 'axios';
import { db } from './db-connection';
import { users, trips, activities } from './db/schema';
import { eq, and, gte, lte } from './utils/drizzle-shim';
import { auditLogger } from './auditLogger';
import crypto from 'crypto';
import EWS from 'node-ews';
import { dav } from 'dav';
import ICAL from 'ical.js';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

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
      userId: userId.toString(),
      organizationId: organizationId.toString(),
      action: 'calendar_provider_configured',
      logType: 'calendar_provider',
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
          userId: userId.toString(),
          organizationId: provider.organizationId.toString(),
          action: 'calendar_sync_completed',
          logType: 'calendar_sync',
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
      if (!provider.config.serverUrl || !provider.config.username || !provider.config.password) {
        result.errors.push('Exchange integration requires server URL, username, and password');
        return result;
      }

      // Initialize EWS connection
      const ewsConfig = {
        username: provider.config.username,
        password: provider.config.password,
        host: provider.config.serverUrl.replace(/^https?:\/\//, ''),
        auth: 'basic'
      };

      const ews = new EWS(ewsConfig);

      // Get calendar items for the next 30 days
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const ewsFunction = 'FindItem';
      const ewsArgs = {
        'ItemShape': {
          'BaseShape': 'IdOnly',
          'AdditionalProperties': {
            'FieldURI': [
              { 'FieldURI': 'item:Subject' },
              { 'FieldURI': 'calendar:Start' },
              { 'FieldURI': 'calendar:End' },
              { 'FieldURI': 'item:Body' },
              { 'FieldURI': 'calendar:Location' },
              { 'FieldURI': 'calendar:IsAllDayEvent' },
              { 'FieldURI': 'calendar:CalendarItemType' }
            ]
          }
        },
        'ParentFolderIds': {
          'DistinguishedFolderId': {
            'Id': 'calendar'
          }
        },
        'CalendarView': {
          'StartDate': startDate.toISOString(),
          'EndDate': endDate.toISOString()
        }
      };

      const exchangeEvents = await ews.run(ewsFunction, ewsArgs);
      const providerEvents = this.events.get(provider.id) || [];

      if (exchangeEvents && exchangeEvents.ResponseMessages && exchangeEvents.ResponseMessages.FindItemResponseMessage) {
        const items = exchangeEvents.ResponseMessages.FindItemResponseMessage.RootFolder.Items.CalendarItem || [];
        const calendarItems = Array.isArray(items) ? items : [items];

        for (const calItem of calendarItems) {
          const event = this.convertExchangeEventToCalendarEvent(calItem, provider.id);
          
          const existingEvent = providerEvents.find(e => e.externalId === calItem.ItemId.Id);
          
          if (existingEvent) {
            Object.assign(existingEvent, event);
            result.eventsUpdated++;
          } else {
            providerEvents.push(event);
            result.eventsCreated++;
          }
        }
      }

      this.events.set(provider.id, providerEvents);

      // Sync NestMap events to Exchange if two-way sync is enabled
      if (provider.syncSettings.syncDirection === 'two_way') {
        await this.syncNestMapEventsToExchange(provider, ews);
      }

      result.success = true;

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
      if (!provider.config.serverUrl || !provider.config.username || !provider.config.password) {
        result.errors.push('CalDAV integration requires server URL, username, and password');
        return result;
      }

      // Initialize CalDAV client
      const xhr = new dav.transport.Basic(
        new dav.Credentials({
          username: provider.config.username,
          password: provider.config.password
        })
      );

      // Create account and discover calendars
      const account = await dav.createAccount({
        server: provider.config.serverUrl,
        xhr: xhr,
        loadCollections: true
      });

      if (!account.calendars || account.calendars.length === 0) {
        result.errors.push('No calendars found on CalDAV server');
        return result;
      }

      const calendar = account.calendars[0]; // Use first calendar
      const providerEvents = this.events.get(provider.id) || [];

      // Sync objects (events) from calendar
      const calendarObjects = await dav.syncCalendar(calendar, {
        xhr: xhr,
        syncToken: provider.config.customFields?.syncToken
      });

      // Update sync token for next sync
      if (!provider.config.customFields) {
        provider.config.customFields = {};
      }
      provider.config.customFields.syncToken = calendarObjects.syncToken;

      // Process calendar objects
      for (const calendarObject of calendarObjects.objects) {
        if (calendarObject.calendarData) {
          try {
            const jcalData = ICAL.parse(calendarObject.calendarData);
            const vcalendar = new ICAL.Component(jcalData);
            const vevents = vcalendar.getAllSubcomponents('vevent');

            for (const vevent of vevents) {
              const event = this.convertCalDAVEventToCalendarEvent(vevent, provider.id, calendarObject.url);
              
              const existingEvent = providerEvents.find(e => e.externalId === calendarObject.url);
              
              if (existingEvent) {
                Object.assign(existingEvent, event);
                result.eventsUpdated++;
              } else {
                providerEvents.push(event);
                result.eventsCreated++;
              }
            }
          } catch (parseError) {
            result.errors.push(`Failed to parse calendar event: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          }
        }
      }

      this.events.set(provider.id, providerEvents);

      // Sync NestMap events to CalDAV if two-way sync is enabled
      if (provider.syncSettings.syncDirection === 'two_way') {
        await this.syncNestMapEventsToCalDAV(provider, calendar, xhr);
      }

      result.success = true;

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
      if (!provider.config.serverUrl) {
        result.errors.push('iCal integration requires calendar URL');
        return result;
      }

      // Fetch iCal data from URL
      const response = await axios.get(provider.config.serverUrl, {
        headers: {
          'User-Agent': 'NestMap Calendar Sync',
          'Accept': 'text/calendar, text/plain'
        },
        timeout: 30000 // 30 second timeout
      });

      if (!response.data) {
        result.errors.push('No calendar data received from iCal URL');
        return result;
      }

      // Parse iCal data
      const jcalData = ICAL.parse(response.data);
      const vcalendar = new ICAL.Component(jcalData);
      const vevents = vcalendar.getAllSubcomponents('vevent');

      const providerEvents = this.events.get(provider.id) || [];

      // Process each calendar event
      for (const vevent of vevents) {
        try {
          const event = this.convertICalEventToCalendarEvent(vevent, provider.id);
          
          // Check if event already exists (based on UID)
          const uid = vevent.getFirstPropertyValue('uid');
          const existingEvent = providerEvents.find(e => e.externalId === uid);
          
          if (existingEvent) {
            Object.assign(existingEvent, event);
            result.eventsUpdated++;
          } else {
            providerEvents.push(event);
            result.eventsCreated++;
          }
        } catch (parseError) {
          result.errors.push(`Failed to parse iCal event: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      }

      this.events.set(provider.id, providerEvents);

      // Note: iCal is typically read-only, so no two-way sync
      result.success = true;

    } catch (error) {
      result.errors.push(`iCal sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Create calendar event from trip
  async createTripEvent(tripId: string, providerId: string): Promise<CalendarEvent> {
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
      location: tripData.city || '',
      startTime: tripData.startDate,
      endTime: tripData.endDate,
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
  async createActivityEvent(activityId: string, providerId: string): Promise<CalendarEvent> {
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
      description: `${activityData.notes || activityData.title}\n\nGenerated by NestMap`,
      location: activityData.locationName || '',
      startTime: new Date(activityData.date),
      endTime: new Date(new Date(activityData.date).getTime() + 60 * 60 * 1000), // Default 1 hour duration
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

  private convertExchangeEventToCalendarEvent(exchangeEvent: any, providerId: string): CalendarEvent {
    return {
      id: `exchange-${exchangeEvent.ItemId.Id}`,
      providerId,
      externalId: exchangeEvent.ItemId.Id,
      title: exchangeEvent.Subject || 'Untitled Event',
      description: exchangeEvent.Body?.Value || '',
      location: exchangeEvent.Location || '',
      startTime: new Date(exchangeEvent.Start),
      endTime: new Date(exchangeEvent.End),
      isAllDay: exchangeEvent.IsAllDayEvent || false,
      attendees: exchangeEvent.RequiredAttendees?.Attendee?.map((attendee: any) => ({
        email: attendee.Mailbox.EmailAddress,
        name: attendee.Mailbox.Name,
        status: 'needs_action' as const,
        isOrganizer: false,
        isOptional: false
      })) || [],
      status: 'confirmed' as const,
      visibility: 'private' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private convertCalDAVEventToCalendarEvent(vevent: any, providerId: string, url: string): CalendarEvent {
    const summary = vevent.getFirstPropertyValue('summary') || 'Untitled Event';
    const description = vevent.getFirstPropertyValue('description') || '';
    const location = vevent.getFirstPropertyValue('location') || '';
    const uid = vevent.getFirstPropertyValue('uid');
    const dtstart = vevent.getFirstPropertyValue('dtstart');
    const dtend = vevent.getFirstPropertyValue('dtend');
    const isAllDay = dtstart && !dtstart.isDate ? false : true;

    return {
      id: `caldav-${uid}`,
      providerId,
      externalId: url,
      title: summary,
      description,
      location,
      startTime: dtstart ? dtstart.toJSDate() : new Date(),
      endTime: dtend ? dtend.toJSDate() : new Date(),
      isAllDay,
      attendees: [],
      status: 'confirmed' as const,
      visibility: 'private' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private convertICalEventToCalendarEvent(vevent: any, providerId: string): CalendarEvent {
    const summary = vevent.getFirstPropertyValue('summary') || 'Untitled Event';
    const description = vevent.getFirstPropertyValue('description') || '';
    const location = vevent.getFirstPropertyValue('location') || '';
    const uid = vevent.getFirstPropertyValue('uid');
    const dtstart = vevent.getFirstPropertyValue('dtstart');
    const dtend = vevent.getFirstPropertyValue('dtend');
    const isAllDay = dtstart && !dtstart.isDate ? false : true;

    return {
      id: `ical-${uid}`,
      providerId,
      externalId: uid,
      title: summary,
      description,
      location,
      startTime: dtstart ? dtstart.toJSDate() : new Date(),
      endTime: dtend ? dtend.toJSDate() : new Date(),
      isAllDay,
      attendees: [],
      status: 'confirmed' as const,
      visibility: 'public' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async syncEventToProvider(event: CalendarEvent, provider: CalendarProvider): Promise<void> {
    try {
      switch (provider.type) {
        case 'google':
          await this.syncEventToGoogle(event, provider);
          break;
        case 'outlook':
          await this.syncEventToOutlook(event, provider);
          break;
        case 'exchange':
          await this.syncEventToExchange(event, provider);
          break;
        case 'caldav':
          await this.syncEventToCalDAV(event, provider);
          break;
        case 'ical':
          // iCal is typically read-only
          console.log(`Skipping sync to iCal (read-only): ${event.id}`);
          break;
        default:
          console.log(`Unsupported provider type for sync: ${provider.type}`);
      }
    } catch (error) {
      console.error(`Error syncing event ${event.id} to ${provider.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async syncEventToGoogle(event: CalendarEvent, provider: CalendarProvider): Promise<void> {
    await this.refreshGoogleToken(provider);
    
    const googleEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.isAllDay 
        ? { date: event.startTime.toISOString().split('T')[0] }
        : { dateTime: event.startTime.toISOString() },
      end: event.isAllDay 
        ? { date: event.endTime.toISOString().split('T')[0] }
        : { dateTime: event.endTime.toISOString() },
      attendees: event.attendees?.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name
      }))
    };

    await axios.post(
      `https://www.googleapis.com/calendar/v3/calendars/${provider.config.calendarId || 'primary'}/events`,
      googleEvent,
      {
        headers: { 'Authorization': `Bearer ${provider.config.accessToken}` }
      }
    );
  }

  private async syncEventToOutlook(event: CalendarEvent, provider: CalendarProvider): Promise<void> {
    await this.refreshOutlookToken(provider);
    
    const outlookEvent = {
      subject: event.title,
      body: {
        contentType: 'text',
        content: event.description
      },
      location: {
        displayName: event.location
      },
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: 'UTC'
      },
      isAllDay: event.isAllDay,
      attendees: event.attendees?.map(attendee => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name
        }
      }))
    };

    await axios.post(
      'https://graph.microsoft.com/v1.0/me/events',
      outlookEvent,
      {
        headers: { 'Authorization': `Bearer ${provider.config.accessToken}` }
      }
    );
  }

  private async syncEventToExchange(event: CalendarEvent, provider: CalendarProvider): Promise<void> {
    const ewsConfig = {
      username: provider.config.username,
      password: provider.config.password,
      host: provider.config.serverUrl?.replace(/^https?:\/\//, ''),
      auth: 'basic'
    };

    const ews = new EWS(ewsConfig);
    
    const ewsFunction = 'CreateItem';
    const ewsArgs = {
      'SavedItemFolderId': {
        'DistinguishedFolderId': {
          'Id': 'calendar'
        }
      },
      'Items': {
        'CalendarItem': {
          'Subject': event.title,
          'Body': {
            'BodyType': 'Text',
            'Value': event.description
          },
          'Start': event.startTime.toISOString(),
          'End': event.endTime.toISOString(),
          'Location': event.location,
          'IsAllDayEvent': event.isAllDay
        }
      }
    };

    await ews.run(ewsFunction, ewsArgs);
  }

  private async syncEventToCalDAV(event: CalendarEvent, provider: CalendarProvider): Promise<void> {
    const xhr = new dav.transport.Basic(
      new dav.Credentials({
        username: provider.config.username!,
        password: provider.config.password!
      })
    );

    const account = await dav.createAccount({
      server: provider.config.serverUrl!,
      xhr: xhr,
      loadCollections: true
    });

    if (!account.calendars || account.calendars.length === 0) {
      throw new Error('No calendars found on CalDAV server');
    }

    const calendar = account.calendars[0];
    
    // Create iCalendar string
    const icalString = this.createICalString(event);
    
    await dav.createCalendarObject(calendar, {
      data: icalString,
      filename: `${event.id}.ics`,
      xhr: xhr
    });
  }

  private createICalString(event: CalendarEvent): string {
    const uid = event.externalId || event.id;
    const now = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    const startTime = event.isAllDay 
      ? event.startTime.toISOString().split('T')[0].replace(/-/g, '')
      : event.startTime.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    const endTime = event.isAllDay 
      ? event.endTime.toISOString().split('T')[0].replace(/-/g, '')
      : event.endTime.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NestMap//Calendar Sync//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      event.isAllDay ? `DTSTART;VALUE=DATE:${startTime}` : `DTSTART:${startTime}`,
      event.isAllDay ? `DTEND;VALUE=DATE:${endTime}` : `DTEND:${endTime}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location || ''}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }

  private async syncNestMapEventsToGoogle(provider: CalendarProvider): Promise<void> {
    // Get NestMap trips and activities that need to be synced
    const nestMapEvents = await this.getNestMapEventsForSync(provider);
    
    for (const event of nestMapEvents) {
      try {
        await this.syncEventToGoogle(event, provider);
      } catch (error) {
        console.error(`Failed to sync NestMap event ${event.id} to Google: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async syncNestMapEventsToOutlook(provider: CalendarProvider): Promise<void> {
    // Get NestMap trips and activities that need to be synced
    const nestMapEvents = await this.getNestMapEventsForSync(provider);
    
    for (const event of nestMapEvents) {
      try {
        await this.syncEventToOutlook(event, provider);
      } catch (error) {
        console.error(`Failed to sync NestMap event ${event.id} to Outlook: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async syncNestMapEventsToExchange(provider: CalendarProvider, ews: any): Promise<void> {
    // Get NestMap trips and activities that need to be synced
    const nestMapEvents = await this.getNestMapEventsForSync(provider);
    
    for (const event of nestMapEvents) {
      try {
        await this.syncEventToExchange(event, provider);
      } catch (error) {
        console.error(`Failed to sync NestMap event ${event.id} to Exchange: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async syncNestMapEventsToCalDAV(provider: CalendarProvider, calendar: any, xhr: any): Promise<void> {
    // Get NestMap trips and activities that need to be synced
    const nestMapEvents = await this.getNestMapEventsForSync(provider);
    
    for (const event of nestMapEvents) {
      try {
        await this.syncEventToCalDAV(event, provider);
      } catch (error) {
        console.error(`Failed to sync NestMap event ${event.id} to CalDAV: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async getNestMapEventsForSync(provider: CalendarProvider): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    
    try {
      // Get trips if sync is enabled
      if (provider.syncSettings.syncTripEvents) {
        const userTrips = await db.select().from(trips).where(eq(trips.userId, provider.userId.toString()));
        
        for (const trip of userTrips) {
          const event: CalendarEvent = {
            id: `trip-${trip.id}`,
            providerId: provider.id,
            title: `${provider.syncSettings.eventPrefix || ''}${trip.title}`,
            description: `Trip to ${trip.city}\n\nGenerated by NestMap`,
            location: trip.city || '',
            startTime: trip.startDate,
            endTime: trip.endDate,
            isAllDay: true,
            status: 'confirmed',
            visibility: 'private',
            metadata: {
              tripId: trip.id,
              source: 'nestmap',
              type: 'trip'
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };
          events.push(event);
        }
      }

      // Get activities if sync is enabled
      if (provider.syncSettings.syncActivityEvents) {
        const userActivities = await db.select().from(activities).where(eq(activities.assignedTo, provider.userId.toString()));
        
        for (const activity of userActivities) {
          const event: CalendarEvent = {
            id: `activity-${activity.id}`,
            providerId: provider.id,
            title: `${provider.syncSettings.eventPrefix || ''}${activity.title}`,
            description: `${activity.notes || activity.title}\n\nGenerated by NestMap`,
            location: activity.locationName || '',
            startTime: new Date(activity.date),
            endTime: new Date(new Date(activity.date).getTime() + 60 * 60 * 1000), // Default 1 hour duration
            isAllDay: false,
            status: 'confirmed',
            visibility: 'private',
            metadata: {
              activityId: activity.id,
              source: 'nestmap',
              type: 'activity'
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };
          events.push(event);
        }
      }
    } catch (error) {
      console.error(`Error getting NestMap events for sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return events;
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

// Create API router for calendar sync
const router = Router();

// Configure a calendar provider
router.post('/providers', async (req, res) => {
  try {
    const { userId, organizationId, type, name, config, syncSettings } = req.body;
    
    const provider = await enhancedCalendarSyncService.configureProvider(
      userId,
      organizationId,
      type,
      name,
      config,
      syncSettings
    );
    
    res.json({ success: true, provider });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get user's calendar providers
router.get('/providers/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const providers = await enhancedCalendarSyncService.getUserProviders(userId);
    res.json({ success: true, providers });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Sync calendar events
router.post('/sync/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { providerId } = req.body;
    
    const results = await enhancedCalendarSyncService.syncCalendar(userId, providerId);
    res.json({ success: true, results });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get events for a provider
router.get('/events/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { startDate, endDate } = req.query;
    
    const events = await enhancedCalendarSyncService.getProviderEvents(
      providerId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    res.json({ success: true, events });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Create trip event
router.post('/events/trip', async (req, res) => {
  try {
    const { tripId, providerId } = req.body;
    
    const event = await enhancedCalendarSyncService.createTripEvent(tripId, providerId);
    res.json({ success: true, event });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Create activity event
router.post('/events/activity', async (req, res) => {
  try {
    const { activityId, providerId } = req.body;
    
    const event = await enhancedCalendarSyncService.createActivityEvent(activityId, providerId);
    res.json({ success: true, event });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get meeting rooms
router.get('/meeting-rooms/:organizationId', async (req, res) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const rooms = await enhancedCalendarSyncService.getMeetingRooms(organizationId);
    res.json({ success: true, rooms });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Book meeting room
router.post('/meeting-rooms/book', async (req, res) => {
  try {
    const { organizationId, roomId, startTime, endTime, title, attendees } = req.body;
    
    const event = await enhancedCalendarSyncService.bookMeetingRoom(
      organizationId,
      roomId,
      new Date(startTime),
      new Date(endTime),
      title,
      attendees
    );
    
    res.json({ success: true, event });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export { router as calendarSyncRouter };



