import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import process from 'process';

// Configure dotenv
dotenv.config({ path: '.env.test' });

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const LOG_FILE = path.join(__dirname, '../api-test-results.json');

// Log levels
const LogLevel = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

let currentLogLevel = LogLevel.DEBUG;

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

// API endpoints to test
const endpoints = [
  {
    name: 'Get Session',
    method: 'GET',
    path: '/auth/session',
    requiresAuth: true,
  },
  {
    name: 'List Trips',
    method: 'GET',
    path: '/trips',
    requiresAuth: true,
  },
  // Add more endpoints here
];

// Configure axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    ...(AUTH_TOKEN && { Authorization: `Bearer ${AUTH_TOKEN}` }),
  },
});

// Logging function
function log(level, message, data = null) {
  if (level > currentLogLevel) return;
  
  const timestamp = new Date().toISOString();
  const levelStr = Object.entries(LogLevel).find(([_, v]) => v === level)?.[0] || 'LOG';
  
  const logMessage = `[${timestamp}] [${levelStr}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Test runner
async function runTests() {
  log(LogLevel.INFO, 'Starting API tests...');
  
  for (const endpoint of endpoints) {
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
      if (endpoint.requiresAuth && !AUTH_TOKEN) {
        testCase.status = 'skipped';
        testCase.error = 'Missing authentication token';
        testResults.summary.skipped++;
        log(LogLevel.WARN, `Skipped ${endpoint.method} ${endpoint.path}: ${testCase.error}`);
        continue;
      }
      
      const startTime = Date.now();
      log(LogLevel.INFO, `Testing ${endpoint.method} ${endpoint.path}...`);
      
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
      
      // Basic validation - adjust as needed
      if (response.status >= 200 && response.status < 300) {
        testCase.status = 'passed';
        testResults.summary.passed++;
        log(LogLevel.INFO, `✓ PASSED ${endpoint.method} ${endpoint.path} (${testCase.duration}ms)`);
      } else {
        testCase.status = 'failed';
        testCase.error = `Unexpected status code: ${response.status}`;
        testResults.summary.failed++;
        log(LogLevel.ERROR, `✗ FAILED ${endpoint.method} ${endpoint.path}: ${testCase.error}`);
      }
    } catch (error) {
      testCase.status = 'failed';
      testCase.duration = error.config ? Date.now() - error.config.metadata.startTime : 0;
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
      log(LogLevel.ERROR, `✗ ERROR in ${endpoint.method} ${endpoint.path}: ${error.message}`);
    }
    
    testResults.results.push(testCase);
  }
  
  // Save results to file
  await fs.writeFile(LOG_FILE, JSON.stringify(testResults, null, 2), 'utf-8');
  
  // Print summary
  log(LogLevel.INFO, '\n=== Test Summary ===');
  log(LogLevel.INFO, `Total: ${testResults.summary.total}`);
  log(LogLevel.INFO, `Passed: ${testResults.summary.passed}`);
  log(LogLevel.INFO, `Failed: ${testResults.summary.failed}`);
  log(LogLevel.INFO, `Skipped: ${testResults.summary.skipped}`);
  log(LogLevel.INFO, `Results saved to: ${LOG_FILE}`);
  
  // Exit with appropriate code
  process.exit(testResults.summary.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Unhandled error in test runner:', error);
  process.exit(1);
});
