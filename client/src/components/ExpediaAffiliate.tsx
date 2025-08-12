import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Hotel, Plane, Car, Package, Calendar,
  Search, ExternalLink, TrendingUp, DollarSign
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { affiliateConfig, getExpediaAffiliateId } from '@/config/affiliates';

interface ExpediaAffiliateProps {
  destination?: string;
  checkIn?: Date;
  checkOut?: Date;
  variant?: 'compact' | 'full' | 'cta';
  campaign?: string; // Optional campaign tracking
}

export default function ExpediaAffiliate({
  destination = '',
  checkIn,
  checkOut,
  variant = 'full',
  campaign = 'default'
}: ExpediaAffiliateProps) {

  // Format dates for Expedia URL
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Generate Expedia affiliate URLs
  const generateExpediaUrl = (type: 'hotels' | 'flights' | 'packages' | 'cars') => {
    // Use your custom affiliate link
    const baseUrl = affiliateConfig.expedia.baseUrl;

    const params = new URLSearchParams();

    // Add product type
    params.append('product', type);

    // Add destination search
    if (destination) {
      params.append('destination', destination);
    }

    // Add dates if provided
    if (checkIn) {
      params.append('checkin', formatDate(checkIn));
    }
    if (checkOut) {
      params.append('checkout', formatDate(checkOut));
    }

    // Add tracking for analytics
    params.append('utm_source', 'remvana');
    params.append('utm_medium', 'destination_page');
    params.append('utm_campaign', campaign);

    return `${baseUrl}?${params.toString()}`;
  };

  // Track clicks for analytics
  const handleClick = (type: string) => {
    // You can add analytics tracking here
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'affiliate_click', {
        affiliate: 'expedia',
        type: type,
        destination: destination
      });
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleClick('hotels')}
          asChild
        >
          <a href={generateExpediaUrl('hotels')} target="_blank" rel="noopener noreferrer">
            <Hotel className="h-4 w-4 mr-2" />
            Find Hotels
            <ExternalLink className="h-3 w-3 ml-2" />
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleClick('flights')}
          asChild
        >
          <a href={generateExpediaUrl('flights')} target="_blank" rel="noopener noreferrer">
            <Plane className="h-4 w-4 mr-2" />
            Search Flights
            <ExternalLink className="h-3 w-3 ml-2" />
          </a>
        </Button>
      </div>
    );
  }

  if (variant === 'cta') {
    return (
      <Card className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <CardContent className="text-center py-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Package className="h-6 w-6" />
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Save up to 22%
            </Badge>
          </div>
          <h3 className="text-2xl font-bold mb-2">
            Book Your {destination} Trip
          </h3>
          <p className="mb-6 text-white/90">
            Save when you bundle flight + hotel together
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => handleClick('packages')}
            asChild
            className="w-full sm:w-auto"
          >
            <a href={generateExpediaUrl('packages')} target="_blank" rel="noopener noreferrer">
              <Search className="mr-2 h-5 w-5" />
              Search Packages on Expedia
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <p className="text-xs text-white/70 mt-4">
            Powered by Expedia • We earn a commission from bookings
          </p>
        </CardContent>
      </Card>
    );
  }

  // Full variant (default)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Book Your Trip
          </span>
          <Badge variant="secondary">
            <DollarSign className="h-3 w-3 mr-1" />
            Best Prices
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleClick('hotels')}
            asChild
          >
            <a href={generateExpediaUrl('hotels')} target="_blank" rel="noopener noreferrer">
              <Hotel className="h-4 w-4 mr-2 text-blue-600" />
              Hotels
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          </Button>

          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleClick('flights')}
            asChild
          >
            <a href={generateExpediaUrl('flights')} target="_blank" rel="noopener noreferrer">
              <Plane className="h-4 w-4 mr-2 text-purple-600" />
              Flights
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          </Button>

          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleClick('cars')}
            asChild
          >
            <a href={generateExpediaUrl('cars')} target="_blank" rel="noopener noreferrer">
              <Car className="h-4 w-4 mr-2 text-green-600" />
              Car Rental
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          </Button>

          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleClick('packages')}
            asChild
          >
            <a href={generateExpediaUrl('packages')} target="_blank" rel="noopener noreferrer">
              <Package className="h-4 w-4 mr-2 text-orange-600" />
              Packages
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          </Button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900 font-medium mb-1">
            💰 Bundle & Save
          </p>
          <p className="text-xs text-blue-700">
            Book flight + hotel together and save an average of 22% on your trip
          </p>
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center">
          We earn a commission from bookings at no extra cost to you
        </p>
      </CardContent>
    </Card>
  );
}

// Additional component for inline booking links
export function ExpediaBookingButton({
  destination,
  type = 'packages' as 'hotels' | 'flights' | 'packages' | 'cars',
  className = '',
  children
}: {
  destination: string;
  type?: 'hotels' | 'flights' | 'packages' | 'cars';
  className?: string;
  children?: React.ReactNode;
}) {
  const generateUrl = () => {
    const baseUrl = affiliateConfig.expedia.baseUrl;

    const params = new URLSearchParams({
      product: type,
      destination: destination,
      utm_source: 'remvana',
      utm_medium: 'button',
      utm_campaign: `${type}_${destination.toLowerCase().replace(/\s+/g, '_')}`
    });

    return `${baseUrl}?${params.toString()}`;
  };

  const icons = {
    hotels: Hotel,
    flights: Plane,
    packages: Package,
    cars: Car
  };

  const Icon = icons[type];

  return (
    <Button asChild className={className}>
      <a href={generateUrl()} target="_blank" rel="noopener noreferrer">
        <Icon className="h-4 w-4 mr-2" />
        {children || `Book ${type === 'packages' ? 'Trip' : type}`}
        <ExternalLink className="h-3 w-3 ml-2" />
      </a>
    </Button>
  );
}