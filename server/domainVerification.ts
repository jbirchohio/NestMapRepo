import * as dns from 'dns';
import { promisify } from 'util';
import crypto from 'crypto';
import https from 'https';

const resolveTxt = promisify(dns.resolveTxt);

export interface DomainVerificationResult {
  verified: boolean;
  error?: string;
  records?: string[];
}

export interface SSLVerificationResult {
  verified: boolean;
  expiresAt?: Date;
  issuer?: string;
  error?: string;
}

/**
 * Generate a verification token for domain ownership
 */
export function generateVerificationToken(domain: string, organizationId: number): string {
  const data = `${domain}-${organizationId}-${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Verify domain ownership through DNS TXT record
 */
export async function verifyDomainOwnership(
  domain: string, 
  expectedToken: string
): Promise<DomainVerificationResult> {
  try {
    // Check for TXT record: remvana-verification=<token>
    const txtRecords = await resolveTxt(`_remvana-verification.${domain}`);
    
    const flatRecords = txtRecords.flat();
    const verificationRecord = flatRecords.find((record: string) => 
      record.includes(`remvana-verification=${expectedToken}`)
    );
    
    if (verificationRecord) {
      return {
        verified: true,
        records: flatRecords
      };
    }
    
    return {
      verified: false,
      error: `Verification record not found. Expected: _remvana-verification.${domain} TXT "remvana-verification=${expectedToken}"`,
      records: flatRecords
    };
  } catch (error) {
    return {
      verified: false,
      error: `DNS lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      records: []
    };
  }
}

/**
 * Check SSL certificate validity for a domain
 */
export async function verifySSLCertificate(domain: string): Promise<SSLVerificationResult> {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      method: 'HEAD',
      timeout: 10000,
      rejectUnauthorized: true
    };

    const req = https.request(options, (res) => {
      const cert = (res.socket as any)?.getPeerCertificate?.();
      
      if (cert && cert.valid_to) {
        const expiresAt = new Date(cert.valid_to);
        const now = new Date();
        
        if (expiresAt > now) {
          resolve({
            verified: true,
            expiresAt,
            issuer: cert.issuer?.CN || 'Unknown'
          });
        } else {
          resolve({
            verified: false,
            error: 'SSL certificate has expired',
            expiresAt
          });
        }
      } else {
        resolve({
          verified: false,
          error: 'No valid SSL certificate found'
        });
      }
    });

    req.on('error', (error) => {
      resolve({
        verified: false,
        error: `SSL verification failed: ${error.message}`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        verified: false,
        error: 'SSL verification timeout'
      });
    });

    req.end();
  });
}

/**
 * Generate Let's Encrypt ACME challenge for domain
 */
export async function generateACMEChallenge(domain: string): Promise<{
  token: string;
  keyAuthorization: string;
  challengeUrl: string;
}> {
  // Generate ACME challenge token
  const token = crypto.randomBytes(32).toString('base64url');
  
  // In production, this would involve proper ACME protocol
  // For now, we'll generate the expected response
  const keyAuthorization = crypto
    .createHash('sha256')
    .update(`${token}.${domain}`)
    .digest('base64url');
  
  return {
    token,
    keyAuthorization,
    challengeUrl: `http://${domain}/.well-known/acme-challenge/${token}`
  };
}

/**
 * Verify ACME challenge response
 */
export async function verifyACMEChallenge(
  domain: string, 
  token: string, 
  expectedResponse: string
): Promise<boolean> {
  try {
    const challengeUrl = `http://${domain}/.well-known/acme-challenge/${token}`;
    
    const response = await fetch(challengeUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      return false;
    }
    
    const actualResponse = await response.text();
    return actualResponse.trim() === expectedResponse.trim();
  } catch (error) {
    console.error('ACME challenge verification failed:', error);
    return false;
  }
}

/**
 * Get domain verification instructions for users
 */
export function getDomainVerificationInstructions(
  domain: string, 
  verificationToken: string
): {
  dnsRecord: { name: string; type: string; value: string };
  instructions: string[];
} {
  return {
    dnsRecord: {
      name: `_remvana-verification.${domain}`,
      type: 'TXT',
      value: `remvana-verification=${verificationToken}`
    },
    instructions: [
      `Add a TXT record to your domain's DNS settings:`,
      `Name: _remvana-verification.${domain}`,
      `Type: TXT`,
      `Value: remvana-verification=${verificationToken}`,
      ``,
      `Wait 5-10 minutes for DNS propagation, then click 'Verify Domain'`,
      ``,
      `For subdomain setup, also add a CNAME record:`,
      `Name: ${domain.split('.')[0]}`,
      `Type: CNAME`, 
      `Value: domains.remvana.com`
    ]
  };
}

/**
 * Check if domain is reachable and responding
 */
export async function checkDomainReachability(domain: string): Promise<{
  reachable: boolean;
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(15000),
      redirect: 'manual'
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      reachable: true,
      responseTime
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}