import { getDatabase } from './db-connection';
import { trips } from "./db/schema";
import { and, eq, sql } from './utils/drizzle-shim';

export async function forecastBudget(
  organizationId: string,
  city: string,
  startDate: string,
  endDate: string,
  travelers: number
): Promise<{ dailyAverage: number; predictedTotal: number; dataPoints: number }> {
  const db = getDatabase();
  if (!db) {
    // Return default estimates if database is not available
    return { dailyAverage: 200, predictedTotal: travelers * 200, dataPoints: 0 };
  }
  
  const pastTrips = await db
    .select({
      budget: trips.budget,
      duration: sql<number>`EXTRACT(days FROM ${trips.endDate} - ${trips.startDate})`
    })
    .from(trips)
    .where(and(eq(trips.organizationId, organizationId), eq(trips.city, city)))
    .limit(20);

  const dailyCosts = pastTrips
    .filter((t: any) => t.budget && t.duration && t.duration > 0)
    .map((t: any) => t.budget! / t.duration!);

  const dailyAverage =
    dailyCosts.length > 0
      ? Math.round(dailyCosts.reduce((a: number, b: number) => a + b, 0) / dailyCosts.length)
      : 15000; // default $150/day in cents

  const durationDays = Math.max(
    1,
    Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
  );

  const predictedTotal = dailyAverage * durationDays * travelers;

  return { dailyAverage, predictedTotal, dataPoints: dailyCosts.length };
}




