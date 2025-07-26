/**
 * White Label Branding Service
 * Handles dynamic organization-specific theming and branding
 */

import { db } from '../db/db';
import { organizations } from '../db/schema';
import { eq } from '../utils/drizzle-shim';
import { logger } from '../utils/logger';

export interface WhiteLabelTheme {
  enabled: boolean;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  linkColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  sidebarBackgroundColor?: string;
  sidebarTextColor?: string;
  footerBackgroundColor?: string;
  footerTextColor?: string;
  customCss?: string;
  customJs?: string;
  favicon?: string;
  companyName?: string;
  companyTagline?: string;
  contactEmail?: string;
  supportUrl?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  socialLinks?: {
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    instagram?: string;
  };
}

export interface BrandingAssets {
  logo: {
    primary?: string;
    secondary?: string;
    icon?: string;
    favicon?: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    link: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    headingFont?: string;
    bodyFont?: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export class WhiteLabelService {
  private static instance: WhiteLabelService;
  private themeCache = new Map<string, WhiteLabelTheme>();
  private brandingCache = new Map<string, BrandingAssets>();

  public static getInstance(): WhiteLabelService {
    if (!WhiteLabelService.instance) {
      WhiteLabelService.instance = new WhiteLabelService();
    }
    return WhiteLabelService.instance;
  }

  /**
   * Get organization's white label theme
   */
  async getOrganizationTheme(organizationId: string): Promise<WhiteLabelTheme> {
    try {
      // Check cache first
      if (this.themeCache.has(organizationId)) {
        return this.themeCache.get(organizationId)!;
      }

      const [org] = await db
        .select({
          settings: organizations.settings
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org) {
        throw new Error('Organization not found');
      }

      const defaultTheme = this.getDefaultTheme();
      const orgWhiteLabel = org.settings?.whiteLabel || {};
      
      const theme: WhiteLabelTheme = {
        ...defaultTheme,
        ...orgWhiteLabel
      };

      // Cache the theme
      this.themeCache.set(organizationId, theme);

      return theme;
    } catch (error) {
      logger.error('Error fetching organization theme:', error);
      return this.getDefaultTheme();
    }
  }

  /**
   * Update organization's white label theme
   */
  async updateOrganizationTheme(
    organizationId: string, 
    theme: Partial<WhiteLabelTheme>
  ): Promise<WhiteLabelTheme> {
    try {
      // Get current settings
      const [org] = await db
        .select({
          settings: organizations.settings
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org) {
        throw new Error('Organization not found');
      }

      const currentSettings = org.settings || {};
      const updatedWhiteLabel = {
        enabled: theme.enabled ?? false,
        logoUrl: theme.logoUrl,
        primaryColor: theme.primaryColor
      };
      
      const updatedSettings = {
        ...currentSettings,
        whiteLabel: updatedWhiteLabel
      };

      // Update in database
      await db
        .update(organizations)
        .set({
          settings: updatedSettings,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, organizationId));

      const defaultTheme = this.getDefaultTheme();
      const updatedTheme: WhiteLabelTheme = {
        ...defaultTheme,
        ...updatedSettings.whiteLabel
      };

      // Update cache
      this.themeCache.set(organizationId, updatedTheme);

      logger.info('Organization theme updated:', { organizationId });

      return updatedTheme;
    } catch (error) {
      logger.error('Error updating organization theme:', error);
      throw error;
    }
  }

  /**
   * Generate CSS variables for organization theme
   */
  async generateThemeCSS(organizationId: string): Promise<string> {
    try {
      const theme = await this.getOrganizationTheme(organizationId);

      if (!theme.enabled) {
        return '';
      }

      const cssVariables = [
        theme.primaryColor && `--color-primary: ${theme.primaryColor};`,
        theme.secondaryColor && `--color-secondary: ${theme.secondaryColor};`,
        theme.accentColor && `--color-accent: ${theme.accentColor};`,
        theme.backgroundColor && `--color-background: ${theme.backgroundColor};`,
        theme.textColor && `--color-text: ${theme.textColor};`,
        theme.linkColor && `--color-link: ${theme.linkColor};`,
        theme.buttonColor && `--color-button: ${theme.buttonColor};`,
        theme.buttonTextColor && `--color-button-text: ${theme.buttonTextColor};`,
        theme.headerBackgroundColor && `--color-header-bg: ${theme.headerBackgroundColor};`,
        theme.headerTextColor && `--color-header-text: ${theme.headerTextColor};`,
        theme.sidebarBackgroundColor && `--color-sidebar-bg: ${theme.sidebarBackgroundColor};`,
        theme.sidebarTextColor && `--color-sidebar-text: ${theme.sidebarTextColor};`,
        theme.footerBackgroundColor && `--color-footer-bg: ${theme.footerBackgroundColor};`,
        theme.footerTextColor && `--color-footer-text: ${theme.footerTextColor};`
      ].filter(Boolean);

      const css = `
        :root {
          ${cssVariables.join('\n          ')}
        }
        
        ${theme.customCss || ''}
      `;

      return css.trim();
    } catch (error) {
      logger.error('Error generating theme CSS:', error);
      return '';
    }
  }

  /**
   * Generate complete branding assets for organization
   */
  async generateBrandingAssets(organizationId: string): Promise<BrandingAssets> {
    try {
      // Check cache first
      if (this.brandingCache.has(organizationId)) {
        return this.brandingCache.get(organizationId)!;
      }

      const theme = await this.getOrganizationTheme(organizationId);
      const defaultAssets = this.getDefaultBrandingAssets();

      const assets: BrandingAssets = {
        logo: {
          primary: theme.logoUrl || defaultAssets.logo.primary,
          secondary: defaultAssets.logo.secondary,
          icon: defaultAssets.logo.icon,
          favicon: theme.favicon || defaultAssets.logo.favicon
        },
        colors: {
          primary: theme.primaryColor || defaultAssets.colors.primary,
          secondary: theme.secondaryColor || defaultAssets.colors.secondary,
          accent: theme.accentColor || defaultAssets.colors.accent,
          background: theme.backgroundColor || defaultAssets.colors.background,
          text: theme.textColor || defaultAssets.colors.text,
          link: theme.linkColor || defaultAssets.colors.link,
          success: defaultAssets.colors.success,
          warning: defaultAssets.colors.warning,
          error: defaultAssets.colors.error,
          info: defaultAssets.colors.info
        },
        typography: defaultAssets.typography,
        spacing: defaultAssets.spacing,
        borderRadius: defaultAssets.borderRadius,
        shadows: defaultAssets.shadows
      };

      // Cache the assets
      this.brandingCache.set(organizationId, assets);

      return assets;
    } catch (error) {
      logger.error('Error generating branding assets:', error);
      return this.getDefaultBrandingAssets();
    }
  }

  /**
   * Clear cache for organization
   */
  clearCache(organizationId: string): void {
    this.themeCache.delete(organizationId);
    this.brandingCache.delete(organizationId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.themeCache.clear();
    this.brandingCache.clear();
  }

  /**
   * Get default theme
   */
  private getDefaultTheme(): WhiteLabelTheme {
    return {
      enabled: false,
      primaryColor: '#3B82F6',
      secondaryColor: '#64748B',
      accentColor: '#10B981',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      linkColor: '#3B82F6',
      buttonColor: '#3B82F6',
      buttonTextColor: '#FFFFFF',
      headerBackgroundColor: '#FFFFFF',
      headerTextColor: '#1F2937',
      sidebarBackgroundColor: '#F8FAFC',
      sidebarTextColor: '#64748B',
      footerBackgroundColor: '#F8FAFC',
      footerTextColor: '#64748B',
      companyName: 'NestMap',
      companyTagline: 'AI-Powered Travel Planning',
      contactEmail: 'support@nestmap.com',
      supportUrl: 'https://nestmap.com/support',
      privacyPolicyUrl: 'https://nestmap.com/privacy',
      termsOfServiceUrl: 'https://nestmap.com/terms'
    };
  }

  /**
   * Get default branding assets
   */
  private getDefaultBrandingAssets(): BrandingAssets {
    return {
      logo: {
        primary: '/assets/logo-primary.svg',
        secondary: '/assets/logo-secondary.svg',
        icon: '/assets/logo-icon.svg',
        favicon: '/assets/favicon.ico'
      },
      colors: {
        primary: '#3B82F6',
        secondary: '#64748B',
        accent: '#10B981',
        background: '#FFFFFF',
        text: '#1F2937',
        link: '#3B82F6',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        headingFont: 'Inter, system-ui, sans-serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem'
        }
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem'
      },
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        full: '9999px'
      },
      shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
      }
    };
  }
}

export const whiteLabelService = WhiteLabelService.getInstance();



