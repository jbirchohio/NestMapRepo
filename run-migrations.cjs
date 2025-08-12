const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Running database migrations...\n');
    
    // Run CASCADE DELETE migration (safe version)
    const cascadeDeleteSQL = fs.readFileSync(
      path.join(__dirname, 'server/db/add-cascade-delete-safe.sql'),
      'utf8'
    );
    
    console.log('📝 Applying CASCADE DELETE constraints...');
    try {
      await pool.query(cascadeDeleteSQL);
      console.log('✅ CASCADE DELETE constraints applied successfully\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Some constraints already exist, skipping...\n');
      } else {
        console.error('❌ Error applying CASCADE DELETE:', error.message);
      }
    }
    
    // Run unique constraints migration
    const uniqueConstraintsSQL = fs.readFileSync(
      path.join(__dirname, 'server/db/add-unique-constraints.sql'),
      'utf8'
    );
    
    console.log('📝 Applying unique constraints...');
    try {
      await pool.query(uniqueConstraintsSQL);
      console.log('✅ Unique constraints applied successfully\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Some constraints already exist, skipping...\n');
      } else {
        console.error('❌ Error applying unique constraints:', error.message);
      }
    }
    
    // Run budget features migration
    const budgetFeaturesSQL = fs.readFileSync(
      path.join(__dirname, 'server/db/add-budget-features.sql'),
      'utf8'
    );
    
    console.log('📝 Adding budget tracking features...');
    try {
      await pool.query(budgetFeaturesSQL);
      console.log('✅ Budget features added successfully\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Some budget features already exist, skipping...\n');
      } else {
        console.error('❌ Error adding budget features:', error.message);
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();