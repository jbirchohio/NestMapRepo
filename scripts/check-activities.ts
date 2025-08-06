import { Pool } from 'pg';

const RAILWAY_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway";

async function checkActivities() {
  const pool = new Pool({ connectionString: RAILWAY_URL });
  
  try {
    console.log('🔍 Checking activities in Railway database...\n');
    
    // Count activities
    const activityCount = await pool.query('SELECT COUNT(*) FROM activities');
    console.log(`📊 Total activities: ${activityCount.rows[0].count}`);
    
    // Get sample activities
    const activities = await pool.query(`
      SELECT a.*, t.title as trip_title 
      FROM activities a 
      LEFT JOIN trips t ON a.trip_id = t.id 
      LIMIT 10
    `);
    
    console.log('\n📝 Sample activities:');
    activities.rows.forEach(row => {
      console.log(`  - ${row.title} (Trip: ${row.trip_title || 'none'})`);
    });
    
    // Check trips
    const trips = await pool.query('SELECT id, title, user_id FROM trips LIMIT 5');
    console.log('\n🗺️ Trips:');
    trips.rows.forEach(row => {
      console.log(`  - Trip #${row.id}: ${row.title} (User: ${row.user_id})`);
    });
    
    // Check templates and their trip_data
    const templates = await pool.query(`
      SELECT title, duration, trip_data IS NOT NULL as has_trip_data 
      FROM templates 
      LIMIT 5
    `);
    
    console.log('\n📦 Templates:');
    templates.rows.forEach(row => {
      console.log(`  - ${row.title}: ${row.duration} days (has trip_data: ${row.has_trip_data})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkActivities();