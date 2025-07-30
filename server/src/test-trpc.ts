import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './trpc/trpc-server';

// Create tRPC client
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
    }),
  ],
});

async function testHealthCheck() {
  try {
    console.log('Testing health check...');
    const result = await trpc.health.status.query();
    console.log('Health check result:', result);
    console.log('✅ Health check passed!');
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }
}

// Run the test
async function runTests() {
  console.log('Starting tRPC server tests...');
  await testHealthCheck();
  console.log('Tests completed.');
}

runTests().catch(console.error);
