// Emergency rate limit reset utility
import { clearViolations } from '../middleware/comprehensive-rate-limiting.js';
// Clear violations for the current IP
const currentIP = '172.31.128.58';
const key = `tier:free:none:${currentIP}`;
console.log('Clearing rate limit violations for key:', key);
clearViolations(key);
console.log('Rate limit violations cleared successfully');
