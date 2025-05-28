import React, { createContext, useContext, useState, useEffect } from 'react';

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
  const [config, setConfig] = useState<WhiteLabelConfig>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('whiteLabelConfig');
    return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
  });

  const updateConfig = (newConfig: Partial<WhiteLabelConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('whiteLabelConfig', JSON.stringify(updated));
      return updated;
    });
  };

  const applyBranding = () => {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    root.style.setProperty('--primary', config.primaryColor);
    root.style.setProperty('--secondary', config.secondaryColor);
    root.style.setProperty('--accent', config.accentColor);
    
    // Update document title
    document.title = `${config.companyName} - Travel Management`;
    
    // Update favicon if provided
    if (config.favicon) {
      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (favicon) {
        favicon.href = config.favicon;
      }
    }
  };

  const resetToDefault = () => {
    setConfig(defaultConfig);
    localStorage.removeItem('whiteLabelConfig');
    applyBranding();
  };

  // Apply branding on mount and config changes
  useEffect(() => {
    applyBranding();
  }, [config]);

  return (
    <WhiteLabelContext.Provider value={{ config, updateConfig, applyBranding, resetToDefault }}>
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