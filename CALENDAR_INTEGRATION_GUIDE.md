# Calendar Integration Guide

This guide covers the implementation and usage of the enhanced calendar synchronization system in NestMap.

## Overview

The Enhanced Calendar Sync Service provides comprehensive integration with major calendar providers:

- **Google Calendar** - Full two-way sync with OAuth 2.0
- **Microsoft Outlook** - Graph API integration with OAuth 2.0
- **Exchange Server** - EWS (Exchange Web Services) integration
- **CalDAV** - Standard CalDAV protocol support
- **iCal** - Read-only iCal feed support

## Features

### Core Functionality
- ✅ **Real Calendar Integration** - No simulations, fully working implementations
- ✅ **Two-way Synchronization** - Sync from and to external calendars
- ✅ **Conflict Resolution** - Handle scheduling conflicts intelligently
- ✅ **Meeting Room Management** - Book and manage meeting rooms
- ✅ **Trip/Activity Sync** - Automatically sync NestMap trips and activities
- ✅ **Real-time Updates** - Support for real-time, hourly, daily, and manual sync
- ✅ **Multiple Providers** - Support multiple calendar providers per user

### Sync Settings
- **Sync Direction**: One-way or two-way synchronization
- **Sync Frequency**: Real-time, hourly, daily, or manual
- **Event Filtering**: Choose which types of events to sync
- **Conflict Resolution**: Choose how to handle conflicts
- **Custom Prefixes**: Add custom prefixes to synced events
- **Reminders**: Configure reminder settings

## API Endpoints

### Base URL: `/api/calendar-sync`

#### Configure Calendar Provider
```http
POST /providers
```

**Request Body:**
```json
{
  "userId": 123,
  "organizationId": 456,
  "type": "google",
  "name": "My Google Calendar",
  "config": {
    "accessToken": "...",
    "refreshToken": "...",
    "clientId": "...",
    "clientSecret": "...",
    "calendarId": "primary"
  },
  "syncSettings": {
    "syncDirection": "two_way",
    "syncFrequency": "hourly",
    "syncTripEvents": true,
    "syncActivityEvents": true,
    "syncMeetingRooms": false,
    "syncAttendees": true,
    "eventPrefix": "[NestMap] ",
    "conflictResolution": "nestmap_wins",
    "autoCreateMeetings": true,
    "includePrivateEvents": false,
    "reminderMinutes": [15, 60]
  }
}
```

#### Get User's Providers
```http
GET /providers/:userId
```

#### Sync Calendar Events
```http
POST /sync/:userId
```

**Request Body:**
```json
{
  "providerId": "google-123-1234567890"
}
```

#### Get Events
```http
GET /events/:providerId?startDate=2024-01-01&endDate=2024-01-31
```

#### Create Trip Event
```http
POST /events/trip
```

**Request Body:**
```json
{
  "tripId": "trip-uuid",
  "providerId": "google-123-1234567890"
}
```

#### Create Activity Event
```http
POST /events/activity
```

**Request Body:**
```json
{
  "activityId": "activity-uuid",
  "providerId": "google-123-1234567890"
}
```

#### Book Meeting Room
```http
POST /meeting-rooms/book
```

**Request Body:**
```json
{
  "organizationId": 456,
  "roomId": "conference-room-1",
  "startTime": "2024-01-15T14:00:00.000Z",
  "endTime": "2024-01-15T15:00:00.000Z",
  "title": "Team Meeting",
  "attendees": ["user1@example.com", "user2@example.com"]
}
```

## Provider-Specific Setup

### Google Calendar

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Google Calendar API

2. **Create OAuth 2.0 Credentials**
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URIs

3. **Configuration**
   ```typescript
   const config: CalendarConfig = {
     clientId: "your-google-client-id",
     clientSecret: "your-google-client-secret",
     accessToken: "obtained-through-oauth",
     refreshToken: "obtained-through-oauth",
     calendarId: "primary" // or specific calendar ID
   };
   ```

### Microsoft Outlook

1. **Register Application**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Register new application
   - Add Microsoft Graph API permissions

2. **Configuration**
   ```typescript
   const config: CalendarConfig = {
     clientId: "your-azure-app-id",
     clientSecret: "your-azure-app-secret",
     tenantId: "your-tenant-id",
     accessToken: "obtained-through-oauth",
     refreshToken: "obtained-through-oauth"
   };
   ```

### Exchange Server

1. **Exchange Web Services (EWS)**
   - Ensure EWS is enabled on Exchange Server
   - Get the EWS endpoint URL

2. **Configuration**
   ```typescript
   const config: CalendarConfig = {
     serverUrl: "https://exchange.company.com/EWS/Exchange.asmx",
     username: "user@company.com",
     password: "user-password"
   };
   ```

### CalDAV

1. **CalDAV Server Setup**
   - Most email providers support CalDAV
   - Get the CalDAV server URL

2. **Configuration**
   ```typescript
   const config: CalendarConfig = {
     serverUrl: "https://caldav.provider.com/calendars/username/",
     username: "your-username",
     password: "your-password"
   };
   ```

### iCal (Read-only)

1. **iCal Feed URL**
   - Get the public iCal URL from your calendar provider

2. **Configuration**
   ```typescript
   const config: CalendarConfig = {
     serverUrl: "https://calendar.provider.com/calendar.ics"
   };
   ```

## Usage Examples

### Basic Calendar Sync

```typescript
import { enhancedCalendarSyncService } from './enhancedCalendarSync';

// Configure Google Calendar provider
const provider = await enhancedCalendarSyncService.configureProvider(
  123, // userId
  456, // organizationId
  'google',
  'My Google Calendar',
  {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    accessToken: 'your-access-token',
    refreshToken: 'your-refresh-token'
  },
  {
    syncDirection: 'two_way',
    syncFrequency: 'hourly',
    syncTripEvents: true,
    syncActivityEvents: true,
    conflictResolution: 'nestmap_wins'
  }
);

// Sync calendar events
const results = await enhancedCalendarSyncService.syncCalendar(123);
console.log('Sync results:', results);
```

### Creating Events from Trips

```typescript
// Create calendar event from a trip
const tripEvent = await enhancedCalendarSyncService.createTripEvent(
  'trip-uuid',
  'google-123-1234567890'
);
```

### Managing Meeting Rooms

```typescript
// Book a meeting room
const meetingEvent = await enhancedCalendarSyncService.bookMeetingRoom(
  456, // organizationId
  'conference-room-1',
  new Date('2024-01-15T14:00:00.000Z'),
  new Date('2024-01-15T15:00:00.000Z'),
  'Team Meeting',
  ['user1@example.com', 'user2@example.com']
);
```

## Error Handling

The service provides comprehensive error handling:

```typescript
try {
  const results = await enhancedCalendarSyncService.syncCalendar(123);
  
  // Check for errors in sync results
  results.forEach(result => {
    if (!result.success) {
      console.error('Sync errors:', result.errors);
    }
    
    if (result.conflicts.length > 0) {
      console.warn('Conflicts found:', result.conflicts);
    }
  });
} catch (error) {
  console.error('Sync failed:', error.message);
}
```

## Security Considerations

1. **Token Storage**: Store access and refresh tokens securely
2. **HTTPS Only**: Always use HTTPS for API communications
3. **Token Rotation**: Implement proper token refresh mechanisms
4. **Rate Limiting**: Respect provider rate limits
5. **Data Privacy**: Handle calendar data according to privacy requirements

## Testing

The implementation includes real integrations with:
- ✅ Google Calendar API v3
- ✅ Microsoft Graph API
- ✅ Exchange Web Services (EWS)
- ✅ CalDAV Protocol
- ✅ iCal Feed Parsing

## Dependencies

Required packages:
- `node-ews` - Exchange Web Services integration
- `dav` - CalDAV client library
- `ical.js` - iCalendar parsing library
- `@microsoft/microsoft-graph-client` - Microsoft Graph API client
- `axios` - HTTP client for API requests

## Support

For issues or questions:
1. Check the error messages in sync results
2. Verify provider configurations
3. Ensure proper authentication tokens
4. Check provider-specific documentation
