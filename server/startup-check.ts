/**
 * Startup environment check for debugging deployment issues
 */

console.log('\n🚀 === STARTUP ENVIRONMENT CHECK ===');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🖥️  Platform: ${process.platform}`);
console.log(`🔧 Node Version: ${process.version}`);
console.log(`📦 NPM Version: ${process.env.npm_version || 'unknown'}`);

// Check deployment platform
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('\n🚂 RAILWAY DEPLOYMENT DETECTED');
  console.log(`  Environment: ${process.env.RAILWAY_ENVIRONMENT}`);
  console.log(`  Project ID: ${process.env.RAILWAY_PROJECT_ID}`);
  console.log(`  Service ID: ${process.env.RAILWAY_SERVICE_ID}`);
  console.log(`  Region: ${process.env.RAILWAY_REGION}`);
}

// Check critical environment variables
console.log('\n🔐 CRITICAL ENVIRONMENT VARIABLES:');
const criticalVars = [
  'NODE_ENV',
  'DATABASE_URL',
  'SESSION_SECRET', 
  'JWT_SECRET',
  'CORS_ORIGIN',
  'PORT'
];

criticalVars.forEach(varName => {
  const exists = !!process.env[varName];
  const value = process.env[varName];
  
  if (varName === 'DATABASE_URL' || varName === 'SESSION_SECRET' || varName === 'JWT_SECRET') {
    // Don't log sensitive values, just check existence
    console.log(`  ${varName}: ${exists ? '✅ SET' : '❌ MISSING'}`);
  } else {
    console.log(`  ${varName}: ${exists ? `✅ ${value}` : '❌ MISSING'}`);
  }
});

// List all environment variables (excluding sensitive ones)
console.log('\n📋 ALL ENVIRONMENT VARIABLES:');
const allEnvVars = Object.keys(process.env).sort();
console.log(`  Total count: ${allEnvVars.length}`);
console.log('  Variables:', allEnvVars
  .filter(key => !key.includes('SECRET') && !key.includes('KEY') && !key.includes('PASSWORD') && !key.includes('DATABASE_URL'))
  .join(', ')
);

// Export a function that can be called from index.ts
export function performStartupCheck() {
  console.log('\n✅ Startup check completed');
  
  // Return summary for use in the app
  return {
    platform: process.env.RAILWAY_ENVIRONMENT ? 'railway' : 'unknown',
    hasRequiredVars: criticalVars.every(v => !!process.env[v]),
    missingVars: criticalVars.filter(v => !process.env[v])
  };
}