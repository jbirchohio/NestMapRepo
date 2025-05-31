import { AnalyticsData } from "./analytics";

interface DemoAnalyticsConfig {
  [orgId: string]: {
    corporate?: AnalyticsData;
    agency?: AnalyticsData;
  };
}

// Organization-specific demo analytics configurations
const DEMO_ANALYTICS_CONFIG: DemoAnalyticsConfig = {
  "enterprise": {
    corporate: {
      overview: {
        totalTrips: 247,
        totalUsers: 89,
        totalActivities: 1245,
        averageTripLength: 5.2,
        averageActivitiesPerTrip: 8.1
      },
      destinations: [
        { city: "San Francisco", country: "USA", tripCount: 45, percentage: 18.2 },
        { city: "New York", country: "USA", tripCount: 38, percentage: 15.4 },
        { city: "London", country: "UK", tripCount: 32, percentage: 13.0 },
        { city: "Tokyo", country: "Japan", tripCount: 28, percentage: 11.3 },
        { city: "Singapore", country: "Singapore", tripCount: 24, percentage: 9.7 }
      ],
      tripDurations: [
        { duration: "1-2 days", count: 78, percentage: 31.6 },
        { duration: "3-5 days", count: 95, percentage: 38.5 },
        { duration: "6-10 days", count: 52, percentage: 21.1 },
        { duration: "11+ days", count: 22, percentage: 8.9 }
      ],
      activityTags: [
        { tag: "Business Meetings", count: 234, percentage: 18.8 },
        { tag: "Client Entertainment", count: 186, percentage: 14.9 },
        { tag: "Team Building", count: 145, percentage: 11.6 },
        { tag: "Training", count: 132, percentage: 10.6 },
        { tag: "Conference", count: 98, percentage: 7.9 }
      ],
      userEngagement: {
        usersWithTrips: 78,
        usersWithMultipleTrips: 45,
        averageTripsPerUser: 2.8,
        tripCompletionRate: 87.5,
        activityCompletionRate: 92.3
      },
      recentActivity: {
        newTripsLast7Days: 12,
        newUsersLast7Days: 3,
        activitiesAddedLast7Days: 67
      },
      growthMetrics: [
        { date: "2024-01", trips: 180, users: 65, activities: 890 },
        { date: "2024-02", trips: 195, users: 71, activities: 965 },
        { date: "2024-03", trips: 212, users: 78, activities: 1034 },
        { date: "2024-04", trips: 229, users: 83, activities: 1156 },
        { date: "2024-05", trips: 247, users: 89, activities: 1245 }
      ],
      userFunnel: {
        totalUsers: 89,
        usersWithTrips: 78,
        usersWithActivities: 72,
        usersWithCompletedTrips: 68,
        usersWithExports: 34
      }
    },
    agency: {
      overview: {
        totalTrips: 156,
        totalUsers: 23,
        totalActivities: 892,
        averageTripLength: 7.8,
        averageActivitiesPerTrip: 12.3
      },
      destinations: [
        { city: "Paris", country: "France", tripCount: 28, percentage: 17.9 },
        { city: "Rome", country: "Italy", tripCount: 24, percentage: 15.4 },
        { city: "Barcelona", country: "Spain", tripCount: 22, percentage: 14.1 },
        { city: "Amsterdam", country: "Netherlands", tripCount: 18, percentage: 11.5 },
        { city: "Prague", country: "Czech Republic", tripCount: 16, percentage: 10.3 }
      ],
      tripDurations: [
        { duration: "1-2 days", count: 23, percentage: 14.7 },
        { duration: "3-5 days", count: 45, percentage: 28.8 },
        { duration: "6-10 days", count: 62, percentage: 39.7 },
        { duration: "11+ days", count: 26, percentage: 16.7 }
      ],
      activityTags: [
        { tag: "Sightseeing", count: 156, percentage: 17.5 },
        { tag: "Food & Dining", count: 134, percentage: 15.0 },
        { tag: "Cultural Sites", count: 98, percentage: 11.0 },
        { tag: "Shopping", count: 87, percentage: 9.8 },
        { tag: "Entertainment", count: 76, percentage: 8.5 }
      ],
      userEngagement: {
        usersWithTrips: 23,
        usersWithMultipleTrips: 18,
        averageTripsPerUser: 6.8,
        tripCompletionRate: 94.2,
        activityCompletionRate: 96.7
      },
      recentActivity: {
        newTripsLast7Days: 8,
        newUsersLast7Days: 1,
        activitiesAddedLast7Days: 45
      },
      growthMetrics: [
        { date: "2024-01", trips: 112, users: 18, activities: 645 },
        { date: "2024-02", trips: 125, users: 19, activities: 723 },
        { date: "2024-03", trips: 138, users: 21, activities: 798 },
        { date: "2024-04", trips: 147, users: 22, activities: 834 },
        { date: "2024-05", trips: 156, users: 23, activities: 892 }
      ],
      userFunnel: {
        totalUsers: 23,
        usersWithTrips: 23,
        usersWithActivities: 23,
        usersWithCompletedTrips: 22,
        usersWithExports: 18
      }
    }
  },
  "travel_agency": {
    agency: {
      overview: {
        totalTrips: 312,
        totalUsers: 45,
        totalActivities: 1876,
        averageTripLength: 9.2,
        averageActivitiesPerTrip: 15.1
      },
      destinations: [
        { city: "Bali", country: "Indonesia", tripCount: 42, percentage: 13.5 },
        { city: "Santorini", country: "Greece", tripCount: 38, percentage: 12.2 },
        { city: "Kyoto", country: "Japan", tripCount: 35, percentage: 11.2 },
        { city: "Dubai", country: "UAE", tripCount: 31, percentage: 9.9 },
        { city: "Maldives", country: "Maldives", tripCount: 28, percentage: 9.0 }
      ],
      tripDurations: [
        { duration: "1-2 days", count: 18, percentage: 5.8 },
        { duration: "3-5 days", count: 89, percentage: 28.5 },
        { duration: "6-10 days", count: 142, percentage: 45.5 },
        { duration: "11+ days", count: 63, percentage: 20.2 }
      ],
      activityTags: [
        { tag: "Beach & Water Sports", count: 287, percentage: 15.3 },
        { tag: "Cultural Experiences", count: 245, percentage: 13.1 },
        { tag: "Adventure Tours", count: 198, percentage: 10.6 },
        { tag: "Luxury Dining", count: 176, percentage: 9.4 },
        { tag: "Spa & Wellness", count: 154, percentage: 8.2 }
      ],
      userEngagement: {
        usersWithTrips: 45,
        usersWithMultipleTrips: 38,
        averageTripsPerUser: 6.9,
        tripCompletionRate: 97.1,
        activityCompletionRate: 98.4
      },
      recentActivity: {
        newTripsLast7Days: 15,
        newUsersLast7Days: 2,
        activitiesAddedLast7Days: 89
      },
      growthMetrics: [
        { date: "2024-01", trips: 245, users: 38, activities: 1456 },
        { date: "2024-02", trips: 267, users: 41, activities: 1598 },
        { date: "2024-03", trips: 289, users: 43, activities: 1723 },
        { date: "2024-04", trips: 301, users: 44, activities: 1798 },
        { date: "2024-05", trips: 312, users: 45, activities: 1876 }
      ],
      userFunnel: {
        totalUsers: 45,
        usersWithTrips: 45,
        usersWithActivities: 44,
        usersWithCompletedTrips: 43,
        usersWithExports: 38
      }
    }
  }
};

// Default analytics for organizations without specific demo data
const DEFAULT_DEMO_ANALYTICS: AnalyticsData = {
  overview: {
    totalTrips: 45,
    totalUsers: 12,
    totalActivities: 287,
    averageTripLength: 4.2,
    averageActivitiesPerTrip: 6.4
  },
  destinations: [
    { city: "Los Angeles", country: "USA", tripCount: 12, percentage: 26.7 },
    { city: "Chicago", country: "USA", tripCount: 8, percentage: 17.8 },
    { city: "Miami", country: "USA", tripCount: 7, percentage: 15.6 },
    { city: "Seattle", country: "USA", tripCount: 6, percentage: 13.3 },
    { city: "Boston", country: "USA", tripCount: 5, percentage: 11.1 }
  ],
  tripDurations: [
    { duration: "1-2 days", count: 15, percentage: 33.3 },
    { duration: "3-5 days", count: 18, percentage: 40.0 },
    { duration: "6-10 days", count: 9, percentage: 20.0 },
    { duration: "11+ days", count: 3, percentage: 6.7 }
  ],
  activityTags: [
    { tag: "Business", count: 67, percentage: 23.3 },
    { tag: "Meetings", count: 54, percentage: 18.8 },
    { tag: "Dining", count: 43, percentage: 15.0 },
    { tag: "Transportation", count: 38, percentage: 13.2 },
    { tag: "Accommodation", count: 32, percentage: 11.1 }
  ],
  userEngagement: {
    usersWithTrips: 11,
    usersWithMultipleTrips: 7,
    averageTripsPerUser: 3.8,
    tripCompletionRate: 82.2,
    activityCompletionRate: 89.5
  },
  recentActivity: {
    newTripsLast7Days: 3,
    newUsersLast7Days: 1,
    activitiesAddedLast7Days: 18
  },
  growthMetrics: [
    { date: "2024-01", trips: 32, users: 9, activities: 198 },
    { date: "2024-02", trips: 36, users: 10, activities: 223 },
    { date: "2024-03", trips: 41, users: 11, activities: 254 },
    { date: "2024-04", trips: 43, users: 12, activities: 267 },
    { date: "2024-05", trips: 45, users: 12, activities: 287 }
  ],
  userFunnel: {
    totalUsers: 12,
    usersWithTrips: 11,
    usersWithActivities: 10,
    usersWithCompletedTrips: 9,
    usersWithExports: 5
  }
};

/**
 * Get demo analytics data based on organization and type
 * @param orgId Organization ID or identifier
 * @param type Type of analytics (corporate or agency)
 * @returns Promise<AnalyticsData>
 */
export async function getDemoAnalytics(orgId: number | string | null, type: 'corporate' | 'agency'): Promise<AnalyticsData> {
  // Convert orgId to string for lookup
  const orgKey = orgId?.toString() || 'default';
  
  // Check if we have specific demo data for this organization
  const orgConfig = DEMO_ANALYTICS_CONFIG[orgKey];
  if (orgConfig && orgConfig[type]) {
    return orgConfig[type];
  }
  
  // Check for organization-specific config in different keys
  for (const [key, config] of Object.entries(DEMO_ANALYTICS_CONFIG)) {
    if (key.includes(orgKey) || orgKey.includes(key)) {
      if (config[type]) {
        return config[type];
      }
    }
  }
  
  // Return type-appropriate default
  if (type === 'agency') {
    return DEMO_ANALYTICS_CONFIG.travel_agency.agency || DEFAULT_DEMO_ANALYTICS;
  }
  
  return DEMO_ANALYTICS_CONFIG.enterprise.corporate || DEFAULT_DEMO_ANALYTICS;
}

/**
 * Add or update demo analytics for an organization
 * @param orgId Organization identifier
 * @param type Analytics type
 * @param data Analytics data
 */
export function setDemoAnalytics(orgId: string, type: 'corporate' | 'agency', data: AnalyticsData): void {
  if (!DEMO_ANALYTICS_CONFIG[orgId]) {
    DEMO_ANALYTICS_CONFIG[orgId] = {};
  }
  DEMO_ANALYTICS_CONFIG[orgId][type] = data;
}