const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    // Load environment
    require('dotenv').config();
    
    // Import database connection
    const { db } = require('./server/db-connection');
    const { users } = require('./shared/schema');
    const { eq } = require('drizzle-orm');
    
    // Check if test user exists
    const existingUser = await db.select().from(users).where(eq(users.email, 'test@example.com'));
    
    if (existingUser.length > 0) {
      console.log('Test user already exists');
      return;
    }
    
    // Create test user
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const [newUser] = await db.insert(users).values({
      email: 'test@example.com',
      password_hash: hashedPassword,
      display_name: 'Test User',
      auth_id: 'test_' + Date.now()
    }).returning();
    
    console.log('✅ Test user created:', newUser.email);
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    process.exit(0);
  }
}

createTestUser();