#!/usr/bin/env tsx

// Load env before any imports that might need it
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);

import { db } from '../server/db.js';
import { users, organizations, trips, activities } from '../shared/schema.js';
import { hashPassword } from '../server/auth.js';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

async function seedDemoData() {
  console.log('🌱 Seeding demo data for Remvana...');

  try {
    // Check if demo data already exists
    const existingDemoUsers = await db.select().from(users).where(eq(users.username, 'demo-sarah-chen'));
    if (existingDemoUsers.length > 0) {
      console.log('✓ Demo data already exists. Use reseed option to recreate.');
      return;
    }
    
    // Create demo organizations
    console.log('📊 Creating demo organizations...');
    
    const [techCorpOrg] = await db.insert(organizations).values({
      name: 'TechCorp International',
      domain: 'techcorp.com',
      plan: 'enterprise',
      white_label_enabled: true,
      primary_color: '#2563eb',
      secondary_color: '#64748b',
      accent_color: '#10b981',
      employee_count: 250,
      subscription_status: 'active'
    }).returning();

    const [designStudioOrg] = await db.insert(organizations).values({
      name: 'Creative Design Studio',
      domain: 'creativestudio.com', 
      plan: 'team',
      white_label_enabled: false,
      employee_count: 45,
      subscription_status: 'active'
    }).returning();

    const [consultingOrg] = await db.insert(organizations).values({
      name: 'Global Consulting Partners',
      domain: 'globalconsulting.com',
      plan: 'enterprise',
      white_label_enabled: true,
      primary_color: '#7c3aed',
      secondary_color: '#374151',
      accent_color: '#f59e0b',
      employee_count: 1200,
      subscription_status: 'active'
    }).returning();

    console.log('✅ Organizations created');

    // Create superadmin user (you)
    console.log('👑 Creating superadmin user...');
    
    // Check if superadmin already exists
    const existingSuperadmin = await db.select().from(users).where(eq(users.username, 'jbirchohio'));
    
    let superadminUser;
    if (existingSuperadmin.length > 0) {
      console.log('✓ Superadmin user already exists');
      superadminUser = existingSuperadmin[0];
    } else {
      const superadminPasswordHash = hashPassword('OopsieDoodle1!');
      
      const [newSuperadmin] = await db.insert(users).values({
        auth_id: `superadmin_${nanoid()}`,
        username: 'jbirchohio',
        email: 'jbirchohio@gmail.com',
        password_hash: superadminPasswordHash,
        display_name: 'Jonas Birch',
        role: 'superadmin_owner',
        role_type: 'corporate',
        organization_id: null, // Superadmin doesn't belong to specific org
        company: 'Remvana',
        job_title: 'Platform Owner',
        team_size: '1-10',
        use_case: 'Platform Management'
      }).returning();
      
      superadminUser = newSuperadmin;
      console.log('✅ Superadmin user created');
    }

    // Create demo users for organizations
    console.log('👥 Creating demo users...');
    
    // TechCorp users
    const techCorpUsers = await db.insert(users).values([
      {
        auth_id: `user_${nanoid()}`,
        username: 'demo-sarah-chen',
        email: 'sarah.chen@techcorp.demo',
        password_hash: hashPassword('demo123'),
        display_name: 'Sarah Chen',
        role: 'admin',
        role_type: 'corporate',
        organization_id: techCorpOrg.id,
        company: 'TechCorp International',
        job_title: 'VP of Operations',
        team_size: '51-200',
        use_case: 'Executive Travel'
      },
      {
        auth_id: `user_${nanoid()}`,
        username: 'demo-mike-rodriguez',
        email: 'mike.rodriguez@techcorp.demo',
        password_hash: hashPassword('demo123'),
        display_name: 'Mike Rodriguez',
        role: 'manager',
        role_type: 'corporate',
        organization_id: techCorpOrg.id,
        company: 'TechCorp International',
        job_title: 'Engineering Manager',
        team_size: '11-50',
        use_case: 'Team Travel Coordination'
      },
      {
        auth_id: `user_${nanoid()}`,
        username: 'demo-emma-thompson',
        email: 'emma.thompson@techcorp.demo',
        password_hash: hashPassword('demo123'),
        display_name: 'Emma Thompson',
        role: 'user',
        role_type: 'corporate',
        organization_id: techCorpOrg.id,
        company: 'TechCorp International',
        job_title: 'Senior Developer',
        team_size: '11-50',
        use_case: 'Conference Travel'
      }
    ]).returning();

    // Design Studio users
    const designUsers = await db.insert(users).values([
      {
        auth_id: `user_${nanoid()}`,
        username: 'demo-alex-kim',
        email: 'alex@creativestudio.demo',
        password_hash: hashPassword('demo123'),
        display_name: 'Alex Kim',
        role: 'admin',
        role_type: 'corporate',
        organization_id: designStudioOrg.id,
        company: 'Creative Design Studio',
        job_title: 'Creative Director',
        team_size: '11-50',
        use_case: 'Client Meetings'
      },
      {
        auth_id: `user_${nanoid()}`,
        username: 'demo-jessica-wong',
        email: 'jessica@creativestudio.demo',
        password_hash: hashPassword('demo123'),
        display_name: 'Jessica Wong',
        role: 'user',
        role_type: 'corporate',
        organization_id: designStudioOrg.id,
        company: 'Creative Design Studio',
        job_title: 'UX Designer',
        team_size: '11-50',
        use_case: 'Design Workshops'
      }
    ]).returning();

    // Consulting users
    const consultingUsers = await db.insert(users).values([
      {
        auth_id: `user_${nanoid()}`,
        username: 'demo-david-miller',
        email: 'david.miller@globalconsulting.demo',
        password_hash: hashPassword('demo123'),
        display_name: 'David Miller',
        role: 'admin',
        role_type: 'corporate',
        organization_id: consultingOrg.id,
        company: 'Global Consulting Partners',
        job_title: 'Managing Partner',
        team_size: '201+',
        use_case: 'Client Engagements'
      }
    ]).returning();

    console.log('✅ Demo users created');

    // Create sample trips
    console.log('✈️ Creating sample trips...');
    
    const sampleTrips = await db.insert(trips).values([
      {
        title: 'Q1 Leadership Summit - San Francisco',
        start_date: new Date('2025-03-15'),
        end_date: new Date('2025-03-18'),
        user_id: techCorpUsers[0].id,
        organization_id: techCorpOrg.id,
        description: 'Annual leadership team meeting and strategic planning session',
        destination: 'San Francisco, CA',
        budget: 15000,
        currency: 'USD',
        status: 'planned',
        is_public: false
      },
      {
        title: 'TechConf 2025 - Austin',
        start_date: new Date('2025-04-22'),
        end_date: new Date('2025-04-25'),
        user_id: techCorpUsers[2].id,
        organization_id: techCorpOrg.id,
        description: 'Annual technology conference for engineering team',
        destination: 'Austin, TX',
        budget: 8500,
        currency: 'USD',
        status: 'planned',
        is_public: false
      },
      {
        title: 'Client Workshop - New York',
        start_date: new Date('2025-02-10'),
        end_date: new Date('2025-02-12'),
        user_id: designUsers[0].id,
        organization_id: designStudioOrg.id,
        description: 'Design thinking workshop with Fortune 500 client',
        destination: 'New York, NY',
        budget: 6000,
        currency: 'USD',
        status: 'booked',
        is_public: false
      },
      {
        title: 'Global Strategy Meeting - London',
        start_date: new Date('2025-05-08'),
        end_date: new Date('2025-05-12'),
        user_id: consultingUsers[0].id,
        organization_id: consultingOrg.id,
        description: 'International expansion planning and market analysis',
        destination: 'London, UK',
        budget: 25000,
        currency: 'USD',
        status: 'planned',
        is_public: false
      }
    ]).returning();

    console.log('✅ Sample trips created');

    // Create sample activities
    console.log('📅 Creating sample activities...');
    
    await db.insert(activities).values([
      // San Francisco trip activities
      {
        trip_id: sampleTrips[0].id,
        organization_id: techCorpOrg.id,
        title: 'Team Arrival & Check-in',
        date: new Date('2025-03-15T14:00:00'),
        time: '14:00',
        location_name: 'Grand Hyatt San Francisco',
        notes: 'Welcome drinks and networking session',
        order: 1
      },
      {
        trip_id: sampleTrips[0].id,
        organization_id: techCorpOrg.id,
        title: 'Leadership Strategy Session',
        date: new Date('2025-03-16T09:00:00'),
        time: '09:00',
        location_name: 'Conference Room A - Grand Hyatt',
        notes: 'Full day strategic planning session',
        order: 2
      },
      {
        trip_id: sampleTrips[0].id,
        organization_id: techCorpOrg.id,
        title: 'Team Dinner at Michelin Restaurant',
        date: new Date('2025-03-16T19:00:00'),
        time: '19:00',
        location_name: 'The French Laundry',
        notes: 'Advance reservations confirmed',
        order: 3
      },
      
      // New York workshop activities
      {
        trip_id: sampleTrips[2].id,
        organization_id: designStudioOrg.id,
        title: 'Design Thinking Workshop Day 1',
        date: new Date('2025-02-10T09:00:00'),
        time: '09:00',
        location_name: 'Client Office - Manhattan',
        notes: 'Bring presentation materials and sticky notes',
        order: 1
      },
      {
        trip_id: sampleTrips[2].id,
        organization_id: designStudioOrg.id,
        title: 'Working Lunch with Stakeholders',
        date: new Date('2025-02-10T12:00:00'),
        time: '12:00',
        location_name: 'Client Office - Conference Room B',
        notes: 'Dietary restrictions: 2 vegetarian, 1 gluten-free',
        order: 2
      }
    ]);

    console.log('✅ Sample activities created');

    console.log('\n🎉 Demo data seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`• Created 3 demo organizations`);
    console.log(`• Created 1 superadmin user (you)`);
    console.log(`• Created 6 demo users across organizations`);
    console.log(`• Created 4 sample trips`);
    console.log(`• Created 5 sample activities`);
    
    console.log('\n🔐 Login credentials:');
    console.log(`Superadmin: jbirchohio@gmail.com / OopsieDoodle1!`);
    console.log(`Demo users: [username]@[domain] / demo123`);
    console.log(`Example: sarah.chen@techcorp.com / demo123`);

    console.log('\n🚀 Ready for screenshots! Start with:');
    console.log(`npm run dev`);
    console.log(`Then visit: http://localhost:5000`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1]?.endsWith('seed-demo-data.ts') || process.argv[1]?.endsWith('seed-demo-data.js')) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedDemoData };