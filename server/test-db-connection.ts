import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabasePassword = process.env.SUPABASE_DB_PASSWORD;
    
    if (!supabaseUrl || !supabasePassword) {
      throw new Error('SUPABASE_URL and SUPABASE_DB_PASSWORD environment variables are required');
    }
    
    // Extract the host from SUPABASE_URL
    const host = new URL(supabaseUrl).hostname;
    const connectionString = `postgresql://postgres:${encodeURIComponent(supabasePassword)}@db.${host}:5432/postgres?sslmode=require`;
    
    console.log(`🔗 Connection string: postgresql://postgres:*****@db.${host}:5432/postgres`);
    
    // Test with direct connection (no pooling)
    console.log('🚀 Attempting direct connection...');
    const startTime = Date.now();
    
    const client = postgres(connectionString, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
      ssl: { rejectUnauthorized: false },
      debug: (connection, query, params) => {
        console.log('📝 Query:', query);
      },
      onnotice: (notice) => console.log('📢 Notice:', notice),
      onparameter: (key, value) => console.log(`⚙️  Parameter ${key} = ${value}`),
      onclose: () => console.log('❌ Connection closed'),
      onerror: (err) => console.error('❌ Connection error:', err)
    });
    
    try {
      console.log('🔌 Connected, running test query...');
      const result = await client`SELECT 1 as test`;
      console.log('✅ Test query successful:', result);
    } finally {
      await client.end();
    }
    
    const endTime = Date.now();
    console.log(`✨ Connection test completed in ${endTime - startTime}ms`);
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
}

testConnection();
