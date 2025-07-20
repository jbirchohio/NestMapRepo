import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import bcrypt from 'bcrypt';

// Load environment variables from root .env file
config({ path: resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(connectionString, { max: 1 });

async function seedUsers() {
  console.log('Seeding demo users...');

  try {
    // Hash passwords
    const superAdminPassword = await bcrypt.hash('OopsieDoodle1!', 12);
    const demoPassword = await bcrypt.hash('Demo123!', 12);

    // Step 1: Create or update users
    await sql`
      INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, email_verified, created_at, updated_at)
      VALUES 
        (gen_random_uuid(), 'jbirchohio@gmail.com', 'jbirchohio', ${superAdminPassword}, 'Jonas', 'Birch', 'super_admin', true, NOW(), NOW()),
        (gen_random_uuid(), 'admin@nestmap.demo', 'admin', ${demoPassword}, 'Admin', 'User', 'admin', true, NOW(), NOW()),
        (gen_random_uuid(), 'manager@nestmap.demo', 'manager', ${demoPassword}, 'Manager', 'User', 'manager', true, NOW(), NOW()),
        (gen_random_uuid(), 'user@nestmap.demo', 'user', ${demoPassword}, 'Regular', 'User', 'member', true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = NOW()
    `;
    console.log('✅ All users created/updated successfully');

    // Step 2: Create or update organization
    await sql`
      INSERT INTO organizations (id, name, slug, settings, created_at, updated_at)
      VALUES (gen_random_uuid(), 'NestMap Demo Organization', 'nestmap-demo', '{"theme": "default", "features": {"ai_assistant": true, "expense_tracking": true}}', NOW(), NOW())
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        settings = EXCLUDED.settings,
        updated_at = NOW()
    `;
    console.log('✅ Demo organization created: NestMap Demo Organization');

    // Step 3: Get actual IDs from database
    const users = await sql`
      SELECT id, email FROM users 
      WHERE email IN ('jbirchohio@gmail.com', 'admin@nestmap.demo', 'manager@nestmap.demo', 'user@nestmap.demo')
    `;
    
    const org = await sql`
      SELECT id FROM organizations WHERE slug = 'nestmap-demo' LIMIT 1
    `;

    if (users.length === 4 && org.length === 1) {
      const orgId = org[0].id;
      const userIds = users.map(u => u.id);
      
      // Step 4: Assign users to organization
      await sql`
        UPDATE users 
        SET organization_id = ${orgId}, updated_at = NOW() 
        WHERE id = ANY(${userIds})
      `;
      console.log('✅ Users assigned to demo organization');

      // Step 5: Create demo trip
      const demoUser = users.find(u => u.email === 'user@nestmap.demo');
      if (demoUser) {
        const tripResult = await sql`
          INSERT INTO trips (id, user_id, organization_id, title, location, city, country, start_date, end_date, trip_type, created_at, updated_at)
          VALUES (gen_random_uuid(), ${demoUser.id}, ${orgId}, 'Demo Business Trip to San Francisco', 'San Francisco, CA', 'San Francisco', 'United States', '2025-02-15', '2025-02-18', 'business', NOW(), NOW())
          ON CONFLICT DO NOTHING
          RETURNING id
        `;
        
        if (tripResult.length > 0) {
          const tripId = tripResult[0].id;
          console.log('✅ Demo trip created');

          // Step 6: Create sample activities
          await sql`
            INSERT INTO activities (id, trip_id, organization_id, title, date, location_name, notes, created_at, updated_at)
            VALUES 
              (gen_random_uuid(), ${tripId}, ${orgId}, 'Flight to San Francisco', '2025-02-15 08:00:00', 'San Francisco International Airport', 'Morning flight departure', NOW(), NOW()),
              (gen_random_uuid(), ${tripId}, ${orgId}, 'Client Meeting', '2025-02-16 14:00:00', 'Downtown San Francisco', 'Important client presentation', NOW(), NOW()),
              (gen_random_uuid(), ${tripId}, ${orgId}, 'Return Flight', '2025-02-18 18:00:00', 'San Francisco International Airport', 'Evening return flight', NOW(), NOW())
            ON CONFLICT DO NOTHING
          `;
          console.log('✅ Demo activities created');
        }
      }
    } else {
      console.log('⚠️ Could not find all required users or organization');
    }



    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Demo Accounts Created:');
    console.log('Super Admin: jbirchohio@gmail.com (password: OopsieDoodle1!)');
    console.log('Admin: admin@nestmap.demo (password: Demo123!)');
    console.log('Manager: manager@nestmap.demo (password: Demo123!)');
    console.log('User: user@nestmap.demo (password: Demo123!)');
    console.log('\n🏢 Demo Organization: NestMap Demo Organization');
    console.log('🧳 Demo Trip: Business Trip to San Francisco with sample activities');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedUsers();
