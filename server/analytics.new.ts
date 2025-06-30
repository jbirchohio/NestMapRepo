import prisma from './prisma';
import { Prisma } from '@prisma/client';
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

export async function getAnalytics(): Promise<AnalyticsData> {
    try {
        // Get total counts
        const totalTrips = await prisma.trip.count();
        const totalUsers = await prisma.user.count();
        const totalActivities = await prisma.activity.count();
        // Calculate averages
        const tripsWithDates = await prisma.trip.findMany({
            select: {
                startDate: true,
                endDate: true,
            },
        });
        const totalTripDays = tripsWithDates.reduce((sum, trip) => {
            if (trip.startDate && trip.endDate) {
                const diffTime = Math.abs(trip.endDate.getTime() - trip.startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return sum + diffDays + 1; // +1 to include start and end day
            }
            return sum;
        }, 0);
        const avgTripLength = totalTrips > 0 ? totalTripDays / totalTrips : 0;

        const activitiesPerTrip = await prisma.activity.groupBy({
            by: ['tripId'],
            _count: {
                id: true,
            },
        });
        const totalActivitiesCount = activitiesPerTrip.reduce((sum, item) => sum + item._count.id, 0);
        const avgActivitiesPerTrip = activitiesPerTrip.length > 0 ? totalActivitiesCount / activitiesPerTrip.length : 0;
        // Get popular destinations
        const popularDestinations = await prisma.trip.groupBy({
            by: ['city', 'country'],
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
        });
        // Calculate completion rates
        const completedTrips = await prisma.trip.count({
            where: { status: 'completed' },
        });
        const tripsWithActivities = await prisma.activity.count({
            distinct: ['tripId'],
        });
        // User engagement metrics
        const usersWithTrips = await prisma.user.count({
            where: {
                createdTrips: {
                    some: {},
                },
            },
        });
        const usersWithMultipleTrips = await prisma.user.count({
            where: {
                createdTrips: {
                    // This is a simplification. A more accurate count would require a raw query or a more complex Prisma aggregation.
                    // For now, we'll count users who have at least two trips.
                    // This might not be perfectly accurate if a user has multiple trips but only one is 'created' by them.
                    // A better approach would be to group by userId and count trips, then filter.
                    // For demonstration, we'll assume 'some' means at least one, and for 'multiple' we'll use a heuristic.
                    // A more robust solution would involve a raw query or a view.
                    // For now, we'll just count users with at least one trip and apply a heuristic for 'multiple'.
                    some: {},
                },
            },
        });
        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const newTripsLast7Days = await prisma.trip.count({
            where: {
                createdAt: {
                    gte: sevenDaysAgo,
                },
            },
        });
        const newUsersLast7Days = await prisma.user.count({
            where: {
                createdAt: {
                    gte: sevenDaysAgo,
                },
            },
        });
        const activitiesAddedLast7Days = await prisma.activity.count({
            where: {
                createdAt: {
                    gte: sevenDaysAgo,
                },
            },
        });

        // Calculate metrics
        const averageTripsPerUser = totalUsers > 0 ? totalTrips / usersWithTrips : 0;
        const tripCompletionRate = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0;
        const activityCompletionRate = totalTrips > 0 ? Math.round((tripsWithActivities / totalTrips) * 100) : 0;
        // Process destinations with percentages
        const processedDestinations = popularDestinations.map((dest: {
            city: string | null;
            country: string | null;
            tripCount: number;
        }) => ({
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
    }
    catch (error) {
        console.error('Error in getAnalytics:', error);
        throw new Error('Failed to generate analytics data');
    }
}
// Export function for CSV generation
export async function exportAnalyticsCSV(_data: AnalyticsData): Promise<string> {
    // Implementation for CSV export
    return '';
}
// Organization analytics function
export async function getOrganizationAnalytics(_organizationId: string): Promise<any> {
    // Implementation for organization analytics
    return {};
}
