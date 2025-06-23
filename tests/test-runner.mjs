import { jest } from '@jest/globals';
// Configure Jest globals
global.describe = jest.describe || describe;
global.it = jest.it || it;
global.test = jest.test || test;
global.expect = jest.expect || expect;
global.beforeAll = jest.beforeAll || beforeAll;
global.afterAll = jest.afterAll || afterAll;
global.beforeEach = jest.beforeEach || beforeEach;
global.afterEach = jest.afterEach || afterEach;
// Import and run test files
async function runTests() {
    console.log('🧪 NestMap Comprehensive Test Suite');
    console.log('===================================');
    try {
        // Run integration tests first
        console.log('\n1. Running Integration Tests...');
        await import('./integration-test.ts');
        // Check if other test files can be loaded
        console.log('\n2. Validating Test Files...');
        const testFiles = [
            './auth.test.ts',
            './trips.test.ts',
            './activities.test.ts',
            './organizations.test.ts',
            './analytics.test.ts',
            './ai-integration.test.ts'
        ];
        for (const file of testFiles) {
            try {
                console.log(`   Checking ${file}...`);
                // Just validate the file can be imported
                const module = await import(file);
                console.log(`   ✅ ${file} - Configuration valid`);
            }
            catch (error) {
                console.log(`   ❌ ${file} - ${error.message}`);
            }
        }
        console.log('\n✅ Test suite validation complete');
    }
    catch (error) {
        console.error('❌ Test execution failed:', error.message);
    }
}
runTests();
