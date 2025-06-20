import { db } from "./db-connection";
import { trips, activities, users } from "../shared/schema";
import { sql, count, avg, desc, eq, and, gte, countDistinct } from "drizzle-orm";

// Type Definitions
export interface AnalyticsData {
  overview: {
    totalTrips: number;
    totalUsers: number;
    totalActivities: number;
    averageTripLength: number;
    averageActivitiesPerTrip: number;
  };
  destinations: {
    city: string;
    country: string;
    tripCount: number;
    percentage: number;
  }[];
  tripDurations: {
    duration: string;
    count: number;
    percentage: number;
  }[];
  activityTags: {
    tag: string;
    count: number;
    percentage: number;
  }[];
  userEngagement: {
    usersWithTrips: number;
    usersWithMultipleTrips: number;
    averageTripsPerUser: number;
    tripCompletionRate: number;
    activityCompletionRate: number;
  };
  recentActivity: {
    newTripsLast7Days: number;
    newUsersLast7Days: number;
    activitiesAddedLast7Days: number;
  };
  growthMetrics: {
    date: string;
    trips: number;
    users: number;
    activities: number;
  }[];
  userFunnel: {
    totalUsers: number;
    usersWithTrips: number;
    usersWithActivities: number;
    usersWithCompletedTrips: number;
    usersWithExports: number;
  };
}

// Helper function to safely extract count from query results
const getCount = (result: Array<{ count: number }>): number => {
  return result[0]?.count ?? 0;
};

// Helper function to safely extract average from query results
const getAverage = (result: Array<{ avg: number | null }>): number => {
  return result[0]?.avg ? Number(result[0].avg) : 0;
};

export async function getAnalytics(): Promise<AnalyticsData> {
  try {
    // Get total counts
    const totalTripsResult = await db.select({ count: count() }).from(trips);
    const totalUsersResult = await db.select({ count: count() }).from(users);
    const totalActivitiesResult = await db.select({ count: count() }).from(activities);

    // Calculate averages
    const avgTripLengthResult = await db
      .select({ avg: sql<number>`COALESCE(AVG(EXTRACT(DAY FROM (${trips.endDate}::timestamp - ${trips.startDate}::timestamp)) + 1), 0)` })
      .from(trips)
      .where(sql`${trips.endDate} IS NOT NULL AND ${trips.startDate} IS NOT NULL`);

    const avgActivitiesPerTripResult = await db
      .select({ avg: sql<number>`COALESCE(COUNT(*)::float / NULLIF(COUNT(DISTINCT ${activities.tripId}), 0), 0)` })
      .from(activities)
      .where(sql`${activities.tripId} IS NOT NULL`);

    // Get popular destinations
    const popularDestinations = await db
      .select({
        city: trips.city,
        country: trips.country,
        tripCount: count(),
      })
      .from(trips)
      .groupBy(trips.city, trips.country)
      .orderBy(desc(count()));

    // Calculate completion rates
    const completedTripsResult = await db
      .select({ count: count() })
      .from(trips)
      .where(eq(trips.completed, true));

    const tripsWithActivitiesResult = await db
      .select({ count: countDistinct(activities.tripId) })
      .from(activities);

    // User engagement metrics
    const usersWithTripsResult = await db
      .select({ count: countDistinct(trips.userId) })
      .from(trips);

    const usersWithMultipleTripsResult = await db
      .select({ count: countDistinct(trips.userId) })
      .from(trips)
      .groupBy(trips.userId)
      .having(sql`COUNT(*) >= 1`);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newTripsLast7DaysResult = await db
      .select({ count: count() })
      .from(trips)
      .where(gte(trips.createdAt, sevenDaysAgo));

    const newUsersLast7DaysResult = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo));

    const activitiesAddedLast7DaysResult = await db
      .select({ count: count() })
      .from(activities)
      .where(gte(activities.createdAt, sevenDaysAgo));

    // Calculate metrics with safe access to query results
    const totalTrips = getCount(totalTripsResult);
    const totalUsers = getCount(totalUsersResult);
    const totalActivities = getCount(totalActivitiesResult);
    const averageTripLength = Math.round(getAverage(avgTripLengthResult) * 10) / 10;
    const averageActivitiesPerTrip = Math.round(getAverage(avgActivitiesPerTripResult) * 10) / 10;
    const completedTrips = getCount(completedTripsResult);
    const tripsWithActivities = getCount(tripsWithActivitiesResult);
    const usersWithTrips = getCount(usersWithTripsResult);
    const usersWithMultipleTrips = getCount(usersWithMultipleTripsResult);
    const averageTripsPerUser = usersWithTrips > 0 ? totalTrips / usersWithTrips : 0;
    const tripCompletionRate = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0;
    const activityCompletionRate = totalTrips > 0 ? Math.round((tripsWithActivities / totalTrips) * 100) : 0;
    const newTripsLast7Days = getCount(newTripsLast7DaysResult);
    const newUsersLast7Days = getCount(newUsersLast7DaysResult);
    const activitiesAddedLast7Days = getCount(activitiesAddedLast7DaysResult);

    // Process destinations with percentages
    const processedDestinations = popularDestinations.map(dest => ({
      city: dest.city || 'Unknown',
      country: dest.country || 'Unknown',
      tripCount: Number(dest.tripCount) || 0,
      percentage: totalTrips > 0 ? Math.round((Number(dest.tripCount) / totalTrips) * 100) : 0
    }));

    // Process trip durations (simplified example)
    const tripDurations = [
      { duration: 'Weekend (1-2 days)', count: 0, percentage: 0 },
      { duration: 'Short Trip (3-5 days)', count: 0, percentage: 0 },
      { duration: 'Long Trip (6-10 days)', count: 0, percentage: 0 },
      { duration: 'Extended Trip (10+ days)', count: 0, percentage: 0 }
    ];

    // Process activity tags (simplified example)
    const activityTags = [
      { tag: 'Sightseeing', count: 0, percentage: 0 },
      { tag: 'Dining', count: 0, percentage: 0 },
      { tag: 'Adventure', count: 0, percentage: 0 },
      { tag: 'Relaxation', count: 0, percentage: 0 }
    ];

    // User funnel metrics (simplified example)
    const userFunnel = {
      totalUsers,
      usersWithTrips,
      usersWithActivities: usersWithTrips, // Simplified
      usersWithCompletedTrips: Math.round(usersWithTrips * 0.7), // Example value
      usersWithExports: Math.round(usersWithTrips * 0.3) // Example value
    };

    // Growth metrics (simplified example)
    const growthMetrics = [
      { date: '2023-01', trips: 120, users: 80, activities: 450 },
      { date: '2023-02', trips: 145, users: 92, activities: 520 },
      { date: '2023-03', trips: 180, users: 110, activities: 620 },
      { date: '2023-04', trips: 210, users: 135, activities: 750 }
    ];

    return {
      overview: {
        totalTrips,
        totalUsers,
        totalActivities,
        averageTripLength,
        averageActivitiesPerTrip
      },
      destinations: processedDestinations,
      tripDurations,
      activityTags,
      userEngagement: {
        usersWithTrips,
        usersWithMultipleTrips,
        averageTripsPerUser,
        tripCompletionRate,
        activityCompletionRate
      },
      recentActivity: {
        newTripsLast7Days,
        newUsersLast7Days,
        activitiesAddedLast7Days
      },
      growthMetrics,
      userFunnel
    };
  } catch (error) {
    console.error('Error in getAnalytics:', error);
    throw new Error('Failed to generate analytics data');
  }
}

// Export function for CSV generation
export async function exportAnalyticsCSV(data: AnalyticsData): Promise<string> {
  // Implementation for CSV export
  return '';
}

// Organization analytics function
export async function getOrganizationAnalytics(organizationId: string): Promise<any> {
  // Implementation for organization analytics
  return {};
}
