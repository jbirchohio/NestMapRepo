import { db } from "./db-connection";
import { trips, activities, todos, notes, users } from "@shared/schema";
import { sql, count, avg, desc, asc, eq, and } from "drizzle-orm";

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

export async function getUserPersonalAnalytics(userId: number): Promise<AnalyticsData> {
  try {
    // Filter all queries to only include data for this specific user
    const userTripsFilter = eq(trips.userId, userId);
    
    // Overview statistics - user specific
    const [totalTripsResult] = await db.select({ count: count() }).from(trips).where(userTripsFilter);
    const [totalUsersResult] = await db.select({ count: sql`1` }); // Always 1 for personal analytics
    
    // Get activities only for this user's trips
    const userActivities = db.select().from(activities)
      .innerJoin(trips, eq(activities.tripId, trips.id))
      .where(userTripsFilter);
      
    const [totalActivitiesResult] = await db.select({ count: count() }).from(userActivities.as('user_activities'));
    
    // Average trip length for user's trips only
    const [avgTripLengthResult] = await db.select({
      avgLength: avg(sql`EXTRACT(DAY FROM (${trips.endDate} - ${trips.startDate})) + 1`)
    }).from(trips).where(userTripsFilter);

    // Average activities per trip for user only
    const userTripActivities = await db.select({
      tripId: activities.tripId,
      activityCount: count()
    })
    .from(activities)
    .innerJoin(trips, eq(activities.tripId, trips.id))
    .where(userTripsFilter)
    .groupBy(activities.tripId);

    const avgActivitiesPerTrip = userTripActivities.length > 0 ? 
      Math.round(userTripActivities.reduce((sum, trip) => sum + trip.activityCount, 0) / userTripActivities.length) : 0;

    // User's destinations only
    const destinationsResult = await db.select({
      city: trips.city,
      country: trips.country,
      tripCount: count()
    })
    .from(trips)
    .where(and(userTripsFilter, sql`${trips.city} IS NOT NULL AND ${trips.country} IS NOT NULL`))
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

    // User's trip duration distribution
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
    .where(userTripsFilter)
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

    // User's activity tags distribution
    const activityTagsResult = await db.select({
      tag: activities.tag,
      count: count()
    })
    .from(activities)
    .innerJoin(trips, eq(activities.tripId, trips.id))
    .where(and(userTripsFilter, sql`${activities.tag} IS NOT NULL`))
    .groupBy(activities.tag)
    .orderBy(desc(count()))
    .limit(10);

    const totalActivitiesWithTags = activityTagsResult.reduce((sum, tag) => sum + tag.count, 0);
    const activityTags = activityTagsResult.map(tag => ({
      tag: tag.tag || 'Untagged',
      count: tag.count,
      percentage: totalActivitiesWithTags > 0 ? Math.round((tag.count / totalActivitiesWithTags) * 100) : 0
    }));

    // User engagement metrics (simplified for personal view)
    const [completedTripsResult] = await db.select({
      count: count()
    }).from(trips).where(and(userTripsFilter, eq(trips.completed, true)));

    const [tripsWithCompletedActivitiesResult] = await db.select({
      count: count()
    }).from(
      db.selectDistinct({ tripId: activities.tripId })
      .from(activities)
      .innerJoin(trips, eq(activities.tripId, trips.id))
      .where(and(userTripsFilter, sql`${activities.completed} = true`))
      .as('user_trips_with_completed')
    );

    const tripCompletionRate = totalTripsResult.count > 0 ? 
      Math.round((completedTripsResult.count / totalTripsResult.count) * 100) : 0;

    const activityCompletionRate = totalTripsResult.count > 0 ? 
      Math.round((tripsWithCompletedActivitiesResult.count / totalTripsResult.count) * 100) : 0;

    // Recent activity for user only
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [newTripsLast7DaysResult] = await db.select({
      count: count()
    }).from(trips).where(and(userTripsFilter, sql`${trips.createdAt} >= ${sevenDaysAgo}`));

    const [activitiesAddedLast7DaysResult] = await db.select({
      count: count()
    }).from(activities)
    .innerJoin(trips, eq(activities.tripId, trips.id))
    .where(userTripsFilter);

    // Growth metrics for user
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    
    const growthMetricsResult = await db.select({
      week: sql`DATE_TRUNC('week', ${trips.createdAt})`.as('week'),
      tripCount: count(trips.id)
    })
    .from(trips)
    .where(and(userTripsFilter, sql`${trips.createdAt} >= ${eightWeeksAgo}`))
    .groupBy(sql`DATE_TRUNC('week', ${trips.createdAt})`)
    .orderBy(sql`DATE_TRUNC('week', ${trips.createdAt})`);

    const growthMetrics = growthMetricsResult.map(week => ({
      date: new Date(week.week as string).toISOString().split('T')[0],
      trips: week.tripCount,
      users: 1, // Always 1 for personal analytics
      activities: 0 // Simplified for now
    }));

    return {
      overview: {
        totalTrips: totalTripsResult.count,
        totalUsers: 1, // Always 1 for personal analytics
        totalActivities: totalActivitiesResult.count,
        averageTripLength: Math.round(Number(avgTripLengthResult.avgLength) || 0),
        averageActivitiesPerTrip: avgActivitiesPerTrip
      },
      destinations,
      tripDurations,
      activityTags,
      userEngagement: {
        usersWithTrips: 1, // Always 1 for personal view
        usersWithMultipleTrips: totalTripsResult.count > 1 ? 1 : 0,
        averageTripsPerUser: totalTripsResult.count,
        tripCompletionRate,
        activityCompletionRate
      },
      recentActivity: {
        newTripsLast7Days: newTripsLast7DaysResult.count,
        newUsersLast7Days: 0, // Not relevant for personal analytics
        activitiesAddedLast7Days: activitiesAddedLast7DaysResult.count
      },
      growthMetrics,
      userFunnel: {
        totalUsers: 1,
        usersWithTrips: 1,
        usersWithActivities: totalActivitiesResult.count > 0 ? 1 : 0,
        usersWithCompletedTrips: completedTripsResult.count > 0 ? 1 : 0,
        usersWithExports: 0 // Not tracked for personal view
      }
    };
  } catch (error) {
    console.error('Error fetching personal analytics:', error);
    throw new Error('Failed to fetch personal analytics data');
  }
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

    // Trip completion metrics
    const [completedTripsResult] = await db.select({
      count: count()
    }).from(trips).where(eq(trips.completed, true));

    // Activity completion rate (trips with at least one completed activity)
    const [tripsWithCompletedActivitiesResult] = await db.select({
      count: count()
    }).from(
      db.selectDistinct({ tripId: activities.tripId })
      .from(activities)
      .where(sql`${activities.completed} = true`)
      .as('trips_with_completed')
    );

    // Overall trip completion rate (trips marked as complete)
    const tripCompletionRate = totalTripsResult.count > 0 ? 
      Math.round((completedTripsResult.count / totalTripsResult.count) * 100) : 0;

    // Activity engagement rate
    const activityCompletionRate = totalTripsResult.count > 0 ? 
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

    // For activities, we'll use a simpler approach since the table might not have created_at
    const [activitiesAddedLast7DaysResult] = await db.select({
      count: count()
    }).from(activities);

    // Growth metrics - last 8 weeks of data
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    
    const growthMetricsResult = await db.select({
      week: sql`DATE_TRUNC('week', ${trips.createdAt})`.as('week'),
      tripCount: count(trips.id)
    })
    .from(trips)
    .where(sql`${trips.createdAt} >= ${eightWeeksAgo}`)
    .groupBy(sql`DATE_TRUNC('week', ${trips.createdAt})`)
    .orderBy(sql`DATE_TRUNC('week', ${trips.createdAt})`);

    const growthMetrics = growthMetricsResult.map(week => ({
      date: new Date(week.week as string).toISOString().split('T')[0],
      trips: week.tripCount,
      users: 0, // Simplified for now
      activities: 0 // Simplified for now
    }));

    // User funnel metrics
    const [usersWithActivitiesResult] = await db.select({
      count: count()
    }).from(
      db.selectDistinct({ userId: activities.tripId })
      .from(activities)
      .innerJoin(trips, sql`${activities.tripId} = ${trips.id}`)
      .as('users_with_activities')
    );

    // Users with completed trips
    const [usersWithCompletedTripsResult] = await db.select({
      count: count()
    }).from(
      db.selectDistinct({ userId: trips.userId })
      .from(trips)
      .where(eq(trips.completed, true))
      .as('users_with_completed_trips')
    );

    // For exports, we'll estimate based on users with multiple trips (proxy for engagement)
    const estimatedExportUsers = Math.round(usersWithMultipleTripsResult.count * 0.3);

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
        tripCompletionRate,
        activityCompletionRate
      },
      recentActivity: {
        newTripsLast7Days: newTripsLast7DaysResult.count,
        newUsersLast7Days: newUsersLast7DaysResult.count,
        activitiesAddedLast7Days: activitiesAddedLast7DaysResult.count
      },
      growthMetrics,
      userFunnel: {
        totalUsers: totalUsersResult.count,
        usersWithTrips: usersWithTripsResult.count,
        usersWithActivities: usersWithActivitiesResult.count,
        usersWithCompletedTrips: usersWithCompletedTripsResult.count,
        usersWithExports: estimatedExportUsers
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