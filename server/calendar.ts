import type { Request, Response } from './express-augmentations.js';
// Import types directly from the shared directory
import type { Activity, Trip } from '@shared/schema';
// Generate iCal format content for calendar export
export function generateICalContent(trip: Trip, activities: Activity[]): string {
    const events = activities.map(activity => {
        // Parse the activity date and time properly
        const activityDate = activity.date ? new Date(activity.date) : new Date();
        const [hours = 12, minutes = 0] = activity.time?.split(':').map(Number) || [];
        const startDate = new Date(activityDate);
        startDate.setHours(hours, minutes, 0, 0);
        // Default 2 hour duration for each activity
        const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
        const formatDateForICal = (date: Date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
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
    }).join('\n');
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
        const activityDate = activity.date ? new Date(activity.date) : new Date();
        const [hours = 12, minutes = 0] = activity.time?.split(':').map(Number) || [];
        const startDate = new Date(activityDate);
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
        const formatDateForGoogle = (date: Date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(activity.title)}&dates=${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}&details=${encodeURIComponent(`${activity.notes || ''}\n\nLocation: ${activity.locationName || ''}\n\nPart of trip: ${trip.title}\nCreated with NestMap`)}&location=${encodeURIComponent(activity.locationName || '')}`;
    });
}
// Generate Outlook Calendar URLs for each activity
export function generateOutlookCalendarUrls(trip: Trip, activities: Activity[]): string[] {
    return activities.map(activity => {
        const activityDate = activity.date ? new Date(activity.date) : new Date();
        const [hours = 12, minutes = 0] = activity.time?.split(':').map(Number) || [];
        const startDate = new Date(activityDate);
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
        return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(activity.title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(`${activity.notes || ''}\n\nLocation: ${activity.locationName || ''}\n\nPart of trip: ${trip.title}\nCreated with NestMap`)}&location=${encodeURIComponent(activity.locationName || '')}`;
    });
}
