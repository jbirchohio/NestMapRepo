const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
require('dotenv').config();

async function testWeekendGen() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Get user for trip 121
    const result = await client.query(`
      SELECT u.id, u.email 
      FROM users u
      JOIN trips t ON t.user_id = u.id
      WHERE t.id = 121
    `);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      console.log('Calling /api/ai/generate-weekend endpoint...');
      console.log('This will fetch REAL places from OpenStreetMap...\n');
      
      // Call the endpoint
      const response = await fetch('http://localhost:5000/api/ai/generate-weekend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          trip_id: 121,
          destination: 'Sigmaringen, Germany',
          duration: 3
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Response:', JSON.stringify(data, null, 2));
      } else {
        console.error('Error:', data);
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

testWeekendGen();
