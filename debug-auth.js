import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve('.env') });

// Set DATABASE_URL explicitly for debugging
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://neondb_owner:npg_heyosY71KqiV@ep-lingering-pine-aez2izws-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";
}

console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);

import { db } from './server/db.ts';
import { users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from './server/auth.ts';

async function debugAuth() {
  try {
    console.log('🔍 Debugging authentication...');
    
    // Check if user exists
    const userResults = await db.select().from(users).where(eq(users.email, 'jbirchohio@gmail.com'));
    console.log('User found:', userResults.length > 0);
    
    if (userResults.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    const user = userResults[0];
    console.log('User details:', {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      hasPasswordHash: !!user.password_hash,
      passwordHashLength: user.password_hash?.length || 0
    });
    
    // Test password verification with your specific hash
    const testPassword = 'OopsieDoodle1!';
    const yourHash = '722cbc1eb2d6eac99c7a22ba3110f8d1:ecc432658ee9582814ec56fbe132832cc809b9b51823c521c74d4d0800d5a4012a9efbe0953a5f966949268a2579c634d9966b2281c2cefbc21e9ef6d8ff92bb';
    
    console.log('Testing password:', testPassword);
    console.log('Your provided hash:', yourHash);
    
    if (user.password_hash) {
      console.log('Stored hash:', user.password_hash);
      console.log('Hashes match:', user.password_hash === yourHash);
      
      const isValid = verifyPassword(testPassword, user.password_hash);
      console.log('Password verification result:', isValid);
      
      // Also test with your provided hash directly
      const isValidYourHash = verifyPassword(testPassword, yourHash);
      console.log('Your hash verification result:', isValidYourHash);
      
      // Test hashing a new password to compare format
      const newHash = hashPassword(testPassword);
      console.log('New hash format sample:', newHash.substring(0, 50) + '...');
    } else {
      console.log('❌ No password hash stored for user');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

debugAuth();