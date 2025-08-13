import 'dotenv/config';
import { db } from './db-connection';
import { templates } from '@shared/schema';
import { desc } from 'drizzle-orm';

async function getSlug() {
  const [template] = await db
    .select({ slug: templates.slug, title: templates.title, id: templates.id })
    .from(templates)
    .orderBy(desc(templates.created_at))
    .limit(1);
  
  console.log('Latest template:');
  console.log('  ID:', template.id);
  console.log('  Title:', template.title);
  console.log('  Slug:', template.slug);
  console.log('');
  console.log('View at: http://localhost:5000/templates/' + template.slug);
  
  process.exit(0);
}

getSlug();