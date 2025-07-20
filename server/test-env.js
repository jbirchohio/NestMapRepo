import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Current directory:', process.cwd());
console.log('Script directory:', __dirname);

const possiblePaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.join(__dirname, '..', '.env'),
  'C:\\Users\\Jonas\\Desktop\\NestMapRepo\\.env'
];

console.log('\nChecking paths:');
possiblePaths.forEach(envPath => {
  const exists = fs.existsSync(envPath);
  console.log(`${envPath}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  if (exists) {
    console.log('Loading from:', envPath);
    dotenv.config({ path: envPath });
    console.log('SUPABASE_URL after load:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
  }
});
