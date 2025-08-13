#!/usr/bin/env node

require('dotenv').config();
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { sql } = require('drizzle-orm');

async function createPromoTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    console.log('🔄 Creating promo code tables...');
    
    // Create promo_codes table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        stripe_coupon_id TEXT,
        description TEXT,
        discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
        discount_amount DECIMAL(10, 2) NOT NULL,
        minimum_purchase DECIMAL(10, 2),
        max_uses INTEGER,
        max_uses_per_user INTEGER DEFAULT 1,
        used_count INTEGER DEFAULT 0,
        valid_from TIMESTAMP DEFAULT NOW(),
        valid_until TIMESTAMP,
        template_id INTEGER,
        creator_id INTEGER,
        is_active BOOLEAN DEFAULT true,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER
      )
    `);
    console.log('✅ Created promo_codes table');

    // Create promo_code_uses table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS promo_code_uses (
        id SERIAL PRIMARY KEY,
        promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        template_purchase_id INTEGER REFERENCES template_purchases(id),
        discount_applied DECIMAL(10, 2) NOT NULL,
        used_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created promo_code_uses table');

    // Create indexes for better performance
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_promo_code_uses_promo ON promo_code_uses(promo_code_id)`);
    console.log('✅ Created indexes');

    // Check if sample code exists
    const existingCodes = await db.execute(sql`
      SELECT id FROM promo_codes WHERE code = 'WELCOME20'
    `);
    
    if (existingCodes.rows.length === 0) {
      // Insert sample promo codes
      await db.execute(sql`
        INSERT INTO promo_codes (
          code, 
          description, 
          discount_type, 
          discount_amount, 
          max_uses_per_user,
          is_active
        ) VALUES 
        (
          'WELCOME20',
          'Welcome discount for new users - 20% off',
          'percentage',
          20,
          1,
          true
        ),
        (
          'FIRST10',
          'First purchase discount - $10 off',
          'fixed',
          10,
          1,
          true
        )
      `);
      console.log('✅ Created sample promo codes:');
      console.log('   - WELCOME20 (20% off)');
      console.log('   - FIRST10 ($10 off)');
    } else {
      console.log('ℹ️  Sample promo codes already exist');
    }

    console.log('\n🎉 Promo code tables created successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Go to /admin and click on "Promo Codes" tab');
    console.log('2. Create new promo codes or use the sample ones');
    console.log('3. Test in checkout when purchasing a template');
    
  } catch (error) {
    if (error.code === '42P07') {
      console.log('ℹ️  Tables already exist');
    } else {
      console.error('❌ Error creating promo tables:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

createPromoTables().catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});