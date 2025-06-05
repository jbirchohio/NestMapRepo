import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './JWTAuthContext';
import { useLocation } from 'wouter';
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

const WhiteLabelContext = createContext<WhiteLabelContextType | undefined>(undefined);

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [isWhiteLabelActive, setIsWhiteLabelActive] = useState(false);
  
  // Load branding configuration from database
  const { data: brandingData } = useQuery<{
    isWhiteLabelActive: boolean;
    config: Partial<WhiteLabelConfig>;
  }>({
    queryKey: ['/api/white-label/config'],
    enabled: !!user // Only fetch when user is authenticated
  });

  const [config, setConfig] = useState<WhiteLabelConfig>(defaultConfig);

  // Update config when branding data loads from database
  useEffect(() => {
    if (brandingData && typeof brandingData === 'object') {
      setIsWhiteLabelActive(brandingData.isWhiteLabelActive || false);
      if (brandingData.config && typeof brandingData.config === 'object') {
        setConfig({
          ...defaultConfig,
          ...brandingData.config
        });
      }
    }
  }, [brandingData]);

  // Determine if we should be in white label mode
  const shouldUseWhiteLabel = () => {
    // Only use white label in specific contexts:
    // 1. When explicitly enabled by user
    // 2. When on white label settings page
    // 3. When organization has white label enabled and user is in org context
    return isWhiteLabelActive || 
           location === '/white-label' || 
           location.startsWith('/white-label/');
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
    
    if (shouldUseWhiteLabel()) {
      // Apply white label branding
      root.style.setProperty('--primary', config.primaryColor);
      root.style.setProperty('--secondary', config.secondaryColor);
      root.style.setProperty('--accent', config.accentColor);
      document.title = `${config.companyName} - Travel Management`;
      
      if (config.favicon) {
        const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (favicon) {
          favicon.href = config.favicon;
        }
      }
    } else {
      // Apply default NestMap branding
      root.style.setProperty('--primary', defaultConfig.primaryColor);
      root.style.setProperty('--secondary', defaultConfig.secondaryColor);
      root.style.setProperty('--accent', defaultConfig.accentColor);
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

  return (
    <WhiteLabelContext.Provider value={{ 
      config, 
      updateConfig, 
      applyBranding, 
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