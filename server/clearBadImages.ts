// Script to clear bad image URLs and force regeneration
import { db } from './db-connection';
import { destinations } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function clearBadImages() {
  try {
    // Clear all images that have the old Unsplash search API format
    const result = await db
      .update(destinations)
      .set({ 
        cover_image: null,
        thumbnail_image: null,
        image_attribution: null,
        status: 'draft' // Force regeneration
      })
      .where(sql`${destinations.cover_image} LIKE '%ixid=%' OR ${destinations.cover_image} IS NULL`);
    
    console.log('Cleared bad image URLs, destinations will regenerate on next visit');
    
    // Also clear bad FAQs
    await db
      .update(destinations) 
      .set({
        faqs: null
      })
      .where(sql`${destinations.faqs}::text LIKE '%Budget question%'`);
      
    console.log('Also cleared placeholder FAQs');
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

clearBadImages();