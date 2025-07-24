import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

export interface WhiteLabelConfig {
  // Branding
  companyName: string;
  companyLogo?: string;
  favicon?: string;
  tagline?: string;
  
  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  
  // Domain & URLs
  customDomain?: string;
  supportEmail?: string;
  helpUrl?: string;
  
  // Features
  enableGuestMode: boolean;
  enablePublicSignup: boolean;
  enableSocialLogin: boolean;
  enableMobileApp: boolean;
  
  // Footer & Legal
  companyWebsite?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  footerText?: string;
}

interface WhiteLabelContextType {
  config: WhiteLabelConfig;
  updateConfig: (newConfig: Partial<WhiteLabelConfig>) => void;
  applyBranding: () => void;
  resetToDefault: () => void;
  isWhiteLabelActive: boolean;
  enableWhiteLabel: () => void;
  disableWhiteLabel: () => void;
}

const defaultConfig: WhiteLabelConfig = {
  companyName: "NestMap",
  primaryColor: "#2563eb",
  secondaryColor: "#64748b",
  accentColor: "#10b981",
  enableGuestMode: true,
  enablePublicSignup: true,
  enableSocialLogin: true,
  enableMobileApp: true,
  tagline: "AI-Powered Corporate Travel Management",
  footerText: "© 2025 NestMap. All rights reserved."
};

// Helper function to convert hex color to HSL format for CSS variables
function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

const WhiteLabelContext = createContext<WhiteLabelContextType | undefined>(undefined);

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [isWhiteLabelActive, setIsWhiteLabelActive] = useState(false);
  
  // Fetch white label config when user logs in or location changes
  const { data: whiteLabelConfig } = useQuery<WhiteLabelConfig>({
    queryKey: ['whiteLabelConfig', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return defaultConfig;
      
      try {
        // Get token from localStorage since User type doesn't have accessToken
        const token = localStorage.getItem('token');
        if (!token) return defaultConfig;
        
        const response = await fetch(`/api/organizations/${user.organization_id}/white-label`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch white label config');
        }
        
        const data = await response.json();
        return { ...defaultConfig, ...data };
      } catch (error) {
        console.error('Error fetching white label config:', error);
        return defaultConfig;
      }
    },
    enabled: !!user?.organization_id,
    initialData: defaultConfig,
  });

  const [config, setConfig] = useState<WhiteLabelConfig>(defaultConfig);

  // Update config when white label config loads
  useEffect(() => {
    if (whiteLabelConfig) {
      setIsWhiteLabelActive(true);
      setConfig(() => ({
        ...defaultConfig,
        ...whiteLabelConfig
      }));
    }
  }, [whiteLabelConfig]);

  // Determine if we should be in white label mode
  const shouldUseWhiteLabel = () => {
    // Use white label when:
    // 1. Organization has white label enabled (from database)
    // 2. When on white label settings page for preview
    // 3. When explicitly enabled by user for testing
    const pathname = location.pathname;
    return isWhiteLabelActive || 
           pathname === '/white-label' || 
           pathname.startsWith('/white-label/') ||
           pathname === '/settings'; // Also apply on settings page for immediate preview
  };

  const updateConfig = (newConfig: Partial<WhiteLabelConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      // Remove localStorage dependency - now saved to database via API
      return updated;
    });
  };

  const applyBranding = () => {
    const root = document.documentElement;
    const useWhiteLabel = shouldUseWhiteLabel();
    
    // Applying branding configuration
    
    if (useWhiteLabel) {
      // Apply white label branding - convert hex to HSL for CSS variables
      const primaryHsl = hexToHsl(config.primaryColor);
      const secondaryHsl = hexToHsl(config.secondaryColor);
      const accentHsl = hexToHsl(config.accentColor);
      
      // Setting CSS variables for dynamic theming
      
      root.style.setProperty('--primary', primaryHsl);
      root.style.setProperty('--secondary', secondaryHsl);
      root.style.setProperty('--accent', accentHsl);
      root.style.setProperty('--foreground', primaryHsl);
      root.style.setProperty('--muted-foreground', secondaryHsl);
      
      // Also set the hex values for components that might expect them
      root.style.setProperty('--primary-hex', config.primaryColor);
      root.style.setProperty('--secondary-hex', config.secondaryColor);
      root.style.setProperty('--accent-hex', config.accentColor);
      
      document.title = `${config.companyName} - Travel Management`;
      
      if (config.favicon) {
        const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (favicon) {
          favicon.href = config.favicon;
        }
      }
    } else {
      // Apply default NestMap branding
      const defaultPrimaryHsl = hexToHsl(defaultConfig.primaryColor);
      const defaultSecondaryHsl = hexToHsl(defaultConfig.secondaryColor);
      const defaultAccentHsl = hexToHsl(defaultConfig.accentColor);
      
      root.style.setProperty('--primary', defaultPrimaryHsl);
      root.style.setProperty('--secondary', defaultSecondaryHsl);
      root.style.setProperty('--accent', defaultAccentHsl);
      root.style.setProperty('--foreground', defaultPrimaryHsl);
      root.style.setProperty('--muted-foreground', defaultSecondaryHsl);
      
      root.style.setProperty('--primary-hex', defaultConfig.primaryColor);
      root.style.setProperty('--secondary-hex', defaultConfig.secondaryColor);
      root.style.setProperty('--accent-hex', defaultConfig.accentColor);
      
      document.title = `${defaultConfig.companyName} - Travel Management`;
    }
  };

  const resetToDefault = () => {
    setConfig(defaultConfig);
    localStorage.removeItem('whiteLabelConfig');
    setIsWhiteLabelActive(false);
    applyBranding();
  };

  const enableWhiteLabel = () => {
    setIsWhiteLabelActive(true);
  };

  const disableWhiteLabel = () => {
    setIsWhiteLabelActive(false);
  };

  // Apply branding on mount and when relevant dependencies change
  useEffect(() => {
    applyBranding();
  }, [config, isWhiteLabelActive, location]);

  const forceApplyBranding = () => {
    // Force applying branding with current configuration
    applyBranding();
  };

  return (
    <WhiteLabelContext.Provider value={{ 
      config, 
      updateConfig, 
      applyBranding: forceApplyBranding, 
      resetToDefault,
      isWhiteLabelActive,
      enableWhiteLabel,
      disableWhiteLabel
    }}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

export function useWhiteLabel() {
  const context = useContext(WhiteLabelContext);
  if (context === undefined) {
    throw new Error('useWhiteLabel must be used within a WhiteLabelProvider');
  }
  return context;
}
