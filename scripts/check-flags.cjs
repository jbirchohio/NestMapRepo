const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function checkFlags() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    // Check feature flags
    const flags = await sql`SELECT * FROM feature_flags ORDER BY flag_name LIMIT 10`;
    
    console.log('Sample Feature Flags in Database:');
    console.log('=====================================');
    flags.forEach(flag => {
      console.log(`Flag: ${flag.flag_name}`);
      console.log(`  Default Value: ${flag.default_value}`);
      console.log(`  Description: ${flag.description}`);
      console.log('---');
    });

    // Check what the API would return with case conversion
    console.log('\nWhat API returns (with case conversion):');
    console.log('=====================================');
    const apiFlags = flags.map(flag => ({
      id: flag.id,
      flagName: flag.flag_name,
      description: flag.description,
      defaultValue: flag.default_value,
      createdAt: flag.created_at
    }));
    console.log(JSON.stringify(apiFlags[0], null, 2));
    
    await sql.end();
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
  }
}

checkFlags();