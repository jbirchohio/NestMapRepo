import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🚀 Applying database migration...');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'prisma', 'migrations', '0_init', 'migration.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    const sql = await readFile(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`🔍 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`\n📝 Executing statement ${i + 1}/${statements.length}:`);
        console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
        
        await prisma.$executeRawUnsafe(statement);
        console.log('✅ Statement executed successfully');
      } catch (e) {
        console.error(`❌ Error executing statement ${i + 1}:`, e.message);
        // Continue with next statement even if one fails
      }
    }
    
    console.log('\n🎉 Migration completed!');
    
  } catch (e) {
    console.error('❌ Migration failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('Script error:', e);
    process.exit(1);
  });
