import 'dotenv/config';
import postgres from 'postgres';

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase database connection...');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabasePassword = process.env.SUPABASE_DB_PASSWORD;
    
    if (!supabaseUrl || !supabasePassword) {
      throw new Error('SUPABASE_URL and SUPABASE_DB_PASSWORD environment variables are required');
    }

    // Extract project reference from Supabase URL
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    
    // Connection string using Supabase's connection pooler
    const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(supabasePassword)}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`;
    
    console.log(`🔗 Attempting to connect to project: ${projectRef}`);
    
    // Create a simple connection
    const sql = postgres({
      connectionString,
      max: 1,
      idle_timeout: 10,
      connect_timeout: 10,
      ssl: {
        rejectUnauthorized: false,
        sslmode: 'require'
      },
      debug: true
    });

    try {
      console.log('🚀 Running test query...');
      const result = await sql`SELECT version() as db_version, current_database() as db_name, current_user as db_user`;
      console.log('✅ Connection successful!');
      console.log('📊 Database Info:', result[0]);
      return true;
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
