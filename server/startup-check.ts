/**
 * Startup environment check for debugging deployment issues
 */

const criticalVars = [
  'NODE_ENV',
  'DATABASE_URL',
  'SESSION_SECRET', 
  'JWT_SECRET',
  'CORS_ORIGIN',
  'PORT'
];

// Export a function that can be called from index.ts
export function performStartupCheck() {
  // Return summary for use in the app
  return {
    platform: process.env.RAILWAY_ENVIRONMENT ? 'railway' : 'unknown',
    hasRequiredVars: criticalVars.every(v => !!process.env[v]),
    missingVars: criticalVars.filter(v => !process.env[v])
  };
}