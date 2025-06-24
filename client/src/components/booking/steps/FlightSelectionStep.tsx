import { useState, useCallback, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { BookingFormData } from '../types';
import type { 
  Flight, 
  FlightSearchParams,
  FlightSegment,
  Airport,
  FlightPrice
} from '@shared/types/flight';

// Local components to replace missing UI imports
const Input = ({ className, ...props }: React.HTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      'block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
);

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

// Define proper types for the Select component
interface SelectProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> & {
  Trigger: React.FC<React.HTMLAttributes<HTMLButtonElement>>;
  Content: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Item: React.FC<{ value: string } & React.HTMLAttributes<HTMLDivElement>>;
  Value: React.FC<{ children: React.ReactNode }>;
} = ({ children, value, onValueChange, ...props }) => {
  return <div {...props}>{children}</div>;
};

Select.Trigger = ({ className, children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
  </button>
);

Select.Content = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

Select.Item = ({ className, children, value, ...props }: { value: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

Select.Value = ({ children, ...props }: { children: React.ReactNode }) => (
  <span className="truncate" {...props}>
    {children}
  </span>
);

// Define proper types for the Popover component
interface PopoverProps {
  children: React.ReactNode;
  className?: string;
}

const Popover: React.FC<PopoverProps> & {
  Trigger: React.FC<React.HTMLAttributes<HTMLButtonElement>>;
  Content: React.FC<React.HTMLAttributes<HTMLDivElement>>;
} = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};

Popover.Trigger = ({ className, children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
  <button className={cn('w-full', className)} {...props}>
    {children}
  </button>
);

Popover.Content = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// Define proper types for the Calendar component
interface CalendarProps {
  mode?: 'single' | 'range' | 'multiple';
  selected?: Date | undefined;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
  disabled?: (date: Date) => boolean;
  initialFocus?: boolean;
  children?: React.ReactNode;
}

const Calendar: React.FC<CalendarProps> = ({
  className,
  children,
  selected,
  onSelect,
  disabled,
  initialFocus = false,
  ...props
}) => {
  return (
    <div
      className={cn('p-3', className)}
      {...props}
      onClick={() => {
        if (onSelect && !disabled?.(new Date())) {
          onSelect(selected);
        }
      }}
    >
      {children || (selected ? selected.toLocaleDateString() : 'Select date')}
    </div>
  );
};

// FlightCard component that works with the Flight type
interface FlightCardProps {
  flight: Flight;
  isSelected: boolean;
  onSelect: (flight: Flight) => void;
  type: 'outbound' | 'return';
}

const FlightCard: React.FC<FlightCardProps> = ({ flight, isSelected, onSelect, type }) => {
  // Safely access the first segment for display
  const firstSegment = flight.segments?.[0];
  const lastSegment = flight.segments?.[flight.segments.length - 1];

  if (!firstSegment || !lastSegment) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 text-gray-500">
        Invalid flight data
      </div>
    );
  }

  const departureTime = firstSegment.departure?.scheduledTime
    ? new Date(firstSegment.departure.scheduledTime)
    : null;
  const arrivalTime = lastSegment.arrival?.scheduledTime
    ? new Date(lastSegment.arrival.scheduledTime)
    : null;
  const departureAirport = firstSegment.departure?.airport?.iataCode || 'N/A';
  const arrivalAirport = lastSegment.arrival?.airport?.iataCode || 'N/A';

  // Safely get airline information
  const airline = {
    code: (firstSegment.operatingCarrier?.iataCode ||
      firstSegment.marketingCarrier?.iataCode ||
      '--') as string,
    name: (typeof firstSegment.operatingCarrier?.name === 'string'
      ? firstSegment.operatingCarrier.name
      : typeof firstSegment.marketingCarrier?.name === 'string'
      ? firstSegment.marketingCarrier.name
      : 'Flight') as string,
  };

  // Calculate duration in minutes
  const durationInMinutes = departureTime && arrivalTime
    ? Math.round((arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60))
    : 0;
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  const stops = flight.segments ? flight.segments.length - 1 : 0;

  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
      }`}
      onClick={() => onSelect(flight)}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium">
          {departureAirport} â†’ {arrivalAirport}
        </div>
        <div className="text-sm text-gray-500">
          {type === 'outbound' ? 'Outbound' : 'Return'}
        </div>
      </div>

      <div className="flex justify-between items-center text-sm mb-2">
        <div>
          <div>Depart: {departureTime ? format(departureTime, 'h:mm a') : 'N/A'}</div>
          <div>Arrive: {arrivalTime ? format(arrivalTime, 'h:mm a') : 'N/A'}</div>
        </div>
        <div className="text-right">
          <div className="font-medium">
            ${flight.price?.totalAmount ? flight.price.totalAmount.toFixed(2) : 'N/A'}
          </div>
          <div className="text-xs text-gray-500">
            {airline.name} {firstSegment.flightNumber || ''}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500">
        <div>
          {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`} â€¢
          {stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`}
        </div>
        <div className="text-right">
          {airline.code}-{firstSegment.flightNumber || '--'}
        </div>
      </div>

      {flight.price?.baggageAllowance && (
        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          Baggage: {flight.price.baggageAllowance.cabin || '--'} cabin,
          {flight.price.baggageAllowance.checked || '--'} checked
        </div>
      )}
    </div>
  );
};

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
    passengers: {
      adults: formData.passengers,
      children: 0,
      infants: 0
    },
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

      // Create mock airport data
      const originAirport = {
        code: searchParams.origin,
        name: `${searchParams.origin} Airport`,
        city: searchParams.origin,
        country: 'USA',
        timezone: 'UTC-5'
      };

      const destinationAirport = {
        code: searchParams.destination,
        name: `${searchParams.destination} Airport`,
        city: searchParams.destination,
        country: 'USA',
        timezone: 'UTC-5'
      };

      // Mock flight data that matches the Flight interface
      const mockFlights: Flight[] = [
        {
          id: '1',
          type: 'departure',
          segments: [
            {
              id: 'seg-1',
              departure: {
                airport: originAirport,
                time: new Date(searchParams.departureDate).toISOString(),
                terminal: '1',
                gate: 'A1'
              },
              arrival: {
                airport: destinationAirport,
                time: new Date(
                  new Date(searchParams.departureDate).getTime() + (3 * 60 * 60 * 1000)
                ).toISOString(),
                terminal: '2',
                gate: 'B2'
              },
              carrier: {
                code: 'NA',
                name: 'NestAir',
                logoUrl: 'https://example.com/logo.png'
              },
              flightNumber: 'NA123',
              aircraft: {
                code: 'B737',
                name: 'Boeing 737'
              },
              duration: 180, // 3 hours in minutes
              cabin: searchParams.cabin || 'economy',
              bookingClass: 'Y',
              fareBasis: 'Y26',
              technicalStops: []
            }
          ],
          price: {
            amount: 299.99,
            currency: 'USD',
            formatted: '$299.99',
            taxes: 50.00,
            fees: 25.00,
            baseFare: 224.99
          },
          duration: 180, // Total duration in minutes
          stops: 0,
          departureTime: new Date(searchParams.departureDate).toISOString(),
          arrivalTime: new Date(
            new Date(searchParams.departureDate).getTime() + (3 * 60 * 60 * 1000)
          ).toISOString(),
          bookingClass: 'Y',
          fareBasis: 'Y26',
          baggageAllowance: {
            cabin: '1 x 7kg',
            checked: '2 x 23kg'
          },
          refundable: true,
          changeable: true,
          availableSeats: 24,
          amenities: ['wifi', 'entertainment', 'power-outlets'],
          metadata: {
            equipmentType: '737-800',
            wifiAvailable: true
          },
          airline: 'NestAir',
          flightNumber: 'NA123',
          cabin: searchParams.cabin || 'economy'
        }
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
    if (!selectedOutbound) {
      setError('Please select an outbound flight');
      return;
    }

    if (isRoundTrip && !selectedReturn) {
      setError('Please select a return flight');
      return;
    }

    onNext({
      selectedFlight: selectedOutbound,
      ...(isRoundTrip && { returnFlight: selectedReturn }),
    });
  }, [selectedOutbound, selectedReturn, isRoundTrip, onNext]);

  const toggleRoundTrip = useCallback(() => {
    setIsRoundTrip(prev => !prev);
    if (isRoundTrip) {
      setSelectedReturn(null);
    }
  }, [isRoundTrip]);

  const searchFlights = useCallback(async () => {
    if (!searchParams) return;
    
    setIsLoading(true);
    setError('');
    
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

  const handleFlightSelect = useCallback((flight: Flight, isReturn: boolean = false) => {
    if (isReturn) {
      setSelectedReturn(flight);
    } else {
      setSelectedOutbound(flight);
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

  const canProceed = selectedOutbound !== null && (!isRoundTrip || selectedReturn !== null);

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
                <Popover.Trigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
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
                    selected={searchParams.departureDate ? new Date(searchParams.departureDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setSearchParams((prev) => ({
                          ...prev,
                          departureDate: date.toISOString().split('T')[0],
                        }));
                      }
                    }}
                    initialFocus
                  />
                </Popover.Content>
              </Popover>
            </div>
            {isRoundTrip && (
              <div>
                <Label>Return Date</Label>
                <Popover>
                  <Popover.Trigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {searchParams.returnDate ? (
                        format(new Date(searchParams.returnDate), 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={searchParams.returnDate ? new Date(searchParams.returnDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setSearchParams((prev) => ({
                            ...prev,
                            returnDate: date.toISOString().split('T')[0],
                          }));
                        }
                      }}
                      initialFocus
                      disabled={(date) => {
                        if (!searchParams.departureDate) return true;
                        return date < new Date(searchParams.departureDate);
                      }}
                    />
                  </Popover.Content>
                </Popover>
              </div>
            )}
            <div>
              <Label>Cabin Class</Label>
              <Select
                value={searchParams.cabin}
                onValueChange={(value) => {
                  setSearchParams((prev) => ({
                    ...prev,
                    cabin: value,
                  }));
                }}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select cabin class" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="economy">Economy</Select.Item>
                  <Select.Item value="premium">Premium Economy</Select.Item>
                  <Select.Item value="business">Business</Select.Item>
                  <Select.Item value="first">First Class</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flight Results */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">
            {isRoundTrip ? 'Outbound Flights' : 'Available Flights'}
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Round trip</span>
            <Button
              variant={isRoundTrip ? 'default' : 'outline'}
              size="sm"
              onClick={toggleRoundTrip}
              className="h-8 px-3"
            >
              {isRoundTrip ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
        {isLoading ? (<div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>) : error ? (<div className="text-center p-4">
            <p className="text-red-500">{error}</p>
            <Button variant="outline" onClick={searchFlights} className="mt-2">
              Retry Search
            </Button>
          </div>) : (<div className="space-y-4">
            {flights.map((flight) => (
              <FlightCard 
                key={flight.id} 
                flight={flight} 
                selected={flight.id === (isRoundTrip ? selectedReturn?.id : selectedOutbound?.id)}
                onSelect={() => handleFlightSelect(flight, isRoundTrip)}
              />
            ))}
          </div>)}
      </div>

      {/* Return Flight Section - Only show when round trip is selected */}
      {isRoundTrip && selectedOutbound && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-medium">Return Flights</h3>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center p-4">
              <p className="text-red-500">{error}</p>
              <Button variant="outline" onClick={searchFlights} className="mt-2">
                Retry Search
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {flights.map((flight) => (
                <FlightCard 
                  key={flight.id} 
                  flight={flight} 
                  selected={flight.id === selectedReturn?.id}
                  onSelect={() => handleFlightSelect(flight, true)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleContinue} 
          disabled={!canProceed}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isRoundTrip && !selectedReturn ? 'Skip Return Flight' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};

// Local components to replace missing UI imports
const Input = ({ className, ...props }: React.HTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      'block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
);

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

// Define proper types for the Select component
interface SelectProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> & {
  Trigger: React.FC<React.HTMLAttributes<HTMLButtonElement>>;
  Content: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Item: React.FC<{ value: string } & React.HTMLAttributes<HTMLDivElement>>;
  Value: React.FC<{ children: React.ReactNode }>;
} = ({ children, value, onValueChange, ...props }) => {
  return <div {...props}>{children}</div>;
};

Select.Trigger = ({ className, children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
  </button>
);

Select.Content = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

Select.Item = ({ className, children, value, ...props }: { value: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

Select.Value = ({ children, ...props }: { children: React.ReactNode }) => (
  <span className="truncate" {...props}>
    {children}
  </span>
);

// Define proper types for the Popover component
interface PopoverProps {
  children: React.ReactNode;
  className?: string;
}

const Popover: React.FC<PopoverProps> & {
  Trigger: React.FC<React.HTMLAttributes<HTMLButtonElement>>;
  Content: React.FC<React.HTMLAttributes<HTMLDivElement>>;
} = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};

Popover.Trigger = ({ className, children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
  <button className={cn('w-full', className)} {...props}>
    {children}
  </button>
);

Popover.Content = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// Define proper types for the Calendar component
interface CalendarProps {
  mode?: 'single' | 'range' | 'multiple';
  selected?: Date | undefined;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
  disabled?: (date: Date) => boolean;
  initialFocus?: boolean;
  children?: React.ReactNode;
}

const Calendar: React.FC<CalendarProps> = ({
  className,
  children,
  selected,
  onSelect,
  disabled,
  initialFocus = false,
  ...props
}) => {
  return (
    <div
      className={cn('p-3', className)}
      {...props}
      onClick={() => {
        if (onSelect && !disabled?.(new Date())) {
          onSelect(selected);
        }
      }}
    >
      {children || (selected ? selected.toLocaleDateString() : 'Select date')}
    </div>
  );
};

// FlightCard component that works with the Flight type
interface FlightCardProps {
  flight: Flight;
  isSelected: boolean;
  onSelect: (flight: Flight) => void;
  type: 'outbound' | 'return';
}

const FlightCard: React.FC<FlightCardProps> = ({ flight, isSelected, onSelect, type }) => {
  // Safely access the first segment for display
  const firstSegment = flight.segments?.[0];
  const lastSegment = flight.segments?.[flight.segments.length - 1];

  if (!firstSegment || !lastSegment) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 text-gray-500">
        Invalid flight data
      </div>
    );
  }

  const departureTime = firstSegment.departure?.scheduledTime
    ? new Date(firstSegment.departure.scheduledTime)
    : null;
  const arrivalTime = lastSegment.arrival?.scheduledTime
    ? new Date(lastSegment.arrival.scheduledTime)
    : null;
  const departureAirport = firstSegment.departure?.airport?.iataCode || 'N/A';
  const arrivalAirport = lastSegment.arrival?.airport?.iataCode || 'N/A';

  // Safely get airline information
  const airline = {
    code: (firstSegment.operatingCarrier?.iataCode ||
      firstSegment.marketingCarrier?.iataCode ||
      '--') as string,
    name: (typeof firstSegment.operatingCarrier?.name === 'string'
      ? firstSegment.operatingCarrier.name
      : typeof firstSegment.marketingCarrier?.name === 'string'
      ? firstSegment.marketingCarrier.name
      : 'Flight') as string,
  };

  // Calculate duration in minutes
  const durationInMinutes = departureTime && arrivalTime
    ? Math.round((arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60))
    : 0;
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  const stops = flight.segments ? flight.segments.length - 1 : 0;

  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
      }`}
      onClick={() => onSelect(flight)}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium">
          {departureAirport} â†’ {arrivalAirport}
        </div>
        <div className="text-sm text-gray-500">
          {type === 'outbound' ? 'Outbound' : 'Return'}
        </div>
      </div>

      <div className="flex justify-between items-center text-sm mb-2">
        <div>
          <div>Depart: {departureTime ? format(departureTime, 'h:mm a') : 'N/A'}</div>
          <div>Arrive: {arrivalTime ? format(arrivalTime, 'h:mm a') : 'N/A'}</div>
        </div>
        <div className="text-right">
          <div className="font-medium">
            ${flight.price?.totalAmount ? flight.price.totalAmount.toFixed(2) : 'N/A'}
          </div>
          <div className="text-xs text-gray-500">
            {airline.name} {firstSegment.flightNumber || ''}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500">
        <div>
          {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`} â€¢
          {stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`}
        </div>
        <div className="text-right">
          {airline.code}-{firstSegment.flightNumber || '--'}
        </div>
      </div>

      {flight.price?.baggageAllowance && (
        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          Baggage: {flight.price.baggageAllowance.cabin || '--'} cabin,
          {flight.price.baggageAllowance.checked || '--'} checked
        </div>
      )}
    </div>
  );
};

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
    passengers: {
      adults: formData.passengers,
      children: 0,
      infants: 0
    },
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

      // Create mock airport data
      const originAirport = {
        code: searchParams.origin,
        name: `${searchParams.origin} Airport`,
        city: searchParams.origin,
        country: 'USA',
        timezone: 'UTC-5'
      };

      const destinationAirport = {
        code: searchParams.destination,
        name: `${searchParams.destination} Airport`,
        city: searchParams.destination,
        country: 'USA',
        timezone: 'UTC-5'
      };

      // Mock flight data that matches the Flight interface
      const mockFlights: Flight[] = [
        {
          id: '1',
          type: 'departure',
          segments: [
            {
              id: 'seg-1',
              departure: {
                airport: originAirport,
                time: new Date(searchParams.departureDate).toISOString(),
                terminal: '1',
                gate: 'A1'
              },
              arrival: {
                airport: destinationAirport,
                time: new Date(
                  new Date(searchParams.departureDate).getTime() + (3 * 60 * 60 * 1000)
                ).toISOString(),
                terminal: '2',
                gate: 'B2'
              },
              carrier: {
                code: 'NA',
                name: 'NestAir',
                logoUrl: 'https://example.com/logo.png'
              },
              flightNumber: 'NA123',
              aircraft: {
                code: 'B737',
                name: 'Boeing 737'
              },
              duration: 180, // 3 hours in minutes
              cabin: searchParams.cabin || 'economy',
              bookingClass: 'Y',
              fareBasis: 'Y26',
              technicalStops: []
            }
          ],
          price: {
            amount: 299.99,
            currency: 'USD',
            formatted: '$299.99',
            taxes: 50.00,
            fees: 25.00,
            baseFare: 224.99
          },
          duration: 180, // Total duration in minutes
          stops: 0,
          departureTime: new Date(searchParams.departureDate).toISOString(),
          arrivalTime: new Date(
            new Date(searchParams.departureDate).getTime() + (3 * 60 * 60 * 1000)
          ).toISOString(),
          bookingClass: 'Y',
          fareBasis: 'Y26',
          baggageAllowance: {
            cabin: '1 x 7kg',
            checked: '2 x 23kg'
          },
          refundable: true,
          changeable: true,
          availableSeats: 24,
          amenities: ['wifi', 'entertainment', 'power-outlets'],
          metadata: {
            equipmentType: '737-800',
            wifiAvailable: true
          },
          airline: 'NestAir',
          flightNumber: 'NA123',
          cabin: searchParams.cabin || 'economy'
        }
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
    if (!selectedOutbound) {
      setError('Please select an outbound flight');
      return;
    }

    if (isRoundTrip && !selectedReturn) {
      setError('Please select a return flight');
      return;
    }

    onNext({
      selectedFlight: selectedOutbound,
      ...(isRoundTrip && { returnFlight: selectedReturn }),
    });
  }, [selectedOutbound, selectedReturn, isRoundTrip, onNext]);

  const toggleRoundTrip = useCallback(() => {
    setIsRoundTrip(prev => !prev);
    if (isRoundTrip) {
      setSelectedReturn(null);
    }
  }, [isRoundTrip]);

  const searchFlights = useCallback(async () => {
    if (!searchParams) return;
    
    setIsLoading(true);
    setError('');
    
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

  const handleFlightSelect = useCallback((flight: Flight, isReturn: boolean = false) => {
    if (isReturn) {
      setSelectedReturn(flight);
    } else {
      setSelectedOutbound(flight);
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

  const canProceed = selectedOutbound !== null && (!isRoundTrip || selectedReturn !== null);

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
                <Popover.Trigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
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
                    selected={searchParams.departureDate ? new Date(searchParams.departureDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setSearchParams((prev) => ({
                          ...prev,
                          departureDate: date.toISOString().split('T')[0],
                        }));
                      }
                    }}
                    initialFocus
                  />
                </Popover.Content>
              </Popover>
            </div>
            {isRoundTrip && (
              <div>
                <Label>Return Date</Label>
                <Popover>
                  <Popover.Trigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {searchParams.returnDate ? (
                        format(new Date(searchParams.returnDate), 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={searchParams.returnDate ? new Date(searchParams.returnDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setSearchParams((prev) => ({
                            ...prev,
                            returnDate: date.toISOString().split('T')[0],
                          }));
                        }
                      }}
                      initialFocus
                      disabled={(date) => {
                        if (!searchParams.departureDate) return true;
                        return date < new Date(searchParams.departureDate);
                      }}
                    />
                  </Popover.Content>
                </Popover>
              </div>
            )}
            <div>
              <Label>Cabin Class</Label>
              <Select
                value={searchParams.cabin}
                onValueChange={(value) => {
                  setSearchParams((prev) => ({
                    ...prev,
                    cabin: value,
                  }));
                }}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select cabin class" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="economy">Economy</Select.Item>
                  <Select.Item value="premium">Premium Economy</Select.Item>
                  <Select.Item value="business">Business</Select.Item>
                  <Select.Item value="first">First Class</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flight Results */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">
            {isRoundTrip ? 'Outbound Flights' : 'Available Flights'}
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Round trip</span>
            <Button
              variant={isRoundTrip ? 'default' : 'outline'}
              size="sm"
              onClick={toggleRoundTrip}
              className="h-8 px-3"
            >
              {isRoundTrip ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
        {isLoading ? (<div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>) : error ? (<div className="text-center p-4">
            <p className="text-red-500">{error}</p>
            <Button variant="outline" onClick={searchFlights} className="mt-2">
              Retry Search
            </Button>
          </div>) : (<div className="space-y-4">
            {flights.map((flight) => (
              <FlightCard 
                key={flight.id} 
                flight={flight} 
                selected={flight.id === (isRoundTrip ? selectedReturn?.id : selectedOutbound?.id)}
                onSelect={() => handleFlightSelect(flight, isRoundTrip)}
              />
            ))}
          </div>)}
      </div>

      {/* Return Flight Section - Only show when round trip is selected */}
      {isRoundTrip && selectedOutbound && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-medium">Return Flights</h3>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center p-4">
              <p className="text-red-500">{error}</p>
              <Button variant="outline" onClick={searchFlights} className="mt-2">
                Retry Search
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {flights.map((flight) => (
                <FlightCard 
                  key={flight.id} 
                  flight={flight} 
                  selected={flight.id === selectedReturn?.id}
                  onSelect={() => handleFlightSelect(flight, true)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleContinue} 
          disabled={!canProceed}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isRoundTrip && !selectedReturn ? 'Skip Return Flight' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};
