import { Pool } from 'pg';

const RAILWAY_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway";

async function testPurchaseSetup() {
  const pool = new Pool({ connectionString: RAILWAY_URL });
  
  try {
    console.log('🔍 Checking purchase setup...\n');
    
    // Check template
    const template = await pool.query(`
      SELECT id, title, price, status, user_id 
      FROM templates 
      WHERE price = 0 
      LIMIT 1
    `);
    
    if (template.rows.length === 0) {
      console.log('❌ No free templates found');
      return;
    }
    
    console.log('📦 Free Template:');
    console.log(`  ID: ${template.rows[0].id}`);
    console.log(`  Title: ${template.rows[0].title}`);
    console.log(`  Price: $${template.rows[0].price}`);
    console.log(`  Status: ${template.rows[0].status}`);
    console.log(`  Owner ID: ${template.rows[0].user_id}`);
    
    // Check if you have a user account
    const users = await pool.query(`
      SELECT id, email, username 
      FROM users 
      WHERE email NOT LIKE '%@%wanderer.com' 
      AND email NOT LIKE '%@%backpack.com'
      AND email NOT LIKE '%@%adventures.com'
      AND email NOT LIKE '%@%traveler.com'
      AND email NOT LIKE '%@%seeker.com'
      ORDER BY id DESC
      LIMIT 5
    `);
    
    console.log('\n👤 Your user accounts:');
    if (users.rows.length === 0) {
      console.log('  ❌ No user account found - you need to register/login first!');
    } else {
      users.rows.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id})`);
      });
    }
    
    // Check recent purchases
    const purchases = await pool.query(`
      SELECT tp.*, t.title 
      FROM template_purchases tp
      JOIN templates t ON tp.template_id = t.id
      ORDER BY tp.purchased_at DESC
      LIMIT 5
    `);
    
    console.log('\n📝 Recent purchases:');
    if (purchases.rows.length === 0) {
      console.log('  No purchases yet');
    } else {
      purchases.rows.forEach(p => {
        console.log(`  - ${p.title} by user ${p.buyer_id} at ${p.purchased_at}`);
      });
    }
    
    console.log('\n✅ To test purchase:');
    console.log('1. Make sure you are logged in');
    console.log('2. Open browser console (F12)');
    console.log('3. Click purchase button');
    console.log('4. Check for any errors in console');
    console.log('5. Check Network tab for the /api/templates/1/purchase request');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testPurchaseSetup();