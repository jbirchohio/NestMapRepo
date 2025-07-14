import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { FlightSearchParams } from '../types/flight';
import { Flight } from '../types/flight';
import { CabinType } from '../types/booking';
import { FlightCard } from './FlightCard';

interface FlightSelectionStepProps {
  formData: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    cabin: CabinType; // 'economy' | 'premium-economy' | 'business' | 'first'
  };
  onBack: () => void;
  onNext: () => void;
}

export const FlightSelectionStep = ({ formData, onBack, onNext }: FlightSelectionStepProps) => {
  const [searchParams, setSearchParams] = useState<FlightSearchParams>({
    origin: formData.origin,
    destination: formData.destination,
    departureDate: formData.departureDate,
    returnDate: formData.returnDate,
    passengers: { 
      adults: formData.passengers,
      children: 0,
      infants: 0 
    },
    cabin: formData.cabin as 'economy' | 'premium-economy' | 'business' | 'first',
    directOnly: false,
  });

  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutbound, setSelectedOutbound] = useState<Flight | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<Flight | null>(null);

  const searchFlights = useCallback(async () => {
    if (!searchParams.origin || !searchParams.destination || !searchParams.departureDate) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/flights/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch flights');
      }

      const data = await response.json();
      setFlights(data.flights || []);
    } catch (err) {
      console.error('Error searching flights:', err);
      setError('Failed to search for flights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  const handleSelectFlight = useCallback((flight: Flight, type: 'outbound' | 'return') => {
    if (type === 'outbound') {
      setSelectedOutbound(flight);
    } else {
      setSelectedReturn(flight);
    }
  }, []);

  const handleClearSelection = useCallback((type: 'outbound' | 'return') => {
    if (type === 'outbound') {
      setSelectedOutbound(null);
    } else {
      setSelectedReturn(null);
    }
  }, []);

  useEffect(() => {
    searchFlights();
  }, [searchFlights]);

  const canProceed = selectedOutbound !== null && (!formData.returnDate || selectedReturn !== null);

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Departure Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {searchParams.departureDate ? (
                      format(new Date(searchParams.departureDate), 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={searchParams.departureDate ? new Date(searchParams.departureDate) : undefined}
                    onSelect={(date) => {
                      setSearchParams((prev) => ({
                        ...prev,
                        departureDate: date ? date.toISOString().split('T')[0] : prev.departureDate,
                      }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {formData.returnDate && (
              <div>
                <Label>Return Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {searchParams.returnDate ? (
                        format(new Date(searchParams.returnDate), 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={searchParams.returnDate ? new Date(searchParams.returnDate) : undefined}
                      onSelect={(date) => {
                        setSearchParams((prev) => ({
                          ...prev,
                          returnDate: date?.toISOString().split('T')[0],
                        }));
                      }}
                      initialFocus
                      disabled={(date) => date < new Date(searchParams.departureDate)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div>
              <Label>Cabin Class</Label>
              <Select
                value={searchParams.cabin}
                onValueChange={(value: CabinType) => {
                  setSearchParams((prev) => ({
                    ...prev,
                    cabin: value,
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select cabin class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy</SelectItem>
                  <SelectItem value="premium-economy">Premium Economy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first">First Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flight Results */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Available Flights</h3>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center p-4">
            <p className="text-red-500">{error}</p>
            <Button
              variant="outline"
              onClick={searchFlights}
              className="mt-2"
            >
              Retry Search
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {flights.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                isSelected={flight.id === (formData.returnDate ? selectedReturn?.id : selectedOutbound?.id)}
                onSelect={() => handleSelectFlight(flight, formData.returnDate ? 'return' : 'outbound')}
                onClear={() => handleClearSelection(formData.returnDate ? 'return' : 'outbound')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          {canProceed ? 'Next' : 'Select flights first'}
        </Button>
      </div>
    </div>
  );
};
