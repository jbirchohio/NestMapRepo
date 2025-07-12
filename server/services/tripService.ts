import { db } from '../db.js';

export async function getTripById(tripId: string, organizationId?: string) {
  // Example: Replace with real DB query
  const trip = await db.trips.findFirst({
    where: {
      id: tripId,
      ...(organizationId ? { organizationId } : {})
    },
    include: {
      activities: true,
      participants: true,
      accommodation: true,
      flights: true,
    }
  });
  return trip;
}
