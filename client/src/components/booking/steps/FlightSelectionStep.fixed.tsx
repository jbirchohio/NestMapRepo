import { useState, useCallback, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BookingFormData } from '../types';
import type { 
  Flight, 
  FlightSearchParams,
  FlightSegment,
  Airport,
  FlightPrice,
  CabinClass
} from '@shared/types/flight';

// Mock data for airports - replace with actual API call in production
const mockAirports: Airport[] = [
  {
    iataCode: 'JFK',
    code: 'JFK',
    name: 'John F. Kennedy International Airport',
    city: 'New York',
    country: 'United States',
    timezone: 'America/New_York',
    latitude: 40.6413,
    longitude: -73.7781,
  },
  {
    iataCode: 'LAX',
    code: 'LAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles',
    country: 'United States',
    timezone: 'America/Los_Angeles',
    latitude: 33.9416,
    longitude: -118.4085,
  },
  // Add more airports as needed
];

// FlightCard component that works with the Flight type
interface FlightCardProps {
  flight: Flight;
  isSelected: boolean;
  onSelect: (flight: Flight) => void;
  type: 'outbound' | 'return';
}

const FlightCard: React.FC<FlightCardProps> = ({ flight, isSelected, onSelect, type }) => {
  const departureSegment = flight.segments[0];
  const arrivalSegment = flight.segments[flight.segments.length - 1];

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-colors',
        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
      )}
      onClick={() => onSelect(flight)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">
              {departureSegment.departure.iataCode} → {arrivalSegment.arrival.iataCode}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(departureSegment.departure.at), 'h:mm a')} - {format(new Date(arrivalSegment.arrival.at), 'h:mm a')}
            </div>
          </div>
          <div className="text-right">
            {flight.price?.amount && (
              <div className="text-lg font-semibold">
                ${flight.price.amount} {flight.price.currency}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              {type === 'outbound' ? 'Outbound' : 'Return'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface FlightSelectionStepProps {
  formData: BookingFormData;
  onBack: () => void;
  onNext: (data?: Partial<BookingFormData>) => void;
}

const FlightSelectionStep: React.FC<FlightSelectionStepProps> = ({ formData, onBack, onNext }) => {
  const [searchParams, setSearchParams] = useState<FlightSearchParams>({
    cabin: 'economy' as CabinClass,
    origin: '',
    destination: '',
    departureDate: new Date().toISOString(),
    passengers: { adults: 1 },
  });

  const [outboundFlights, setOutboundFlights] = useState<Flight[]>([]);
  const [returnFlights, setReturnFlights] = useState<Flight[]>([]);
  const [selectedOutbound, setSelectedOutbound] = useState<Flight | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<Flight | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock function to simulate flight search
  const searchFlights = useCallback(async (params: FlightSearchParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock flight data - replace with actual API call
      const mockFlight: Flight = {
        id: `flt-${Math.random().toString(36).substr(2, 9)}`,
        bookingReference: `BR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        segments: [
          {
            id: `seg-${Math.random().toString(36).substr(2, 9)}`,
            departure: {
              at: new Date().toISOString(),
              iataCode: params.origin,
              terminal: '1',
            },
            arrival: {
              at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
              iataCode: params.destination,
              terminal: '1',
            },
            carrier: {
              code: 'AA',
              name: 'American Airlines',
            },
            aircraft: {
              code: 'B737',
              name: 'Boeing 737',
            },
            operatingCarrier: {
              code: 'AA',
              name: 'American Airlines',
            },
            duration: 120,
            stops: 0,
            stopDetails: [],
          },
        ],
        price: {
          amount: Math.floor(Math.random() * 500) + 100,
          currency: 'USD',
        },
        cabin: params.cabin || 'economy',
        availableSeats: Math.floor(Math.random() * 10) + 1,
        bookingClass: 'Y',
        fareBasis: 'Y26',
        fareRules: [],
        refundable: false,
        changePenalties: [],
        baggageAllowance: {
          carryOn: 1,
          checked: 1,
        },
        metadata: {},
      };

      return [mockFlight];
    } catch (err) {
      console.error('Error searching flights:', err);
      setError('Failed to search for flights. Please try again.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchParams.origin || !searchParams.destination || !searchParams.departureDate) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const flights = await searchFlights(searchParams);
      setOutboundFlights(flights);
      
      // If it's a round trip, also search for return flights
      if (searchParams.returnDate) {
        const returnParams = {
          ...searchParams,
          origin: searchParams.destination,
          destination: searchParams.origin,
          departureDate: searchParams.returnDate,
        };
        const returnFlights = await searchFlights(returnParams);
        setReturnFlights(returnFlights);
      }
    } catch (err) {
      console.error('Error handling search:', err);
      setError('An error occurred while searching for flights');
    }
  }, [searchParams, searchFlights]);

  const handleFlightSelect = useCallback((flight: Flight, type: 'outbound' | 'return') => {
    if (type === 'outbound') {
      setSelectedOutbound(flight);
    } else {
      setSelectedReturn(flight);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (!selectedOutbound) {
      setError('Please select an outbound flight');
      return;
    }

    if (searchParams.returnDate && !selectedReturn) {
      setError('Please select a return flight');
      return;
    }

    onNext({
      outboundFlight: selectedOutbound,
      returnFlight: selectedReturn,
    });
  }, [onNext, searchParams.returnDate, selectedOutbound, selectedReturn]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="origin">From</Label>
            <Select
              value={searchParams.origin}
              onValueChange={(value) =>
                setSearchParams((prev) => ({
                  ...prev,
                  origin: value,
                }))
              }
            >
              <Select.Trigger>
                <Select.Value placeholder="Select origin" />
              </Select.Trigger>
              <Select.Content>
                {mockAirports.map((airport) => (
                  <Select.Item key={airport.iataCode} value={airport.iataCode}>
                    {airport.name} ({airport.iataCode})
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div>
            <Label htmlFor="destination">To</Label>
            <Select
              value={searchParams.destination}
              onValueChange={(value) =>
                setSearchParams((prev) => ({
                  ...prev,
                  destination: value,
                }))
              }
            >
              <Select.Trigger>
                <Select.Value placeholder="Select destination" />
              </Select.Trigger>
              <Select.Content>
                {mockAirports.map((airport) => (
                  <Select.Item key={airport.iataCode} value={airport.iataCode}>
                    {airport.name} ({airport.iataCode})
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div>
            <Label htmlFor="departureDate">Departure</Label>
            <Popover>
              <Popover.Trigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !searchParams.departureDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {searchParams.departureDate ? (
                    format(new Date(searchParams.departureDate), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </Popover.Trigger>
              <Popover.Content className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={new Date(searchParams.departureDate)}
                  onSelect={(date) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      departureDate: date?.toISOString() || new Date().toISOString(),
                    }))
                  }
                  initialFocus
                />
              </Popover.Content>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search Flights'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-500 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Outbound Flights</h3>
          {outboundFlights.length > 0 ? (
            <div className="space-y-2">
              {outboundFlights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  isSelected={selectedOutbound?.id === flight.id}
                  onSelect={(f) => handleFlightSelect(f, 'outbound')}
                  type="outbound"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {isLoading ? 'Searching for flights...' : 'No outbound flights found'}
            </div>
          )}
        </div>

        {searchParams.returnDate && (
          <div>
            <h3 className="text-lg font-medium mb-4">Return Flights</h3>
            {returnFlights.length > 0 ? (
              <div className="space-y-2">
                {returnFlights.map((flight) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    isSelected={selectedReturn?.id === flight.id}
                    onSelect={(f) => handleFlightSelect(f, 'return')}
                    type="return"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {isLoading ? 'Searching for flights...' : 'No return flights found'}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!selectedOutbound || (searchParams.returnDate && !selectedReturn)}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default FlightSelectionStep;
