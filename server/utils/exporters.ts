import { stringify } from 'csv-stringify/sync';
import { createEvents, EventAttributes } from 'ics';

interface Activity {
    date: string;
    time?: string;
    title?: string;
    name?: string;
    location?: string;
    description?: string;
    cost?: number | string;
}

interface Trip {
    activities?: Activity[];
}
// Converts a trip object to CSV string
export function exportTripToCSV(trip: Trip): string {
    const activities = trip.activities || [];
    const rows = activities.map((a: Activity) => [
        a.date,
        a.time || '',
        a.title || a.name,
        a.location || '',
        a.description || '',
        a.cost || '',
    ]);
    return stringify([
        ['Date', 'Time', 'Title', 'Location', 'Description', 'Cost'],
        ...rows
    ]);
}
// Converts a trip object to ICS calendar string
export function exportTripToICS(trip: Trip): string {
    const activities = trip.activities || [];
    const events = activities.map((a: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => ({
        title: a.title || a.name,
        description: a.description || '',
        location: a.location || '',
        start: parseDateTime(a.date, a.time),
        duration: { hours: 1 },
    }));
    const { error, value } = createEvents(events);
    if (error) {
        console.error('Error creating ICS events:', error);
        throw new Error(`Failed to generate ICS: ${error.message}`);
    }
    return value || '';
}
function parseDateTime(date: string, time?: string): number[] {
    const d = new Date(`${date}T${time || '09:00'}`);
    return [
        d.getFullYear(),
        d.getMonth() + 1, // Month is 0-indexed in JavaScript
        d.getDate(),
        d.getHours(),
        d.getMinutes()
    ] as [number, number, number, number, number];
}
