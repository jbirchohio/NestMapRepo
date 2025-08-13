import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Clock, Star, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ViatorProduct {
  productCode: string;
  productName: string;
  primaryImageURL: string;
  duration?: string;
  fromPrice: number;
  currency: string;
  rating?: number;
  reviewCount?: number;
  cancellationPolicy?: string;
}

interface BookableActivityProps {
  activityTitle: string;
  latitude?: string;
  longitude?: string;
  city?: string;  // Add city prop for better location-specific searches
  onBook?: (product: ViatorProduct) => void;
}

export default function BookableActivity({
  activityTitle,
  latitude,
  longitude,
  city,
  onBook
}: BookableActivityProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ViatorProduct[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-search when component mounts or when location changes
  useEffect(() => {
    if (activityTitle && latitude && longitude && !hasSearched) {
      searchBookableActivities();
    }
  }, [activityTitle, latitude, longitude, city]);

  const searchBookableActivities = async () => {
    if (!activityTitle || !latitude || !longitude) return;

    setLoading(true);
    setHasSearched(true);

    try {
      // Include city in the search to get more relevant, location-specific results
      const searchQuery = city ? `${activityTitle} ${city}` : activityTitle;
      
      const response = await apiRequest('POST', '/api/viator/search', {
        activityName: searchQuery,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        city: city  // Pass city context to the backend
      });

      if (response.activities && response.activities.length > 0) {
        setProducts(response.activities);
      }
    } catch (error) {
      } finally {
      setLoading(false);
    }
  };

  const handleBookActivity = async (product: ViatorProduct) => {
    try {
      // Get affiliate link
      const response = await apiRequest('POST', '/api/viator/affiliate-link', {
        productCode: product.productCode
      });

      // Open in new tab
      window.open(response.affiliateLink, '_blank');

      // Track conversion
      if (onBook) {
        onBook(product);
      }
    } catch (error) {
      }
  };

  // Don't show anything if we don't have location data yet
  if (!latitude || !longitude || !activityTitle) {
    return null;
  }

  // Show loading state while searching
  if (loading) {
    return (
      <div className="mt-4 p-4 border rounded-lg">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Finding bookable tours near you...
        </div>
      </div>
    );
  }

  // Don't show anything if no products found
  if (hasSearched && products.length === 0) {
    return null;
  }

  // Show results
  if (products.length > 0) {
    return (
      <div className="mt-4 space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">🎟️ Book this experience</h4>
        <div className="space-y-2">
          {products.slice(0, 2).map((product) => (
            <Card key={product.productCode} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleBookActivity(product)}>
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {product.primaryImageURL && (
                    <img
                      src={product.primaryImageURL}
                      alt={product.productName}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h5 className="font-medium text-sm line-clamp-2">
                      {product.productName}
                    </h5>

                    <div className="flex items-center gap-2 mt-1">
                      {product.rating && product.rating > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{product.rating.toFixed(1)}</span>
                        </div>
                      )}
                      <span className="text-sm font-bold text-primary">
                        From ${product.fromPrice}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Powered by Viator
        </p>
      </div>
    );
  }

  return null;
}