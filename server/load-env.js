// Simple CommonJS module to load environment variables
const dotenv = require('dotenv');
const path = require('path');

// Load .env file from project root
const envPath = path.resolve(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.log('ℹ️  Could not load .env file:', result.error.message);
} else {
  console.log('✅ Loaded .env file for development');
}

module.exports = {};