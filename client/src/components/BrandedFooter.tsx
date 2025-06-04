import React from 'react';
import { useWhiteLabel } from '@/contexts/WhiteLabelContext';
import { Separator } from '@/components/ui/separator';

export default function BrandedFooter() {
  const { config } = useWhiteLabel();

  return (
    <footer className="border-t border-electric-200/30 dark:border-electric-700/30 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div 
                className="h-6 w-6 rounded flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br from-electric-500 to-electric-600 shadow-sm"
              >
                {config.companyName.charAt(0)}
              </div>
              <span className="font-semibold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent">
                {config.companyName}
              </span>
            </div>
            {config.tagline && (
              <p className="text-sm text-navy-600 dark:text-navy-400">
                {config.tagline}
              </p>
            )}
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-navy-700 dark:text-navy-200">Product</h4>
            <div className="space-y-2">
              <a href="/" className="block text-sm text-navy-600 dark:text-navy-400 hover:text-electric-600 dark:hover:text-electric-400 transition-colors duration-200">
                Dashboard
              </a>
              <a href="/analytics" className="block text-sm text-navy-600 dark:text-navy-400 hover:text-electric-600 dark:hover:text-electric-400 transition-colors duration-200">
                Analytics
              </a>
              {config.enableMobileApp && (
                <a href="#" className="block text-sm text-navy-600 dark:text-navy-400 hover:text-electric-600 dark:hover:text-electric-400 transition-colors duration-200">
                  Mobile App
                </a>
              )}
            </div>
          </div>

          {/* Support Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-navy-700 dark:text-navy-200">Support</h4>
            <div className="space-y-2">
              {config.helpUrl && (
                <a 
                  href={config.helpUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-sm text-navy-600 dark:text-navy-400 hover:text-electric-600 dark:hover:text-electric-400 transition-colors duration-200"
                >
                  Help Center
                </a>
              )}
              {config.supportEmail && (
                <a 
                  href={`mailto:${config.supportEmail}`}
                  className="block text-sm text-navy-600 dark:text-navy-400 hover:text-electric-600 dark:hover:text-electric-400 transition-colors duration-200"
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
              {config.companyWebsite && (
                <a 
                  href={config.companyWebsite} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-sm text-navy-600 dark:text-navy-400 hover:text-electric-600 dark:hover:text-electric-400 transition-colors duration-200"
                >
                  About Us
                </a>
              )}
              {config.privacyPolicyUrl && (
                <a 
                  href={config.privacyPolicyUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-sm text-navy-600 dark:text-navy-400 hover:text-electric-600 dark:hover:text-electric-400 transition-colors duration-200"
                >
                  Privacy Policy
                </a>
              )}
              {config.termsOfServiceUrl && (
                <a 
                  href={config.termsOfServiceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
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
            {config.footerText}
          </p>
        </div>
      </div>
    </footer>
  );
}