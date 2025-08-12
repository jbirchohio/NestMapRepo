#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Checks that all required environment variables are set
 * Run: node validate-env.js
 */

// Define all required environment variables
const requiredVars = {
  // Backend runtime variables
  backend: [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    'CORS_ORIGIN',
    'NODE_ENV',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'OPENAI_API_KEY',
    'VIATOR_API_KEY',
    'SENDGRID_API_KEY',
    'DUFFEL_API_KEY'
  ],
  
  // Frontend build-time variables
  frontend: [
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'VITE_MAPBOX_TOKEN',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_API_URL',
    'VITE_BASE_URL'
  ]
};

// Optional variables
const optionalVars = [
  'PORT',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_BASE_URL',
  'DUFFEL_API_KEY',
  'SENDGRID_API_KEY'
];

function validateEnvironment() {
  console.log('\n🔍 Validating Environment Variables...\n');
  
  let hasErrors = false;
  const warnings = [];
  
  // Check backend variables
  console.log('Backend Variables:');
  requiredVars.backend.forEach(varName => {
    const value = process.env[varName];
    const isOptional = optionalVars.includes(varName);
    
    if (!value) {
      if (isOptional) {
        console.log(`  ⚠ ${varName}: Not set (optional)`);
        warnings.push(varName);
      } else {
        console.log(`  ✗ ${varName}: Missing`);
        hasErrors = true;
      }
    } else if (value === 'undefined' || value === 'null' || value === '') {
      console.log(`  ✗ ${varName}: Invalid value "${value}"`);
      hasErrors = true;
    } else {
      // Mask sensitive values
      let displayValue = value;
      if (varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD')) {
        displayValue = value.substring(0, 4) + '****' + value.substring(value.length - 4);
      } else if (varName === 'DATABASE_URL') {
        displayValue = value.replace(/:[^:@]+@/, ':****@');
      }
      console.log(`  ✓ ${varName}: ${displayValue}`);
    }
  });
  
  // Check frontend variables
  console.log('\nFrontend Variables (Build-time):');
  requiredVars.frontend.forEach(varName => {
    const value = process.env[varName];
    const isOptional = optionalVars.includes(varName);
    
    if (!value) {
      if (isOptional) {
        console.log(`  ⚠ ${varName}: Not set (optional)`);
        warnings.push(varName);
      } else {
        console.log(`  ✗ ${varName}: Missing`);
        hasErrors = true;
      }
    } else if (value === 'undefined' || value === 'null' || value === '') {
      console.log(`  ✗ ${varName}: Invalid value "${value}"`);
      hasErrors = true;
    } else {
      // Mask sensitive values
      let displayValue = value;
      if (varName.includes('KEY')) {
        displayValue = value.substring(0, 8) + '****' + value.substring(value.length - 4);
      }
      console.log(`  ✓ ${varName}: ${displayValue}`);
    }
  });
  
  // Check for Stripe key consistency
  console.log('\nStripe Configuration Check:');
  const stripePub = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const stripeSec = process.env.STRIPE_SECRET_KEY;
  
  if (stripePub && stripeSec) {
    const pubMode = stripePub.startsWith('pk_test_') ? 'TEST' : 'LIVE';
    const secMode = stripeSec.startsWith('sk_test_') ? 'TEST' : 'LIVE';
    
    if (pubMode !== secMode) {
      console.log(`  ✗ Stripe key mismatch: Publishable is ${pubMode}, Secret is ${secMode}`);
      hasErrors = true;
    } else {
      console.log(`  ✓ Stripe keys are both in ${pubMode} mode`);
    }
  }
  
  // Check NODE_ENV
  console.log('\nEnvironment Mode:');
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    console.log(`  ✓ Running in PRODUCTION mode`);
  } else if (nodeEnv === 'development') {
    console.log(`  ℹ Running in DEVELOPMENT mode`);
  } else {
    console.log(`  ⚠ NODE_ENV is "${nodeEnv}" (expected "production" or "development")`);
  }
  
  // Summary
  console.log('\n📊 Summary:');
  if (hasErrors) {
    console.log('  ✗ Environment validation failed');
    console.log('  Please set all required environment variables');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`  ⚠ Validation passed with ${warnings.length} warnings`);
    console.log('  Some optional features may not work');
  } else {
    console.log('  ✓ All environment variables are properly configured');
  }
  
  // Railway-specific tips
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('\n🚂 Railway Deployment Tips:');
    console.log('  1. Ensure all VITE_ variables are set in Railway dashboard');
    console.log('  2. Redeploy after changing environment variables');
    console.log('  3. Check build logs to confirm variables are passed to Docker');
  }
  
  console.log('\n');
}

// Run validation
validateEnvironment();