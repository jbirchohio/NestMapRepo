// Centralized conflict detection service
export interface TripConflict {
    trips: number[];
    type: 'date_overlap' | 'geo_clustering' | 'resource_conflict';
    users?: number[];
    departments?: string[];
    city?: string;
    potentialSavings?: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
}
export interface ActivityConflict {
    type: 'time_overlap' | 'travel_time' | 'venue_hours' | 'capacity_conflict';
    severity: 'high' | 'medium' | 'low';
    activities: any[];
    description: string;
    suggestedFix: string;
    autoFixAvailable: boolean;
}
export function detectTripConflicts(trips: any[]): {
    conflicts: TripConflict[];
    opportunities: TripConflict[];
} {
    const conflicts: TripConflict[] = [];
    const opportunities: TripConflict[] = [];
    // Optimize conflict detection using sorted arrays and efficient lookups
    const sortedTrips = trips
        .map((trip, index) => ({
        ...trip,
        originalIndex: index,
        startTime: new Date(trip.startDate).getTime(),
        endTime: new Date(trip.endDate).getTime()
    }))
        .sort((a, b) => a.startTime - b.startTime);
    // Group trips by city for efficient geo-clustering
    const tripsByCity = new Map<string, typeof sortedTrips>();
    for (const trip of sortedTrips) {
        if (trip.city) {
            if (!tripsByCity.has(trip.city)) {
                tripsByCity.set(trip.city, []);
            }
            tripsByCity.get(trip.city)!.push(trip);
        }
    }
    // Efficient date overlap detection using sorted order
    for (let i = 0; i < sortedTrips.length; i++) {
        const trip1 = sortedTrips[i];
        // Only check trips that could potentially overlap
        for (let j = i + 1; j < sortedTrips.length; j++) {
            const trip2 = sortedTrips[j];
            // If trip2 starts after trip1 ends, no more overlaps possible
            if (trip2.startTime > trip1.endTime)
                break;
            // Date overlap detected
            conflicts.push({
                trips: [trip1.id, trip2.id],
                type: 'date_overlap',
                users: [trip1.user_id, trip2.user_id],
                departments: [trip1.department, trip2.department],
                severity: 'high',
                description: `Overlapping travel dates for ${trip1.title} and ${trip2.title}`
            });
        }
    }
    // Efficient geo-clustering opportunities
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    const groupDiscount = 0.15;
    const baseCost = 2000;
    for (const [city, cityTrips] of tripsByCity) {
        if (cityTrips.length < 2)
            continue;
        for (let i = 0; i < cityTrips.length; i++) {
            for (let j = i + 1; j < cityTrips.length; j++) {
                const trip1 = cityTrips[i];
                const trip2 = cityTrips[j];
                // If trips are more than a week apart, skip
                if (trip2.startTime - trip1.startTime > weekInMs)
                    break;
                opportunities.push({
                    trips: [trip1.id, trip2.id],
                    type: 'geo_clustering',
                    city: city,
                    potentialSavings: baseCost * groupDiscount,
                    severity: 'medium',
                    description: `Group booking opportunity in ${trip1.city}`
                });
            }
        }
    }
    return { conflicts, opportunities };
}
export function detectActivityConflicts(activities: any[]): ActivityConflict[] {
    const conflicts: ActivityConflict[] = [];
    for (let i = 0; i < activities.length; i++) {
        for (let j = i + 1; j < activities.length; j++) {
            const activity1 = activities[i];
            const activity2 = activities[j];
            // Same day activities only
            if (activity1.day !== activity2.day)
                continue;
            const conflict = checkActivityTimeConflict(activity1, activity2);
            if (conflict) {
                conflicts.push(conflict);
            }
        }
    }
    return conflicts;
}
function checkActivityTimeConflict(activity1: any, activity2: any): ActivityConflict | null {
    const time1 = parseTime(activity1.time);
    const time2 = parseTime(activity2.time);
    if (!time1 || !time2)
        return null;
    const duration1 = activity1.duration || 60; // Default 1 hour
    const duration2 = activity2.duration || 60;
    const end1 = time1 + duration1;
    const end2 = time2 + duration2;
    // Check for overlap
    if (time1 < end2 && time2 < end1) {
        return {
            type: 'time_overlap',
            severity: 'high',
            activities: [activity1, activity2],
            description: `Time overlap between ${activity1.title} and ${activity2.title}`,
            suggestedFix: `Reschedule ${activity2.title} to start after ${formatTime(end1)}`,
            autoFixAvailable: true
        };
    }
    // Check for tight connections (less than 30 minutes travel time)
    const gap = Math.abs(time2 - end1);
    if (gap < 30 && gap > 0) {
        const distance = calculateDistance(activity1, activity2);
        if (distance > 5) { // More than 5km
            return {
                type: 'travel_time',
                severity: 'medium',
                activities: [activity1, activity2],
                description: `Tight connection between ${activity1.title} and ${activity2.title}`,
                suggestedFix: `Allow more time for travel (estimated ${Math.round(distance * 2)} minutes)`,
                autoFixAvailable: false
            };
        }
    }
    return null;
}
function parseTime(timeString: string): number | null {
    if (!timeString)
        return null;
    const match = timeString.match(/(\d{1,2}):(\d{2})/);
    if (!match)
        return null;
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    return hours * 60 + minutes; // Convert to minutes since midnight
}
function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
function calculateDistance(activity1: any, activity2: any): number {
    if (!activity1.latitude || !activity1.longitude || !activity2.latitude || !activity2.longitude) {
        return 5; // Default estimate
    }
    const lat1 = parseFloat(activity1.latitude);
    const lon1 = parseFloat(activity1.longitude);
    const lat2 = parseFloat(activity2.latitude);
    const lon2 = parseFloat(activity2.longitude);
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}
