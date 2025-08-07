// Quick script to clear bad FAQ data
import { db } from './db-connection';
import { destinations } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function clearBadFaqs() {
  try {
    // Clear FAQs for Paris to force regeneration
    const result = await db
      .update(destinations)
      .set({ 
        faqs: null,
        status: 'draft' // This will force regeneration on next visit
      })
      .where(eq(destinations.slug, 'paris'));
    
    console.log('Cleared Paris FAQ data, will regenerate on next visit');
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

clearBadFaqs();