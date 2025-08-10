import React from 'react';
import { Info } from 'lucide-react';
import { isMonetizationEnabled } from '@/config/affiliates';

interface AffiliateDisclosureProps {
  variant?: 'inline' | 'footer' | 'card';
  className?: string;
}

export default function AffiliateDisclosure({ 
  variant = 'inline',
  className = '' 
}: AffiliateDisclosureProps) {
  
  // Only show if monetization is enabled
  if (!isMonetizationEnabled()) {
    return null;
  }

  if (variant === 'footer') {
    return (
      <div className={`text-center py-4 border-t ${className}`}>
        <p className="text-xs text-gray-500">
          <Info className="inline-block h-3 w-3 mr-1" />
          We earn commission from bookings made through our affiliate links at no extra cost to you. 
          This helps us maintain and improve our free trip planning service.
        </p>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">
              Affiliate Disclosure
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              When you book through our links, we may earn a commission from our partners. 
              This doesn't affect the price you pay and helps support our free service.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <p className={`text-xs text-gray-500 ${className}`}>
      <Info className="inline-block h-3 w-3 mr-1" />
      We earn commission from bookings at no extra cost to you
    </p>
  );
}