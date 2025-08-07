import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Client } = pkg;
import { templates } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

const DATABASE_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway";

async function updateCovers() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to Railway database');
    
    const db = drizzle(client);
    
    // Update all templates with the cover image
    const coverImageUrl = '/uploads/covers/cover_template_remvana.webp';
    
    console.log('Updating all templates with cover image:', coverImageUrl);
    
    await db
      .update(templates)
      .set({
        cover_image: coverImageUrl,
        updated_at: new Date()
      });
    
    // Get count and samples
    const result = await client.query(`
      SELECT id, title, slug, cover_image 
      FROM templates 
      LIMIT 10
    `);
    
    console.log(`\n✓ Updated ${result.rowCount} templates`);
    console.log('\nSample templates with new cover:');
    result.rows.forEach(row => {
      console.log(`  - [${row.id}] ${row.title}`);
      console.log(`    URL: ${row.cover_image}`);
    });
    
    // Get total count
    const countResult = await client.query('SELECT COUNT(*) as count FROM templates');
    console.log(`\nTotal templates updated: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
}

updateCovers();