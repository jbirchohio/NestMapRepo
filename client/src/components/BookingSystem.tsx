import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/JWTAuthContext';
import { FlightSearchForm } from '@/components/booking/FlightSearchForm';
import { FlightResults } from '@/components/booking/FlightResults';
import { HotelResults } from '@/components/booking/HotelResults';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { CalendarIcon, Plane, MapPin, Users, DollarSign, Clock, Star, Building2, Building, ChevronLeft, ChevronRight, Search, Filter, Loader2, CreditCard, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

const flightSearchSchema = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  passengers: z.number().min(1).max(10),
  cabin: z.enum(['economy', 'premium', 'business', 'first']),
  directFlights: z.boolean().optional(),
});

const hotelSearchSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  guests: z.number().min(1).max(10),
  rooms: z.number().min(1).max(5),
});

const clientInfoSchema = z.object({
  // Travel Details
  origin: z.string().min(1, 'Origin city is required'),
  destination: z.string().min(1, 'Destination city is required'),
  departureDate: z.string().min(1, 'Departure date is required'),
  returnDate: z.string().optional(),
  tripType: z.enum(['one-way', 'round-trip']),
  passengers: z.number().min(1).max(10),
  
  // Primary Traveler
  primaryTraveler: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(10, 'Phone number is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
  }),
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    phone: z.string().min(10, 'Emergency contact phone is required'),
    relationship: z.string().min(1, 'Relationship is required'),
  }),
  specialRequests: z.string().optional(),
  tripPurpose: z.enum(['business', 'leisure', 'family', 'medical', 'other']),
  companyName: z.string().optional(),
  costCenter: z.string().optional(),
});

type FlightSearchValues = z.infer<typeof flightSearchSchema>;
type HotelSearchValues = z.infer<typeof hotelSearchSchema>;
type ClientInfoValues = z.infer<typeof clientInfoSchema>;
type TravelerInfoValues = ClientInfoValues;

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
}

interface HotelResult {
  id: string;
  name: string;
  address: string;
  starRating: number;
  price: { amount: number; currency: string; per: string };
  amenities: string[];
  images: string[];
  rating: { score: number; reviews: number };
  cancellation: string;
  bookingUrl: string;
}

export default function BookingSystem() {
  const { toast } = useToast();
  const { user, userId } = useAuth();
  
  // Workflow steps: client-info -> flights -> hotels -> confirmation
  const [currentStep, setCurrentStep] = useState<'client-info' | 'flights' | 'hotels' | 'confirmation'>('client-info');
  const [isSearching, setIsSearching] = useState(false);
  const [flightResults, setFlightResults] = useState<FlightResult[]>([]);
  const [hotelResults, setHotelResults] = useState<HotelResult[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  
  // Client and trip information
  const [clientInfo, setClientInfo] = useState<ClientInfoValues | null>(null);
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('round-trip');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // Selected bookings
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<FlightResult | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<FlightResult | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelResult | null>(null);
  
  // UI state
  const [showTravelerForm, setShowTravelerForm] = useState(false);
  const [activeTab, setActiveTab] = useState('flights');

  const flightForm = useForm<FlightSearchValues>({
    resolver: zodResolver(flightSearchSchema),
    defaultValues: {
      origin: '',
      destination: '',
      passengers: 1,
      cabin: 'economy',
      directFlights: false,
    },
  });

  const hotelForm = useForm<HotelSearchValues>({
    resolver: zodResolver(hotelSearchSchema),
    defaultValues: {
      destination: '',
      guests: 1,
      rooms: 1,
    },
  });

  const clientForm = useForm<ClientInfoValues>({
    resolver: zodResolver(clientInfoSchema),
    defaultValues: {
      origin: '',
      destination: '',
      departureDate: '',
      returnDate: '',
      tripType: 'round-trip',
      passengers: 1,
      primaryTraveler: {
        firstName: '',
        lastName: '',
        email: user?.email || '',
        phone: '',
        dateOfBirth: '',
      },
      emergencyContact: {
        name: '',
        phone: '',
        relationship: '',
      },
      specialRequests: '',
      tripPurpose: 'business',
      companyName: '',
      costCenter: '',
    },
  });

  const searchFlights = async (values: FlightSearchValues) => {
    if (!dateRange?.from) {
      toast({
        title: "Missing Travel Dates",
        description: "Please select your travel dates to search for flights.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const searchParams = {
        ...values,
        departureDate: format(dateRange.from, 'yyyy-MM-dd'),
        returnDate: tripType === 'round-trip' && dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        tripType,
      };

      const response = await apiRequest('POST', '/api/bookings/flights/search', searchParams);
      
      if (response.ok) {
        const data = await response.json();
        setFlightResults(data.flights || []);
        
        if (data.flights && data.flights.length > 0) {
          toast({
            title: "Flights Found",
            description: `Found ${data.flights.length} available flights for your search.`,
          });
        } else {
          toast({
            title: "No Flights Found",
            description: "No flights available for your search criteria. Try different dates or destinations.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error('Flight search failed');
      }
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Unable to search for flights. Please try again.",
        variant: "destructive",
      });
      setFlightResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const searchHotels = async (values: HotelSearchValues) => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Missing Stay Dates",
        description: "Please select your check-in and check-out dates.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const searchParams = {
        ...values,
        checkIn: format(dateRange.from, 'yyyy-MM-dd'),
        checkOut: format(dateRange.to, 'yyyy-MM-dd'),
      };

      const response = await apiRequest('POST', '/api/bookings/hotels/search', searchParams);
      
      if (response.ok) {
        const data = await response.json();
        setHotelResults(data.hotels || []);
        
        if (data.hotels && data.hotels.length > 0) {
          toast({
            title: "Hotels Found",
            description: `Found ${data.hotels.length} available hotels for your stay.`,
          });
        } else {
          toast({
            title: "No Hotels Found",
            description: "No hotels available for your search criteria. Try different dates or destinations.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error('Hotel search failed');
      }
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Unable to search for hotels. Please try again.",
        variant: "destructive",
      });
      setHotelResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateTripWithFlights = async () => {
    if (!selectedDepartureFlight && !selectedReturnFlight) {
      toast({
        title: "No Flights Selected",
        description: "Please select at least one flight to create a trip.",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "Please sign in to create a trip.",
        variant: "destructive",
      });
      return;
    }

    // Show traveler information form instead of creating trip immediately
    setShowTravelerForm(true);
  };

  const handleCreateTripWithTravelerInfo = async (travelerData: TravelerInfoValues) => {
    setIsBooking(true);
    try {
      const startDate = selectedDepartureFlight?.departureTime ? 
        new Date(selectedDepartureFlight.departureTime).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];
      
      const endDate = selectedReturnFlight?.departureTime ? 
        new Date(selectedReturnFlight.departureTime).toISOString().split('T')[0] : 
        startDate;

      const destination = selectedDepartureFlight?.destination || selectedReturnFlight?.origin || 'Unknown';

      const tripResponse = await apiRequest('POST', '/api/trips', {
        title: `Trip to ${destination}`,
        city: destination,
        startDate,
        endDate,
        userId: userId,
        description: `${travelerData.tripPurpose} trip for ${travelerData.primaryTraveler.firstName} ${travelerData.primaryTraveler.lastName}`,
        notes: travelerData.specialRequests || '',
        // Add traveler information to trip data
        primaryTraveler: travelerData.primaryTraveler,
        emergencyContact: travelerData.emergencyContact,
        tripPurpose: travelerData.tripPurpose,
        companyName: travelerData.companyName,
        costCenter: travelerData.costCenter,
      });

      if (tripResponse.ok) {
        const trip = await tripResponse.json();
        
        toast({
          title: "Trip Created",
          description: `Trip for ${travelerData.primaryTraveler.firstName} ${travelerData.primaryTraveler.lastName} has been created successfully.`,
        });

        setSelectedDepartureFlight(null);
        setSelectedReturnFlight(null);
        setFlightResults([]);
        setShowTravelerForm(false);
        
        window.location.href = `/trip/${trip.id}`;
      } else {
        throw new Error('Failed to create trip');
      }
    } catch (error) {
      toast({
        title: "Failed to Create Trip",
        description: "There was an error creating your trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const formatDuration = (duration: string) => {
    return duration.replace('PT', '').replace('H', 'h ').replace('M', 'm');
  };

  const formatFlightTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFlightDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Book Your Travel</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="flights">Flights</TabsTrigger>
          <TabsTrigger value="hotels">Hotels</TabsTrigger>
        </TabsList>

        {/* Flight Search Tab */}
        <TabsContent value="flights" className="space-y-6">
          {/* Flight Search Form */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Find Flights</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={flightForm.handleSubmit(searchFlights)} className="space-y-4">
                {/* Trip Type Toggle */}
                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    variant={tripType === 'round-trip' ? 'default' : 'outline'}
                    onClick={() => setTripType('round-trip')}
                    className="flex-1"
                  >
                    Round Trip
                  </Button>
                  <Button
                    type="button"
                    variant={tripType === 'one-way' ? 'default' : 'outline'}
                    onClick={() => setTripType('one-way')}
                    className="flex-1"
                  >
                    One Way
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origin">From</Label>
                    <Input
                      id="origin"
                      {...flightForm.register("origin")}
                      placeholder="Departure city or airport"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">To</Label>
                    <Input
                      id="destination"
                      {...flightForm.register("destination")}
                      placeholder="Destination city or airport"
                    />
                  </div>
                </div>

                {/* Date Range Picker */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    {tripType === 'round-trip' ? 'Departure & Return Dates' : 'Departure Date'}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        disabled={isSearching}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick your travel dates</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode={tripType === 'round-trip' ? "range" : "single"}
                        defaultMonth={dateRange?.from}
                        selected={dateRange as any}
                        onSelect={setDateRange as any}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="passengers">Passengers</Label>
                    <Input
                      id="passengers"
                      type="number"
                      min="1"
                      max="10"
                      {...flightForm.register("passengers", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cabin">Cabin Class</Label>
                    <select
                      id="cabin"
                      {...flightForm.register("cabin")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="economy">Economy</option>
                      <option value="premium">Premium Economy</option>
                      <option value="business">Business</option>
                      <option value="first">First Class</option>
                    </select>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSearching}>
                  {isSearching ? 'Searching...' : 'Search Flights'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Flight Results */}
          {flightResults.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Available Flights ({flightResults.length})</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tripType === 'round-trip' ? (
                    <Tabs defaultValue="departure" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="departure" className="flex items-center gap-2">
                          <Plane className="h-4 w-4 text-blue-600" />
                          Departure Flights ({flightResults.filter(f => !f.id.startsWith('return_')).length})
                        </TabsTrigger>
                        <TabsTrigger value="return" className="flex items-center gap-2">
                          <Plane className="h-4 w-4 text-orange-600 rotate-180" />
                          Return Flights ({flightResults.filter(f => f.id.startsWith('return_')).length})
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="departure" className="space-y-4 mt-4">
                        {flightResults.filter(flight => !flight.id.startsWith('return_')).map((flight) => (
                          <div key={flight.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                  <Plane className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold">{flight.airline} {flight.flightNumber}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {flight.origin} → {flight.destination}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">
                                  ${flight.price.amount}
                                </p>
                                <p className="text-sm text-muted-foreground">per person</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{formatDuration(flight.duration)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <div className="flex flex-col">
                                  <span className="font-medium">{formatFlightTime(flight.departureTime)} - {formatFlightTime(flight.arrivalTime)}</span>
                                  <span className="text-xs text-muted-foreground">{formatFlightDate(flight.departureTime)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{flight.availability} seats left</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="capitalize">
                                {flight.cabin}
                              </Badge>
                              <Button 
                                onClick={() => setSelectedDepartureFlight(flight)}
                                variant={selectedDepartureFlight?.id === flight.id ? 'default' : 'outline'}
                              >
                                {selectedDepartureFlight?.id === flight.id ? 'Selected' : 'Select Flight'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="return" className="space-y-4 mt-4">
                        {flightResults.filter(flight => flight.id.startsWith('return_')).map((flight) => (
                          <div key={flight.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                                  <Plane className="h-5 w-5 text-orange-600 rotate-180" />
                                </div>
                                <div>
                                  <h4 className="font-semibold">{flight.airline} {flight.flightNumber}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {flight.origin} → {flight.destination}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">
                                  ${flight.price.amount}
                                </p>
                                <p className="text-sm text-muted-foreground">per person</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{formatDuration(flight.duration)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <div className="flex flex-col">
                                  <span className="font-medium">{formatFlightTime(flight.departureTime)} - {formatFlightTime(flight.arrivalTime)}</span>
                                  <span className="text-xs text-muted-foreground">{formatFlightDate(flight.departureTime)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{flight.availability} seats left</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="capitalize">
                                {flight.cabin}
                              </Badge>
                              <Button 
                                onClick={() => setSelectedReturnFlight(flight)}
                                variant={selectedReturnFlight?.id === flight.id ? 'default' : 'outline'}
                              >
                                {selectedReturnFlight?.id === flight.id ? 'Selected' : 'Select Flight'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                    </Tabs>
                  ) : (
                    /* One-way flights */
                    <div className="space-y-4">
                      {flightResults.map((flight) => (
                        <div key={flight.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Plane className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{flight.airline} {flight.flightNumber}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {flight.origin} → {flight.destination}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">
                                ${flight.price.amount}
                              </p>
                              <p className="text-sm text-muted-foreground">per person</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{formatDuration(flight.duration)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <div className="flex flex-col">
                                <span className="font-medium">{formatFlightTime(flight.departureTime)} - {formatFlightTime(flight.arrivalTime)}</span>
                                <span className="text-xs text-muted-foreground">{formatFlightDate(flight.departureTime)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{flight.availability} seats left</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="capitalize">
                              {flight.cabin}
                            </Badge>
                            <Button 
                              onClick={() => setSelectedDepartureFlight(flight)}
                              variant={selectedDepartureFlight?.id === flight.id ? 'default' : 'outline'}
                            >
                              {selectedDepartureFlight?.id === flight.id ? 'Selected' : 'Select Flight'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Flight Selection Summary */}
                  {(selectedDepartureFlight || selectedReturnFlight) && (
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-semibold mb-4">Selected Flights</h3>
                      
                      {selectedDepartureFlight && (
                        <div className="mb-3 p-3 bg-background rounded border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
                                <Plane className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{selectedDepartureFlight.airline} {selectedDepartureFlight.flightNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                  {selectedDepartureFlight.origin} → {selectedDepartureFlight.destination}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFlightDate(selectedDepartureFlight.departureTime)} at {formatFlightTime(selectedDepartureFlight.departureTime)}
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold text-green-600">${selectedDepartureFlight.price.amount}</p>
                          </div>
                        </div>
                      )}

                      {selectedReturnFlight && (
                        <div className="mb-3 p-3 bg-background rounded border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-1 bg-orange-100 dark:bg-orange-900 rounded">
                                <Plane className="h-4 w-4 text-orange-600 rotate-180" />
                              </div>
                              <div>
                                <p className="font-medium">{selectedReturnFlight.airline} {selectedReturnFlight.flightNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                  {selectedReturnFlight.origin} → {selectedReturnFlight.destination}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFlightDate(selectedReturnFlight.departureTime)} at {formatFlightTime(selectedReturnFlight.departureTime)}
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold text-green-600">${selectedReturnFlight.price.amount}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <p className="font-semibold">
                            Total: ${(selectedDepartureFlight?.price.amount || 0) + (selectedReturnFlight?.price.amount || 0)}
                          </p>
                          <p className="text-sm text-muted-foreground">per person</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedDepartureFlight(null);
                              setSelectedReturnFlight(null);
                            }}
                          >
                            Clear Selection
                          </Button>
                          <Button
                            onClick={handleCreateTripWithFlights}
                            disabled={isBooking}
                          >
                            {isBooking ? 'Creating Trip...' : 'Create Trip with Flights'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Hotel Search Tab */}
        <TabsContent value="hotels" className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Find Hotels</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={hotelForm.handleSubmit(searchHotels)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hotelDestination">Destination</Label>
                  <Input
                    id="hotelDestination"
                    {...hotelForm.register("destination")}
                    placeholder="City or hotel name"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Stay Dates</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        disabled={isSearching}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick your stay dates</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange as any}
                        onSelect={setDateRange as any}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guests">Guests</Label>
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      max="10"
                      {...hotelForm.register("guests", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rooms">Rooms</Label>
                    <Input
                      id="rooms"
                      type="number"
                      min="1"
                      max="5"
                      {...hotelForm.register("rooms", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSearching}>
                  {isSearching ? 'Searching Hotels...' : 'Search Hotels'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Hotel Results */}
          {hotelResults.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Available Hotels ({hotelResults.length})</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hotelResults.map((hotel) => (
                    <div key={hotel.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                              <Building className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{hotel.name}</h4>
                              <p className="text-sm text-muted-foreground">{hotel.address}</p>
                              <div className="flex items-center gap-1 mt-1">
                                {[...Array(hotel.starRating)].map((_, i) => (
                                  <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                ))}
                                <span className="ml-2 text-sm font-medium">
                                  {hotel.rating.score}/10 ({hotel.rating.reviews} reviews)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            ${hotel.price.amount}
                          </p>
                          <p className="text-sm text-muted-foreground">per {hotel.price.per}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {hotel.amenities.slice(0, 4).map((amenity, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                        {hotel.amenities.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{hotel.amenities.length - 4} more
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-medium text-green-600">{hotel.cancellation}</span> cancellation
                        </div>
                        <Button>
                          Book Hotel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Traveler Information Modal */}
      {showTravelerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Traveler Information</h2>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowTravelerForm(false)}
                >
                  ✕
                </Button>
              </div>

              <form onSubmit={clientForm.handleSubmit(handleCreateTripWithTravelerInfo)} className="space-y-6">
                {/* Primary Traveler Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Primary Traveler</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        {...clientForm.register("primaryTraveler.firstName")}
                        className={clientForm.formState.errors.primaryTraveler?.firstName ? "border-red-500" : ""}
                      />
                      {clientForm.formState.errors.primaryTraveler?.firstName && (
                        <p className="text-sm text-red-500 mt-1">
                          {clientForm.formState.errors.primaryTraveler.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        {...clientForm.register("primaryTraveler.lastName")}
                        className={clientForm.formState.errors.primaryTraveler?.lastName ? "border-red-500" : ""}
                      />
                      {clientForm.formState.errors.primaryTraveler?.lastName && (
                        <p className="text-sm text-red-500 mt-1">
                          {clientForm.formState.errors.primaryTraveler.lastName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        {...clientForm.register("primaryTraveler.email")}
                        className={clientForm.formState.errors.primaryTraveler?.email ? "border-red-500" : ""}
                      />
                      {clientForm.formState.errors.primaryTraveler?.email && (
                        <p className="text-sm text-red-500 mt-1">
                          {clientForm.formState.errors.primaryTraveler.email.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        {...clientForm.register("primaryTraveler.phone")}
                        className={clientForm.formState.errors.primaryTraveler?.phone ? "border-red-500" : ""}
                      />
                      {clientForm.formState.errors.primaryTraveler?.phone && (
                        <p className="text-sm text-red-500 mt-1">
                          {clientForm.formState.errors.primaryTraveler.phone.message}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        {...clientForm.register("primaryTraveler.dateOfBirth")}
                        className={clientForm.formState.errors.primaryTraveler?.dateOfBirth ? "border-red-500" : ""}
                      />
                      {clientForm.formState.errors.primaryTraveler?.dateOfBirth && (
                        <p className="text-sm text-red-500 mt-1">
                          {clientForm.formState.errors.primaryTraveler.dateOfBirth.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergencyName">Contact Name *</Label>
                      <Input
                        id="emergencyName"
                        {...clientForm.register("emergencyContact.name")}
                        className={clientForm.formState.errors.emergencyContact?.name ? "border-red-500" : ""}
                      />
                      {clientForm.formState.errors.emergencyContact?.name && (
                        <p className="text-sm text-red-500 mt-1">
                          {clientForm.formState.errors.emergencyContact.name.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="emergencyPhone">Contact Phone *</Label>
                      <Input
                        id="emergencyPhone"
                        {...clientForm.register("emergencyContact.phone")}
                        className={clientForm.formState.errors.emergencyContact?.phone ? "border-red-500" : ""}
                      />
                      {clientForm.formState.errors.emergencyContact?.phone && (
                        <p className="text-sm text-red-500 mt-1">
                          {clientForm.formState.errors.emergencyContact.phone.message}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="relationship">Relationship *</Label>
                      <Input
                        id="relationship"
                        placeholder="e.g., Spouse, Parent, Friend"
                        {...clientForm.register("emergencyContact.relationship")}
                        className={clientForm.formState.errors.emergencyContact?.relationship ? "border-red-500" : ""}
                      />
                      {clientForm.formState.errors.emergencyContact?.relationship && (
                        <p className="text-sm text-red-500 mt-1">
                          {clientForm.formState.errors.emergencyContact.relationship.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trip Details Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Trip Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tripPurpose">Trip Purpose *</Label>
                      <select
                        id="tripPurpose"
                        {...clientForm.register("tripPurpose")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="business">Business</option>
                        <option value="leisure">Leisure</option>
                        <option value="family">Family</option>
                        <option value="medical">Medical</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        {...clientForm.register("companyName")}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="costCenter">Cost Center</Label>
                      <Input
                        id="costCenter"
                        {...clientForm.register("costCenter")}
                        placeholder="For business trips (optional)"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="specialRequests">Special Requests</Label>
                      <textarea
                        id="specialRequests"
                        {...clientForm.register("specialRequests")}
                        placeholder="Any special dietary requirements, accessibility needs, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Flight Summary */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Flight Summary</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    {selectedDepartureFlight && (
                      <div className="flex justify-between items-center">
                        <span>Departure: {selectedDepartureFlight.airline} {selectedDepartureFlight.flightNumber}</span>
                        <span className="font-medium">${selectedDepartureFlight.price.amount}</span>
                      </div>
                    )}
                    {selectedReturnFlight && (
                      <div className="flex justify-between items-center">
                        <span>Return: {selectedReturnFlight.airline} {selectedReturnFlight.flightNumber}</span>
                        <span className="font-medium">${selectedReturnFlight.price.amount}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between items-center font-bold">
                      <span>Total:</span>
                      <span>${(selectedDepartureFlight?.price.amount || 0) + (selectedReturnFlight?.price.amount || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setShowTravelerForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isBooking}
                  >
                    {isBooking ? 'Creating Trip...' : 'Create Trip'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}