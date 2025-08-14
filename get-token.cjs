const { Client } = require('pg');
require('dotenv').config();

async function getToken() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Get a user
    const result = await client.query(`
      SELECT id, email FROM users LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log(`User: ${user.email}`);
      console.log(`ID: ${user.id}`);
      
      // Generate a simple token for testing (not secure, just for testing)
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      console.log(`\nToken: ${token}`);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

getToken();
