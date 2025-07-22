import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

console.log('🔌 Testing database connection...');
console.log('Database URL:', databaseUrl.replace(/:[^:@]*@/, ':***@')); // Hide password

const client = postgres(databaseUrl, {
  ssl: { rejectUnauthorized: false },
  max: 1,
  idle_timeout: 5,
  connect_timeout: 5,
  prepare: false,
  debug: false
});

try {
  console.log('⏳ Attempting connection...');
  const result = await client`SELECT 1 as test`;
  console.log('✅ Database connection successful!');
  console.log('Test result:', result);
  await client.end();
  console.log('🔌 Connection closed');
} catch (error) {
  console.error('❌ Database connection failed:');
  console.error('Error:', error.message);
  if (error.code) {
    console.error('Error code:', error.code);
  }
  process.exit(1);
}
