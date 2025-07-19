import { EventEmitter } from 'events';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DeveloperApp {
  id: string;
  name: string;
  description: string;
  developerId: string;
  organizationId: number;
  category: 'travel' | 'expense' | 'analytics' | 'integration' | 'automation' | 'communication';
  status: 'draft' | 'review' | 'approved' | 'published' | 'suspended';
  version: string;
  apiEndpoints: APIEndpoint[];
  webhooks: WebhookConfig[];
  pricing: PricingModel;
  permissions: AppPermission[];
  metadata: {
    logoUrl?: string;
    screenshots: string[];
    documentation: string;
    supportUrl: string;
    privacyPolicy: string;
    termsOfService: string;
  };
  metrics: AppMetrics;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  parameters: APIParameter[];
  responses: APIResponse[];
  authentication: 'api_key' | 'oauth' | 'jwt';
  rateLimit: {
    requests: number;
    window: number; // seconds
  };
  isPublic: boolean;
}

export interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  example?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface APIResponse {
  statusCode: number;
  description: string;
  schema: object;
  example?: any;
}

export interface WebhookConfig {
  event: string;
  url: string;
  secret: string;
  isActive: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

export interface PricingModel {
  type: 'free' | 'freemium' | 'subscription' | 'usage_based' | 'revenue_share';
  tiers: PricingTier[];
  revenueShare?: {
    developerPercentage: number;
    platformPercentage: number;
  };
}

export interface PricingTier {
  name: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly' | 'usage';
  features: string[];
  limits: {
    apiCalls?: number;
    users?: number;
    storage?: number; // MB
  };
}

export interface AppPermission {
  scope: string;
  description: string;
  required: boolean;
}

export interface AppMetrics {
  installations: number;
  activeUsers: number;
  apiCalls: number;
  revenue: number;
  rating: number;
  reviews: number;
  lastUsed: Date;
}

export interface Developer {
  id: string;
  name: string;
  email: string;
  company?: string;
  website?: string;
  bio?: string;
  profileImage?: string;
  verified: boolean;
  tier: 'individual' | 'startup' | 'enterprise';
  apiKeys: APIKey[];
  apps: string[]; // app IDs
  earnings: {
    total: number;
    thisMonth: number;
    lastPayout: Date;
  };
  metrics: {
    totalDownloads: number;
    totalRevenue: number;
    averageRating: number;
  };
  createdAt: Date;
  lastActive: Date;
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  secret: string;
  permissions: string[];
  rateLimit: {
    requests: number;
    window: number;
  };
  isActive: boolean;
  expiresAt?: Date;
  lastUsed?: Date;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'crm' | 'erp' | 'hr' | 'finance' | 'communication' | 'analytics' | 'other';
  provider: string;
  logoUrl: string;
  status: 'available' | 'beta' | 'coming_soon' | 'deprecated';
  authType: 'oauth' | 'api_key' | 'basic' | 'custom';
  endpoints: IntegrationEndpoint[];
  configuration: IntegrationConfig[];
  documentation: string;
  supportLevel: 'community' | 'standard' | 'premium';
  pricing: 'free' | 'paid' | 'enterprise';
  popularity: number;
  lastUpdated: Date;
}

export interface IntegrationEndpoint {
  name: string;
  method: string;
  path: string;
  description: string;
  requestSchema?: object;
  responseSchema?: object;
}

export interface IntegrationConfig {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  required: boolean;
  description: string;
  options?: { label: string; value: any }[];
  defaultValue?: any;
}

export interface Marketplace {
  apps: DeveloperApp[];
  integrations: Integration[];
  categories: MarketplaceCategory[];
  featured: string[]; // app/integration IDs
  trending: string[];
  newReleases: string[];
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  appCount: number;
  integrationCount: number;
}

export interface PlatformEcosystemCapabilities {
  features: [
    "Third-party developer marketplace",
    "White-label SaaS platform",
    "Integration hub (1000+ tools)",
    "Open-source community",
    "Revenue sharing model",
    "API rate limiting and monitoring",
    "Developer analytics and insights",
    "Automated app review process"
  ];
  supportedIntegrations: [
    "CRM Systems", "ERP Platforms", "HR Management", "Finance Tools",
    "Communication Platforms", "Analytics Services", "Booking Engines",
    "Payment Processors", "Identity Providers", "Cloud Storage"
  ];
  revenueModel: ["App Store Commission", "API Usage Fees", "Premium Integrations", "White-label Licensing"];
}

class PlatformEcosystemService extends EventEmitter {
  private developers: Map<string, Developer> = new Map();
  private apps: Map<string, DeveloperApp> = new Map();
  private integrations: Map<string, Integration> = new Map();
  private apiKeys: Map<string, APIKey> = new Map();
  private marketplace: Marketplace;
  private usageMetrics: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeMarketplace();
    this.initializeIntegrations();
    this.startMetricsCollection();
    this.startRevenueCalculation();
  }

  private initializeMarketplace() {
    this.marketplace = {
      apps: [],
      integrations: [],
      categories: [
        {
          id: 'travel',
          name: 'Travel & Booking',
          description: 'Flight, hotel, and transportation booking tools',
          icon: '✈️',
          appCount: 0,
          integrationCount: 0
        },
        {
          id: 'expense',
          name: 'Expense Management',
          description: 'Expense tracking and reporting solutions',
          icon: '💰',
          appCount: 0,
          integrationCount: 0
        },
        {
          id: 'analytics',
          name: 'Analytics & Reporting',
          description: 'Business intelligence and data visualization',
          icon: '📊',
          appCount: 0,
          integrationCount: 0
        },
        {
          id: 'integration',
          name: 'System Integration',
          description: 'Connect with external systems and APIs',
          icon: '🔗',
          appCount: 0,
          integrationCount: 0
        },
        {
          id: 'automation',
          name: 'Workflow Automation',
          description: 'Automate business processes and workflows',
          icon: '🤖',
          appCount: 0,
          integrationCount: 0
        },
        {
          id: 'communication',
          name: 'Communication',
          description: 'Messaging, notifications, and collaboration tools',
          icon: '💬',
          appCount: 0,
          integrationCount: 0
        }
      ],
      featured: [],
      trending: [],
      newReleases: []
    };

    this.emit('marketplaceInitialized');
  }

  private initializeIntegrations() {
    const defaultIntegrations: Integration[] = [
      {
        id: 'salesforce',
        name: 'Salesforce CRM',
        description: 'Integrate with Salesforce for customer and lead management',
        category: 'crm',
        provider: 'Salesforce',
        logoUrl: '/integrations/salesforce.png',
        status: 'available',
        authType: 'oauth',
        endpoints: [
          {
            name: 'Get Contacts',
            method: 'GET',
            path: '/contacts',
            description: 'Retrieve customer contacts'
          },
          {
            name: 'Create Lead',
            method: 'POST',
            path: '/leads',
            description: 'Create new sales lead'
          }
        ],
        configuration: [
          {
            key: 'instance_url',
            label: 'Salesforce Instance URL',
            type: 'string',
            required: true,
            description: 'Your Salesforce instance URL'
          }
        ],
        documentation: '/docs/integrations/salesforce',
        supportLevel: 'premium',
        pricing: 'paid',
        popularity: 95,
        lastUpdated: new Date()
      },
      {
        id: 'slack',
        name: 'Slack',
        description: 'Send notifications and updates to Slack channels',
        category: 'communication',
        provider: 'Slack Technologies',
        logoUrl: '/integrations/slack.png',
        status: 'available',
        authType: 'oauth',
        endpoints: [
          {
            name: 'Send Message',
            method: 'POST',
            path: '/messages',
            description: 'Send message to channel or user'
          }
        ],
        configuration: [
          {
            key: 'default_channel',
            label: 'Default Channel',
            type: 'string',
            required: false,
            description: 'Default channel for notifications'
          }
        ],
        documentation: '/docs/integrations/slack',
        supportLevel: 'standard',
        pricing: 'free',
        popularity: 88,
        lastUpdated: new Date()
      }
    ];

    defaultIntegrations.forEach(integration => {
      this.integrations.set(integration.id, integration);
    });

    this.emit('integrationsInitialized', { count: defaultIntegrations.length });
  }

  private startMetricsCollection() {
    // Collect usage metrics every 5 minutes
    setInterval(() => {
      this.collectUsageMetrics();
    }, 5 * 60 * 1000);
  }

  private startRevenueCalculation() {
    // Calculate revenue daily
    setInterval(() => {
      this.calculateDeveloperRevenue();
    }, 24 * 60 * 60 * 1000);
  }

  // Developer Management
  async registerDeveloper(
    developerData: Omit<Developer, 'id' | 'apiKeys' | 'apps' | 'earnings' | 'metrics' | 'createdAt' | 'lastActive'>
  ): Promise<Developer> {
    const developer: Developer = {
      id: this.generateDeveloperId(),
      ...developerData,
      verified: false,
      apiKeys: [],
      apps: [],
      earnings: {
        total: 0,
        thisMonth: 0,
        lastPayout: new Date()
      },
      metrics: {
        totalDownloads: 0,
        totalRevenue: 0,
        averageRating: 0
      },
      createdAt: new Date(),
      lastActive: new Date()
    };

    this.developers.set(developer.id, developer);
    this.emit('developerRegistered', developer);

    return developer;
  }

  async createAPIKey(
    developerId: string,
    keyData: Omit<APIKey, 'id' | 'key' | 'secret' | 'lastUsed'>
  ): Promise<APIKey> {
    const developer = this.developers.get(developerId);
    if (!developer) {
      throw new Error('Developer not found');
    }

    const apiKey: APIKey = {
      id: this.generateAPIKeyId(),
      key: this.generateAPIKey(),
      secret: this.generateAPISecret(),
      ...keyData,
      lastUsed: undefined
    };

    developer.apiKeys.push(apiKey);
    this.apiKeys.set(apiKey.key, apiKey);
    this.developers.set(developerId, developer);

    this.emit('apiKeyCreated', { developerId, apiKey });
    return apiKey;
  }

  async validateAPIKey(apiKey: string): Promise<{ valid: boolean; developer?: Developer; permissions: string[] }> {
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData || !keyData.isActive) {
      return { valid: false, permissions: [] };
    }

    if (keyData.expiresAt && keyData.expiresAt < new Date()) {
      return { valid: false, permissions: [] };
    }

    // Find developer
    const developer = Array.from(this.developers.values())
      .find(dev => dev.apiKeys.some(key => key.key === apiKey));

    if (!developer) {
      return { valid: false, permissions: [] };
    }

    // Update last used
    keyData.lastUsed = new Date();
    this.apiKeys.set(apiKey, keyData);

    return {
      valid: true,
      developer,
      permissions: keyData.permissions
    };
  }

  // App Management
  async submitApp(
    developerId: string,
    appData: Omit<DeveloperApp, 'id' | 'developerId' | 'status' | 'metrics' | 'createdAt' | 'updatedAt'>
  ): Promise<DeveloperApp> {
    const developer = this.developers.get(developerId);
    if (!developer) {
      throw new Error('Developer not found');
    }

    const app: DeveloperApp = {
      id: this.generateAppId(),
      developerId,
      status: 'review',
      ...appData,
      metrics: {
        installations: 0,
        activeUsers: 0,
        apiCalls: 0,
        revenue: 0,
        rating: 0,
        reviews: 0,
        lastUsed: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.apps.set(app.id, app);
    developer.apps.push(app.id);
    this.developers.set(developerId, developer);

    this.emit('appSubmitted', app);
    return app;
  }

  async reviewApp(appId: string, decision: 'approved' | 'rejected', feedback?: string): Promise<DeveloperApp> {
    const app = this.apps.get(appId);
    if (!app) {
      throw new Error('App not found');
    }

    app.status = decision === 'approved' ? 'approved' : 'draft';
    app.updatedAt = new Date();

    if (decision === 'approved') {
      app.publishedAt = new Date();
      this.marketplace.apps.push(app);
      this.marketplace.newReleases.unshift(app.id);
      
      // Keep only last 10 new releases
      if (this.marketplace.newReleases.length > 10) {
        this.marketplace.newReleases = this.marketplace.newReleases.slice(0, 10);
      }
    }

    this.apps.set(appId, app);
    this.emit('appReviewed', { app, decision, feedback });

    return app;
  }

  async installApp(appId: string, organizationId: number): Promise<{ success: boolean; installationId: string }> {
    const app = this.apps.get(appId);
    if (!app || app.status !== 'published') {
      throw new Error('App not available for installation');
    }

    const installationId = this.generateInstallationId();
    
    // Update metrics
    app.metrics.installations++;
    app.metrics.activeUsers++;
    this.apps.set(appId, app);

    this.emit('appInstalled', { appId, organizationId, installationId });

    return { success: true, installationId };
  }

  // Integration Management
  async getIntegrations(category?: string): Promise<Integration[]> {
    let integrations = Array.from(this.integrations.values());
    
    if (category) {
      integrations = integrations.filter(integration => integration.category === category);
    }

    return integrations.sort((a, b) => b.popularity - a.popularity);
  }

  async configureIntegration(
    integrationId: string,
    organizationId: number,
    configuration: Record<string, any>
  ): Promise<{ success: boolean; configurationId: string }> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    // Validate configuration
    this.validateIntegrationConfig(integration, configuration);

    const configurationId = this.generateConfigurationId();
    
    this.emit('integrationConfigured', { integrationId, organizationId, configurationId });

    return { success: true, configurationId };
  }

  // Marketplace Operations
  async getMarketplace(organizationId: number): Promise<Marketplace> {
    // Update category counts
    for (const category of this.marketplace.categories) {
      category.appCount = this.marketplace.apps.filter(app => app.category === category.id).length;
      category.integrationCount = Array.from(this.integrations.values())
        .filter(integration => integration.category === category.id).length;
    }

    return this.marketplace;
  }

  async searchMarketplace(query: string, category?: string): Promise<{
    apps: DeveloperApp[];
    integrations: Integration[];
  }> {
    const searchTerm = query.toLowerCase();
    
    let apps = this.marketplace.apps.filter(app => 
      app.name.toLowerCase().includes(searchTerm) ||
      app.description.toLowerCase().includes(searchTerm)
    );

    let integrations = Array.from(this.integrations.values()).filter(integration =>
      integration.name.toLowerCase().includes(searchTerm) ||
      integration.description.toLowerCase().includes(searchTerm)
    );

    if (category) {
      apps = apps.filter(app => app.category === category);
      integrations = integrations.filter(integration => integration.category === category);
    }

    return { apps, integrations };
  }

  async getFeaturedContent(): Promise<{
    featuredApps: DeveloperApp[];
    trendingApps: DeveloperApp[];
    newReleases: DeveloperApp[];
    popularIntegrations: Integration[];
  }> {
    const featuredApps = this.marketplace.featured
      .map(id => this.apps.get(id))
      .filter(Boolean) as DeveloperApp[];

    const trendingApps = this.marketplace.trending
      .map(id => this.apps.get(id))
      .filter(Boolean) as DeveloperApp[];

    const newReleases = this.marketplace.newReleases
      .map(id => this.apps.get(id))
      .filter(Boolean) as DeveloperApp[];

    const popularIntegrations = Array.from(this.integrations.values())
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10);

    return { featuredApps, trendingApps, newReleases, popularIntegrations };
  }

  // Analytics and Insights
  async getDeveloperAnalytics(developerId: string): Promise<{
    overview: any;
    appPerformance: any[];
    revenue: any;
    apiUsage: any;
  }> {
    const developer = this.developers.get(developerId);
    if (!developer) {
      throw new Error('Developer not found');
    }

    const apps = developer.apps.map(appId => this.apps.get(appId)).filter(Boolean);
    
    const overview = {
      totalApps: apps.length,
      totalInstallations: apps.reduce((sum, app) => sum + app!.metrics.installations, 0),
      totalRevenue: developer.earnings.total,
      averageRating: developer.metrics.averageRating
    };

    const appPerformance = apps.map(app => ({
      id: app!.id,
      name: app!.name,
      installations: app!.metrics.installations,
      activeUsers: app!.metrics.activeUsers,
      revenue: app!.metrics.revenue,
      rating: app!.metrics.rating
    }));

    const revenue = {
      total: developer.earnings.total,
      thisMonth: developer.earnings.thisMonth,
      lastPayout: developer.earnings.lastPayout,
      nextPayout: this.calculateNextPayout(developer.earnings.lastPayout)
    };

    const apiUsage = {
      totalCalls: apps.reduce((sum, app) => sum + app!.metrics.apiCalls, 0),
      callsThisMonth: this.getMonthlyAPICalls(developerId),
      topEndpoints: this.getTopEndpoints(developerId)
    };

    return { overview, appPerformance, revenue, apiUsage };
  }

  async getPlatformAnalytics(): Promise<{
    overview: any;
    growth: any;
    revenue: any;
    topApps: any[];
    topDevelopers: any[];
  }> {
    const totalApps = this.apps.size;
    const totalDevelopers = this.developers.size;
    const totalIntegrations = this.integrations.size;
    const totalInstallations = Array.from(this.apps.values())
      .reduce((sum, app) => sum + app.metrics.installations, 0);

    const overview = {
      totalApps,
      totalDevelopers,
      totalIntegrations,
      totalInstallations,
      activeUsers: Array.from(this.apps.values())
        .reduce((sum, app) => sum + app.metrics.activeUsers, 0)
    };

    const growth = {
      appsThisMonth: this.getAppsCreatedThisMonth(),
      developersThisMonth: this.getDevelopersRegisteredThisMonth(),
      installationsThisMonth: this.getInstallationsThisMonth()
    };

    const revenue = {
      total: this.getTotalPlatformRevenue(),
      thisMonth: this.getMonthlyPlatformRevenue(),
      revenueShare: this.getRevenueShareBreakdown()
    };

    const topApps = Array.from(this.apps.values())
      .sort((a, b) => b.metrics.installations - a.metrics.installations)
      .slice(0, 10)
      .map(app => ({
        id: app.id,
        name: app.name,
        developer: this.developers.get(app.developerId)?.name,
        installations: app.metrics.installations,
        revenue: app.metrics.revenue
      }));

    const topDevelopers = Array.from(this.developers.values())
      .sort((a, b) => b.earnings.total - a.earnings.total)
      .slice(0, 10)
      .map(dev => ({
        id: dev.id,
        name: dev.name,
        company: dev.company,
        totalApps: dev.apps.length,
        totalRevenue: dev.earnings.total
      }));

    return { overview, growth, revenue, topApps, topDevelopers };
  }

  // Private Helper Methods
  private validateIntegrationConfig(integration: Integration, configuration: Record<string, any>): void {
    for (const configItem of integration.configuration) {
      if (configItem.required && !configuration[configItem.key]) {
        throw new Error(`Required configuration '${configItem.key}' is missing`);
      }
    }
  }

  private collectUsageMetrics(): void {
    // Collect and update usage metrics for apps and APIs
    this.emit('metricsCollected', { timestamp: new Date() });
  }

  private calculateDeveloperRevenue(): void {
    // Calculate and distribute revenue to developers
    this.emit('revenueCalculated', { timestamp: new Date() });
  }

  private generateDeveloperId(): string {
    return `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAppId(): string {
    return `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAPIKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAPIKey(): string {
    return `pk_${Math.random().toString(36).substr(2, 32)}`;
  }

  private generateAPISecret(): string {
    return `sk_${Math.random().toString(36).substr(2, 48)}`;
  }

  private generateInstallationId(): string {
    return `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConfigurationId(): string {
    return `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMonthlyAPICalls(developerId: string): number {
    // Mock implementation
    return Math.floor(Math.random() * 10000);
  }

  private getTopEndpoints(developerId: string): any[] {
    // Mock implementation
    return [
      { endpoint: '/api/trips', calls: 1250 },
      { endpoint: '/api/bookings', calls: 980 },
      { endpoint: '/api/expenses', calls: 750 }
    ];
  }

  private getAppsCreatedThisMonth(): number {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    
    return Array.from(this.apps.values())
      .filter(app => app.createdAt >= thisMonth).length;
  }

  private getDevelopersRegisteredThisMonth(): number {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    
    return Array.from(this.developers.values())
      .filter(dev => dev.createdAt >= thisMonth).length;
  }

  private getInstallationsThisMonth(): number {
    // Mock implementation - in real scenario, track installation dates
    return Math.floor(Math.random() * 500);
  }

  private getTotalPlatformRevenue(): number {
    return Array.from(this.apps.values())
      .reduce((sum, app) => sum + app.metrics.revenue, 0) * 0.3; // 30% platform fee
  }

  private getMonthlyPlatformRevenue(): number {
    // Mock implementation
    return this.getTotalPlatformRevenue() * 0.15; // Assume 15% of total is this month
  }

  private getRevenueShareBreakdown(): any {
    return {
      platform: 30,
      developers: 70
    };
  }

  private calculateNextPayout(lastPayout: Date): Date {
    const nextPayout = new Date(lastPayout);
    nextPayout.setMonth(nextPayout.getMonth() + 1);
    return nextPayout;
  }

  // Public API Methods
  async getEcosystemOverview(): Promise<{
    developers: number;
    apps: number;
    integrations: number;
    categories: MarketplaceCategory[];
  }> {
    return {
      developers: this.developers.size,
      apps: this.apps.size,
      integrations: this.integrations.size,
      categories: this.marketplace.categories
    };
  }

  async getAppDetails(appId: string): Promise<DeveloperApp | null> {
    return this.apps.get(appId) || null;
  }

  async getDeveloperProfile(developerId: string): Promise<Developer | null> {
    return this.developers.get(developerId) || null;
  }
}

export const platformEcosystemService = new PlatformEcosystemService();
