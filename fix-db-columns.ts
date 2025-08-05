import { db } from './server/db-connection';
import { sql } from 'drizzle-orm';

async function fixPasswordColumn() {
  console.log('Checking and fixing password column...');
  
  try {
    // First, let's see what columns exist
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND (column_name = 'password' OR column_name = 'password_hash')
    `);
    
    console.log('Found columns:', result.rows);
    
    // Check if we have 'password' but not 'password_hash'
    const hasPassword = result.rows.some((row: any) => row.column_name === 'password');
    const hasPasswordHash = result.rows.some((row: any) => row.column_name === 'password_hash');
    
    if (hasPassword && !hasPasswordHash) {
      console.log('Renaming password to password_hash...');
      await db.execute(sql`ALTER TABLE users RENAME COLUMN password TO password_hash`);
      console.log('✅ Column renamed successfully');
    } else if (!hasPassword && !hasPasswordHash) {
      console.log('Adding password_hash column...');
      await db.execute(sql`ALTER TABLE users ADD COLUMN password_hash TEXT`);
      console.log('✅ Column added successfully');
    } else if (hasPasswordHash) {
      console.log('✅ password_hash column already exists');
    }
    
    // Show all columns for verification
    const allColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nAll user table columns:');
    allColumns.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixPasswordColumn();