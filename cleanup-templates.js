import 'dotenv/config';
import { db } from './server/db.js';
import { templates } from './shared/schema.js';
import { inArray, eq } from 'drizzle-orm';

async function cleanup() {
  // Delete duplicate templates (keeping the better ones)
  const duplicatesToDelete = [68, 69, 70, 71]; // These are duplicates
  await db.delete(templates)
    .where(inArray(templates.id, duplicatesToDelete));
  
  console.log('Deleted duplicate templates:', duplicatesToDelete);

  // Also update AI flag for remaining ones
  const toUpdate = [64, 65, 66, 67, 72, 73, 74, 75];
  for (const id of toUpdate) {
    await db.update(templates)
      .set({ ai_generated: false })
      .where(eq(templates.id, id));
  }
  console.log('Updated AI flag to false for:', toUpdate);
  
  process.exit(0);
}

cleanup().catch(console.error);