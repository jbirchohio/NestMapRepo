import postgres from 'postgres';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(connectionString, { max: 1 });

async function verifyUsers() {
  console.log('🔍 Verifying created users...\n');

  try {
    // Check users
    const users = await sql`
      SELECT id, email, username, first_name, last_name, role, email_verified, organization_id, created_at
      FROM users 
      ORDER BY role DESC, created_at ASC
    `;

    console.log('👥 Users in database:');
    users.forEach(user => {
      console.log(`  • ${user.first_name} ${user.last_name} (${user.email}) - Role: ${user.role} - Verified: ${user.email_verified}`);
    });

    // Check organizations
    const orgs = await sql`
      SELECT id, name, slug, created_at
      FROM organizations
    `;

    console.log('\n🏢 Organizations:');
    orgs.forEach(org => {
      console.log(`  • ${org.name} (${org.slug})`);
    });

    // Check users with organizations
    const usersWithOrgs = await sql`
      SELECT u.email, u.role, o.name as org_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      ORDER BY u.role DESC
    `;

    console.log('\n👥 Users with Organizations:');
    usersWithOrgs.forEach(user => {
      const orgInfo = user.org_name ? `in ${user.org_name}` : 'no organization';
      console.log(`  • ${user.email} - ${user.role} (${orgInfo})`);
    });

    // Check trips
    const trips = await sql`
      SELECT t.title, t.location, t.city, t.country, t.trip_type, t.completed, u.email as user_email
      FROM trips t
      JOIN users u ON t.user_id = u.id
    `;

    console.log('\n🧣 Trips:');
    trips.forEach(trip => {
      const status = trip.completed ? 'completed' : 'active';
      const location = trip.city && trip.country ? `${trip.city}, ${trip.country}` : (trip.location || 'Unknown location');
      console.log(`  • ${trip.title} to ${location} (${trip.trip_type}, ${status}) - Created by: ${trip.user_email}`);
    });

    console.log('\n✅ Database verification completed!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await sql.end();
  }
}

verifyUsers();
