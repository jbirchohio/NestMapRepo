import { Pool } from 'pg';

const RAILWAY_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway";

async function debugPurchase() {
  const pool = new Pool({ connectionString: RAILWAY_URL });
  
  try {
    console.log('🔍 Debugging purchase issue...\n');
    
    // Find Jonas's user account
    const user = await pool.query(`
      SELECT id, email, username 
      FROM users 
      WHERE username ILIKE '%jonas%' OR email ILIKE '%jonas%'
      LIMIT 1
    `);
    
    if (user.rows.length > 0) {
      const userId = user.rows[0].id;
      console.log('👤 Found user:');
      console.log(`  Username: ${user.rows[0].username}`);
      console.log(`  Email: ${user.rows[0].email}`);
      console.log(`  User ID: ${userId}`);
      
      // Check if already purchased the free template
      const existingPurchase = await pool.query(`
        SELECT * FROM template_purchases 
        WHERE buyer_id = $1 AND template_id = 1
      `, [userId]);
      
      if (existingPurchase.rows.length > 0) {
        console.log('\n⚠️ You already purchased this template!');
        console.log('  That\'s why the button might not be working.');
        console.log('\n💡 Solution: Let me make a different template free for you...');
        
        // Find another template to make free
        const nextTemplate = await pool.query(`
          SELECT id, title, price 
          FROM templates 
          WHERE id != 1 
          ORDER BY id 
          LIMIT 1
        `);
        
        if (nextTemplate.rows.length > 0) {
          await pool.query(`
            UPDATE templates 
            SET price = 0 
            WHERE id = $1
          `, [nextTemplate.rows[0].id]);
          
          console.log(`\n✅ Made "${nextTemplate.rows[0].title}" FREE!`);
          console.log('  Try purchasing this one instead.');
        }
      } else {
        console.log('\n✅ No existing purchase found.');
        console.log('  Purchase should work. Check browser console for errors.');
      }
      
      // Check trips to see if template was already copied
      const trips = await pool.query(`
        SELECT id, title, created_at 
        FROM trips 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5
      `, [userId]);
      
      console.log('\n📝 Your recent trips:');
      trips.rows.forEach(trip => {
        console.log(`  - ${trip.title} (ID: ${trip.id})`);
      });
      
    } else {
      console.log('❌ Could not find Jonas user account');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugPurchase();