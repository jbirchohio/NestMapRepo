import { db } from "../server/db";
import { activities } from "../shared/schema";
import { eq } from "drizzle-orm";
import { geocodeLocation } from "../server/geocoding";

async function fixActivityGeocoding() {
  try {
    // Find activities with potentially incorrect coordinates
    const allActivities = await db.select().from(activities);
    
    console.log("Checking activities for geocoding issues...");
    
    for (const activity of allActivities) {
      // Check for Hudson River Kayaking specifically or other activities far from NYC
      if (activity.location_name && activity.latitude && activity.longitude) {
        const lat = parseFloat(activity.latitude);
        const lng = parseFloat(activity.longitude);
        
        // Check if coordinates are far from NYC (approximate bounds)
        const isNYCArea = lat >= 40.4 && lat <= 41.0 && lng >= -74.3 && lng <= -73.7;
        
        if (!isNYCArea && activity.location_name.toLowerCase().includes('hudson river')) {
          console.log(`Found activity outside NYC area: ${activity.title} at ${lat}, ${lng}`);
          
          // Re-geocode with NYC context
          const result = await geocodeLocation(activity.location_name, "New York City, NY");
          
          if (result) {
            console.log(`Re-geocoding ${activity.title} from ${lat}, ${lng} to ${result.latitude}, ${result.longitude}`);
            
            await db.update(activities)
              .set({
                latitude: result.latitude,
                longitude: result.longitude
              })
              .where(eq(activities.id, activity.id));
          }
        }
      }
    }
    
    console.log("Geocoding fix complete!");
  } catch (error) {
    console.error("Error fixing geocoding:", error);
  } finally {
    process.exit(0);
  }
}

fixActivityGeocoding();