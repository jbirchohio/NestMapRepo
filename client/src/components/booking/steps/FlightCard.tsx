import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Plane, Users, Check, X } from 'lucide-react';
import { Flight } from '../types';

interface FlightCardProps {
  flight: Flight;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onClear: () => void;
}

export const FlightCard = ({ flight, isSelected, onSelect, onClear }: FlightCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const toggleDetails = () => setShowDetails(!showDetails);

  const formatTime = (time: string) => {
    return format(new Date(time), 'h:mm a');
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy');
  };

  // Helper function to safely get price amount
  const getPriceAmount = (flight: Flight): number => {
    if (typeof flight.price === 'number') {
      return flight.price;
    }
    
    if (flight.price && typeof flight.price === 'object') {
      const priceObj = flight.price as { amount?: number };
      return priceObj.amount || 0;
    }
    
    return 0;
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'hover:border-blue-300'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Flight Information */}
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Plane className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <div className="font-medium">
              {flight.airline ?? (flight.segments && flight.segments[0]?.carrier.name) ?? 'Unknown Airline'} {flight.flightNumber ?? (flight.segments && flight.segments[0]?.flightNumber) ?? ''}
            </div>
            <div className="text-sm text-muted-foreground">
              {flight.segments?.[0]?.departure.airport.name || 'Unknown'} → {flight.segments?.[flight.segments.length - 1]?.arrival.airport.name || 'Unknown'}
            </div>
          </div>
        </div>

        {/* Flight Times */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <div className="font-medium">{flight.departureTime ? formatTime(flight.departureTime) : 'N/A'}</div>
            <div className="text-muted-foreground">{flight.departureTime ? formatDate(flight.departureTime) : 'N/A'}</div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">{flight.arrivalTime ? formatTime(flight.arrivalTime) : 'N/A'}</div>
            <div className="text-muted-foreground">{flight.arrivalTime ? formatDate(flight.arrivalTime) : 'N/A'}</div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">
              ${getPriceAmount(flight)}
            </div>
            <div className="text-muted-foreground">
              {flight.stops !== undefined ? (flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`) : 'Unknown'}
            </div>
          </div>
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
              onClick={() => onSelect(true)}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Select Flight
            </Button>
          )}
        </div>
      </div>

      {/* Flight Details */}
      <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 text-sm">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{flight.duration}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          <span>{flight.stops !== undefined ? (flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`) : 'Unknown'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>Seats available</span>
        </div>
        <Badge variant="outline" className="ml-auto capitalize">
          {flight.cabin || 'Economy'}
        </Badge>
      </div>

      {/* Flight Details Toggle */}
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
              <Calendar className="h-4 w-4" />
              <span>Departure: {flight.departureTime ? formatDate(flight.departureTime) : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Duration: {flight.duration || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Seats Available: Available</span>
            </div>
            {flight.stops !== undefined && flight.stops > 0 && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Stops: {flight.stops} stop{flight.stops > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
