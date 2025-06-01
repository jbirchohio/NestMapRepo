// Quick script to hash password for JonasCo owner account
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 12000, 64, 'sha512');
  return `${salt}:${hash.toString('hex')}`;
}

const hashedPassword = hashPassword('nestmap2025');
console.log('Hashed password:', hashedPassword);