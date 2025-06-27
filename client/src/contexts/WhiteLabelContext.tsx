import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/state/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
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
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    return `${h} ${s}% ${l}%`;
}
const WhiteLabelContext = createContext<WhiteLabelContextType>({
  config: defaultConfig,
  updateConfig: () => {},
  isWhiteLabelActive: false,
  enableWhiteLabel: () => { },
  disableWhiteLabel: () => { },
});

export const WhiteLabelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<WhiteLabelConfig>(defaultConfig);
  const [isWhiteLabelActive, setIsWhiteLabelActive] = useState<boolean>(false);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      if (user?.id) {
        try {
          const response = await apiClient.get('/white-label/config');
          if (response.data) {
            setConfig({ ...defaultConfig, ...response.data });
            setIsWhiteLabelActive(true);
            return;
          }
        } catch (error) {
          console.error('Failed to load white label config from API', error);
        }
      }

      const savedConfig = localStorage.getItem('whiteLabelConfig');
      if (savedConfig) {
        try {
          setConfig({ ...defaultConfig, ...JSON.parse(savedConfig) });
          setIsWhiteLabelActive(localStorage.getItem('whiteLabelActive') === 'true');
        } catch (e) {
          console.error('Failed to parse saved white label config', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [user?.id]);

  const updateConfig = useCallback(async (newConfig: Partial<WhiteLabelConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);

    try {
      if (user?.id) {
        await apiClient.put('/white-label/config', updatedConfig);
      } else {
        localStorage.setItem('whiteLabelConfig', JSON.stringify(updatedConfig));
      }
    } catch (error) {
      console.error('Failed to save white label config', error);
      toast({
        title: 'Error',
        description: 'Failed to save white label configuration',
        variant: 'destructive',
      });
      throw error;
    }
  }, [config, user?.id, toast]);

  const applyBranding = useCallback(() => {
    if (!isWhiteLabelActive) return;

    document.documentElement.style.setProperty('--primary', config.primaryColor);
    document.documentElement.style.setProperty('--secondary', config.secondaryColor);
    document.documentElement.style.setProperty('--accent', config.accentColor);

    if (config.favicon) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = config.favicon;
      }
    }

    if (config.companyName && config.companyName !== 'NestMap') {
      document.title = `${config.companyName} | Travel Management`;
    }
  }, [config, isWhiteLabelActive]);

  const resetToDefault = useCallback(() => {
    setConfig(defaultConfig);
    localStorage.removeItem('whiteLabelConfig');
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--secondary');
    document.documentElement.style.removeProperty('--accent');
    document.title = 'NestMap | Travel Management';
  }, []);

  const enableWhiteLabel = useCallback(() => {
    setIsWhiteLabelActive(true);
    localStorage.setItem('whiteLabelActive', 'true');
    applyBranding();
  }, [applyBranding]);

  const disableWhiteLabel = useCallback(() => {
    setIsWhiteLabelActive(false);
    localStorage.setItem('whiteLabelActive', 'false');
    resetToDefault();
  }, [resetToDefault]);

  useEffect(() => {
    applyBranding();
  }, [config, isWhiteLabelActive, location]);

  const forceApplyBranding = () => {
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
    return (<WhiteLabelContext.Provider value={{
            config,
            updateConfig,
            applyBranding: forceApplyBranding,
            resetToDefault,
            isWhiteLabelActive,
            enableWhiteLabel,
            disableWhiteLabel
        }}>
      {children}
    </WhiteLabelContext.Provider>);
}
export function useWhiteLabel() {
    const context = useContext(WhiteLabelContext);
    if (context === undefined) {
        throw new Error('useWhiteLabel must be used within a WhiteLabelProvider');
    }
    return context;
}
