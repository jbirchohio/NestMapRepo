// Simple password verification test without database
import crypto from 'crypto';

const SALT_ROUNDS = 12;

function verifyPassword(password, hashedPassword) {
  try {
    const [salt, hash] = hashedPassword.split(':');
    if (!salt || !hash) return false;
    
    const verifyHash = crypto.pbkdf2Sync(password, salt, SALT_ROUNDS * 1000, 64, 'sha512');
    return hash === verifyHash.toString('hex');
  } catch (error) {
    console.error('Password verification error:', error.message);
    return false;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, SALT_ROUNDS * 1000, 64, 'sha512');
  return `${salt}:${hash.toString('hex')}`;
}

// Test with your specific hash
const testPassword = 'OopsieDoodle1!';
const yourHash = '722cbc1eb2d6eac99c7a22ba3110f8d1:ecc432658ee9582814ec56fbe132832cc809b9b51823c521c74d4d0800d5a4012a9efbe0953a5f966949268a2579c634d9966b2281c2cefbc21e9ef6d8ff92bb';

console.log('🔍 Testing password verification...');
console.log('Password:', testPassword);
console.log('Hash:', yourHash.substring(0, 50) + '...');

const isValid = verifyPassword(testPassword, yourHash);
console.log('✅ Password verification result:', isValid);

// Test creating a new hash for comparison
const newHash = hashPassword(testPassword);
console.log('🆕 New hash for same password:', newHash.substring(0, 50) + '...');

// Test if new hash works
const newHashValid = verifyPassword(testPassword, newHash);
console.log('✅ New hash verification:', newHashValid);