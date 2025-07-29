#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// Helper function to check if file/directory exists
async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

// Step 4.1: Remove deprecated Express files
async function removeDeprecatedFiles() {
  console.log('\n🗑️  Removing deprecated Express route files...');

  const routesToDelete = [
    'server/src/routes/activities.ts',
    'server/src/routes/admin-analytics.ts',
    'server/src/routes/admin-settings.ts',
    'server/src/routes/admin.ts',
    'server/src/routes/ai-assistant.ts',
    'server/src/routes/ai-routes.ts',
    'server/src/routes/ai.ts',
    'server/src/routes/alerts.ts',
    'server/src/routes/analytics.ts',
    'server/src/routes/approvals.ts',
    'server/src/routes/auth.ts',
    'server/src/routes/autonomous-vehicles.ts',
    'server/src/routes/billing.ts',
    'server/src/routes/bookings.ts',
    'server/src/routes/branding.ts',
    'server/src/routes/budgets.ts',
    'server/src/routes/calendar.ts',
    'server/src/routes/collaboration.ts',
    'server/src/routes/communication.ts',
    'server/src/routes/compliance.ts',
    'server/src/routes/comprehensive-routes.ts',
    'server/src/routes/corporate-cards.ts',
    'server/src/routes/corporateCards.ts',
    'server/src/routes/custom-reporting.ts',
    'server/src/routes/customDomains.ts',
    'server/src/routes/domains.ts',
    'server/src/routes/errors.ts',
    'server/src/routes/expenses.ts',
    'server/src/routes/export.ts',
    'server/src/routes/flights.ts',
    'server/src/routes/health.ts',
    'server/src/routes/hotels.ts',
    'server/src/routes/index.ts',
    'server/src/routes/invoices.ts',
    'server/src/routes/localization.ts',
    'server/src/routes/locations.ts',
    'server/src/routes/metrics.ts',
    'server/src/routes/mfa.ts',
    'server/src/routes/notes.ts',
    'server/src/routes/notifications.ts',
    'server/src/routes/onboarding-feedback.ts',
    'server/src/routes/organizationFunding.ts',
    'server/src/routes/organizationMembers.ts',
    'server/src/routes/organizations.ts',
    'server/src/routes/payments.ts',
    'server/src/routes/performance.ts',
    'server/src/routes/policies.ts',
    'server/src/routes/proposals.ts',
    'server/src/routes/reimbursements.ts',
    'server/src/routes/reporting.ts',
    'server/src/routes/security.ts',
    'server/src/routes/stripeOAuth.ts',
    'server/src/routes/subscription-status.ts',
    'server/src/routes/system-metrics.ts',
    'server/src/routes/templates.ts',
    'server/src/routes/test.routes.ts',
    'server/src/routes/todos.ts',
    'server/src/routes/trips.ts',
    'server/src/routes/user-management.ts',
    'server/src/routes/user.ts',
    'server/src/routes/voice.ts',
    'server/src/routes/weather.ts',
    'server/src/routes/webhooks.ts',
    'server/src/routes/whiteLabelSimplified.ts',
    'server/src/routes/whiteLabelStatus.ts',
  ];

  const authFiles = [
    'server/src/auth/auth.container.ts',
    'server/src/auth/auth.controller.ts',
    'server/src/auth/auth.module.ts',
    'server/src/auth/auth.routes.ts',
  ];

  const allFiles = [...routesToDelete, ...authFiles];
  let deletedCount = 0;

  for (const file of allFiles) {
    if (await exists(file)) {
      try {
        await fs.unlink(file);
        console.log(`  ✅ Deleted: ${file}`);
        deletedCount++;
      } catch (error) {
        console.error(`  ❌ Failed to delete ${file}:`, error.message);
      }
    }
  }

  // Remove empty routes directory if all files are deleted
  try {
    const routesDir = 'server/src/routes';
    const remainingFiles = await fs.readdir(routesDir);
    if (remainingFiles.length === 0) {
      await fs.rmdir(routesDir);
      console.log(`  ✅ Removed empty directory: ${routesDir}`);
    }
  } catch (error) {
    // Directory might not exist or have files
  }

  console.log(`\n  Deleted ${deletedCount} deprecated files`);
}

// Remove unused middleware
async function cleanupMiddleware() {
  console.log('\n🧹 Cleaning up unused middleware...');

  const middlewareDir = 'server/src/middleware';
  
  if (!await exists(middlewareDir)) {
    console.log('  ℹ️  Middleware directory not found, skipping...');
    return;
  }

  // List of middleware that might be obsolete after tRPC migration
  const possiblyUnusedMiddleware = [
    'routeValidator.ts',
    'apiRateLimiter.ts',
    'restErrorHandler.ts',
  ];

  for (const file of possiblyUnusedMiddleware) {
    const filePath = path.join(middlewareDir, file);
    if (await exists(filePath)) {
      console.log(`  ⚠️  Found potentially unused middleware: ${file}`);
      console.log(`     Please review and delete manually if not needed`);
    }
  }
}

// Step 4.2: Update tests
async function updateTestSetup() {
  console.log('\n🧪 Updating test setup for tRPC...');

  const testSetupContent = `import { createTRPCMsw } from 'msw-trpc';
import { setupServer } from 'msw/node';
import type { AppRouter } from '../server/src/trpc/routers';

// Create tRPC MSW helper
export const trpcMsw = createTRPCMsw<AppRouter>();

// Setup MSW server
export const server = setupServer();

// Test helpers
export const createTestContext = async (user?: any) => {
  return {
    user,
    prisma: prismaMock,
    req: {} as any,
    res: {} as any,
  };
};

// Example test setup
export const setupTRPCTest = () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
};
`;

  await fs.writeFile('tests/setup/trpc-test-setup.ts', testSetupContent);
  console.log('  ✅ Created tRPC test setup');

  // Example integration test
  const integrationTestExample = `import { appRouter } from '../../server/src/trpc/routers';
import { createTestContext } from '../setup/trpc-test-setup';
import { prismaMock } from '../setup/prisma-mock';

describe('tRPC Integration Tests', () => {
  describe('Auth Router', () => {
    it('should register a new user', async () => {
      const ctx = await createTestContext();
      
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('Trips Router', () => {
    it('should list user trips', async () => {
      const ctx = await createTestContext({ userId: '1' });
      
      prismaMock.trip.findMany.mockResolvedValue([
        {
          id: '1',
          name: 'Test Trip',
          destination: 'Paris',
          startDate: new Date(),
          endDate: new Date(),
          userId: '1',
          status: 'PLANNED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const caller = appRouter.createCaller(ctx);
      const result = await caller.trips.list({ limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Test Trip');
    });
  });
});
`;

  await fs.writeFile('tests/integration/trpc-routes.test.ts', integrationTestExample);
  console.log('  ✅ Created example integration tests');
}

// Step 4.3: Update documentation
async function updateDocumentation() {
  console.log('\n📚 Creating tRPC documentation...');

  const readmeContent = `# tRPC Migration Documentation

## Overview
This project has been migrated from Express REST API to tRPC for type-safe API calls.

## Architecture

### Server Setup
- tRPC router: \`/server/src/trpc/routers/index.ts\`
- Context: \`/server/src/trpc/context.ts\`
- Endpoint: \`/trpc\`

### Client Setup
- tRPC client: \`/client/src/lib/trpc.ts\`
- Provider setup in \`main.tsx\`

## API Usage

### Client-side Usage
\`\`\`typescript
import { trpc } from '@/lib/trpc';

// Query
const { data, isLoading } = trpc.user.getProfile.useQuery();

// Mutation
const createTrip = trpc.trips.create.useMutation();
await createTrip.mutateAsync({ name: 'Paris Trip', ... });
\`\`\`

### Available Routers
- \`auth\` - Authentication (login, register, logout)
- \`user\` - User profile and preferences
- \`trips\` - Trip management
- \`bookings\` - Flight and hotel bookings
- \`expenses\` - Expense tracking
- \`analytics\` - Analytics and reports
- \`admin\` - Admin operations
- \`organizations\` - Organization management
- \`notifications\` - Notification system
- \`ai\` - AI assistant features

## Development

### Adding New Procedures
1. Create/update router in \`/server/src/trpc/routers/[name].ts\`
2. Add to main router in \`/server/src/trpc/routers/index.ts\`
3. Use in client with \`trpc.[router].[procedure].useQuery/useMutation()\`

### Testing
- Unit tests: Test individual procedures
- Integration tests: Test full request/response cycle
- Use \`appRouter.createCaller()\` for testing

## Migration Notes
- All REST endpoints have been replaced with tRPC procedures
- Authentication uses Bearer token in headers
- Error handling is built into tRPC
- Type safety is enforced across client and server
`;

  await fs.writeFile('docs/trpc-migration.md', readmeContent);
  console.log('  ✅ Created tRPC documentation');

  // Update main README
  console.log('\n  ℹ️  Remember to update your main README.md with:');
  console.log('     - New /trpc endpoint documentation');
  console.log('     - Updated setup instructions');
  console.log('     - tRPC-specific development guidelines');
}

// Update CI/CD configuration
async function updateCICD() {
  console.log('\n🚀 Creating CI/CD update instructions...');

  const githubActionsUpdate = `# GitHub Actions Update

Add these steps to your workflow:

\`\`\`yaml
- name: Type Check
  run: |
    pnpm run type-check
    
- name: Test tRPC Routes
  run: |
    pnpm test -- tests/integration/trpc-routes.test.ts
\`\`\`

Update your build script:
\`\`\`yaml
- name: Build
  run: |
    pnpm build
  env:
    VITE_API_URL: /trpc
\`\`\`
`;

  await fs.writeFile('docs/cicd-updates.md', githubActionsUpdate);
  console.log('  ✅ Created CI/CD update guide');
}

// Verify migration completeness
async function verifyMigration() {
  console.log('\n✅ Verifying migration completeness...');

  const checks = [
    {
      name: 'tRPC server setup',
      path: 'server/src/trpc/routers/index.ts',
    },
    {
      name: 'tRPC client setup',
      path: 'client/src/lib/trpc.ts',
    },
    {
      name: 'Old routes removed',
      path: 'server/src/routes',
      shouldNotExist: true,
    },
    {
      name: 'Old API client removed',
      path: 'client/src/lib/apiClient.ts',
      shouldNotExist: true,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    const fileExists = await exists(check.path);
    const success = check.shouldNotExist ? !fileExists : fileExists;
    
    if (success) {
      console.log(`  ✅ ${check.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${check.name}`);
      failed++;
    }
  }

  console.log(`\n  Summary: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Generate migration report
async function generateReport() {
  console.log('\n📊 Generating migration report...');

  const report = {
    timestamp: new Date().toISOString(),
    steps: {
      serverSetup: await exists('server/src/trpc/routers/index.ts'),
      clientSetup: await exists('client/src/lib/trpc.ts'),
      oldRoutesRemoved: !await exists('server/src/routes'),
      oldApiClientRemoved: !await exists('client/src/lib/apiClient.ts'),
      testsUpdated: await exists('tests/integration/trpc-routes.test.ts'),
      documentationCreated: await exists('docs/trpc-migration.md'),
    },
  };

  await fs.writeFile('migration-report.json', JSON.stringify(report, null, 2));
  console.log('  ✅ Migration report saved to migration-report.json');
}

// Main execution
async function main() {
  console.log('🚀 Starting tRPC migration - Step 4: Cleanup and Finalization\n');

  try {
    // Ensure we're in the right directory
    const packageJson = await fs.readFile('package.json', 'utf8');
    const pkg = JSON.parse(packageJson);
    
    if (!pkg.name || !pkg.workspaces) {
      console.error('❌ This script must be run from the monorepo root');
      process.exit(1);
    }

    // Run all cleanup tasks
    await removeDeprecatedFiles();
    await cleanupMiddleware();
    await updateTestSetup();
    await updateDocumentation();
    await updateCICD();
    
    // Verify and report
    const isComplete = await verifyMigration();
    await generateReport();

    console.log('\n✨ Step 4 completed successfully!');
    
    if (isComplete) {
      console.log('\n🎉 tRPC migration is complete!');
      console.log('\n📋 Final steps:');
      console.log('1. Run tests: pnpm test');
      console.log('2. Start dev server: pnpm dev');
      console.log('3. Test all major features');
      console.log('4. Update CI/CD pipelines');
      console.log('5. Deploy to staging for final verification');
    } else {
      console.log('\n⚠️  Some migration steps may be incomplete.');
      console.log('   Please check the migration report and complete any missing steps.');
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the script
main();
