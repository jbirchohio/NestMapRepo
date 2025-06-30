import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🔍 Verifying database data...');
  
  try {
    // Check organizations
    const organizations = await prisma.organization.findMany();
    console.log('\n📋 Organizations:');
    console.table(organizations);
    
    // Check users
    const users = await prisma.user.findMany({
      include: {
        organization: true,
        settings: true,
      },
    });
    
    console.log('\n👥 Users:');
    console.table(users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organization: user.organization?.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
    })));
    
    // Count records in each table
    console.log('\n📊 Record counts:');
    const tables = [
      'organization',
      'user',
      'userSetting',
      'userSession',
      'passwordHistory',
      'userActivityLog',
      'invitation',
    ];
    
    for (const table of tables) {
      try {
        const count = await prisma[table].count();
        console.log(`${table}: ${count} records`);
      } catch (e) {
        console.error(`Error counting ${table}:`, e.message);
      }
    }
    
  } catch (e) {
    console.error('Error verifying data:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('Script error:', e);
    process.exit(1);
  });
