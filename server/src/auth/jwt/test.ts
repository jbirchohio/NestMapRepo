import { generateToken, verifyToken, generateTokenPair } from './index.js';

async function testJWT() {
  try {
    console.log('Testing JWT functionality...');
    
    // Test token generation
    const token = await generateToken({
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'member',
      type: 'access',
      key: 'test-user-id',
    });
    
    console.log('✅ Token generated successfully');
    
    // Test token verification
    const result = await verifyToken(token, 'access');
    
    if (result.valid && result.payload) {
      console.log('✅ Token verified successfully');
      console.log('Payload:', result.payload);
    } else {
      console.log('❌ Token verification failed:', result.error);
    }
    
    // Test token pair generation
    const tokenPair = await generateTokenPair(
      'test-user-id',
      'test@example.com',
      'member'
    );
    
    console.log('✅ Token pair generated successfully');
    console.log('Access token expires in:', tokenPair.expiresIn, 'seconds');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testJWT();

