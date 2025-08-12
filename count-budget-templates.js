import 'dotenv/config';
import { db } from './server/db.js';
import { templates } from './shared/schema.js';
import { or, like } from 'drizzle-orm';

async function countBudgetTemplates() {
  const budgetTemplates = await db.select({
    id: templates.id,
    title: templates.title,
    price: templates.price,
    ai_generated: templates.ai_generated,
    created_at: templates.created_at
  })
  .from(templates)
  .where(
    or(
      like(templates.title, '%Shoestring%'),
      like(templates.title, '%Budget%'),
      like(templates.title, '%Without Gambling%'),
      like(templates.title, '%for Less%'),
      like(templates.title, '%Cheap%'),
      like(templates.title, '%Under%'),
      like(templates.title, '%Free%'),
      like(templates.title, '%Broke%')
    )
  );

  console.log('\n=== BUDGET TEMPLATES CREATED ===');
  console.log('================================\n');
  
  budgetTemplates
    .sort((a, b) => a.price - b.price)
    .forEach(t => {
      console.log(`ID ${t.id}: ${t.title}`);
      console.log(`  Price: $${t.price} | AI: ${t.ai_generated}`);
    });
  
  console.log(`\n✅ Total: ${budgetTemplates.length} budget templates`);
  console.log(`💰 Price Range: $${Math.min(...budgetTemplates.map(t => parseFloat(t.price)))} - $${Math.max(...budgetTemplates.map(t => parseFloat(t.price)))}`);
  
  process.exit(0);
}

countBudgetTemplates().catch(console.error);