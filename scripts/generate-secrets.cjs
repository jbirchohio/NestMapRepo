const crypto = require('crypto');

/**
 * Generate secure secrets for VoyageOps production deployment
 */
function generateSecrets() {
  console.log('🔐 Generating secure secrets for VoyageOps...\n');
  
  // Generate cryptographically secure random strings
  const jwtSecret = crypto.randomBytes(64).toString('hex');
  const sessionSecret = crypto.randomBytes(64).toString('hex');
  
  console.log('Copy these values to your .env file:\n');
  console.log('# Generated secure secrets');
  console.log(`JWT_SECRET=${jwtSecret}`);
  console.log(`SESSION_SECRET=${sessionSecret}`);
  
  console.log('\n🔒 Secrets generated successfully!');
  console.log('⚠️  IMPORTANT: Store these secrets securely and never commit them to version control.');
  
  // Optional: Generate API keys for demo purposes
  console.log('\n📝 Additional demo values (replace with real ones):');
  console.log(`DEMO_DATABASE_URL=postgresql://user:${crypto.randomBytes(16).toString('hex')}@localhost:5432/voyageops`);
  console.log(`DEMO_ADMIN_PASSWORD=${crypto.randomBytes(8).toString('hex').toUpperCase()}`);
}

if (require.main === module) {
  generateSecrets();
}

module.exports = { generateSecrets };