const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function addStripeIdsToPricing() {
  const postgres = require('postgres');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('💳 Adding Stripe IDs to pricing tables...');

    // Add stripe_product_id and stripe_price_id columns to pricing_plans
    await sql`
      ALTER TABLE pricing_plans 
      ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
      ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
      ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT
    `;

    console.log('✅ Added Stripe ID columns to pricing_plans table');

    // Add stripe_price_id to organizations table for tracking current subscription
    await sql`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
      ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT
    `;

    console.log('✅ Added Stripe subscription tracking to organizations table');

    // Create a table to track Stripe sync history
    await sql`
      CREATE TABLE IF NOT EXISTS stripe_pricing_sync_log (
        id SERIAL PRIMARY KEY,
        pricing_plan_id INTEGER REFERENCES pricing_plans(id),
        action TEXT NOT NULL, -- 'create_product', 'update_product', 'create_price', 'update_price'
        stripe_object_id TEXT,
        request_data JSONB,
        response_data JSONB,
        error_message TEXT,
        success BOOLEAN DEFAULT false,
        synced_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Created stripe_pricing_sync_log table');

    // Update existing plans with placeholder Stripe IDs if they exist in env
    const plans = await sql`SELECT * FROM pricing_plans`;
    
    for (const plan of plans) {
      if (plan.name === 'starter' && process.env.STRIPE_PRICE_ID_STARTER) {
        await sql`
          UPDATE pricing_plans 
          SET stripe_price_id_monthly = ${process.env.STRIPE_PRICE_ID_STARTER}
          WHERE id = ${plan.id}
        `;
      } else if (plan.name === 'professional' && process.env.STRIPE_PRICE_ID_TEAM) {
        await sql`
          UPDATE pricing_plans 
          SET stripe_price_id_monthly = ${process.env.STRIPE_PRICE_ID_TEAM}
          WHERE id = ${plan.id}
        `;
      } else if (plan.name === 'enterprise' && process.env.STRIPE_PRICE_ID_ENTERPRISE) {
        await sql`
          UPDATE pricing_plans 
          SET stripe_price_id_monthly = ${process.env.STRIPE_PRICE_ID_ENTERPRISE}
          WHERE id = ${plan.id}
        `;
      }
    }

    console.log('✅ Updated existing plans with Stripe IDs from environment');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding Stripe IDs:', error);
    await sql.end();
    process.exit(1);
  }
}

addStripeIdsToPricing();