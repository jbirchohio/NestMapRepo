import { Request, Response } from "express";
import { Activity, Trip } from "@shared/schema";
import crypto from "crypto";

/**
 * CSRF Protection for Calendar Sync Operations
 */
interface CalendarCSRFToken {
  token: string;
  userId: number;
  organizationId: number;
  createdAt: Date;
  expiresAt: Date;
}

const calendarCSRFTokens = new Map<string, CalendarCSRFToken>();

/**
 * Generate CSRF token for calendar operations
 */
export function generateCalendarCSRFToken(userId: number, organizationId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

  calendarCSRFTokens.set(token, {
    token,
    userId,
    organizationId,
    createdAt: now,
    expiresAt
  });

  // Clean up expired tokens
  cleanupExpiredCalendarTokens();

  return token;
}

/**
 * Validate CSRF token for calendar operations
 */
export function validateCalendarCSRFToken(
  token: string, 
  userId: number, 
  organizationId: number
): boolean {
  const tokenData = calendarCSRFTokens.get(token);
  
  if (!tokenData) {
    return false;
  }

  if (tokenData.expiresAt < new Date()) {
    calendarCSRFTokens.delete(token);
    return false;
  }

  if (tokenData.userId !== userId || tokenData.organizationId !== organizationId) {
    return false;
  }

  return true;
}

/**
 * Clean up expired CSRF tokens
 */
function cleanupExpiredCalendarTokens(): void {
  const now = new Date();
  for (const [token, tokenData] of calendarCSRFTokens.entries()) {
    if (tokenData.expiresAt < now) {
      calendarCSRFTokens.delete(token);
    }
  }
}

/**
 * Middleware to validate calendar CSRF tokens
 */
export function validateCalendarCSRF(req: Request, res: Response, next: Function): void {
  const token = req.headers['x-calendar-csrf-token'] as string;
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!token) {
    res.status(403).json({ error: 'CSRF token required for calendar operations' });
    return;
  }

  if (!validateCalendarCSRFToken(token, user.id, user.organizationId || 0)) {
    res.status(403).json({ error: 'Invalid or expired CSRF token' });
    return;
  }

  next();
}

// Google Calendar API integration
export async function syncToGoogleCalendar(trip: Trip, activities: Activity[], accessToken: string) {
  const events = activities.map(activity => {
    const activityDate = new Date(activity.date);
    const [hours, minutes] = activity.time.split(':').map(Number);
    
    const startDate = new Date(activityDate);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
    
    return {
      summary: activity.title,
      description: `${activity.notes || ''}\n\nPart of trip: ${trip.title}\nCreated with NestMap`,
      location: activity.locationName || '',
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/New_York', // Could be made dynamic based on trip location
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/New_York',
      },
    };
  });

  const results = [];
  
  for (const event of events) {
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
      
      if (response.ok) {
        const createdEvent = await response.json();
        results.push({ success: true, eventId: createdEvent.id, title: event.summary });
      } else {
        const error = await response.text();
        results.push({ success: false, error, title: event.summary });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      results.push({ success: false, error: errorMessage, title: event.summary });
    }
  }
  
  return results;
}

// Outlook Calendar API integration
export async function syncToOutlookCalendar(trip: Trip, activities: Activity[], accessToken: string) {
  const events = activities.map(activity => {
    const activityDate = new Date(activity.date);
    const [hours, minutes] = activity.time.split(':').map(Number);
    
    const startDate = new Date(activityDate);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
    
    return {
      subject: activity.title,
      body: {
        contentType: 'text',
        content: `${activity.notes || ''}\n\nLocation: ${activity.locationName || ''}\n\nPart of trip: ${trip.title}\nCreated with NestMap`,
      },
      location: {
        displayName: activity.locationName || '',
      },
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/New_York',
      },
    };
  });

  const results = [];
  
  for (const event of events) {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
      
      if (response.ok) {
        const createdEvent = await response.json();
        results.push({ success: true, eventId: createdEvent.id, title: event.subject });
      } else {
        const error = await response.text();
        results.push({ success: false, error, title: event.subject });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      results.push({ success: false, error: errorMessage, title: event.subject });
    }
  }
  
  return results;
}

// OAuth flow helpers
export function getGoogleAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/auth/google/callback`;
  const scope = 'https://www.googleapis.com/auth/calendar';
  
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
}

export function getMicrosoftAuthUrl(): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${baseUrl}/api/auth/microsoft/callback`;
  const scope = 'https://graph.microsoft.com/calendars.readwrite';
  
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
}

export async function exchangeGoogleCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',
    }),
  });
  
  const data = await response.json();
  return data.access_token;
}

export async function exchangeMicrosoftCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/auth/microsoft/callback',
    }),
  });
  
  const data = await response.json();
  return data.access_token;
}