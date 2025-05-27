import { Request, Response } from "express";
import { Activity, Trip } from "@shared/schema";

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
      results.push({ success: false, error: error.message, title: event.summary });
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
      results.push({ success: false, error: error.message, title: event.subject });
    }
  }
  
  return results;
}

// OAuth flow helpers
export function getGoogleAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';
  const scope = 'https://www.googleapis.com/auth/calendar';
  
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
}

export function getMicrosoftAuthUrl(): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/auth/microsoft/callback';
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