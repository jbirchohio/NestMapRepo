import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

// Load environment variables from root .env file
config({ path: resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString);

async function showDemoData() {
  console.log('📊 Demo Data Summary\n');

  try {
    // Show users
    const users = await sql`
      SELECT u.email, u.username, u.role, u.first_name, u.last_name, o.name as organization_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.email LIKE '%@nestmap.demo' OR u.email = 'jbirchohio@gmail.com'
      ORDER BY u.role DESC, u.email
    `;

    console.log('👥 Users:');
    users.forEach(user => {
      console.log(`  • ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`    Role: ${user.role}`);
      console.log(`    Username: ${user.username}`);
      console.log(`    Organization: ${user.organization_name || 'None'}`);
      console.log('');
    });

    // Show organizations
    const orgs = await sql`
      SELECT name, slug, settings, created_at
      FROM organizations
      WHERE slug = 'nestmap-demo'
    `;

    console.log('🏢 Organizations:');
    orgs.forEach(org => {
      console.log(`  • ${org.name} (${org.slug})`);
      console.log(`    Settings: ${JSON.stringify(org.settings, null, 2)}`);
      console.log('');
    });

    // Show trips
    const trips = await sql`
      SELECT t.title, t.location, t.city, t.country, t.start_date, t.end_date, t.trip_type,
             u.email as user_email, o.name as organization_name
      FROM trips t
      JOIN users u ON t.user_id = u.id
      JOIN organizations o ON t.organization_id = o.id
      WHERE o.slug = 'nestmap-demo'
    `;

    console.log('✈️ Trips:');
    trips.forEach(trip => {
      console.log(`  • ${trip.title}`);
      console.log(`    Location: ${trip.location}`);
      console.log(`    Dates: ${trip.start_date} to ${trip.end_date}`);
      console.log(`    Type: ${trip.trip_type}`);
      console.log(`    User: ${trip.user_email}`);
      console.log('');
    });

    // Show activities
    const activities = await sql`
      SELECT a.title, a.date, a.location_name, a.notes,
             t.title as trip_title, u.email as user_email
      FROM activities a
      JOIN trips t ON a.trip_id = t.id
      JOIN users u ON t.user_id = u.id
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.slug = 'nestmap-demo'
      ORDER BY a.date
    `;

    console.log('📅 Activities:');
    activities.forEach(activity => {
      console.log(`  • ${activity.title}`);
      console.log(`    Date: ${activity.date}`);
      console.log(`    Location: ${activity.location_name}`);
      console.log(`    Notes: ${activity.notes}`);
      console.log(`    Trip: ${activity.trip_title}`);
      console.log('');
    });

    console.log('✅ Demo data summary complete!');
    console.log('\n🔐 Login Credentials:');
    console.log('  Super Admin: jbirchohio@gmail.com / OopsieDoodle1!');
    console.log('  Demo Admin: admin@nestmap.demo / Demo123!');
    console.log('  Demo Manager: manager@nestmap.demo / Demo123!');
    console.log('  Demo User: user@nestmap.demo / Demo123!');

  } catch (error) {
    console.error('❌ Error showing demo data:', error);
  } finally {
    await sql.end();
  }
}

showDemoData().catch(console.error);
