import { stringify } from 'csv-stringify/sync';
import { createEvents } from 'ics';

// Converts a trip object to CSV string
export function exportTripToCSV(trip: any): string {
  const activities = trip.activities || [];
  const rows = activities.map((a: any) => [
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
export function exportTripToICS(trip: any): string {
  const activities = trip.activities || [];
  const events = activities.map((a: any) => ({
    title: a.title || a.name,
    description: a.description || '',
    location: a.location || '',
    start: parseDateTime(a.date, a.time),
    duration: { hours: 1 },
  }));
  const { error, value } = createEvents(events);
  if (error) throw error;
  return value || "";
}

function parseDateTime(date: string, time?: string): number[] {
  const d = new Date(`${date}T${time || '09:00'}`);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
}
