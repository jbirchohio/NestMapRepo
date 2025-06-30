import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});

  // Create organizations
  const org1 = await prisma.organization.create({
    data: {
      name: 'ACME Corp',
      slug: 'acme-corp',
      isActive: true,
      metadata: {}
    },
  });

  const org2 = await prisma.organization.create({
    data: {
      name: 'TechStart Inc',
      slug: 'techstart',
      isActive: true,
      metadata: {}
    },
  });

  // Create admin user
  const adminPassword = await hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      organizationId: org1.id,
      isActive: true,
      metadata: {}
    },
  });

  // Create regular user
  const userPassword = await hash('user123', 10);
  await prisma.user.create({
    data: {
      email: 'user@example.com',
      passwordHash: userPassword,
      firstName: 'Regular',
      lastName: 'User',
      role: UserRole.USER,
      organizationId: org2.id,
      isActive: true,
      metadata: {}
    },
  });

  console.log('✅ Seed data created successfully');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
