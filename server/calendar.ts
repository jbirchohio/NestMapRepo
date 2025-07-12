import { Request, Response } from "express";
import { Activity, Trip } from "../shared/src/schema.js";

// Generate iCal format content for calendar export
export function generateICalContent(trip: Trip, activities: Activity[]): string {
  const events = activities.map(activity => {
    // Parse the activity date and time properly
    if (!activity.date) return null;
    
    const activityDate = new Date(activity.date);
    const [hours, minutes] = activity.time ? activity.time.split(':').map(Number) : [9, 0]; // Default to 9:00 AM
    
    const startDate = new Date(activityDate);
    startDate.setHours(hours, minutes, 0, 0);
    
    // Default 2 hour duration for each activity
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
    
    const formatDateForICal = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z.js';
    };
    
    return `BEGIN:VEVENT
UID:nestmap-${activity.id}-${Date.now()}@nestmap.com
DTSTAMP:${formatDateForICal(new Date())}
DTSTART:${formatDateForICal(startDate)}
DTEND:${formatDateForICal(endDate)}
SUMMARY:${activity.title}
DESCRIPTION:${activity.notes || 'Activity from NestMap trip: ' + trip.title}
LOCATION:${activity.locationName || ''}
END:VEVENT`;
  }).filter(event => event !== null).join('\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NestMap//Trip Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${trip.title} - NestMap Trip
X-WR-CALDESC:Trip itinerary created with NestMap
${events}
END:VCALENDAR`;
}

// Generate Google Calendar URLs for each activity
export function generateGoogleCalendarUrls(trip: Trip, activities: Activity[]): string[] {
  return activities.map(activity => {
    if (!activity.date) return '';
    
    const activityDate = new Date(activity.date);
    const [hours, minutes] = activity.time ? activity.time.split(':').map(Number) : [9, 0]; // Default to 9:00 AM
    
    const startDate = new Date(activityDate);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
    
    const formatDateForGoogle = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z.js';
    };
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(activity.title)}&dates=${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}&details=${encodeURIComponent(`${activity.notes || ''}\n\nLocation: ${activity.locationName || ''}\n\nPart of trip: ${trip.title}\nCreated with NestMap`)}&location=${encodeURIComponent(activity.locationName || '')}`;
  });
}

// Generate Outlook Calendar URLs for each activity
export function generateOutlookCalendarUrls(trip: Trip, activities: Activity[]): string[] {
  return activities.map(activity => {
    if (!activity.date) return '';
    
    const activityDate = new Date(activity.date);
    const [hours, minutes] = activity.time ? activity.time.split(':').map(Number) : [9, 0]; // Default to 9:00 AM
    
    const startDate = new Date(activityDate);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
    
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(activity.title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(`${activity.notes || ''}\n\nLocation: ${activity.locationName || ''}\n\nPart of trip: ${trip.title}\nCreated with NestMap`)}&location=${encodeURIComponent(activity.locationName || '')}`;
  });
}