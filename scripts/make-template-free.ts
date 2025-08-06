import { Pool } from 'pg';

const RAILWAY_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway";

async function makeTemplateFree() {
  const pool = new Pool({ connectionString: RAILWAY_URL });
  
  try {
    console.log('🎁 Making first template free for testing...\n');
    
    // Get first template
    const result = await pool.query(`
      SELECT id, title, price 
      FROM templates 
      ORDER BY id 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No templates found');
      return;
    }
    
    const template = result.rows[0];
    console.log(`Found template: "${template.title}"`);
    console.log(`Current price: $${template.price}`);
    
    // Make it free
    await pool.query(`
      UPDATE templates 
      SET price = 0 
      WHERE id = $1
    `, [template.id]);
    
    console.log(`✅ Template is now FREE for testing!`);
    console.log(`\n📝 To test:`);
    console.log(`1. Go to the marketplace`);
    console.log(`2. Click on "${template.title}"`);
    console.log(`3. Click "Purchase Template" (it's free now)`);
    console.log(`4. Check your trips to see if all activities were copied correctly`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

makeTemplateFree();