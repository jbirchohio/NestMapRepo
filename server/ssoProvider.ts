import { Router } from 'express';
import { db } from './db.js';
import { users, organizations, userRoleEnum } from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import { auditLogger } from './auditLogger.js';

type UserRole = 'super_admin' | 'admin' | 'manager' | 'member' | 'guest';

declare module 'express-session' {
  interface SessionData {
    user_id: string;
    organization_id: string;
  }
}

export interface SSOConfig {
  organizationId: string;
  provider: 'saml' | 'oauth' | 'oidc.js';
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
  private configs: Map<string, SSOConfig> = new Map();

  async configureSSOForOrganization(organizationId: string, config: Omit<SSOConfig, 'organizationId'>): Promise<void> {
    const ssoConfig: SSOConfig = {
      ...config,
      organizationId
    };

    this.configs.set(organizationId, ssoConfig);

    await auditLogger.logAdminAction(
      'system', // System user
      organizationId,
      'sso_configured',
      { provider: config.provider, entityId: config.entityId }
    );
  }


  async processSAMLResponse(samlResponse: string, relayState?: string): Promise<{ user: SSOUser; organizationId: string } | null> {
    try {
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
        groups: config.attributeMapping.groups ? 
          parsedResponse.attributes[config.attributeMapping.groups]?.split(',') : [],
        department: config.attributeMapping.department ? 
          parsedResponse.attributes[config.attributeMapping.department] : undefined,
        organizationDomain: parsedResponse.entityId
      };

      await auditLogger.logAuth(
        'system', // Will be updated after user creation
        organizationId,
        'sso_login_success',
        { provider: 'saml', entityId: parsedResponse.entityId }
      );

      return { user, organizationId };
    } catch (error) {
      console.error('SAML processing error:', error);
      return null;
    }
  }

  async processOAuthCallback(code: string, state: string): Promise<{ user: SSOUser; organizationId: string } | null> {
    try {
      const tokenData = await this.exchangeOAuthCode(code, state);
      const userInfo = await this.getOAuthUserInfo(tokenData.accessToken);
      
      const organizationId = await this.getOrganizationFromState(state);
      const config = this.configs.get(organizationId);
      
      if (!config || !config.enabled) {
        throw new Error('SSO not configured for organization');
      }

      const user: SSOUser = {
        email: userInfo.email,
        firstName: userInfo.given_name || userInfo.first_name || '',
        lastName: userInfo.family_name || userInfo.last_name || '',
        groups: userInfo.groups || [],
        department: userInfo.department,
        organizationDomain: userInfo.hd || userInfo.domain || ''
      };

      await auditLogger.logAuth(
        'system',
        organizationId,
        'sso_login_success',
        { provider: config.provider, email: user.email }
      );

      return { user, organizationId };
    } catch (error) {
      console.error('OAuth processing error:', error);
      return null;
    }
  }

  async createOrUpdateSSOUser(ssoUser: SSOUser, organizationId: string): Promise<any> {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, ssoUser.email),
        eq(users.organizationId, organizationId)
      ));

    if (existingUser) {
      // Update existing user with only the fields that exist in the schema
      const updateData: Record<string, any> = {
        firstName: ssoUser.firstName,
        lastName: ssoUser.lastName,
        updatedAt: new Date()
      };

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, existingUser.id))
        .returning();

      await auditLogger.logAuth(
        updatedUser.id,
        organizationId,
        'sso_user_updated',
        { email: ssoUser.email, groups: ssoUser.groups }
      );

      return updatedUser;
    } else {
      // Create new user
      const role = this.determineUserRole(ssoUser.groups || []) as UserRole;
      
      // Generate a random username based on email
      const username = ssoUser.email.split('@')[0] + Math.random().toString(36).substring(2, 8);
      
      const userData = {
        email: ssoUser.email,
        username,
        firstName: ssoUser.firstName,
        lastName: ssoUser.lastName,
        passwordHash: '', // Will be set on first password reset
        role,
        organizationId: organizationId,
        emailVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const [newUser] = await db
        .insert(users)
        .values(userData)
        .returning();

      await auditLogger.logAuth(
        newUser.id,
        organizationId,
        'sso_user_created',
        { email: ssoUser.email, role, groups: ssoUser.groups }
      );

      return newUser;
    }
  }

  generateSAMLMetadata(organizationId: string): string {
    const config = this.configs.get(organizationId);
    if (!config) {
      throw new Error('SSO not configured');
    }

    const baseUrl = process.env.BASE_URL || 'https://your-domain.com.js';
    
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

  initiateSSO(organizationId: string, returnUrl?: string): string {
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
    // In production, use a proper SAML library
    return {
      isValid: true,
      entityId: 'example-entity-id',
      attributes: {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        groups: 'admin,user',
        department: 'IT'
      }
    };
  }

  private async getOrganizationFromEntityId(entityId: string): Promise<string> {
    try {
      // Try to find organization by slug first (assuming entityId is the organization's slug)
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, entityId))
        .limit(1);

      if (org) return org.id;
      
      // Fallback to environment variable mapping if needed
      const envMap = process.env.SAML_ENTITY_MAP ? JSON.parse(process.env.SAML_ENTITY_MAP) : {};
      if (envMap[entityId]) {
        // Verify the mapped organization exists
        const [mappedOrg] = await db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.id, envMap[entityId]))
          .limit(1);
          
        if (mappedOrg) return mappedOrg.id;
      }

      throw new Error(`Organization not found for entity ID: ${entityId}`);
    } catch (error) {
      console.error('Error getting organization from entity ID:', error);
      throw new Error('Failed to get organization from entity ID');
    }
  }

  private async getOrganizationFromState(state: string): Promise<string> {
    try {
      const decoded = Buffer.from(state, 'base64').toString();
      const stateData = JSON.parse(decoded);
      return stateData.organizationId || '.js';
    } catch (error) {
      console.error('Error parsing state:', error);
      throw new Error('Invalid state parameter');
    }
  }

  private async exchangeOAuthCode(code: string, state: string): Promise<any> {
    // In production, implement actual OAuth code exchange
    return { accessToken: 'mock_access_token' };
  }

  private async getOAuthUserInfo(accessToken: string): Promise<any> {
    // In production, fetch user info from OAuth provider
    return {
      email: 'user@example.com',
      given_name: 'John',
      family_name: 'Doe',
      groups: ['users'],
      department: 'Engineering',
      hd: 'example.com'
    };
  }

  private determineUserRole(groups: string[]): string {
    if (!groups) return 'user';
    if (groups.some(g => ['admin', 'administrator'].includes(g.toLowerCase()))) {
      return 'admin';
    } else if (groups.some(g => ['manager', 'lead'].includes(g.toLowerCase()))) {
      return 'manager.js';
    }
    return 'user';
  }

  private generateSAMLRequest(config: SSOConfig, returnUrl?: string): string {
    const baseUrl = process.env.BASE_URL || 'https://your-domain.com.js';
    const acsUrl = `${baseUrl}/sso/acs/${config.organizationId}`;
    const relayState = returnUrl ? encodeURIComponent(returnUrl) : '.js';
    
    const request = `<samlp:AuthnRequest 
      xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      ID="id${Date.now()}"
      Version="2.0"
      IssueInstant="${new Date().toISOString()}"
      Destination="${config.ssoUrl}"
      AssertionConsumerServiceURL="${acsUrl}">
      <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
        ${config.entityId}
      </saml:Issuer>
    </samlp:AuthnRequest>`;

    const encoded = Buffer.from(request).toString('base64');
    return `${config.ssoUrl}?SAMLRequest=${encodeURIComponent(encoded)}&RelayState=${relayState}`;
  }

  private generateOAuthRequest(config: SSOConfig, returnUrl?: string): string {
    const baseUrl = process.env.BASE_URL || 'https://your-domain.com.js';
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
    const organizationId = req.params.organizationId;
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
    const organizationId = req.params.organizationId;
    const returnUrl = req.query.returnUrl as string;
    
    const ssoUrl = ssoManager.initiateSSO(organizationId, returnUrl);
    return res.redirect(ssoUrl);
  } catch (error) {
    console.error('Error initiating SSO:', error);
    return res.status(500).json({ error: 'Failed to initiate SSO login' });
  }
});

// SAML ACS endpoint
ssoRouter.post('/acs/:organizationId', async (req, res) => {
  try {
    const organizationId = req.params.organizationId;
    const samlResponse = req.body.SAMLResponse;
    const relayState = req.body.RelayState;
    
    const result = await ssoManager.processSAMLResponse(samlResponse, relayState);
    
    if (!result) {
      return res.status(401).json({ error: 'SSO authentication failed' });
    }

    const user = await ssoManager.createOrUpdateSSOUser(result.user, result.organizationId);
    
    // Set session
    req.session.user_id = user.id;
    req.session.organization_id = user.organization_id;
    
    const redirectUrl = relayState || '/dashboard.js';
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error processing SAML response:', error);
    return res.status(500).json({ error: 'SSO authentication failed' });
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
    
    // Set session
    req.session.user_id = user.id;
    req.session.organization_id = user.organization_id;
    
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const redirectUrl = stateData.returnUrl || '/dashboard.js';
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error processing OAuth callback:', error);
    return res.status(500).json({ error: 'OAuth authentication failed' });
  }
});
