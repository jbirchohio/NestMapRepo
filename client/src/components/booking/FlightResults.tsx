import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Clock, MapPin, Star } from 'lucide-react';
import { format } from 'date-fns';

interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: { amount: number; currency: string };
  cabin: string;
  availability: number;
  bookingUrl: string;
  type?: string;
  departure?: { airport: string; time: string; date: string };
  arrival?: { airport: string; time: string; date: string };
}

interface FlightResultsProps {
  clientInfo: {
    origin: string;
    destination: string;
    departureDate: string;
    tripType: "one-way" | "round-trip";
    returnDate?: string;
    passengers: number;
    cabin: string;
    primaryTraveler: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
    };
    additionalTravelers: Array<{
      firstName: string;
      lastName: string;
      dateOfBirth: string;
    }>;
  };
  flightResults: FlightResult[];
  selectedDepartureFlight: FlightResult | null;
  selectedReturnFlight: FlightResult | null;
  onSelectDepartureFlight: (flight: FlightResult | null) => void;
  onSelectReturnFlight: (flight: FlightResult | null) => void;
  isLoading: boolean;
  onBack: () => void;
  onContinue: () => void;
  currentTravelerIndex: number;
  totalTravelers: number;
  travelerBookings: Array<{
    traveler: string;
    departureFlight?: FlightResult | null;
    returnFlight?: FlightResult | null;
  }>;
}

export function FlightResults({ results, onSelectFlight, isLoading }: FlightResultsProps) {
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'departure'>('price');

  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price.amount - b.price.amount;
      case 'duration':
        return parseInt(a.duration) - parseInt(b.duration);
      case 'departure':
        return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
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
            <span>Searching for flights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Plane className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No flights found for your search criteria.</p>
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
            <span>Flight Results ({results.length})</span>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'price' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('price')}
              >
                Price
              </Button>
              <Button
                variant={sortBy === 'duration' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('duration')}
              >
                Duration
              </Button>
              <Button
                variant={sortBy === 'departure' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('departure')}
              >
                Departure
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Flight Cards */}
      {sortedResults.map((flight) => (
        <Card key={flight.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-lg font-semibold">{flight.airline}</div>
                  <Badge variant="outline">{flight.flightNumber}</Badge>
                  <Badge variant={flight.stops === 0 ? 'default' : 'secondary'}>
                    {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  {/* Departure */}
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {format(new Date(flight.departureTime), 'HH:mm')}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {flight.origin}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(flight.departureTime), 'MMM dd')}
                    </div>
                  </div>

                  {/* Flight Path */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <div className="h-px bg-border flex-1"></div>
                      <Plane className="h-4 w-4 mx-2 text-muted-foreground" />
                      <div className="h-px bg-border flex-1"></div>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      {flight.duration}
                    </div>
                  </div>

                  {/* Arrival */}
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {format(new Date(flight.arrivalTime), 'HH:mm')}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {flight.destination}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(flight.arrivalTime), 'MMM dd')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <Badge variant="outline">{flight.cabin}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {flight.availability} seats available
                  </span>
                </div>
              </div>

              {/* Price and Book */}
              <div className="ml-6 text-right">
                <div className="text-3xl font-bold text-primary">
                  {flight.price.currency} {flight.price.amount.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground mb-4">per person</div>
                <Button 
                  onClick={() => onSelectFlight(flight)}
                  className="w-full"
                >
                  Select Flight
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}