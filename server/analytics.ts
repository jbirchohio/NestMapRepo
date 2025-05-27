import { db } from "./db-connection";
import { trips, activities, todos, notes, users } from "@shared/schema";
import { sql, count, avg, desc, asc } from "drizzle-orm";

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
    completionRate: number;
  };
  recentActivity: {
    newTripsLast7Days: number;
    newUsersLast7Days: number;
    activitiesAddedLast7Days: number;
  };
}

export async function getAnalytics(): Promise<AnalyticsData> {
  try {
    // Overview statistics
    const [totalTripsResult] = await db.select({ count: count() }).from(trips);
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const [totalActivitiesResult] = await db.select({ count: count() }).from(activities);
    
    // Average trip length (in days)
    const [avgTripLengthResult] = await db.select({
      avgLength: avg(sql`EXTRACT(DAY FROM (${trips.endDate} - ${trips.startDate})) + 1`)
    }).from(trips);

    // Average activities per trip
    const [avgActivitiesResult] = await db.select({
      avgActivities: avg(sql`activity_count`)
    }).from(
      db.select({
        tripId: activities.tripId,
        activityCount: sql`COUNT(*)`.as('activity_count')
      })
      .from(activities)
      .groupBy(activities.tripId)
      .as('trip_activities')
    );

    // Most popular destinations
    const destinationsResult = await db.select({
      city: trips.city,
      country: trips.country,
      tripCount: count()
    })
    .from(trips)
    .where(sql`${trips.city} IS NOT NULL AND ${trips.country} IS NOT NULL`)
    .groupBy(trips.city, trips.country)
    .orderBy(desc(count()))
    .limit(10);

    const totalTripsWithDestination = destinationsResult.reduce((sum, dest) => sum + dest.tripCount, 0);
    const destinations = destinationsResult.map(dest => ({
      city: dest.city || 'Unknown',
      country: dest.country || 'Unknown',
      tripCount: dest.tripCount,
      percentage: totalTripsWithDestination > 0 ? Math.round((dest.tripCount / totalTripsWithDestination) * 100) : 0
    }));

    // Trip duration distribution
    const tripDurationsResult = await db.select({
      duration: sql`CASE 
        WHEN EXTRACT(DAY FROM (${trips.endDate} - ${trips.startDate})) + 1 <= 2 THEN 'Weekend (1-2 days)'
        WHEN EXTRACT(DAY FROM (${trips.endDate} - ${trips.startDate})) + 1 <= 5 THEN 'Short Trip (3-5 days)'
        WHEN EXTRACT(DAY FROM (${trips.endDate} - ${trips.startDate})) + 1 <= 10 THEN 'Long Trip (6-10 days)'
        ELSE 'Extended Trip (10+ days)'
      END`.as('duration'),
      count: count()
    })
    .from(trips)
    .groupBy(sql`CASE 
      WHEN EXTRACT(DAY FROM (${trips.endDate} - ${trips.startDate})) + 1 <= 2 THEN 'Weekend (1-2 days)'
      WHEN EXTRACT(DAY FROM (${trips.endDate} - ${trips.startDate})) + 1 <= 5 THEN 'Short Trip (3-5 days)'
      WHEN EXTRACT(DAY FROM (${trips.endDate} - ${trips.startDate})) + 1 <= 10 THEN 'Long Trip (6-10 days)'
      ELSE 'Extended Trip (10+ days)'
    END`)
    .orderBy(desc(count()));

    const totalTripsForDuration = tripDurationsResult.reduce((sum, dur) => sum + dur.count, 0);
    const tripDurations = tripDurationsResult.map(dur => ({
      duration: dur.duration as string,
      count: dur.count,
      percentage: totalTripsForDuration > 0 ? Math.round((dur.count / totalTripsForDuration) * 100) : 0
    }));

    // Activity tags distribution
    const activityTagsResult = await db.select({
      tag: activities.tag,
      count: count()
    })
    .from(activities)
    .where(sql`${activities.tag} IS NOT NULL`)
    .groupBy(activities.tag)
    .orderBy(desc(count()))
    .limit(10);

    const totalActivitiesWithTags = activityTagsResult.reduce((sum, tag) => sum + tag.count, 0);
    const activityTags = activityTagsResult.map(tag => ({
      tag: tag.tag || 'Untagged',
      count: tag.count,
      percentage: totalActivitiesWithTags > 0 ? Math.round((tag.count / totalActivitiesWithTags) * 100) : 0
    }));

    // User engagement metrics
    const [usersWithTripsResult] = await db.select({
      count: count()
    }).from(
      db.selectDistinct({ userId: trips.userId }).from(trips).as('users_with_trips')
    );

    const [usersWithMultipleTripsResult] = await db.select({
      count: count()
    }).from(
      db.select({
        userId: trips.userId,
        tripCount: count()
      })
      .from(trips)
      .groupBy(trips.userId)
      .having(sql`COUNT(*) > 1`)
      .as('users_multiple_trips')
    );

    const [avgTripsPerUserResult] = await db.select({
      avgTrips: avg(sql`trip_count`)
    }).from(
      db.select({
        userId: trips.userId,
        tripCount: sql`COUNT(*)`.as('trip_count')
      })
      .from(trips)
      .groupBy(trips.userId)
      .as('user_trip_counts')
    );

    // Completion rate (trips with at least one completed activity)
    const [tripsWithCompletedActivitiesResult] = await db.select({
      count: count()
    }).from(
      db.selectDistinct({ tripId: activities.tripId })
      .from(activities)
      .where(sql`${activities.completed} = true`)
      .as('trips_with_completed')
    );

    const completionRate = totalTripsResult.count > 0 ? 
      Math.round((tripsWithCompletedActivitiesResult.count / totalTripsResult.count) * 100) : 0;

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [newTripsLast7DaysResult] = await db.select({
      count: count()
    }).from(trips).where(sql`${trips.createdAt} >= ${sevenDaysAgo}`);

    const [newUsersLast7DaysResult] = await db.select({
      count: count()
    }).from(users).where(sql`${users.created_at} >= ${sevenDaysAgo}`);

    const [activitiesAddedLast7DaysResult] = await db.select({
      count: count()
    }).from(activities).where(sql`${activities.createdAt} >= ${sevenDaysAgo}`);

    return {
      overview: {
        totalTrips: totalTripsResult.count,
        totalUsers: totalUsersResult.count,
        totalActivities: totalActivitiesResult.count,
        averageTripLength: Math.round(Number(avgTripLengthResult.avgLength) || 0),
        averageActivitiesPerTrip: Math.round(Number(avgActivitiesResult.avgActivities) || 0)
      },
      destinations,
      tripDurations,
      activityTags,
      userEngagement: {
        usersWithTrips: usersWithTripsResult.count,
        usersWithMultipleTrips: usersWithMultipleTripsResult.count,
        averageTripsPerUser: Math.round(Number(avgTripsPerUserResult.avgTrips) || 0),
        completionRate
      },
      recentActivity: {
        newTripsLast7Days: newTripsLast7DaysResult.count,
        newUsersLast7Days: newUsersLast7DaysResult.count,
        activitiesAddedLast7Days: activitiesAddedLast7DaysResult.count
      }
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw new Error('Failed to fetch analytics data');
  }
}

export async function exportAnalyticsCSV(data: AnalyticsData): Promise<string> {
  const csvRows: string[] = [];
  
  // Overview section
  csvRows.push('Analytics Export - ' + new Date().toISOString());
  csvRows.push('');
  csvRows.push('OVERVIEW');
  csvRows.push('Metric,Value');
  csvRows.push(`Total Trips,${data.overview.totalTrips}`);
  csvRows.push(`Total Users,${data.overview.totalUsers}`);
  csvRows.push(`Total Activities,${data.overview.totalActivities}`);
  csvRows.push(`Average Trip Length (days),${data.overview.averageTripLength}`);
  csvRows.push(`Average Activities per Trip,${data.overview.averageActivitiesPerTrip}`);
  csvRows.push('');

  // Destinations section
  csvRows.push('TOP DESTINATIONS');
  csvRows.push('City,Country,Trip Count,Percentage');
  data.destinations.forEach(dest => {
    csvRows.push(`"${dest.city}","${dest.country}",${dest.tripCount},${dest.percentage}%`);
  });
  csvRows.push('');

  // Trip durations section
  csvRows.push('TRIP DURATIONS');
  csvRows.push('Duration,Count,Percentage');
  data.tripDurations.forEach(dur => {
    csvRows.push(`"${dur.duration}",${dur.count},${dur.percentage}%`);
  });
  csvRows.push('');

  // Activity tags section
  csvRows.push('ACTIVITY TAGS');
  csvRows.push('Tag,Count,Percentage');
  data.activityTags.forEach(tag => {
    csvRows.push(`"${tag.tag}",${tag.count},${tag.percentage}%`);
  });

  return csvRows.join('\n');
}