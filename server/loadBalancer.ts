import { Request, Response, NextFunction } from 'express';
import { db } from './db-connection';
import { customDomains, organizations, whiteLabelSettings } from "./db/schema";
import { eq, and } from 'drizzle-orm';

export interface DomainConfig {
  domain: string;
  organizationId: number;
  ssl_verified: boolean;
  status: string;
  branding: {
    companyName: string;
    companyLogo?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    customDomain?: string;
    supportEmail?: string;
    helpUrl?: string;
    footerText?: string;
  } | null;
}

/**
 * Load balancer middleware for handling custom domains
 */
export async function domainRoutingMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const host = req.get('host');
    
    if (!host) {
      return next();
    }

    // Skip routing for default domain or localhost
    if (host.includes('localhost') || host.includes('nestmap.com') || host.includes('replit.dev') || host.includes('replit.app')) {
      return next();
    }

    // Look up custom domain configuration
    const domainConfig = await getDomainConfig(host);
    
    if (!domainConfig) {
      return res.status(404).json({ 
        error: 'Domain not found',
        message: 'This domain is not configured for white label hosting'
      });
    }

    if (domainConfig.status !== 'active') {
      return res.status(503).json({
        error: 'Domain not active',
        message: 'This domain is currently being configured. Please try again later.'
      });
    }

    // Inject domain context into request
    (req as any).domainConfig = domainConfig;
    (req as any).isWhiteLabel = true;
    (req as any).domainOrganizationId = domainConfig.organizationId;
    (req as any).isWhiteLabelDomain = true;

    // Add white label headers for frontend
    res.setHeader('X-White-Label-Domain', domainConfig.domain);
    res.setHeader('X-Organization-ID', domainConfig.organizationId.toString());
    
    if (domainConfig.branding) {
      res.setHeader('X-White-Label-Config', JSON.stringify(domainConfig.branding));
    }

    next();
  } catch (error) {
    console.error('Domain routing error:', error);
    next();
  }
}

/**
 * Get domain configuration including branding settings
 */
async function getDomainConfig(domain: string): Promise<DomainConfig | null> {
  try {
    // Graceful fallback for database schema migration
    const result = await db
      .select({
        domain: customDomains.domainName,
        organizationId: customDomains.organizationId,
        dns_verified: customDomains.sslEnabled,
        status: customDomains.status,
        companyName: whiteLabelSettings.companyName,
        companyLogo: whiteLabelSettings.companyLogo,
        primaryColor: whiteLabelSettings.primaryColor,
        secondaryColor: whiteLabelSettings.secondaryColor,
        accentColor: whiteLabelSettings.accentColor,
        customDomain: whiteLabelSettings.customDomain,
        supportEmail: whiteLabelSettings.supportEmail,
        helpUrl: whiteLabelSettings.helpUrl,
        footerText: whiteLabelSettings.footerText,
      })
      .from(customDomains)
      .leftJoin(
        whiteLabelSettings,
        eq(customDomains.organizationId, whiteLabelSettings.organizationId)
      )
      .where(eq(customDomains.domainName, domain))
      .limit(1);

    if (!result.length) {
      return null;
    }

    const row = result[0];
    
    return {
      domain: row.domain,
      organizationId: row.organizationId,
      ssl_verified: row.dns_verified || false, // Use dns_verified as fallback
      status: row.status || 'pending',
      branding: row.companyName ? {
        companyName: row.companyName,
        companyLogo: row.companyLogo || undefined,
        primaryColor: row.primaryColor || '#3B82F6',
        secondaryColor: row.secondaryColor || '#64748B',
        accentColor: row.accentColor || '#10B981',
        customDomain: row.customDomain || undefined,
        supportEmail: row.supportEmail || undefined,
        helpUrl: row.helpUrl || undefined,
        footerText: row.footerText || undefined,
      } : null
    };
  } catch (error) {
    console.error('Error getting domain config:', error);
    return null;
  }
}

/**
 * Cloudflare DNS management for automated domain setup
 */
export class CloudflareDNSManager {
  private apiToken: string;
  private zoneId: string;

  constructor(apiToken: string, zoneId: string) {
    this.apiToken = apiToken;
    this.zoneId = zoneId;
  }

  /**
   * Create CNAME record for custom domain
   */
  async createCNAMERecord(subdomain: string, target: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/dns_records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'CNAME',
            name: subdomain,
            content: target,
            ttl: 300,
          }),
        }
      );

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Cloudflare DNS error:', error);
      return false;
    }
  }

  /**
   * Verify domain ownership through DNS TXT record
   */
  async verifyTXTRecord(domain: string, expectedValue: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/dns_records?type=TXT&name=_nestmap-verification.${domain}`
      );

      const result = await response.json();
      
      if (result.success && result.result.length > 0) {
        return result.result.some((record: any) => 
          record.content.includes(expectedValue)
        );
      }

      return false;
    } catch (error) {
      console.error('DNS verification error:', error);
      return false;
    }
  }
}

/**
 * Nginx configuration generator for reverse proxy
 */
export function generateNginxConfig(domains: DomainConfig[]): string {
  let config = `
# Auto-generated Nginx configuration for white label domains
# Generated at: ${new Date().toISOString()}

# Main server block for default domain
server {
    listen 80;
    listen 443 ssl http2;
    server_name nestmap.com *.nestmap.com;
    
    # SSL configuration for main domain
    ssl_certificate /etc/ssl/certs/nestmap.com.pem;
    ssl_certificate_key /etc/ssl/private/nestmap.com.key;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

`;

  // Generate configuration for each custom domain
  domains.forEach(domain => {
    if (domain.status === 'active') {
      config += `
# White label domain: ${domain.domain}
server {
    listen 80;
    listen 443 ssl http2;
    server_name ${domain.domain};
    
    # SSL configuration
    ssl_certificate /etc/ssl/certs/${domain.domain}.pem;
    ssl_certificate_key /etc/ssl/private/${domain.domain}.key;
    
    # White label headers
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-White-Label-Domain ${domain.domain};
        proxy_set_header X-Organization-ID ${domain.organizationId};
    }
}

`;
    }
  });

  return config;
}

/**
 * Update load balancer configuration
 */
export async function updateLoadBalancerConfig(): Promise<void> {
  try {
    // Get all active domains
    const domains = await db
      .select({
        domain: customDomains.domainName,
        organizationId: customDomains.organizationId,
        ssl_verified: customDomains.sslEnabled,
        status: customDomains.status,
      })
      .from(customDomains)
      .where(eq(customDomains.status, 'active'));

    const domainConfigs: DomainConfig[] = domains.map(d => ({
      domain: d.domain,
      organizationId: d.organizationId,
      ssl_verified: d.ssl_verified || false,
      status: d.status || 'pending',
      branding: null
    }));

    // Generate Nginx configuration
    const nginxConfig = generateNginxConfig(domainConfigs);
    
    // In production, write this to Nginx sites-available and reload
    console.log('Generated Nginx config:', nginxConfig);
    
    // Update CDN/proxy service configuration
    await updateCDNConfiguration(domainConfigs);
    
  } catch (error) {
    console.error('Error updating load balancer config:', error);
  }
}

/**
 * Update CDN configuration for custom domains
 */
async function updateCDNConfiguration(domains: DomainConfig[]): Promise<void> {
  // In production, update Cloudflare/AWS CloudFront configuration
  console.log('Updating CDN configuration for domains:', domains.map(d => d.domain));
  
  // Example Cloudflare Workers configuration
  const workerScript = `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const hostname = url.hostname
  
  // Domain routing logic
  const domainConfigs = ${JSON.stringify(domains)}
  const config = domainConfigs.find(d => d.domain === hostname)
  
  if (config) {
    // Forward to origin with white label headers
    const modifiedRequest = new Request(request)
    modifiedRequest.headers.set('X-White-Label-Domain', hostname)
    modifiedRequest.headers.set('X-Organization-ID', config.organization_id.toString())
    
    return fetch('https://origin.nestmap.com', modifiedRequest)
  }
  
  return new Response('Domain not found', { status: 404 })
}
`;

  console.log('Generated Cloudflare Worker script for domain routing');
}