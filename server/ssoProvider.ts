import { Router } from 'express';
import { db } from './db';
import { users, organizations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { auditLogger } from './auditLogger';

export interface SSOConfig {
  organizationId: number;
  provider: 'saml' | 'oauth' | 'oidc';
  entityId: string;
  ssoUrl: string;
  certificate: string;
  attributeMapping: {
    email: string;
    firstName: string;
    lastName: string;
    groups?: string;
    department?: string;
  };
  enabled: boolean;
}

export interface SSOUser {
  email: string;
  firstName: string;
  lastName: string;
  groups?: string[];
  department?: string;
  organizationDomain: string;
}

export class SSOManager {
  private configs: Map<number, SSOConfig> = new Map();

  /**
   * Configure SSO for an organization
   */
  async configureSSOForOrganization(organizationId: number, config: Omit<SSOConfig, 'organizationId'>): Promise<void> {
    const ssoConfig: SSOConfig = {
      ...config,
      organizationId
    };

    this.configs.set(organizationId, ssoConfig);

    // In production, store in database
    await auditLogger.log({
      userId: 0, // System user
      action: 'sso_configured',
      targetType: 'organization',
      targetId: organizationId.toString(),
      details: { provider: config.provider, entityId: config.entityId }
    });
  }

  /**
   * Process SAML response
   */
  async processSAMLResponse(samlResponse: string, relayState?: string): Promise<{ user: SSOUser; organizationId: number } | null> {
    try {
      // Parse SAML response (in production, use a proper SAML library like node-saml)
      const parsedResponse = this.parseSAMLResponse(samlResponse);
      
      if (!parsedResponse.isValid) {
        throw new Error('Invalid SAML response');
      }

      const organizationId = await this.getOrganizationFromEntityId(parsedResponse.entityId);
      const config = this.configs.get(organizationId);
      
      if (!config || !config.enabled) {
        throw new Error('SSO not configured for organization');
      }

      const user: SSOUser = {
        email: parsedResponse.attributes[config.attributeMapping.email],
        firstName: parsedResponse.attributes[config.attributeMapping.firstName],
        lastName: parsedResponse.attributes[config.attributeMapping.lastName],
        groups: config.attributeMapping.groups ? parsedResponse.attributes[config.attributeMapping.groups]?.split(',') : [],
        department: config.attributeMapping.department ? parsedResponse.attributes[config.attributeMapping.department] : undefined,
        organizationDomain: parsedResponse.entityId
      };

      await auditLogger.log({
        userId: 0, // Will be set after user lookup
        action: 'sso_login_success',
        targetType: 'organization',
        targetId: organizationId.toString(),
        details: { provider: 'saml', entityId: parsedResponse.entityId }
      });

      return { user, organizationId };
    } catch (error) {
      console.error('SAML processing error:', error);
      return null;
    }
  }

  /**
   * Process OAuth/OIDC callback
   */
  async processOAuthCallback(code: string, state: string): Promise<{ user: SSOUser; organizationId: number } | null> {
    try {
      // Exchange code for token (implementation depends on OAuth provider)
      const tokenData = await this.exchangeOAuthCode(code, state);
      const userInfo = await this.getOAuthUserInfo(tokenData.accessToken);
      
      const organizationId = await this.getOrganizationFromState(state);
      const config = this.configs.get(organizationId);
      
      if (!config || !config.enabled) {
        throw new Error('SSO not configured for organization');
      }

      const user: SSOUser = {
        email: userInfo.email,
        firstName: userInfo.given_name || userInfo.first_name,
        lastName: userInfo.family_name || userInfo.last_name,
        groups: userInfo.groups || [],
        department: userInfo.department,
        organizationDomain: userInfo.hd || userInfo.domain
      };

      await auditLogger.log({
        userId: 0,
        action: 'sso_login_success',
        targetType: 'organization',
        targetId: organizationId.toString(),
        details: { provider: config.provider, email: user.email }
      });

      return { user, organizationId };
    } catch (error) {
      console.error('OAuth processing error:', error);
      return null;
    }
  }

  /**
   * Create or update user from SSO
   */
  async createOrUpdateSSOUser(ssoUser: SSOUser, organizationId: number): Promise<any> {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, ssoUser.email),
        eq(users.organization_id, organizationId)
      ));

    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          display_name: `${ssoUser.firstName} ${ssoUser.lastName}`,
          last_login: new Date()
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      await auditLogger.log({
        userId: updatedUser.id,
        action: 'sso_user_updated',
        targetType: 'user',
        targetId: updatedUser.id.toString(),
        details: { email: ssoUser.email, groups: ssoUser.groups }
      });

      return updatedUser;
    } else {
      // Create new user
      const role = this.determineUserRole(ssoUser.groups || []);
      
      const [newUser] = await db
        .insert(users)
        .values({
          auth_id: `sso_${ssoUser.email}`, // Create a unique auth_id for SSO users
          username: ssoUser.email.split('@')[0], // Use email prefix as username
          email: ssoUser.email,
          display_name: `${ssoUser.firstName} ${ssoUser.lastName}`,
          role,
          organization_id: organizationId,
          created_at: new Date()
        })
        .returning();

      await auditLogger.log({
        userId: newUser.id,
        action: 'sso_user_created',
        targetType: 'user',
        targetId: newUser.id.toString(),
        details: { email: ssoUser.email, role, groups: ssoUser.groups }
      });

      return newUser;
    }
  }

  /**
   * Generate SAML metadata for IdP configuration
   */
  generateSAMLMetadata(organizationId: number): string {
    const config = this.configs.get(organizationId);
    if (!config) {
      throw new Error('SSO not configured');
    }

    const baseUrl = process.env.BASE_URL || 'https://your-domain.com';
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${baseUrl}/sso/metadata/${organizationId}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService 
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${baseUrl}/sso/acs/${organizationId}"
      index="0" />
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }

  /**
   * Initiate SSO login
   */
  initiateSSO(organizationId: number, returnUrl?: string): string {
    const config = this.configs.get(organizationId);
    if (!config || !config.enabled) {
      throw new Error('SSO not configured');
    }

    if (config.provider === 'saml') {
      return this.generateSAMLRequest(config, returnUrl);
    } else {
      return this.generateOAuthRequest(config, returnUrl);
    }
  }

  private parseSAMLResponse(samlResponse: string): any {
    // Decode base64 SAML response
    try {
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf8');
      
      // Basic XML parsing to extract key attributes
      // In production, use a proper SAML library like @node-saml/node-saml
      const emailMatch = decoded.match(/<saml:Attribute[^>]*Name="email"[^>]*>.*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/s);
      const firstNameMatch = decoded.match(/<saml:Attribute[^>]*Name="firstName"[^>]*>.*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/s);
      const lastNameMatch = decoded.match(/<saml:Attribute[^>]*Name="lastName"[^>]*>.*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/s);
      const entityIdMatch = decoded.match(/<saml:Issuer[^>]*>([^<]+)<\/saml:Issuer>/);
      
      if (!emailMatch || !entityIdMatch) {
        return { isValid: false };
      }
      
      return {
        isValid: true,
        entityId: entityIdMatch[1],
        attributes: {
          email: emailMatch[1],
          firstName: firstNameMatch?.[1] || 'Unknown',
          lastName: lastNameMatch?.[1] || 'User',
          groups: 'users' // Default group
        }
      };
    } catch (error) {
      console.error('Error parsing SAML response:', error);
      return { isValid: false };
    }
  }

  private async getOrganizationFromEntityId(entityId: string): Promise<number> {
    // Look up organization by domain extracted from entity ID
    const domainMatch = entityId.match(/https?:\/\/([^/]+)/);
    if (!domainMatch) {
      throw new Error('Invalid entity ID format');
    }
    
    const domain = domainMatch[1];
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.domain, domain))
      .limit(1);
    
    if (!org) {
      throw new Error(`No organization found for domain: ${domain}`);
    }
    
    return org.id;
  }

  private async getOrganizationFromState(state: string): Promise<number> {
    // Decode state parameter to get organization ID
    const decoded = Buffer.from(state, 'base64').toString();
    return parseInt(JSON.parse(decoded).organization_id);
  }

  private async exchangeOAuthCode(code: string, state: string): Promise<any> {
    // Parse state to get organization config
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const config = this.configs.get(stateData.organization_id);
    
    if (!config) {
      throw new Error('No OAuth configuration found');
    }
    
    // Exchange authorization code for access token
    const tokenUrl = new URL('/token', config.ssoUrl);
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.entityId,
      client_secret: process.env[`OAUTH_CLIENT_SECRET_${stateData.organization_id}`] || '',
      redirect_uri: `${process.env.BASE_URL || 'https://your-domain.com'}/sso/oauth/callback`
    });
    
    try {
      const response = await fetch(tokenUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      
      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('OAuth token exchange error:', error);
      throw error;
    }
  }

  private async getOAuthUserInfo(accessToken: string): Promise<any> {
    // Fetch user info from OAuth provider
    const userInfoUrl = process.env.OAUTH_USERINFO_URL || 'https://api.oauth-provider.com/userinfo';
    
    try {
      const response = await fetch(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching OAuth user info:', error);
      throw error;
    }
  }

  private determineUserRole(groups: string[]): string {
    if (groups.includes('admins') || groups.includes('administrators')) {
      return 'admin';
    } else if (groups.includes('managers') || groups.includes('leads')) {
      return 'manager';
    }
    return 'user';
  }

  private generateSAMLRequest(config: SSOConfig, returnUrl?: string): string {
    const baseUrl = process.env.BASE_URL || 'https://your-domain.com';
    const acsUrl = `${baseUrl}/sso/acs/${config.organizationId}`;
    const relayState = returnUrl ? encodeURIComponent(returnUrl) : '';
    
    // Generate SAML AuthnRequest (simplified)
    const request = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      ID="id${Date.now()}"
      Version="2.0"
      IssueInstant="${new Date().toISOString()}"
      Destination="${config.ssoUrl}"
      AssertionConsumerServiceURL="${acsUrl}">
      <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${config.entityId}</saml:Issuer>
    </samlp:AuthnRequest>`;

    const encoded = Buffer.from(request).toString('base64');
    return `${config.ssoUrl}?SAMLRequest=${encodeURIComponent(encoded)}&RelayState=${relayState}`;
  }

  private generateOAuthRequest(config: SSOConfig, returnUrl?: string): string {
    const baseUrl = process.env.BASE_URL || 'https://your-domain.com';
    const redirectUri = `${baseUrl}/sso/oauth/callback`;
    const state = Buffer.from(JSON.stringify({ 
      organizationId: config.organizationId, 
      returnUrl 
    })).toString('base64');
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.entityId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state
    });

    return `${config.ssoUrl}?${params.toString()}`;
  }
}

export const ssoManager = new SSOManager();

// SSO Routes
export const ssoRouter = Router();

// SAML metadata endpoint
ssoRouter.get('/metadata/:organizationId', async (req, res) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const metadata = ssoManager.generateSAMLMetadata(organizationId);
    
    res.set('Content-Type', 'application/xml');
    res.send(metadata);
  } catch (error) {
    console.error('Error generating SAML metadata:', error);
    res.status(500).json({ error: 'Failed to generate metadata' });
  }
});

// Initiate SSO login
ssoRouter.get('/login/:organizationId', async (req, res) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const returnUrl = req.query.returnUrl as string;
    
    const ssoUrl = ssoManager.initiateSSO(organizationId, returnUrl);
    res.redirect(ssoUrl);
  } catch (error) {
    console.error('Error initiating SSO:', error);
    res.status(500).json({ error: 'Failed to initiate SSO login' });
  }
});

// SAML ACS endpoint
ssoRouter.post('/acs/:organizationId', async (req, res) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const samlResponse = req.body.SAMLResponse;
    const relayState = req.body.RelayState;
    
    const result = await ssoManager.processSAMLResponse(samlResponse, relayState);
    
    if (!result) {
      return res.status(401).json({ error: 'SSO authentication failed' });
    }

    const user = await ssoManager.createOrUpdateSSOUser(result.user, result.organizationId);
    
    // Set session or JWT token
    (req.session as any).userId = user.id;
    (req.session as any).organizationId = user.organization_id;
    
    const redirectUrl = relayState || '/dashboard';
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error processing SAML response:', error);
    res.status(500).json({ error: 'SSO authentication failed' });
  }
});

// OAuth callback endpoint
ssoRouter.get('/oauth/callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;
    
    const result = await ssoManager.processOAuthCallback(code, state);
    
    if (!result) {
      return res.status(401).json({ error: 'OAuth authentication failed' });
    }

    const user = await ssoManager.createOrUpdateSSOUser(result.user, result.organizationId);
    
    // Set session or JWT token
    (req.session as any).userId = user.id;
    (req.session as any).organizationId = user.organization_id;
    
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const redirectUrl = stateData.returnUrl || '/dashboard';
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error processing OAuth callback:', error);
    res.status(500).json({ error: 'OAuth authentication failed' });
  }
});