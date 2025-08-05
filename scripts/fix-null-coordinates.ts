import { db } from "../server/db";
import { activities, trips } from "../shared/schema";
import { eq, isNull, or } from "drizzle-orm";
import { geocodeLocation } from "../server/geocoding";

async function fixNullCoordinates() {
  try {
    // Find activities with null coordinates
    const activitiesWithNullCoords = await db
      .select()
      .from(activities)
      .where(
        or(
          isNull(activities.latitude),
          isNull(activities.longitude)
        )
      );
    
    console.log(`Found ${activitiesWithNullCoords.length} activities with null coordinates`);
    
    for (const activity of activitiesWithNullCoords) {
      if (!activity.location_name) {
        console.log(`Skipping activity ${activity.id} - no location name`);
        continue;
      }
      
      // Get the trip to use city as context
      const [trip] = await db
        .select()
        .from(trips)
        .where(eq(trips.id, activity.trip_id));
      
      if (!trip) {
        console.log(`Could not find trip for activity ${activity.id}`);
        continue;
      }
      
      console.log(`Geocoding "${activity.location_name}" for activity ${activity.id}`);
      const result = await geocodeLocation(
        activity.location_name,
        trip.city || trip.location || "New York"
      );
      
      if (result) {
        await db
          .update(activities)
          .set({
            latitude: result.latitude,
            longitude: result.longitude
          })
          .where(eq(activities.id, activity.id));
        
        console.log(`Updated activity ${activity.id} with coordinates`);
      } else {
        console.log(`Failed to geocode activity ${activity.id}`);
      }
    }
    
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

fixNullCoordinates();