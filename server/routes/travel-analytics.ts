import { Router } from "express";
import { db } from "../db";
import { travelAnalytics, trips, activities, destinations } from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/jwtAuth";

const router = Router();

// Helper function to calculate travel personality
function calculateTravelPersonality(stats: any): string {
  const { avgActivitiesPerDay, mostCommonTags, tripTypes, avgTripLength } = stats;
  
  if (avgActivitiesPerDay > 5) return "The Go-Getter";
  if (mostCommonTags?.includes("food")) return "The Foodie Explorer";
  if (mostCommonTags?.includes("adventure")) return "The Thrill Seeker";
  if (tripTypes?.includes("family")) return "The Family Captain";
  if (avgTripLength > 10) return "The Extended Voyager";
  if (avgTripLength <= 3) return "The Weekend Warrior";
  if (mostCommonTags?.includes("culture")) return "The Culture Enthusiast";
  
  return "The Balanced Traveler";
}

// Helper function to generate fun stats
function generateFunStats(userTrips: any[], userActivities: any[]): Record<string, any> {
  const stats: Record<string, any> = {};
  
  // Calculate total coffee shops visited
  const coffeeActivities = userActivities.filter(a => 
    a.title?.toLowerCase().includes('coffee') || 
    a.title?.toLowerCase().includes('cafe')
  );
  if (coffeeActivities.length > 0) {
    stats.coffeeShopsVisited = coffeeActivities.length;
    stats.coffeeStat = `☕ You visited ${coffeeActivities.length} coffee shops - that's a lot of caffeine!`;
  }
  
  // Calculate earliest morning activity
  const morningActivities = userActivities.filter(a => {
    if (!a.time) return false;
    const hour = parseInt(a.time.split(':')[0]);
    return hour < 7;
  });
  if (morningActivities.length > 0) {
    stats.earlyBird = `🌅 You had ${morningActivities.length} activities before 7 AM - early bird!`;
  }
  
  // Weekend vs weekday trips
  const weekendTrips = userTrips.filter(t => {
    const start = new Date(t.start_date);
    return start.getDay() === 5 || start.getDay() === 6; // Friday or Saturday
  });
  stats.weekendTripRatio = Math.round((weekendTrips.length / userTrips.length) * 100);
  
  // Most photos worthy month (assuming summer months have more activities)
  const summerActivities = userActivities.filter(a => {
    const month = new Date(a.date).getMonth();
    return month >= 5 && month <= 8; // June to September
  });
  if (summerActivities.length > userActivities.length / 2) {
    stats.seasonalTraveler = "☀️ You're definitely a summer traveler!";
  }
  
  return stats;
}

// Generate Year in Travel analytics
router.get("/year/:year", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const year = parseInt(req.params.year);
    
    // Check if we already have cached analytics for this year
    const [existingAnalytics] = await db
      .select()
      .from(travelAnalytics)
      .where(and(
        eq(travelAnalytics.user_id, userId),
        eq(travelAnalytics.year, year)
      ))
      .limit(1);
    
    // If recent analytics exist (less than 7 days old), return cached
    if (existingAnalytics && 
        existingAnalytics.updated_at && 
        new Date(existingAnalytics.updated_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) {
      return res.json(existingAnalytics);
    }
    
    // Otherwise, calculate fresh analytics
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Get all trips for the year
    const userTrips = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.user_id, userId),
        gte(trips.start_date, startDate.toISOString().split('T')[0]),
        lte(trips.start_date, endDate.toISOString().split('T')[0])
      ));
    
    if (userTrips.length === 0) {
      return res.json({
        year,
        message: "No trips found for this year",
        totalTrips: 0
      });
    }
    
    // Get all activities for these trips
    const tripIds = userTrips.map(t => t.id);
    const userActivities = await db
      .select()
      .from(activities)
      .where(sql`${activities.trip_id} IN ${tripIds}`);
    
    // Calculate statistics
    const stats = {
      totalTrips: userTrips.length,
      totalDaysTravel: userTrips.reduce((sum, trip) => {
        const start = new Date(trip.start_date);
        const end = new Date(trip.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0),
      countriesVisited: [...new Set(userTrips.map(t => t.country).filter(Boolean))],
      citiesVisited: [...new Set(userTrips.map(t => t.city).filter(Boolean))],
      totalActivities: userActivities.length,
    };
    
    // Find favorite destination (most visited city)
    const cityCount = userTrips.reduce((acc, trip) => {
      if (trip.city) {
        acc[trip.city] = (acc[trip.city] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const favoriteDestination = Object.entries(cityCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
    
    // Find busiest month
    const monthCount = userTrips.reduce((acc, trip) => {
      const month = new Date(trip.start_date).toLocaleString('default', { month: 'long' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const busiestMonth = Object.entries(monthCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
    
    // Find longest trip
    const longestTrip = userTrips.reduce((longest, trip) => {
      const start = new Date(trip.start_date);
      const end = new Date(trip.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return days > longest ? days : longest;
    }, 0);
    
    // Calculate travel style based on activities
    const avgActivitiesPerDay = stats.totalActivities / stats.totalDaysTravel;
    const travelPersonality = calculateTravelPersonality({
      avgActivitiesPerDay,
      avgTripLength: stats.totalDaysTravel / stats.totalTrips,
      tripTypes: userTrips.map(t => t.trip_type)
    });
    
    // Generate fun stats
    const funStats = generateFunStats(userTrips, userActivities);
    
    // Create or update analytics record
    const analyticsData = {
      user_id: userId,
      year,
      total_trips: stats.totalTrips,
      total_days_traveled: stats.totalDaysTravel,
      countries_visited: stats.countriesVisited,
      cities_visited: stats.citiesVisited,
      total_activities: stats.totalActivities,
      favorite_destination: favoriteDestination,
      travel_style: avgActivitiesPerDay > 4 ? "adventurer" : avgActivitiesPerDay > 2 ? "explorer" : "relaxer",
      busiest_month: busiestMonth,
      longest_trip_days: longestTrip,
      most_visited_city: favoriteDestination,
      travel_personality: travelPersonality,
      fun_stats: funStats,
      updated_at: new Date()
    };
    
    let result;
    if (existingAnalytics) {
      // Update existing
      [result] = await db
        .update(travelAnalytics)
        .set(analyticsData)
        .where(eq(travelAnalytics.id, existingAnalytics.id))
        .returning();
    } else {
      // Create new
      [result] = await db
        .insert(travelAnalytics)
        .values(analyticsData)
        .returning();
    }
    
    res.json(result);
  } catch (error) {
    console.error("Error generating travel analytics:", error);
    res.status(500).json({ error: "Failed to generate travel analytics" });
  }
});

// Get travel recap (Spotify Wrapped style)
router.get("/recap/:year", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const year = parseInt(req.params.year);
    
    // Get or generate analytics
    const analyticsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/travel-analytics/year/${year}`, {
      headers: {
        'Authorization': req.headers.authorization || '',
        'Cookie': req.headers.cookie || ''
      }
    });
    
    const analytics = await analyticsResponse.json();
    
    if (!analytics || analytics.totalTrips === 0) {
      return res.json({
        year,
        hasData: false,
        message: "Start your travel journey!"
      });
    }
    
    // Format for Spotify Wrapped-style presentation
    const recap = {
      year,
      hasData: true,
      slides: [
        {
          type: "intro",
          title: `Your ${year} Travel Wrapped`,
          subtitle: "Let's see where your adventures took you!"
        },
        {
          type: "stat",
          title: "Total Adventures",
          value: analytics.total_trips,
          unit: analytics.total_trips === 1 ? "Trip" : "Trips",
          description: `You explored the world ${analytics.total_trips} times!`
        },
        {
          type: "stat",
          title: "Days on the Road",
          value: analytics.total_days_traveled,
          unit: "Days",
          description: `That's ${Math.round(analytics.total_days_traveled / 7)} weeks of adventure!`
        },
        {
          type: "list",
          title: "Countries Explored",
          items: analytics.countries_visited || [],
          emptyMessage: "The world is waiting for you!"
        },
        {
          type: "highlight",
          title: "Your Favorite Spot",
          value: analytics.favorite_destination || "Everywhere!",
          description: analytics.favorite_destination ? 
            `You couldn't stay away from ${analytics.favorite_destination}` : 
            "Every place was special"
        },
        {
          type: "personality",
          title: "Your Travel Personality",
          value: analytics.travel_personality,
          description: getPersonalityDescription(analytics.travel_personality)
        },
        {
          type: "stat",
          title: "Activities Completed",
          value: analytics.total_activities,
          unit: "Experiences",
          description: "Each one a memory!"
        },
        {
          type: "fun-fact",
          title: "Fun Facts",
          facts: Object.values(analytics.fun_stats || {}).filter(v => typeof v === 'string')
        },
        {
          type: "outro",
          title: `Here's to ${year + 1}!`,
          subtitle: "Where will your next adventure take you?",
          cta: "Plan Your Next Trip"
        }
      ]
    };
    
    res.json(recap);
  } catch (error) {
    console.error("Error generating travel recap:", error);
    res.status(500).json({ error: "Failed to generate travel recap" });
  }
});

function getPersonalityDescription(personality: string): string {
  const descriptions: Record<string, string> = {
    "The Go-Getter": "You pack every day with adventures!",
    "The Foodie Explorer": "You travel with your taste buds leading the way",
    "The Thrill Seeker": "Adventure is your middle name",
    "The Family Captain": "Making memories with the ones you love",
    "The Extended Voyager": "You believe in taking your time to explore",
    "The Weekend Warrior": "You make every weekend count",
    "The Culture Enthusiast": "You immerse yourself in every destination",
    "The Balanced Traveler": "You've found the perfect travel rhythm"
  };
  
  return descriptions[personality] || "You have your own unique travel style!";
}

export default router;