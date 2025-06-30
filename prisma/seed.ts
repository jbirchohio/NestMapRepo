import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create a test organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'test-org' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Organization',
      slug: 'test-org',
      description: 'Test organization for development',
      contactEmail: 'admin@testorg.com',
      isActive: true,
      metadata: '{"plan":"enterprise"}',
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add other required fields with default values
      logoUrl: null,
      website: null,
      contactPhone: null,
      address: null,
      city: null,
      state: null,
      country: null,
      postalCode: null,
      timezone: 'UTC',
      locale: 'en-US',
      deletedAt: null,
    },
  });
  console.log(`✅ Created organization: ${organization.name}`);

  // Create an admin user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: hashedPassword,
      emailVerified: true,
      isActive: true,
      role: 'ADMIN',
      organizationId: organization.id,
      metadata: '{"isSuperAdmin":true}',
      preferences: '{"theme":"dark"}',
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add other required fields with default values
      lastLoginAt: null,
      lastActiveAt: null,
      avatarUrl: null,
      tokenVersion: 0,
      mfaEnabled: false,
      mfaSecret: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      status: 'ACTIVE',
      deletedAt: null,
    },
  });
  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create a regular user
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'user@example.com',
      firstName: 'Regular',
      lastName: 'User',
      passwordHash: hashedPassword,
      emailVerified: true,
      isActive: true,
      role: 'MEMBER',
      organizationId: organization.id,
      metadata: '{}',
      preferences: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add other required fields with default values
      lastLoginAt: null,
      lastActiveAt: null,
      avatarUrl: null,
      tokenVersion: 0,
      mfaEnabled: false,
      mfaSecret: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      status: 'ACTIVE',
      deletedAt: null,
    },
  });
  console.log(`✅ Created regular user: ${regularUser.email}`);

  // Create user settings for admin
  await prisma.userSetting.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      userId: adminUser.id,
      theme: 'dark',
      locale: 'en-US',
      timezone: 'UTC',
      emailNotifications: '{"marketing":true,"updates":true}',
      pushNotifications: '{"enabled":true}',
      metadata: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Created settings for admin user`);

  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
