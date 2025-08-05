const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function checkSettings() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    // Check if system_settings table exists and has data
    const settings = await sql`SELECT * FROM system_settings ORDER BY category, setting_key LIMIT 10`;
    
    console.log('Sample System Settings in Database:');
    console.log('=====================================');
    console.log(`Total settings found: ${settings.length}`);
    
    settings.forEach(setting => {
      console.log(`\nCategory: ${setting.category}`);
      console.log(`Key: ${setting.setting_key}`);
      console.log(`Value: ${setting.is_sensitive ? '[REDACTED]' : setting.setting_value}`);
      console.log(`Type: ${setting.setting_type}`);
      console.log(`Description: ${setting.description}`);
    });

    // Check categories
    const categories = await sql`
      SELECT DISTINCT category, COUNT(*) as count
      FROM system_settings
      GROUP BY category
      ORDER BY category
    `;
    
    console.log('\n\nCategories:');
    console.log('=====================================');
    categories.forEach(cat => {
      console.log(`${cat.category}: ${cat.count} settings`);
    });
    
    await sql.end();
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
  }
}

checkSettings();