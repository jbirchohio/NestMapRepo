#!/usr/bin/env tsx

import { config } from 'dotenv';
config();

import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function fixSuperadminRole() {
  try {
    console.log('🔧 Fixing superadmin role...');
    
    // Update the role for jbirchohio@gmail.com
    const result = await db
      .update(users)
      .set({ role: 'super_admin' })
      .where(eq(users.email, 'jbirchohio@gmail.com'))
      .returning();
    
    if (result.length > 0) {
      console.log('✅ Updated user role to super_admin');
      console.log('User details:', {
        id: result[0].id,
        email: result[0].email,
        username: result[0].username,
        role: result[0].role
      });
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

fixSuperadminRole();