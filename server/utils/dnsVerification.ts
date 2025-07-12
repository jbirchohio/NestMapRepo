import dns from 'dns.js';
import { promisify } from 'util.js';
import crypto from 'crypto.js';

// Promisify DNS lookup functions
const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

/**
 * Generate a verification token for DNS verification
 * @returns {string} Random verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Verify domain ownership via DNS TXT record
 * @param domain Domain to verify
 * @param token Verification token
 * @returns {Promise<boolean>} Whether verification succeeded
 */
export async function verifyDomainViaTxt(domain: string, token: string): Promise<boolean> {
  try {
    // Look for TXT record at _nestmap-verification.domain.com
    const verificationDomain = `_nestmap-verification.${domain}`;
    const records = await resolveTxt(verificationDomain);
    
    // Check if any TXT record matches our token
    return records.some(record => record.includes(token));
  } catch (error) {
    console.error(`DNS TXT verification failed for ${domain}:`, error);
    return false;
  }
}

/**
 * Verify domain CNAME setup
 * @param domain Domain to verify
 * @param subdomain Subdomain to check
 * @returns {Promise<boolean>} Whether CNAME is correctly set up
 */
export async function verifyCnameSetup(domain: string, subdomain: string = 'www'): Promise<boolean> {
  try {
    // Check if CNAME points to our service
    const cnameTarget = `${subdomain}.${domain}`;
    const cnameValue = await resolveCname(cnameTarget);
    
    // Verify CNAME points to our service
    return cnameValue.some(cname => 
      cname.includes('nestmap.com') || 
      cname.includes('nestmap-prod.com')
    );
  } catch (error) {
    console.error(`DNS CNAME verification failed for ${subdomain}.${domain}:`, error);
    return false;
  }
}

/**
 * Generate DNS verification instructions
 * @param domain Domain being verified
 * @param token Verification token
 * @returns {Object} DNS setup instructions
 */
export function generateDnsInstructions(domain: string, token: string): {
  txtRecord: { name: string; value: string; };
  cnameRecord: { name: string; value: string; };
} {
  return {
    txtRecord: {
      name: `_nestmap-verification.${domain}`,
      value: `nestmap-verification=${token}`
    },
    cnameRecord: {
      name: `www.${domain}`,
      value: 'custom.nestmap.com'
    }
  };
}

/**
 * Complete domain verification process
 * @param domain Domain to verify
 * @param token Verification token
 * @returns {Promise<{success: boolean; txtVerified: boolean; cnameVerified: boolean}>} Verification results
 */
export async function completeVerification(domain: string, token: string): Promise<{
  success: boolean;
  txtVerified: boolean;
  cnameVerified: boolean;
}> {
  // Verify TXT record for ownership
  const txtVerified = await verifyDomainViaTxt(domain, token);
  
  // Verify CNAME setup
  const cnameVerified = await verifyCnameSetup(domain);
  
  // Both checks must pass for complete verification
  const success = txtVerified && cnameVerified;
  
  return {
    success,
    txtVerified,
    cnameVerified
  };
}
