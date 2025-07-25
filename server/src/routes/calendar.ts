import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { and, or } from 'drizzle-orm/sql/expressions/conditions';import { getDatabase } from '../db/connection.js';
import { calendarIntegrations, trips, activities } from '../src/db/schema';
import { authenticate as validateJWT } from '../middleware/secureAuth';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext';
import { z } from 'zod';

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};


const router = Router();

// Apply middleware to all routes
router.use(validateJWT);
router.use(injectOrganizationContext);
router.use(validateOrganizationAccess);

// Calendar event generation for trips
router.post('/generate-ical/:tripId', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const tripId = parseInt(req.params.trip_id);
    const organizationId = req.user.organization_id;
    
    // Verify trip belongs to user's organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, tripId),
        eq(trips.organization_id, organizationId)
      ));
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    // Get trip activities for calendar events
    const tripActivities = await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.trip_id, tripId),
        eq(activities.organization_id, organizationId)
      ));
    
    // Generate iCal format
    const icalData = generateICalendar(trip, tripActivities);
    
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${trip.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`);
    res.send(icalData);
  } catch (error) {
    console.error('Error generating calendar:', error);
    res.status(500).json({ error: "Failed to generate calendar" });
  }
});

// Get calendar integration status
router.get('/integrations', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const userId = req.user.id;
    const organizationId = req.user.organization_id;
    
    const integrations = await db
      .select({
        id: calendarIntegrations.id,
        provider: calendarIntegrations.provider,
        syncEnabled: calendarIntegrations.syncEnabled,
        lastSyncAt: calendarIntegrations.lastSyncAt,
        createdAt: calendarIntegrations.createdAt,
      })
      .from(calendarIntegrations)
      .where(and(
        eq(calendarIntegrations.user_id, userId),
        eq(calendarIntegrations.organization_id, organizationId)
      ));
    
    res.json(integrations);
  } catch (error) {
    console.error('Error fetching calendar integrations:', error);
    res.status(500).json({ error: "Failed to fetch integrations" });
  }
});

// Enable calendar sync for trip
router.post('/sync-trip/:tripId', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const tripId = parseInt(req.params.trip_id);
    const organizationId = req.user.organization_id;
    
    // Verify trip belongs to user's organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, tripId),
        eq(trips.organization_id, organizationId)
      ));
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    // For now, return instructions for manual calendar setup
    // This would integrate with Google Calendar API, Outlook API, etc. when API keys are provided
    const calendarInstructions = {
      manual: {
        description: "Add trip events to your calendar manually",
        events: await generateCalendarEvents(trip, tripId, organizationId)
      },
      integrations: {
        google: {
          available: false,
          setupUrl: "/calendar/setup/google",
          description: "Connect Google Calendar for automatic sync"
        },
        outlook: {
          available: false,
          setupUrl: "/calendar/setup/outlook", 
          description: "Connect Outlook Calendar for automatic sync"
        }
      }
    };
    
    res.json(calendarInstructions);
  } catch (error) {
    console.error('Error setting up calendar sync:', error);
    res.status(500).json({ error: "Failed to setup calendar sync" });
  }
});

// Helper function to generate iCal format
function generateICalendar(trip: any, activities: any[]): string {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  
  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NestMap//Business Travel//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];
  
  // Main trip event
  ical.push(
    'BEGIN:VEVENT',
    `UID:trip-${trip.id}@nestmap.com`,
    `DTSTART;VALUE=DATE:${formatDate(startDate)}`,
    `DTEND;VALUE=DATE:${formatDate(new Date(endDate.getTime() + 86400000))}`, // Add 1 day
    `SUMMARY:Business Trip: ${trip.title}`,
    `DESCRIPTION:${trip.description || 'Business travel to ' + trip.city}`,
    `LOCATION:${trip.city}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Business trip starting tomorrow',
    'END:VALARM',
    'END:VEVENT'
  );
  
  // Activity events
  activities.forEach((activity, index) => {
    const activityDate = new Date(activity.date);
    const timeString = activity.time || '09:00';
    const [hours, minutes] = timeString.split(':');
    activityDate.setHours(parseInt(hours), parseInt(minutes));
    
    ical.push(
      'BEGIN:VEVENT',
      `UID:activity-${activity.id}@nestmap.com`,
      `DTSTART:${formatDateTime(activityDate)}`,
      `DTEND:${formatDateTime(new Date(activityDate.getTime() + 3600000))}`, // 1 hour duration
      `SUMMARY:${activity.title}`,
      `DESCRIPTION:${activity.description || ''}`,
      `LOCATION:${activity.location || trip.city}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });
  
  ical.push('END:VCALENDAR');
  return ical.join('\r\n');
}

// Helper function to generate calendar events for API response
async function generateCalendarEvents(trip: any, tripId: number, organizationId: number) {
  const tripActivities = await db
    .select()
    .from(activities)
    .where(and(
      eq(activities.trip_id, tripId),
      eq(activities.organization_id, organizationId)
    ));
  
  return [
    {
      title: `Business Trip: ${trip.title}`,
      start: trip.startDate,
      end: trip.endDate,
      allDay: true,
      description: trip.description || `Business travel to ${trip.city}`,
      location: trip.city
    },
    ...tripActivities.map(activity => ({
      title: activity.title,
      start: `${activity.date}T${activity.time || '09:00'}:00`,
      end: `${activity.date}T${addHour(activity.time || '09:00')}:00`,
      description: activity.notes || '',
      location: activity.locationName || trip.city
    }))
  ];
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

function formatDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function addHour(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const newHours = (parseInt(hours) + 1).toString().padStart(2, '0');
  return `${newHours}:${minutes}`;
}

export default router;