import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

console.log('🔍 ES Module Debug Test Starting...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);

// Try multiple possible paths for .env file
const possibleEnvPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.join(__dirname, '..', '.env'),
  'C:\\Users\\Jonas\\Desktop\\NestMapRepo\\.env'
];

console.log('\n🔍 Checking for .env file in the following paths:');
let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  console.log(`   ${envPath}: ${fs.existsSync(envPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  if (fs.existsSync(envPath)) {
    console.log(`📁 Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    console.log(`✅ Environment loaded. SUPABASE_URL is now: ${process.env.SUPABASE_URL ? 'SET' : 'NOT SET'}`);
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env file found in any of the expected locations');
}

console.log('\n📊 Environment Variables Check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

console.log('\n✅ Debug test completed');
