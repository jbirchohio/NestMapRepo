
import { useWhiteLabel } from '@/contexts/WhiteLabelContext';
import { Separator } from '@/components/ui/separator';

export default function BrandedFooter() {
  const { config, isWhiteLabelActive } = useWhiteLabel();
  
  // Use default branding if white label is not active
  const activeConfig = isWhiteLabelActive ? config : {
    companyName: "Remvana",
    tagline: "AI-Powered Corporate Travel Management",
    footerText: "© 2025 Remvana. All rights reserved.",
    enableMobileApp: true,
    supportEmail: undefined,
    helpUrl: undefined,
    companyWebsite: undefined,
    privacyPolicyUrl: undefined,
    termsOfServiceUrl: undefined
  };

  return (
    <footer 
      className={`border-t backdrop-blur-sm mt-auto ${
        isWhiteLabelActive 
          ? 'bg-white/80 dark:bg-navy-800/80' 
          : 'border-electric-200/30 dark:border-electric-700/30 bg-white/80 dark:bg-navy-800/80'
      }`}
      style={isWhiteLabelActive ? {
        borderTopColor: `${config.primaryColor}30`
      } : {}}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div 
                className={`h-6 w-6 rounded flex items-center justify-center text-white font-bold text-xs shadow-sm ${
                  isWhiteLabelActive 
                    ? '' 
                    : 'bg-gradient-to-br from-electric-500 to-electric-600'
                }`}
                style={isWhiteLabelActive ? {
                  background: `linear-gradient(to bottom right, ${config.primaryColor || '#6D5DFB'}, ${config.secondaryColor || '#6D5DFB'})`
                } : {}}
              >
                {activeConfig.companyName.charAt(0)}
              </div>
              <span 
                className={`font-semibold ${
                  isWhiteLabelActive 
                    ? 'bg-clip-text text-transparent' 
                    : 'bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent'
                }`}
                style={isWhiteLabelActive ? {
                  backgroundImage: `linear-gradient(to right, ${config.primaryColor || '#6D5DFB'}, ${config.secondaryColor || '#6D5DFB'})`
                } : {}}
              >
                {activeConfig.companyName}
              </span>
            </div>
            {activeConfig.tagline && (
              <p className="text-sm text-navy-600 dark:text-navy-400">
                {activeConfig.tagline}
              </p>
            )}
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-navy-700 dark:text-navy-200">Product</h4>
            <div className="space-y-2">
              <a 
                href="/" 
                className={`block text-sm text-navy-600 dark:text-navy-400 transition-colors duration-200 ${
                  isWhiteLabelActive 
                    ? 'hover:opacity-80' 
                    : 'hover:text-electric-600 dark:hover:text-electric-400'
                }`}

                onMouseEnter={(e) => {
                  if (isWhiteLabelActive) {
                    e.currentTarget.style.color = config.primaryColor || '#6D5DFB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isWhiteLabelActive) {
                    e.currentTarget.style.color = '';
                  }
                }}
              >
                Dashboard
              </a>
              <a 
                href="/analytics" 
                className={`block text-sm text-navy-600 dark:text-navy-400 transition-colors duration-200 ${
                  isWhiteLabelActive 
                    ? 'hover:opacity-80' 
                    : 'hover:text-electric-600 dark:hover:text-electric-400'
                }`}
                onMouseEnter={(e) => {
                  if (isWhiteLabelActive) {
                    e.currentTarget.style.color = config.primaryColor || '#6D5DFB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isWhiteLabelActive) {
                    e.currentTarget.style.color = '';
                  }
                }}
              >
                Analytics
              </a>
              {activeConfig.enableMobileApp && (
                <a 
                  href="#" 
                  className={`block text-sm text-navy-600 dark:text-navy-400 transition-colors duration-200 ${
                    isWhiteLabelActive 
                      ? 'hover:opacity-80' 
                      : 'hover:text-electric-600 dark:hover:text-electric-400'
                  }`}
                  onMouseEnter={(e) => {
                    if (isWhiteLabelActive) {
                      e.currentTarget.style.color = config.primaryColor || '#6D5DFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isWhiteLabelActive) {
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  Mobile App
                </a>
              )}
            </div>
          </div>

          {/* Support Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-navy-700 dark:text-navy-200">Support</h4>
            <div className="space-y-2">
              {activeConfig.helpUrl && (
                <a 
                  href={activeConfig.helpUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`block text-sm text-navy-600 dark:text-navy-400 transition-colors duration-200 ${
                    isWhiteLabelActive 
                      ? 'hover:opacity-80' 
                      : 'hover:text-electric-600 dark:hover:text-electric-400'
                  }`}
                  onMouseEnter={(e) => {
                    if (isWhiteLabelActive) {
                      e.currentTarget.style.color = config.primaryColor || '#6D5DFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isWhiteLabelActive) {
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  Help Center
                </a>
              )}
              {activeConfig.supportEmail && (
                <a 
                  href={`mailto:${activeConfig.supportEmail}`}
                  className={`block text-sm text-navy-600 dark:text-navy-400 transition-colors duration-200 ${
                    isWhiteLabelActive 
                      ? 'hover:opacity-80' 
                      : 'hover:text-electric-600 dark:hover:text-electric-400'
                  }`}
                  onMouseEnter={(e) => {
                    if (isWhiteLabelActive) {
                      e.currentTarget.style.color = config.primaryColor || '#6D5DFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isWhiteLabelActive) {
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  Contact Support
                </a>
              )}
            </div>
          </div>

          {/* Company Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-navy-700 dark:text-navy-200">Company</h4>
            <div className="space-y-2">
              {activeConfig.companyWebsite && (
                <a 
                  href={activeConfig.companyWebsite} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`block text-sm text-navy-600 dark:text-navy-400 transition-colors duration-200 ${
                    isWhiteLabelActive 
                      ? 'hover:opacity-80' 
                      : 'hover:text-electric-600 dark:hover:text-electric-400'
                  }`}
                  onMouseEnter={(e) => {
                    if (isWhiteLabelActive) {
                      e.currentTarget.style.color = config.primaryColor || '#6D5DFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isWhiteLabelActive) {
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  About Us
                </a>
              )}
              {activeConfig.privacyPolicyUrl && (
                <a 
                  href={activeConfig.privacyPolicyUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`block text-sm text-navy-600 dark:text-navy-400 transition-colors duration-200 ${
                    isWhiteLabelActive 
                      ? 'hover:opacity-80' 
                      : 'hover:text-electric-600 dark:hover:text-electric-400'
                  }`}
                  onMouseEnter={(e) => {
                    if (isWhiteLabelActive) {
                      e.currentTarget.style.color = config.primaryColor || '#6D5DFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isWhiteLabelActive) {
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  Privacy Policy
                </a>
              )}
              {activeConfig.termsOfServiceUrl && (
                <a 
                  href={activeConfig.termsOfServiceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`block text-sm text-slate-600 dark:text-slate-400 transition-colors duration-200 ${
                    isWhiteLabelActive 
                      ? 'hover:opacity-80' 
                      : 'hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                  onMouseEnter={(e) => {
                    if (isWhiteLabelActive) {
                      e.currentTarget.style.color = config.primaryColor || '#6D5DFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isWhiteLabelActive) {
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  Terms of Service
                </a>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Copyright */}
        <div className="text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {activeConfig.footerText}
          </p>
        </div>
      </div>
    </footer>
  );
}