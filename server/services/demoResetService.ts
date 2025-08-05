import { db } from '../db';
import { trips, activities, expenses, users } from '@shared/schema';
import { eq, and, not, inArray, sql } from 'drizzle-orm';
import { execSync } from 'child_process';
import path from 'path';

interface DemoResetResult {
  success: boolean;
  message: string;
  stats: {
    tripsReset: number;
    activitiesReset: number;
    expensesReset: number;
    usersPreserved: number;
  };
}

export class DemoResetService {
  // Core demo user IDs that should always exist
  private readonly coreDemoUsers = [
    'demo-sarah-chen',
    'demo-mike-rodriguez', 
    'demo-emma-thompson',
    'demo-alex-kim',
    'demo-jessica-wong',
    'demo-david-miller'
  ];

  // Core demo data that should be preserved
  private readonly coreTrips = [
    'Q1 Leadership Summit - San Francisco',
    'Client Presentation - New York',
    'Design Conference - Austin',
    'Annual Planning Meeting - Chicago'
  ];

  /**
   * Reset demo data to original state
   */
  async resetDemoData(): Promise<DemoResetResult> {
    console.log('🔄 Starting demo data reset...');

    try {
      // Delete non-core trips created by demo users
      const deletedTrips = await db.delete(trips)
        .where(and(
          sql`user_id IN (SELECT id FROM users WHERE username LIKE 'demo-%' OR email LIKE '%@demo.%')`,
          not(inArray(trips.title, this.coreTrips))
        ))
        .returning();

      // Delete all activities for trips owned by demo users
      const deletedActivities = await db.delete(activities)
        .where(
          sql`trip_id IN (SELECT id FROM trips WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo-%' OR email LIKE '%@demo.%'))`
        )
        .returning();

      // Delete recent expenses by demo users
      const deletedExpenses = await db.delete(expenses)
        .where(and(
          sql`user_id IN (SELECT id FROM users WHERE username LIKE 'demo-%' OR email LIKE '%@demo.%')`,
          sql`created_at > NOW() - INTERVAL '30 minutes'`
        ))
        .returning();

      // Count preserved demo users
      const [userCount] = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`username LIKE 'demo-%' OR email LIKE '%@demo.%'`);

      return {
        success: true,
        message: 'Demo data reset successfully',
        stats: {
          tripsReset: deletedTrips.length,
          activitiesReset: deletedActivities.length,
          expensesReset: deletedExpenses.length,
          usersPreserved: userCount.count
        }
      };
    } catch (error) {
      console.error('Error resetting demo data:', error);
      return {
        success: false,
        message: 'Failed to reset demo data',
        stats: {
          tripsReset: 0,
          activitiesReset: 0,
          expensesReset: 0,
          usersPreserved: 0
        }
      };
    }
  }

  /**
   * Reseed demo data from scratch
   */
  async reseedDemoData(): Promise<DemoResetResult> {
    try {
      // First clean all demo data
      await db.delete(trips)
        .where(sql`user_id IN (SELECT id FROM users WHERE username LIKE 'demo-%' OR email LIKE '%@demo.%')`);
      
      await db.delete(activities)
        .where(sql`trip_id IN (SELECT id FROM trips WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo-%' OR email LIKE '%@demo.%'))`);

      // Run the seed script
      const scriptPath = path.join(__dirname, '../../scripts/seed-demo-data.ts');
      execSync(`npx tsx ${scriptPath}`, { 
        stdio: 'inherit',
        env: { ...process.env, FORCE_DEMO_SEED: 'true' }
      });

      return {
        success: true,
        message: 'Demo data reseeded successfully',
        stats: {
          tripsReset: 0,
          activitiesReset: 0,
          expensesReset: 0,
          usersPreserved: 6
        }
      };
    } catch (error) {
      console.error('Error reseeding demo data:', error);
      throw error;
    }
  }

  /**
   * Get demo data statistics
   */
  async getDemoStats(): Promise<{
    users: number;
    trips: number;
    activities: number;
    expenses: number;
    lastReset: Date | null;
  }> {
    const [userCount] = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`username LIKE 'demo-%' OR email LIKE '%@demo.%'`);

    const [tripCount] = await db.select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(sql`user_id IN (SELECT id FROM users WHERE username LIKE 'demo-%' OR email LIKE '%@demo.%')`);

    const [activityCount] = await db.select({ count: sql<number>`count(*)` })
      .from(activities)
      .where(sql`trip_id IN (SELECT id FROM trips WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo-%' OR email LIKE '%@demo.%'))`);

    const [expenseCount] = await db.select({ count: sql<number>`count(*)` })
      .from(expenses)
      .where(sql`user_id IN (SELECT id FROM users WHERE username LIKE 'demo-%' OR email LIKE '%@demo.%')`);

    return {
      users: userCount.count,
      trips: tripCount.count,
      activities: activityCount.count,
      expenses: expenseCount.count,
      lastReset: new Date() // In production, track this in database
    };
  }

  /**
   * Check if demo data needs reset (every 30 minutes)
   */
  shouldResetDemo(): boolean {
    const now = new Date();
    const minutes = now.getMinutes();
    // Reset at :00 and :30
    return minutes === 0 || minutes === 30;
  }
}

export const demoResetService = new DemoResetService();

// Auto-reset scheduler (optional - can be run as a cron job instead)
export function startDemoResetScheduler() {
  console.log('🕐 Starting demo reset scheduler...');
  
  setInterval(async () => {
    if (demoResetService.shouldResetDemo()) {
      console.log('🔄 Auto-resetting demo data...');
      const result = await demoResetService.resetDemoData();
      console.log('✅ Demo reset complete:', result.stats);
    }
  }, 60 * 1000); // Check every minute
}