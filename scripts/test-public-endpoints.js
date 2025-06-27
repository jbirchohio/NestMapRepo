import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configure dotenv
dotenv.config({ path: '.env.test' });

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const LOG_FILE = path.join(__dirname, '../api-test-results.json');

// Test results
const testResults = {
  startTime: new Date().toISOString(),
  results: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  },
};

// Public endpoints to test
const publicEndpoints = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/health',
    validate: (data) => data.status === 'ok',
  },
  {
    name: 'Get Public Key',
    method: 'GET',
    path: '/auth/public-key',
    validate: (data) => data && typeof data.publicKey === 'string',
  },
  // Add more public endpoints here
];

// Configure axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Logging function
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Test runner
async function runTests() {
  log('INFO', 'Starting public API endpoint tests...');
  
  for (const endpoint of publicEndpoints) {
    const testCase = {
      name: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
      status: 'pending',
      duration: 0,
      error: null,
      response: null,
      timestamp: new Date().toISOString(),
    };
    
    testResults.summary.total++;
    
    try {
      const startTime = Date.now();
      log('INFO', `Testing ${endpoint.method} ${endpoint.path}...`);
      
      const response = await api({
        method: endpoint.method,
        url: endpoint.path,
        // Add any test data if needed
      });
      
      testCase.duration = Date.now() - startTime;
      testCase.response = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      };
      
      // Validate response if validator is provided
      if (endpoint.validate) {
        const isValid = endpoint.validate(response.data);
        if (isValid) {
          testCase.status = 'passed';
          testResults.summary.passed++;
          log('INFO', `✓ PASSED ${endpoint.method} ${endpoint.path} (${testCase.duration}ms)`);
        } else {
          testCase.status = 'failed';
          testCase.error = 'Response validation failed';
          testResults.summary.failed++;
          log('ERROR', `✗ FAILED ${endpoint.method} ${endpoint.path}: Response validation failed`);
        }
      } else {
        // If no validator, just check for 2xx status
        if (response.status >= 200 && response.status < 300) {
          testCase.status = 'passed';
          testResults.summary.passed++;
          log('INFO', `✓ PASSED ${endpoint.method} ${endpoint.path} (${testCase.duration}ms)`);
        } else {
          testCase.status = 'failed';
          testCase.error = `Unexpected status code: ${response.status}`;
          testResults.summary.failed++;
          log('ERROR', `✗ FAILED ${endpoint.method} ${endpoint.path}: ${testCase.error}`);
        }
      }
    } catch (error) {
      testCase.status = 'failed';
      testCase.duration = error.config ? Date.now() - error.config.metadata?.startTime || 0 : 0;
      testCase.error = {
        message: error.message,
        code: error.code,
        ...(error.response && {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        }),
      };
      testResults.summary.failed++;
      log('ERROR', `✗ ERROR in ${endpoint.method} ${endpoint.path}: ${error.message}`, {
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
        },
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data,
        } : undefined,
      });
    }
    
    testResults.results.push(testCase);
  }
  
  // Save results to file
  await fs.writeFile(LOG_FILE, JSON.stringify(testResults, null, 2), 'utf-8');
  
  // Print summary
  log('INFO', '\n=== Test Summary ===');
  log('INFO', `Total: ${testResults.summary.total}`);
  log('INFO', `Passed: ${testResults.summary.passed}`);
  log('INFO', `Failed: ${testResults.summary.failed}`);
  log('INFO', `Skipped: ${testResults.summary.skipped}`);
  log('INFO', `Results saved to: ${LOG_FILE}`);
  
  // Exit with appropriate code
  process.exit(testResults.summary.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Unhandled error in test runner:', error);
  process.exit(1);
});
