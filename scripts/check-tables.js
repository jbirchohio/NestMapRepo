import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🔍 Checking database tables...');
  
  try {
    // This is a raw SQL query to list all tables in SQLite
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%' 
      AND name NOT LIKE '_prisma_%' 
      ORDER BY name;
    `;
    
    console.log('✅ Database tables:');
    console.log(tables);
    
    // For each table, count the rows
    for (const table of tables) {
      try {
        const count = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM ${table.name};
        `;
        console.log(`Table ${table.name}: ${count[0].count} rows`);
      } catch (e) {
        console.error(`❌ Error counting rows in ${table.name}:`, e.message);
      }
    }
    
  } catch (e) {
    console.error('❌ Error checking database tables:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('Script error:', e);
    process.exit(1);
  });
