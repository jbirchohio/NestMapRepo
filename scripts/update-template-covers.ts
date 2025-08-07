import { db } from '../server/db-connection.js';
import { templates } from '../shared/schema.js';
import { sql } from 'drizzle-orm';
import { logger } from '../server/utils/logger.js';

async function updateTemplateCovers() {
  try {
    console.log('Updating all template cover images...');
    
    // Update all templates to use the same cover image
    const coverImageUrl = '/uploads/covers/cover_template_remvana.webp';
    
    const result = await db
      .update(templates)
      .set({
        cover_image: coverImageUrl,
        updated_at: new Date()
      });
    
    // Get count of updated templates
    const [{ count }] = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(templates);
    
    console.log(`✓ Updated ${count} templates with cover image: ${coverImageUrl}`);
    
    // Show a few examples
    const updatedTemplates = await db
      .select({
        id: templates.id,
        title: templates.title,
        cover_image: templates.cover_image
      })
      .from(templates)
      .limit(5);
    
    console.log('\nSample updated templates:');
    updatedTemplates.forEach(t => {
      console.log(`  - ${t.title}: ${t.cover_image}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating template covers:', error);
    process.exit(1);
  }
}

updateTemplateCovers();