#!/usr/bin/env node

/**
 * Comprehensive Stripe Endpoints Test Suite
 * Tests all corporate card functionality including create, freeze, unfreeze, transactions
 */

import https from 'https';
import http from 'http';

const BASE_URL = 'http://localhost:5000';

// Test data
const testCardData = {
  user_email: 'jonas@example.com',
  spending_limit: 50000, // $500.00 in cents
  purpose: 'travel',
  department: 'Sales'
};

const testUpdateData = {
  spending_limit: 100000 // $1000.00 in cents
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Stripe-Test-Suite/1.0',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('🏥 Testing health check...');
  try {
    const response = await makeRequest('GET', '/api/health');
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
    return response.statusCode === 200;
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testGetCards() {
  console.log('💳 Testing get cards endpoint...');
  try {
    const response = await makeRequest('GET', '/api/corporate-cards/cards');
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
    return response;
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

async function testIssueCard() {
  console.log('🎯 Testing card issuance...');
  try {
    const response = await makeRequest('POST', '/api/corporate-card/issue', testCardData);
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
    return response;
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

async function testFreezeCard(cardId) {
  console.log(`❄️  Testing card freeze (ID: ${cardId})...`);
  try {
    const response = await makeRequest('POST', `/api/corporate-card/${cardId}/freeze`, { freeze: true });
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
    return response;
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

async function testUnfreezeCard(cardId) {
  console.log(`🔓 Testing card unfreeze (ID: ${cardId})...`);
  try {
    const response = await makeRequest('POST', `/api/corporate-card/${cardId}/freeze`, { freeze: false });
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
    return response;
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

async function testUpdateCard(cardId) {
  console.log(`✏️  Testing card update (ID: ${cardId})...`);
  try {
    const response = await makeRequest('PUT', `/api/corporate-card/${cardId}`, testUpdateData);
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
    return response;
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

async function testGetTransactions(cardId) {
  console.log(`📊 Testing get transactions (ID: ${cardId})...`);
  try {
    const response = await makeRequest('GET', `/api/corporate-card/${cardId}/transactions`);
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
    return response;
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

async function testAnalytics() {
  console.log('📈 Testing analytics endpoint...');
  try {
    const response = await makeRequest('GET', '/api/corporate-card/analytics');
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
    return response;
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Stripe Endpoints Test Suite');
  console.log('='.repeat(50));

  // Test health first
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ Health check failed, aborting tests');
    return;
  }

  // Test get existing cards
  const cardsResponse = await testGetCards();
  let testCardId = null;

  if (cardsResponse && cardsResponse.body && cardsResponse.body.cards && cardsResponse.body.cards.length > 0) {
    testCardId = cardsResponse.body.cards[0].id;
    console.log(`   Using existing card ID: ${testCardId}`);
  }

  // Test analytics
  await testAnalytics();

  // Test card issuance (this will likely fail due to auth)
  const issueResponse = await testIssueCard();

  // If we have a card ID, test other operations
  if (testCardId) {
    console.log(`\n🔧 Testing operations on card ID: ${testCardId}`);
    
    // Test freeze
    await testFreezeCard(testCardId);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test unfreeze
    await testUnfreezeCard(testCardId);
    
    // Test update
    await testUpdateCard(testCardId);
    
    // Test transactions
    await testGetTransactions(testCardId);
  }

  console.log('\n✅ Test suite completed');
  console.log('='.repeat(50));
}

// Run the tests
runTests().catch(console.error);