#!/usr/bin/env node

// Test script for authentication system
const { exec } = require('child_process');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000';

console.log('🧪 Testing Authentication System\n');

// Test 1: Login with valid credentials
async function testLogin() {
  console.log('📝 Test 1: Login with valid credentials');
  
  return new Promise((resolve, reject) => {
    const loginData = JSON.stringify({
      email: 'admin@example.com',
      password: 'password'
    });

    const command = `curl -s -X POST -H "Content-Type: application/json" -d '${loginData}' -c cookies.txt "${BASE_URL}/api/auth/login"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Login test failed:', error.message);
        reject(error);
        return;
      }
      
      try {
        const response = JSON.parse(stdout);
        if (response.success) {
          console.log('✅ Login successful');
          console.log('   User ID:', response.user.id);
          console.log('   Role:', response.user.role);
          console.log('   Organization ID:', response.user.organizationId);
          resolve(response);
        } else {
          console.log('❌ Login failed:', response.error || 'Unknown error');
          reject(new Error(response.error));
        }
      } catch (e) {
        console.log('❌ Invalid JSON response:', stdout);
        reject(e);
      }
    });
  });
}

// Test 2: Access protected resource with session
async function testProtectedAccess() {
  console.log('\n📝 Test 2: Access protected resource with session');
  
  return new Promise((resolve, reject) => {
    const command = `curl -s -X GET -b cookies.txt "${BASE_URL}/api/trips"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Protected access test failed:', error.message);
        reject(error);
        return;
      }
      
      try {
        const response = JSON.parse(stdout);
        if (response.error && response.error === 'Authentication required') {
          console.log('❌ Still getting authentication error despite login');
          reject(new Error('Authentication not working'));
        } else {
          console.log('✅ Protected resource accessible');
          console.log('   Response type:', Array.isArray(response) ? 'array' : typeof response);
          resolve(response);
        }
      } catch (e) {
        console.log('❌ Invalid JSON response:', stdout);
        reject(e);
      }
    });
  });
}

// Test 3: Access without session (should fail)
async function testUnauthorizedAccess() {
  console.log('\n📝 Test 3: Access without session (should fail)');
  
  return new Promise((resolve, reject) => {
    const command = `curl -s -X GET "${BASE_URL}/api/trips"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Unauthorized access test failed:', error.message);
        reject(error);
        return;
      }
      
      try {
        const response = JSON.parse(stdout);
        if (response.error === 'Authentication required') {
          console.log('✅ Unauthorized access properly blocked');
          resolve(response);
        } else {
          console.log('❌ Unauthorized access not blocked');
          console.log('   Response:', response);
          reject(new Error('Security issue: unauthorized access allowed'));
        }
      } catch (e) {
        console.log('❌ Invalid JSON response:', stdout);
        reject(e);
      }
    });
  });
}

// Test 4: Get current user info
async function testCurrentUser() {
  console.log('\n📝 Test 4: Get current user info');
  
  return new Promise((resolve, reject) => {
    const command = `curl -s -X GET -b cookies.txt "${BASE_URL}/api/auth/me"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Current user test failed:', error.message);
        reject(error);
        return;
      }
      
      try {
        const response = JSON.parse(stdout);
        if (response.user) {
          console.log('✅ Current user info retrieved');
          console.log('   Email:', response.user.email);
          console.log('   Role:', response.user.role);
          console.log('   Organization ID:', response.user.organizationId);
          resolve(response);
        } else {
          console.log('❌ Current user info failed:', response.error || 'Unknown error');
          reject(new Error(response.error));
        }
      } catch (e) {
        console.log('❌ Invalid JSON response:', stdout);
        reject(e);
      }
    });
  });
}

// Run all tests
async function runTests() {
  try {
    await testLogin();
    await testProtectedAccess();
    await testUnauthorizedAccess();
    await testCurrentUser();
    
    console.log('\n🎉 All authentication tests passed!');
    
    // Cleanup
    if (fs.existsSync('cookies.txt')) {
      fs.unlinkSync('cookies.txt');
    }
    
  } catch (error) {
    console.log('\n💥 Test suite failed:', error.message);
    
    // Cleanup
    if (fs.existsSync('cookies.txt')) {
      fs.unlinkSync('cookies.txt');
    }
    
    process.exit(1);
  }
}

runTests();