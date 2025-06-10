import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Star, Clock, MapPin, Home, Users } from 'lucide-react';
import { Hotel } from '../types';

interface HotelCardProps {
  hotel: Hotel;
  isSelected: boolean;
  onSelect: (hotel: Hotel) => void;
  onClear: () => void;
}

export const HotelCard = ({ hotel, isSelected, onSelect, onClear }: HotelCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const toggleDetails = () => setShowDetails(!showDetails);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'text-yellow-500' : 'text-gray-400'}`}
        />
      );
    }
    return stars;
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'hover:border-blue-300'
      }`}
    >
      {/* Hotel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <Home className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <div className="font-medium">{hotel.name}</div>
            <div className="text-sm text-muted-foreground">
              {hotel.address.street}, {hotel.address.city}, {hotel.address.state}
            </div>
          </div>
        </div>

        {/* Hotel Rating and Price */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {formatStars(hotel.rating)}
          </div>
          <div className="font-medium">Starting from {formatPrice(hotel.price.amount)}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isSelected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear Selection
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => onSelect(hotel)}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Select Hotel
            </Button>
          )}
        </div>
      </div>

      {/* Hotel Details */}
      <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 text-sm">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{hotel.checkInTime} - {hotel.checkOutTime}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          <span>{hotel.distanceFromCenter} km from city center</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>{hotel.maxOccupancy} guest{hotel.maxOccupancy !== 1 ? 's' : ''}</span>
        </div>
        <Badge variant="outline" className="ml-auto">
          {hotel.freeCancellation ? 'Free cancellation' : 'Prepayment required'}
        </Badge>
      </div>

      {/* Hotel Details Toggle */}
      <div className="mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDetails}
          className="w-full justify-start"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>

        {showDetails && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>Rating: {hotel.rating} stars</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Check-in: {hotel.checkInTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Check-out: {hotel.checkOutTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Distance: {hotel.distanceFromCenter} km from city center</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {hotel.amenities.map((amenity) => (
                <Badge key={amenity} variant="outline" className="capitalize">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
