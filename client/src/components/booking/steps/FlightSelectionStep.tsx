import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookingFormData, Flight, FlightSearchParams } from '../types';
import { cn } from '@/lib/utils';

// Local components to replace missing UI imports
const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props}>
    {children}
  </div>
);

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
);

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
);

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);

const Select = {
  Trigger: ({ className, children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
    <button
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        className
      )}
      {...props}
    >
      {children}
    </button>
  ),
  Content: ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      className={cn(
        'relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  ),
  Item: ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  ),
  Value: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
    <span className='text-sm font-medium' {...props}>
      {children}
    </span>
  ),
};

const Popover = {
  Trigger: ({ className, children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
    <button className={cn('w-full', className)} {...props}>
      {children}
    </button>
  ),
  Content: ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      className={cn(
        'z-50 w-full rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  ),
};

const Calendar = {
  Root: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('p-3', className)} {...props} />
  ),
  // Add more calendar components as needed
};

// Mock FlightCard component
const FlightCard = ({ flight, selected, onSelect }: { flight: Flight; selected: boolean; onSelect: () => void }) => (
  <div className={`border rounded-lg p-4 mb-4 ${selected ? 'ring-2 ring-blue-500' : ''}`}>
    <div className="flex justify-between items-center">
      <div>
        <div className="font-medium">
          {flight.origin} → {flight.destination}
        </div>
        <div className="text-sm text-gray-500">
          {format(parseISO(flight.departureTime), 'MMM d, yyyy h:mm a')}
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium">${flight.price.toFixed(2)}</div>
        <Button variant={selected ? 'default' : 'outline'} size="sm" onClick={onSelect}>
          {selected ? 'Selected' : 'Select'}
        </Button>
      </div>
    </div>
  </div>
);
interface FlightSelectionStepProps {
  formData: BookingFormData;
  onBack: () => void;
  onNext: (data?: Partial<BookingFormData>) => void;
}
export const FlightSelectionStep: React.FC<FlightSelectionStepProps> = ({ formData, onBack, onNext }) => {
  const [searchParams, setSearchParams] = useState<FlightSearchParams>({
    origin: formData.origin,
    destination: formData.destination,
    departureDate: formData.departureDate,
    returnDate: formData.returnDate,
    passengers: formData.passengers,
    cabin: formData.cabin,
    directOnly: false,
  });

  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutbound, setSelectedOutbound] = useState<Flight | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<Flight | null>(null);
  const [isRoundTrip, setIsRoundTrip] = useState(!!formData.returnDate);
  const handleSearch = useCallback(async () => {
    if (!searchParams.origin || !searchParams.destination || !searchParams.departureDate) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would be an actual API call
      // For now, we'll simulate a delay and return mock data
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock flight data
      const mockFlights: Flight[] = [
        {
          id: '1',
          origin: searchParams.origin,
          destination: searchParams.destination,
          departureTime: new Date(searchParams.departureDate).toISOString(),
          arrivalTime: new Date(
            new Date(searchParams.departureDate).getTime() + (3 * 60 * 60 * 1000)
          ).toISOString(),
          airline: 'NestAir',
          flightNumber: 'NA123',
          price: 299.99,
          cabin: searchParams.cabin || 'economy',
        },
      ];

      setFlights(mockFlights);
    } catch (err) {
      console.error('Error searching flights:', err);
      setError('Failed to search for flights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  const handleContinue = useCallback(() => {
    if (selectedOutbound) {
      onNext({
        selectedFlight: selectedOutbound,
        ...(isRoundTrip && selectedReturn && { returnFlight: selectedReturn }),
      });
    } else {
      setError('Please select an outbound flight');
    }
  }, [selectedOutbound, selectedReturn, isRoundTrip, onNext]);

  const toggleRoundTrip = useCallback(() => {
    setIsRoundTrip(prev => !prev);
    if (isRoundTrip) {
      setSelectedReturn(null);
    }
  }, [isRoundTrip]);
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(searchParams),
            });
            if (!response.ok) {
                throw new Error('Failed to fetch flights');
            }
            const data = await response.json();
            setFlights(data.flights || []);
        }
        catch (err) {
            console.error('Error searching flights:', err);
            setError('Failed to search for flights. Please try again.');
        }
        finally {
            setIsLoading(false);
        }
    }, [searchParams]);
    const handleSelectFlight = useCallback((flight: Flight, type: 'outbound' | 'return') => {
        if (type === 'outbound') {
            setSelectedOutbound(flight);
        }
        else {
            setSelectedReturn(flight);
        }
    }, []);
    const handleClearSelection = useCallback((type: 'outbound' | 'return') => {
        if (type === 'outbound') {
            setSelectedOutbound(null);
        }
        else {
            setSelectedReturn(null);
        }
    }, []);
    useEffect(() => {
        searchFlights();
    }, [searchFlights]);
    const canProceed = selectedOutbound !== null && (!formData.returnDate || selectedReturn !== null);
    return (<div className="space-y-6">
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
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4"/>
                    {searchParams.departureDate ? (format(new Date(searchParams.departureDate), 'PPP')) : (<span>Pick a date</span>)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={searchParams.departureDate ? new Date(searchParams.departureDate) : undefined} onSelect={(date) => {
            setSearchParams((prev) => ({
                ...prev,
                departureDate: date?.toISOString().split('T')[0],
            }));
        }} initialFocus/>
                </PopoverContent>
              </Popover>
            </div>
            {formData.returnDate && (<div>
                <Label>Return Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4"/>
                      {searchParams.returnDate ? (format(new Date(searchParams.returnDate), 'PPP')) : (<span>Pick a date</span>)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={searchParams.returnDate ? new Date(searchParams.returnDate) : undefined} onSelect={(date) => {
                setSearchParams((prev) => ({
                    ...prev,
                    returnDate: date?.toISOString().split('T')[0],
                }));
            }} initialFocus disabled={(date) => date < new Date(searchParams.departureDate)}/>
                  </PopoverContent>
                </Popover>
              </div>)}
            <div>
              <Label>Cabin Class</Label>
              <Select value={searchParams.cabin} onValueChange={(value) => {
            setSearchParams((prev) => ({
                ...prev,
                cabin: value,
            }));
        }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select cabin class"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy</SelectItem>
                  <SelectItem value="premium">Premium Economy</SelectItem>
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
        {isLoading ? (<div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>) : error ? (<div className="text-center p-4">
            <p className="text-red-500">{error}</p>
            <Button variant="outline" onClick={searchFlights} className="mt-2">
              Retry Search
            </Button>
          </div>) : (<div className="space-y-4">
            {flights.map((flight) => (<FlightCard key={flight.id} flight={flight} isSelected={flight.id === (formData.returnDate ? selectedReturn?.id : selectedOutbound?.id)} onSelect={(selected) => handleSelectFlight(flight, formData.returnDate ? 'return' : 'outbound')} onClear={() => handleClearSelection(formData.returnDate ? 'return' : 'outbound')}/>))}
          </div>)}
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
    </div>);
};
