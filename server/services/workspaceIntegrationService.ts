import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { db } from '../db';
import { 
  calendarIntegrations, 
  trips, 
  activities,
  users,
  notifications,
  InsertCalendarIntegration 
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import axios from 'axios';

interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
  isAllDay?: boolean;
  reminders?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  tripId?: number;
  activityId?: number;
}

interface EmailTemplate {
  subject: string;
  body: string;
  recipients: string[];
  cc?: string[];
  attachments?: Array<{ name: string; content: Buffer }>;
}

export class WorkspaceIntegrationService {
  private googleOAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Google Calendar Integration
  async connectGoogleCalendar(userId: number, authCode: string): Promise<void> {
    try {
      // Exchange auth code for tokens
      const { tokens } = await this.googleOAuth2Client.getToken(authCode);
      this.googleOAuth2Client.setCredentials(tokens);

      // Get calendar info
      const calendar = google.calendar({ version: 'v3', auth: this.googleOAuth2Client });
      const { data: calendarList } = await calendar.calendarList.list();
      
      const primaryCalendar = calendarList.items?.find(cal => cal.primary) || calendarList.items?.[0];

      // Save integration
      await db.insert(calendarIntegrations)
        .values({
          userId,
          organizationId: 0, // Would need to pass this
          provider: 'google',
          accessToken: this.encrypt(tokens.access_token!),
          refreshToken: tokens.refresh_token ? this.encrypt(tokens.refresh_token) : null,
          calendarId: primaryCalendar?.id || 'primary',
          syncEnabled: true
        })
        .onConflictDoUpdate({
          target: [calendarIntegrations.userId, calendarIntegrations.provider],
          set: {
            accessToken: this.encrypt(tokens.access_token!),
            refreshToken: tokens.refresh_token ? this.encrypt(tokens.refresh_token) : null,
            syncEnabled: true,
            updatedAt: new Date()
          }
        });

      // Initial sync
      await this.syncGoogleCalendar(userId);
    } catch (error) {
      console.error('Google Calendar connection failed:', error);
      throw new Error('Failed to connect Google Calendar');
    }
  }

  // Sync trips to Google Calendar
  async syncGoogleCalendar(userId: number): Promise<void> {
    const [integration] = await db.select()
      .from(calendarIntegrations)
      .where(
        and(
          eq(calendarIntegrations.userId, userId),
          eq(calendarIntegrations.provider, 'google')
        )
      );

    if (!integration || !integration.syncEnabled) return;

    // Set up OAuth client
    this.googleOAuth2Client.setCredentials({
      access_token: this.decrypt(integration.accessToken!),
      refresh_token: integration.refreshToken ? this.decrypt(integration.refreshToken) : undefined
    });

    const calendar = google.calendar({ version: 'v3', auth: this.googleOAuth2Client });

    // Get user's trips
    const userTrips = await db.select()
      .from(trips)
      .where(eq(trips.user_id, userId));

    for (const trip of userTrips) {
      try {
        const event: any = {
          summary: `✈️ ${trip.title}`,
          description: `Business trip to ${trip.city || trip.location}\n\nManaged by Remvana`,
          start: {
            date: trip.start_date.toISOString().split('T')[0],
            timeZone: 'UTC'
          },
          end: {
            date: new Date(trip.end_date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            timeZone: 'UTC'
          },
          location: trip.city || trip.location,
          extendedProperties: {
            private: {
              remvana_trip_id: trip.id.toString()
            }
          }
        };

        // Check if event already exists
        const { data: existingEvents } = await calendar.events.list({
          calendarId: integration.calendarId || 'primary',
          privateExtendedProperty: `remvana_trip_id=${trip.id}`
        });

        if (existingEvents.items && existingEvents.items.length > 0) {
          // Update existing event
          await calendar.events.update({
            calendarId: integration.calendarId || 'primary',
            eventId: existingEvents.items[0].id!,
            requestBody: event
          });
        } else {
          // Create new event
          await calendar.events.insert({
            calendarId: integration.calendarId || 'primary',
            requestBody: event
          });
        }
      } catch (error) {
        console.error(`Failed to sync trip ${trip.id} to Google Calendar:`, error);
      }
    }

    // Update last sync time
    await db.update(calendarIntegrations)
      .set({ lastSyncAt: new Date() })
      .where(eq(calendarIntegrations.id, integration.id));
  }

  // Microsoft 365 Calendar Integration
  async connectMicrosoft365(userId: number, authCode: string): Promise<void> {
    try {
      // Exchange auth code for tokens
      const tokenResponse = await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          code: authCode,
          redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
          grant_type: 'authorization_code',
          scope: 'calendars.readwrite mail.send'
        })
      );

      const { access_token, refresh_token } = tokenResponse.data;

      // Get user info
      const client = Client.init({
        authProvider: (done) => {
          done(null, access_token);
        }
      });

      const user = await client.api('/me').get();

      // Save integration
      await db.insert(calendarIntegrations)
        .values({
          userId,
          organizationId: 0, // Would need to pass this
          provider: 'outlook',
          accessToken: this.encrypt(access_token),
          refreshToken: refresh_token ? this.encrypt(refresh_token) : null,
          calendarId: user.mail,
          syncEnabled: true
        })
        .onConflictDoUpdate({
          target: [calendarIntegrations.userId, calendarIntegrations.provider],
          set: {
            accessToken: this.encrypt(access_token),
            refreshToken: refresh_token ? this.encrypt(refresh_token) : null,
            syncEnabled: true,
            updatedAt: new Date()
          }
        });

      // Initial sync
      await this.syncMicrosoft365Calendar(userId);
    } catch (error) {
      console.error('Microsoft 365 connection failed:', error);
      throw new Error('Failed to connect Microsoft 365');
    }
  }

  // Sync trips to Microsoft 365 Calendar
  async syncMicrosoft365Calendar(userId: number): Promise<void> {
    const [integration] = await db.select()
      .from(calendarIntegrations)
      .where(
        and(
          eq(calendarIntegrations.userId, userId),
          eq(calendarIntegrations.provider, 'outlook')
        )
      );

    if (!integration || !integration.syncEnabled) return;

    const client = Client.init({
      authProvider: (done) => {
        done(null, this.decrypt(integration.accessToken!));
      }
    });

    // Get user's trips
    const userTrips = await db.select()
      .from(trips)
      .where(eq(trips.user_id, userId));

    for (const trip of userTrips) {
      try {
        const event = {
          subject: `✈️ ${trip.title}`,
          body: {
            contentType: 'HTML',
            content: `<p>Business trip to ${trip.city || trip.location}</p><p><i>Managed by Remvana</i></p>`
          },
          start: {
            dateTime: trip.start_date.toISOString(),
            timeZone: 'UTC'
          },
          end: {
            dateTime: trip.end_date.toISOString(),
            timeZone: 'UTC'
          },
          location: {
            displayName: trip.city || trip.location
          },
          isAllDay: true,
          extensions: {
            'com.remvana': {
              tripId: trip.id
            }
          }
        };

        // Check if event exists (would need to implement search)
        // For now, just create
        await client.api('/me/events').post(event);
      } catch (error) {
        console.error(`Failed to sync trip ${trip.id} to Outlook:`, error);
      }
    }

    // Update last sync time
    await db.update(calendarIntegrations)
      .set({ lastSyncAt: new Date() })
      .where(eq(calendarIntegrations.id, integration.id));
  }

  // Create calendar event for both providers
  async createCalendarEvent(
    userId: number,
    event: CalendarEvent
  ): Promise<void> {
    const integrations = await db.select()
      .from(calendarIntegrations)
      .where(
        and(
          eq(calendarIntegrations.userId, userId),
          eq(calendarIntegrations.syncEnabled, true)
        )
      );

    for (const integration of integrations) {
      try {
        if (integration.provider === 'google') {
          await this.createGoogleEvent(integration, event);
        } else if (integration.provider === 'outlook') {
          await this.createOutlookEvent(integration, event);
        }
      } catch (error) {
        console.error(`Failed to create event in ${integration.provider}:`, error);
      }
    }
  }

  // Send email via integrated provider
  async sendEmail(
    userId: number,
    template: EmailTemplate
  ): Promise<void> {
    const integrations = await db.select()
      .from(calendarIntegrations)
      .where(eq(calendarIntegrations.userId, userId));

    const outlookIntegration = integrations.find(i => i.provider === 'outlook');
    const googleIntegration = integrations.find(i => i.provider === 'google');

    if (outlookIntegration) {
      await this.sendOutlookEmail(outlookIntegration, template);
    } else if (googleIntegration) {
      await this.sendGmailEmail(googleIntegration, template);
    } else {
      throw new Error('No email integration found');
    }
  }

  // Import contacts for trip attendees
  async importContacts(
    userId: number,
    provider: 'google' | 'outlook'
  ): Promise<Array<{ name: string; email: string; phone?: string }>> {
    const [integration] = await db.select()
      .from(calendarIntegrations)
      .where(
        and(
          eq(calendarIntegrations.userId, userId),
          eq(calendarIntegrations.provider, provider)
        )
      );

    if (!integration) {
      throw new Error('Integration not found');
    }

    if (provider === 'google') {
      return this.importGoogleContacts(integration);
    } else {
      return this.importOutlookContacts(integration);
    }
  }

  // Sync notifications to calendar
  async syncNotificationsToCalendar(
    userId: number,
    notifications: Array<{ title: string; message: string; dueDate?: Date }>
  ): Promise<void> {
    for (const notification of notifications) {
      if (notification.dueDate) {
        await this.createCalendarEvent(userId, {
          title: `📌 ${notification.title}`,
          description: notification.message,
          start: notification.dueDate,
          end: new Date(notification.dueDate.getTime() + 30 * 60 * 1000), // 30 min duration
          reminders: [{ method: 'popup', minutes: 15 }]
        });
      }
    }
  }

  // Helper: Create Google Calendar event
  private async createGoogleEvent(
    integration: any,
    event: CalendarEvent
  ): Promise<void> {
    this.googleOAuth2Client.setCredentials({
      access_token: this.decrypt(integration.accessToken),
      refresh_token: integration.refreshToken ? this.decrypt(integration.refreshToken) : undefined
    });

    const calendar = google.calendar({ version: 'v3', auth: this.googleOAuth2Client });

    const googleEvent: any = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.isAllDay
        ? { date: event.start.toISOString().split('T')[0] }
        : { dateTime: event.start.toISOString() },
      end: event.isAllDay
        ? { date: event.end.toISOString().split('T')[0] }
        : { dateTime: event.end.toISOString() },
      attendees: event.attendees?.map(email => ({ email })),
      reminders: event.reminders
        ? { useDefault: false, overrides: event.reminders }
        : { useDefault: true }
    };

    if (event.tripId) {
      googleEvent.extendedProperties = {
        private: { remvana_trip_id: event.tripId.toString() }
      };
    }

    await calendar.events.insert({
      calendarId: integration.calendarId || 'primary',
      requestBody: googleEvent
    });
  }

  // Helper: Create Outlook event
  private async createOutlookEvent(
    integration: any,
    event: CalendarEvent
  ): Promise<void> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, this.decrypt(integration.accessToken));
      }
    });

    const outlookEvent = {
      subject: event.title,
      body: {
        contentType: 'HTML',
        content: event.description || ''
      },
      start: {
        dateTime: event.start.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: 'UTC'
      },
      location: event.location ? { displayName: event.location } : undefined,
      attendees: event.attendees?.map(email => ({
        emailAddress: { address: email },
        type: 'required'
      })),
      isAllDay: event.isAllDay,
      reminderMinutesBeforeStart: event.reminders?.[0]?.minutes || 15
    };

    await client.api('/me/events').post(outlookEvent);
  }

  // Helper: Send Gmail
  private async sendGmailEmail(
    integration: any,
    template: EmailTemplate
  ): Promise<void> {
    this.googleOAuth2Client.setCredentials({
      access_token: this.decrypt(integration.accessToken),
      refresh_token: integration.refreshToken ? this.decrypt(integration.refreshToken) : undefined
    });

    const gmail = google.gmail({ version: 'v1', auth: this.googleOAuth2Client });

    const message = [
      `To: ${template.recipients.join(', ')}`,
      template.cc ? `Cc: ${template.cc.join(', ')}` : '',
      `Subject: ${template.subject}`,
      '',
      template.body
    ].filter(Boolean).join('\n');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
  }

  // Helper: Send Outlook email
  private async sendOutlookEmail(
    integration: any,
    template: EmailTemplate
  ): Promise<void> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, this.decrypt(integration.accessToken));
      }
    });

    const message = {
      subject: template.subject,
      body: {
        contentType: 'HTML',
        content: template.body
      },
      toRecipients: template.recipients.map(email => ({
        emailAddress: { address: email }
      })),
      ccRecipients: template.cc?.map(email => ({
        emailAddress: { address: email }
      }))
    };

    await client.api('/me/sendMail').post({ message });
  }

  // Helper: Import Google Contacts
  private async importGoogleContacts(
    integration: any
  ): Promise<Array<{ name: string; email: string; phone?: string }>> {
    this.googleOAuth2Client.setCredentials({
      access_token: this.decrypt(integration.accessToken),
      refresh_token: integration.refreshToken ? this.decrypt(integration.refreshToken) : undefined
    });

    const people = google.people({ version: 'v1', auth: this.googleOAuth2Client });
    const { data } = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 100,
      personFields: 'names,emailAddresses,phoneNumbers'
    });

    return (data.connections || []).map(person => ({
      name: person.names?.[0]?.displayName || 'Unknown',
      email: person.emailAddresses?.[0]?.value || '',
      phone: person.phoneNumbers?.[0]?.value
    })).filter(contact => contact.email);
  }

  // Helper: Import Outlook Contacts
  private async importOutlookContacts(
    integration: any
  ): Promise<Array<{ name: string; email: string; phone?: string }>> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, this.decrypt(integration.accessToken));
      }
    });

    const contacts = await client.api('/me/contacts')
      .select('displayName,emailAddresses,mobilePhone')
      .top(100)
      .get();

    return contacts.value.map((contact: any) => ({
      name: contact.displayName,
      email: contact.emailAddresses?.[0]?.address,
      phone: contact.mobilePhone
    })).filter((contact: any) => contact.email);
  }

  // Helper: Encrypt sensitive data
  private encrypt(text: string): string {
    // In production, use proper encryption
    return Buffer.from(text).toString('base64');
  }

  // Helper: Decrypt sensitive data
  private decrypt(text: string): string {
    // In production, use proper decryption
    return Buffer.from(text, 'base64').toString();
  }
}

export const workspaceIntegrationService = new WorkspaceIntegrationService();