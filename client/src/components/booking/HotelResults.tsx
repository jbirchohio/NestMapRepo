import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Wifi, Car, Coffee, Dumbbell } from 'lucide-react';

interface HotelResult {
  id: string;
  name: string;
  address: string;
  starRating: number;
  price: { amount: number; currency: string; per: string };
  amenities: string[];
  images: string[];
  rating: number;
  cancellation: string;
  bookingUrl: string;
}

interface HotelResultsProps {
  clientInfo: any;
  hotelResults: HotelResult[];
  selectedHotel: HotelResult | null;
  onSelectHotel: (hotel: HotelResult) => void;
  travelerBookings: any[];
  onBack: () => void;
  onContinue: () => void;
  isLoading?: boolean;
}

const amenityIcons: Record<string, any> = {
  'Free WiFi': Wifi,
  'Parking': Car,
  'Restaurant': Coffee,
  'Fitness Center': Dumbbell,
};

export function HotelResults({ clientInfo, hotelResults, selectedHotel, onSelectHotel, travelerBookings, onBack, onContinue, isLoading }: HotelResultsProps) {
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'stars'>('price');

  const sortedResults = [...hotelResults].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price.amount - b.price.amount;
      case 'rating':
        return b.rating - a.rating;
      case 'stars':
        return b.starRating - a.starRating;
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Searching for hotels...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hotelResults.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hotels found for your search criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Hotel Results ({hotelResults.length})</span>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'price' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('price')}
              >
                Price
              </Button>
              <Button
                variant={sortBy === 'rating' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('rating')}
              >
                Rating
              </Button>
              <Button
                variant={sortBy === 'stars' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('stars')}
              >
                Stars
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Hotel Cards */}
      {sortedResults.map((hotel) => (
        <Card key={hotel.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex gap-6">
              {/* Hotel Image */}
              {hotel.images[0] && (
                <div className="w-48 h-36 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  <img 
                    src={hotel.images[0]} 
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Hotel Details */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-semibold">{hotel.name}</h3>
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: hotel.starRating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {hotel.address}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {hotel.price.currency} {hotel.price.amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">{hotel.price.per}</div>
                  </div>
                </div>

                {/* Rating and Reviews */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-blue-500 text-blue-500" />
                    <span className="font-semibold">{hotel.rating}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    (Guest Rating)
                  </span>
                </div>

                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {hotel.amenities.slice(0, 4).map((amenity) => {
                    const IconComponent = amenityIcons[amenity];
                    return (
                      <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                        {IconComponent && <IconComponent className="h-3 w-3" />}
                        {amenity}
                      </Badge>
                    );
                  })}
                  {hotel.amenities.length > 4 && (
                    <Badge variant="outline">+{hotel.amenities.length - 4} more</Badge>
                  )}
                </div>

                {/* Cancellation Policy */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">{hotel.cancellation}</span>
                  <Button 
                    onClick={() => onSelectHotel(hotel)}
                    variant={selectedHotel?.id === hotel.id ? "default" : "outline"}
                  >
                    {selectedHotel?.id === hotel.id ? "Selected" : "Select Hotel"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Navigation Controls */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back to Flights
        </Button>
        <Button onClick={onContinue} disabled={!selectedHotel}>
          Continue to Confirmation
        </Button>
      </div>
    </div>
  );
}