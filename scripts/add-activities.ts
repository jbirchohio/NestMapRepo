#!/usr/bin/env tsx

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

// Set DATABASE_URL directly if not loaded
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://neondb_owner:npg_heyosY71KqiV@ep-lingering-pine-aez2izws-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";
}

import { db } from '../server/db.js';
import { activities, trips, organizations } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function addActivities() {
  console.log('📅 Adding sample activities...');

  try {
    // Get existing trips and organizations
    const allTrips = await db.select().from(trips);
    const allOrgs = await db.select().from(organizations);
    
    if (allTrips.length === 0) {
      console.log('❌ No trips found. Please run the full seeding script first.');
      return;
    }

    console.log(`Found ${allTrips.length} trips and ${allOrgs.length} organizations`);

    const sfTrip = allTrips.find(t => t.title?.includes('San Francisco'));
    const nyTrip = allTrips.find(t => t.title?.includes('New York'));
    const techOrg = allOrgs.find(o => o.name?.includes('TechCorp'));
    const designOrg = allOrgs.find(o => o.name?.includes('Creative'));

    if (!sfTrip || !nyTrip || !techOrg || !designOrg) {
      console.log('❌ Could not find expected trips/organizations');
      return;
    }

    // Add activities
    await db.insert(activities).values([
      // San Francisco trip activities
      {
        trip_id: sfTrip.id,
        organization_id: techOrg.id,
        title: 'Team Arrival & Check-in',
        date: new Date('2025-03-15T14:00:00'),
        time: '14:00',
        location_name: 'Grand Hyatt San Francisco',
        notes: 'Welcome drinks and networking session',
        order: 1
      },
      {
        trip_id: sfTrip.id,
        organization_id: techOrg.id,
        title: 'Leadership Strategy Session',
        date: new Date('2025-03-16T09:00:00'),
        time: '09:00',
        location_name: 'Conference Room A - Grand Hyatt',
        notes: 'Full day strategic planning session',
        order: 2
      },
      {
        trip_id: sfTrip.id,
        organization_id: techOrg.id,
        title: 'Team Dinner at Michelin Restaurant',
        date: new Date('2025-03-16T19:00:00'),
        time: '19:00',
        location_name: 'The French Laundry',
        notes: 'Advance reservations confirmed',
        order: 3
      },
      
      // New York workshop activities
      {
        trip_id: nyTrip.id,
        organization_id: designOrg.id,
        title: 'Design Thinking Workshop Day 1',
        date: new Date('2025-02-10T09:00:00'),
        time: '09:00',
        location_name: 'Client Office - Manhattan',
        notes: 'Bring presentation materials and sticky notes',
        order: 1
      },
      {
        trip_id: nyTrip.id,
        organization_id: designOrg.id,
        title: 'Working Lunch with Stakeholders',
        date: new Date('2025-02-10T12:00:00'),
        time: '12:00',
        location_name: 'Client Office - Conference Room B',
        notes: 'Dietary restrictions: 2 vegetarian, 1 gluten-free',
        order: 2
      }
    ]);

    console.log('✅ Activities added successfully!');
    console.log('\n🎉 Ready for screenshots!');
    console.log('\n🔐 Login credentials:');
    console.log(`Superadmin: jbirchohio@gmail.com / OopsieDoodle1!`);
    console.log(`Demo users: sarah.chen@techcorp.com / demo123`);
    console.log('\n🚀 Start the server: npm run dev');
    console.log(`Then visit: http://localhost:5000`);

  } catch (error) {
    console.error('❌ Error adding activities:', error);
  }
}

addActivities()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });