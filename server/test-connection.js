import 'dotenv/config';
import postgres from 'postgres';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Create a safe version of the URL for logging (without password)
    const url = new URL(connectionString);
    const safeUrl = `${url.protocol}//${url.host}${url.pathname}`;
    console.log(`🔗 Connecting to: ${safeUrl}`);

    // Create a simple connection
    const sql = postgres({
      host: url.hostname,
      port: url.port || 5432,
      database: url.pathname.replace(/^\/+/, ''),
      username: url.username,
      password: url.password,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
      debug: true,
    });

    try {
      console.log('🚀 Running test query...');
      const result = await sql`SELECT 1 as test`;
      console.log('✅ Test query successful:', result);
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
