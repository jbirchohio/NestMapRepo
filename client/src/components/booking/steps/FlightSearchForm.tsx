import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { Calendar as CalendarIcon, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FlightSearchParams } from '@shared/schema/types/flight';
import { MOCK_AIRPORTS, CABIN_CLASSES } from '@/utils/mockFlights';

interface FlightSearchFormProps {
  initialValues: Partial<FlightSearchParams>;
  isRoundTrip: boolean;
  onSearch: (values: FlightSearchParams) => void;
  onToggleRoundTrip: () => void;
  isLoading?: boolean;
}

export const FlightSearchForm: React.FC<FlightSearchFormProps> = ({
  initialValues,
  isRoundTrip,
  onSearch,
  onToggleRoundTrip,
  isLoading = false,
}) => {
  const [origin, setOrigin] = useState(initialValues.origin || '');
  const [destination, setDestination] = useState(initialValues.destination || '');
  const [departureDate, setDepartureDate] = useState<Date>(
    initialValues.departureDate ? new Date(initialValues.departureDate) : new Date()
  );
  const [returnDate, setReturnDate] = useState<Date | undefined>(
    initialValues.returnDate ? new Date(initialValues.returnDate) : undefined
  );
  const [passengers, setPassengers] = useState(initialValues.passengers?.adults || 1);
  const [cabin, setCabin] = useState<FlightSearchParams['cabin']>(initialValues.cabin || 'economy');
  
  const [airportSuggestions, setAirportSuggestions] = useState({
    origin: [] as typeof MOCK_AIRPORTS,
    destination: [] as typeof MOCK_AIRPORTS,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!origin || !destination || !departureDate) {
      return;
    }
    
    onSearch({
      origin,
      destination,
      departureDate: format(departureDate, 'yyyy-MM-dd'),
      returnDate: returnDate ? format(returnDate, 'yyyy-MM-dd') : undefined,
      passengers: {
        adults: passengers,
        children: 0,
        infants: 0,
      },
      cabin,
      directOnly: false,
    });
  };

  const handleOriginChange = (value: string) => {
    setOrigin(value);
    if (value.length > 1) {
      const suggestions = MOCK_AIRPORTS.filter(
        airport => 
          airport.iataCode.toLowerCase().includes(value.toLowerCase()) ||
          airport.name.toLowerCase().includes(value.toLowerCase()) ||
          airport.city.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setAirportSuggestions(prev => ({ ...prev, origin: suggestions }));
    } else {
      setAirportSuggestions(prev => ({ ...prev, origin: [] }));
    }
  };

  const handleDestinationChange = (value: string) => {
    setDestination(value);
    if (value.length > 1) {
      const suggestions = MOCK_AIRPORTS.filter(
        airport => 
          airport.iataCode.toLowerCase().includes(value.toLowerCase()) ||
          airport.name.toLowerCase().includes(value.toLowerCase()) ||
          airport.city.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setAirportSuggestions(prev => ({ ...prev, destination: suggestions }));
    } else {
      setAirportSuggestions(prev => ({ ...prev, destination: [] }));
    }
  };

  const swapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    setAirportSuggestions({ origin: [], destination: [] });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Search Flights</CardTitle>
        <CardDescription>Find the best flights for your trip</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            {/* Trip type toggle */}
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Trip Type</div>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant={!isRoundTrip ? 'default' : 'outline'}
                  size="sm"
                  onClick={onToggleRoundTrip}
                >
                  One Way
                </Button>
                <Button
                  type="button"
                  variant={isRoundTrip ? 'default' : 'outline'}
                  size="sm"
                  onClick={onToggleRoundTrip}
                >
                  Round Trip
                </Button>
              </div>
            </div>

            {/* Origin and Destination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin">Leaving from</Label>
                <div className="relative">
                  <Input
                    id="origin"
                    placeholder="City or Airport"
                    value={origin}
                    onChange={(e) => handleOriginChange(e.target.value)}
                    required
                  />
                  {airportSuggestions.origin.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg">
                      {airportSuggestions.origin.map((airport) => (
                        <div
                          key={airport.iataCode}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setOrigin(airport.iataCode);
                            setAirportSuggestions(prev => ({ ...prev, origin: [] }));
                          }}
                        >
                          <div className="font-medium">{airport.city} ({airport.iataCode})</div>
                          <div className="text-sm text-gray-500">{airport.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="destination">Going to</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={swapLocations}
                  >
                    <ArrowRightLeft className="h-3 w-3 mr-1" />
                    Swap
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="destination"
                    placeholder="City or Airport"
                    value={destination}
                    onChange={(e) => handleDestinationChange(e.target.value)}
                    required
                  />
                  {airportSuggestions.destination.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg">
                      {airportSuggestions.destination.map((airport) => (
                        <div
                          key={airport.iataCode}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setDestination(airport.iataCode);
                            setAirportSuggestions(prev => ({ ...prev, destination: [] }));
                          }}
                        >
                          <div className="font-medium">{airport.city} ({airport.iataCode})</div>
                          <div className="text-sm text-gray-500">{airport.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departure-date">Departure</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !departureDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {departureDate ? format(departureDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={departureDate}
                      onSelect={(date) => date && setDepartureDate(date)}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {isRoundTrip && (
                <div className="space-y-2">
                  <Label htmlFor="return-date">Return</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !returnDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {returnDate ? format(returnDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={returnDate}
                        onSelect={(date) => date && setReturnDate(date)}
                        initialFocus
                        disabled={(date) => date < departureDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Passengers and Cabin Class */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passengers">Passengers</Label>
                <Select
                  value={passengers.toString()}
                  onValueChange={(value) => setPassengers(parseInt(value, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select passengers" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'Passenger' : 'Passengers'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cabin">Cabin Class</Label>
                <Select
                  value={cabin}
                  onValueChange={(value) => setCabin(value as FlightSearchParams['cabin'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cabin class" />
                  </SelectTrigger>
                  <SelectContent>
                    {CABIN_CLASSES.map((cabinClass) => (
                      <SelectItem key={cabinClass.value} value={cabinClass.value}>
                        {cabinClass.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search Flights'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
