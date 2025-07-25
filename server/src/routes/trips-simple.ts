import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db-connection';
import { trips, insertTripSchema } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Validation schemas
const idParamSchema = z.object({
  id: z.string().uuid({ message: "Trip ID must be a valid UUID" }),
});

// Get all trips for authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    const userTrips = await db.query.trips.findMany({
      where: organizationId 
        ? and(eq(trips.userId, userId), eq(trips.organizationId, organizationId))
        : eq(trips.userId, userId),
      orderBy: [desc(trips.createdAt)],
    });

    return res.json(userTrips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    return res.status(500).json({ message: "Could not fetch trips" });
  }
});

// Get specific trip by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    const trip = await db.query.trips.findFirst({
      where: and(
        eq(trips.id, tripId),
        eq(trips.userId, userId),
        organizationId ? eq(trips.organizationId, organizationId) : undefined
      ),
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    return res.json(trip);
  } catch (error) {
    console.error("Error fetching trip:", error);
    return res.status(500).json({ message: "Could not fetch trip" });
  }
});

// Create new trip
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    // Validate request body
    const validatedData = insertTripSchema.parse({
      ...req.body,
      userId,
      organizationId,
    });

    const [newTrip] = await db.insert(trips).values(validatedData).returning();

    return res.status(201).json(newTrip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
    }
    console.error("Error creating trip:", error);
    return res.status(500).json({ message: "Could not create trip" });
  }
});

// Update trip
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    // Verify trip exists and user has access
    const existingTrip = await db.query.trips.findFirst({
      where: and(
        eq(trips.id, tripId),
        eq(trips.userId, userId),
        organizationId ? eq(trips.organizationId, organizationId) : undefined
      ),
    });

    if (!existingTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Validate update data
    const updateData = insertTripSchema.partial().parse(req.body);

    const [updatedTrip] = await db
      .update(trips)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(trips.id, tripId))
      .returning();

    return res.json(updatedTrip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
    }
    console.error("Error updating trip:", error);
    return res.status(500).json({ message: "Could not update trip" });
  }
});

// Delete trip
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    // Verify trip exists and user has access
    const existingTrip = await db.query.trips.findFirst({
      where: and(
        eq(trips.id, tripId),
        eq(trips.userId, userId),
        organizationId ? eq(trips.organizationId, organizationId) : undefined
      ),
    });

    if (!existingTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    await db.delete(trips).where(eq(trips.id, tripId));

    return res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Error deleting trip:", error);
    return res.status(500).json({ message: "Could not delete trip" });
  }
});

export default router;
