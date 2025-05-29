import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DayPicker, DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { 
  Plane, 
  Hotel, 
  Search, 
  Star, 
  Clock, 
  DollarSign,
  Users,
  Calendar,
  MapPin,
  Wifi,
  Car,
  Coffee,
  Dumbbell,
  Shield,
  CreditCard,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const flightSearchSchema = z.object({
  origin: z.string().min(3, "Origin city is required"),
  destination: z.string().min(3, "Destination city is required"),
  passengers: z.number().min(1).max(9),
  cabin: z.enum(['economy', 'premium', 'business', 'first']),
  directFlights: z.boolean().optional()
});

const hotelSearchSchema = z.object({
  destination: z.string().min(3, "Destination is required"),
  guests: z.number().min(1).max(10),
  rooms: z.number().min(1).max(5),
  starRating: z.number().min(1).max(5).optional(),
});

type FlightSearchValues = z.infer<typeof flightSearchSchema>;
type HotelSearchValues = z.infer<typeof hotelSearchSchema>;

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
  const [activeTab, setActiveTab] = useState('flights');
  const [isSearching, setIsSearching] = useState(false);
  const [flightResults, setFlightResults] = useState<FlightResult[]>([]);
  const [hotelResults, setHotelResults] = useState<HotelResult[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('round-trip');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<FlightResult | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<FlightResult | null>(null);

  const flightForm = useForm<FlightSearchValues>({
    resolver: zodResolver(flightSearchSchema),
    defaultValues: {
      origin: '',
      destination: '',
      passengers: 1,
      cabin: 'economy',
      directFlights: false
    }
  });

  const hotelForm = useForm<HotelSearchValues>({
    resolver: zodResolver(hotelSearchSchema),
    defaultValues: {
      destination: '',
      guests: 1,
      rooms: 1
    }
  });

  const searchFlights = async (values: FlightSearchValues) => {
    if (!dateRange?.from) {
      toast({
        title: "Missing Travel Dates",
        description: "Please select your travel dates before searching.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const searchData = {
        ...values,
        departureDate: format(dateRange.from, 'yyyy-MM-dd'),
        returnDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      };

      const response = await apiRequest('POST', '/api/bookings/flights/search', searchData);
      
      if (!response.ok) {
        throw new Error('Flight search failed');
      }
      
      const data = await response.json();
      setFlightResults(data.flights || []);
      
      toast({
        title: "Flight Search Complete",
        description: `Found ${data.flights?.length || 0} flight options`,
      });
    } catch (error) {
      console.error('Flight search error:', error);
      toast({
        title: "Search Failed",
        description: "Unable to search flights. Please check your search parameters and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const searchHotels = async (values: HotelSearchValues) => {
    if (!dateRange?.from) {
      toast({
        title: "Missing Travel Dates",
        description: "Please select your travel dates before searching.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const searchData = {
        ...values,
        checkIn: format(dateRange.from, 'yyyy-MM-dd'),
        checkOut: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(dateRange.from.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      };

      const response = await apiRequest('POST', '/api/bookings/hotels/search', searchData);
      
      if (!response.ok) {
        throw new Error('Hotel search failed');
      }
      
      const data = await response.json();
      setHotelResults(data.hotels || []);
      
      toast({
        title: "Hotel Search Complete",
        description: `Found ${data.hotels?.length || 0} hotel options`,
      });
    } catch (error) {
      console.error('Hotel search error:', error);
      toast({
        title: "Search Failed",
        description: "Unable to search hotels. Please check your search parameters and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleBooking = async (type: 'flight' | 'hotel', bookingData: any) => {
    setIsBooking(true);
    try {
      const response = await apiRequest('POST', '/api/bookings/create', {
        type,
        bookingData,
        tripId: null // You can pass a tripId if booking for a specific trip
      });
      
      if (!response.ok) {
        throw new Error('Booking failed');
      }
      
      const booking = await response.json();
      
      toast({
        title: "Booking Confirmed!",
        description: `Your ${type} booking has been confirmed. Confirmation: ${booking.confirmationNumber}`,
      });

      setSelectedBooking(null);
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: "Unable to complete your booking. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
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

    setIsBooking(true);
    try {
      // Determine trip dates from flight selection
      const startDate = selectedDepartureFlight?.departureTime ? 
        new Date(selectedDepartureFlight.departureTime).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];
      
      const endDate = selectedReturnFlight?.departureTime ? 
        new Date(selectedReturnFlight.departureTime).toISOString().split('T')[0] : 
        startDate;

      // Get destination from flight info
      const destination = selectedDepartureFlight?.destination || selectedReturnFlight?.origin || 'Unknown';

      // Create the trip
      const tripResponse = await apiRequest('POST', '/api/trips', {
        title: `Trip to ${destination}`,
        destination,
        startDate,
        endDate,
        description: `Trip created with flight bookings to ${destination}`,
        notes: ''
      });

      if (tripResponse.ok) {
        const trip = await tripResponse.json();
        
        toast({
          title: "Trip Created",
          description: `Your trip to ${destination} has been created successfully with your selected flights.`,
        });

        // Clear selections
        setSelectedDepartureFlight(null);
        setSelectedReturnFlight(null);
        setFlightResults([]);
        
        // Redirect to trip planner
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

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi': return <Wifi className="h-3 w-3" />;
      case 'pool': return <div className="h-3 w-3 bg-blue-500 rounded" />;
      case 'gym': return <Dumbbell className="h-3 w-3" />;
      case 'breakfast': return <Coffee className="h-3 w-3" />;
      case 'parking': return <Car className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  const formatFlightTime = (isoString: string) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return '--:--';
    }
  };

  const formatFlightDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return '';
    }
  };

  const formatDuration = (duration: string) => {
    if (!duration) return '';
    // Convert PT8H30M format to "8h 30m"
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;
    
    const hours = match[1] ? `${match[1]}h` : '';
    const minutes = match[2] ? ` ${match[2]}m` : '';
    return `${hours}${minutes}`.trim();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Travel Booking System
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Search and book flights and hotels with real-time pricing and availability
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="flights" className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Flights
          </TabsTrigger>
          <TabsTrigger value="hotels" className="flex items-center gap-2">
            <Hotel className="h-4 w-4" />
            Hotels
          </TabsTrigger>
        </TabsList>

        {/* Flight Search Tab */}
        <TabsContent value="flights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Flight Search
              </CardTitle>
              <CardDescription>
                Find and book flights from top airlines worldwide
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={flightForm.handleSubmit(searchFlights)} className="space-y-6">
                {/* Trip Type Selector - More Prominent */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Trip Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={tripType === 'round-trip' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setTripType('round-trip');
                        setDateRange(undefined);
                      }}
                      className="flex-1"
                    >
                      Round Trip
                    </Button>
                    <Button
                      type="button"
                      variant={tripType === 'one-way' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setTripType('one-way');
                        setDateRange(undefined);
                      }}
                      className="flex-1"
                    >
                      One Way
                    </Button>
                  </div>
                </div>

                {/* Destination Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origin">From</Label>
                    <Input
                      id="origin"
                      {...flightForm.register("origin")}
                      placeholder="Origin city (e.g., New York)"
                    />
                    {flightForm.formState.errors.origin && (
                      <p className="text-sm text-destructive">
                        {flightForm.formState.errors.origin.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="destination">To</Label>
                    <Input
                      id="destination"
                      {...flightForm.register("destination")}
                      placeholder="Destination city (e.g., London)"
                    />
                    {flightForm.formState.errors.destination && (
                      <p className="text-sm text-destructive">
                        {flightForm.formState.errors.destination.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Date Range Picker - Unified Interface */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Travel Dates</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
{dateRange?.from ? (
                          tripType === 'round-trip' ? (
                            dateRange.to ? (
                              <>
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">Departure</span>
                                  <span>{format(dateRange.from, "LLL dd, y")}</span>
                                </div>
                                <span className="mx-2">→</span>
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">Return</span>
                                  <span>{format(dateRange.to, "LLL dd, y")}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">Departure</span>
                                  <span>{format(dateRange.from, "LLL dd, y")}</span>
                                </div>
                                <span className="mx-2 text-muted-foreground">→ Select return date</span>
                              </>
                            )
                          ) : (
                            <>
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Travel Date</span>
                                <span>{format(dateRange.from, "LLL dd, y")}</span>
                              </div>
                            </>
                          )
                        ) : (
                          <span>
                            {tripType === 'round-trip' 
                              ? 'Select departure and return dates' 
                              : 'Select travel date'
                            }
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {tripType === 'round-trip' ? (
                        <DayPicker
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          disabled={(date) => date < new Date()}
                          numberOfMonths={2}
                          className="p-3"
                        />
                      ) : (
                        <DayPicker
                          mode="single"
                          selected={dateRange?.from}
                          onSelect={(date) => setDateRange(date ? { from: date, to: undefined } : undefined)}
                          disabled={(date) => date < new Date()}
                          numberOfMonths={1}
                          className="p-3"
                        />
                      )}
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    {tripType === 'round-trip' 
                      ? 'Select your departure and return dates' 
                      : 'Select your travel date'
                    }
                  </p>
                </div>

                {/* Passengers and Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="passengers">Passengers</Label>
                    <Select onValueChange={(value) => flightForm.setValue("passengers", parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="1 Passenger" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} Passenger{num > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cabin">Cabin Class</Label>
                    <Select onValueChange={(value) => flightForm.setValue("cabin", value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Economy" />
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

                <Button type="submit" disabled={isSearching} className="w-full">
                  {isSearching ? (
                    <>
                      <Search className="h-4 w-4 mr-2 animate-spin" />
                      Searching Flights...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search Flights
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Flight Results */}
          {flightResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Flight Results</CardTitle>
                <CardDescription>
                  {flightResults.length} flights found
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Flight Type Tabs for Round Trip */}
                {tripType === 'round-trip' && flightResults.some(f => f.id.startsWith('return_')) ? (
                  <Tabs defaultValue="departure" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="departure" className="flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        Departure Flights ({flightResults.filter(f => !f.id.startsWith('return_')).length})
                      </TabsTrigger>
                      <TabsTrigger value="return" className="flex items-center gap-2">
                        <Plane className="h-4 w-4 rotate-180" />
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
                ) : (
                  /* Single list for one-way flights */
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
                  
                  {/* Flight Selection Summary for one-way flights */}
                  {selectedDepartureFlight && (
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-semibold mb-4">Selected Flight</h3>
                      
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

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <p className="font-semibold">Total: ${selectedDepartureFlight.price.amount}</p>
                          <p className="text-sm text-muted-foreground">per person</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedDepartureFlight(null)}
                          >
                            Clear Selection
                          </Button>
                          <Button
                            onClick={handleCreateTripWithFlights}
                            disabled={isBooking}
                          >
                            {isBooking ? 'Creating Trip...' : 'Create Trip with Flight'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Hotel Search Tab */}
        <TabsContent value="hotels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hotel className="h-5 w-5" />
                Hotel Search
              </CardTitle>
              <CardDescription>
                Find and book hotels with the best rates and amenities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={hotelForm.handleSubmit(searchHotels)} className="space-y-6">
                {/* Hotel search form fields... */}
                <div className="space-y-2">
                  <Label htmlFor="hotelDestination">Destination</Label>
                  <Input
                    id="hotelDestination"
                    {...hotelForm.register("destination")}
                    placeholder="City or hotel name"
                  />
                </div>

                {/* Use the same date range picker for hotels */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Stay Dates</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Check-in</span>
                                <span>{format(dateRange.from, "LLL dd, y")}</span>
                              </div>
                              <span className="mx-2">→</span>
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Check-out</span>
                                <span>{format(dateRange.to, "LLL dd, y")}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Check-in</span>
                                <span>{format(dateRange.from, "LLL dd, y")}</span>
                              </div>
                              <span className="mx-2 text-muted-foreground">→ Select check-out</span>
                            </>
                          )
                        ) : (
                          <span>Select check-in and check-out dates</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DayPicker
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        disabled={(date) => date < new Date()}
                        numberOfMonths={2}
                        className="p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guests">Guests</Label>
                    <Select onValueChange={(value) => hotelForm.setValue("guests", parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="1 Guest" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} Guest{num > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rooms">Rooms</Label>
                    <Select onValueChange={(value) => hotelForm.setValue("rooms", parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="1 Room" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} Room{num > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={isSearching} className="w-full">
                  {isSearching ? (
                    <>
                      <Search className="h-4 w-4 mr-2 animate-spin" />
                      Searching Hotels...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search Hotels
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Hotel Results remain the same... */}
          {hotelResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Hotel Results</CardTitle>
                <CardDescription>
                  {hotelResults.length} hotels found
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hotelResults.map((hotel) => (
                  <div key={hotel.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{hotel.name}</h4>
                          <div className="flex items-center">
                            {[...Array(hotel.starRating)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{hotel.address}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4" />
                            <span>{hotel.rating.score}/5 ({hotel.rating.reviews} reviews)</span>
                          </div>
                          <Badge variant="outline">{hotel.cancellation}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ${hotel.price.amount}
                        </p>
                        <p className="text-sm text-muted-foreground">per {hotel.price.per}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {hotel.amenities.slice(0, 4).map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {hotel.amenities.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{hotel.amenities.length - 4} more
                        </Badge>
                      )}
                    </div>

                    <Button 
                      onClick={() => handleBooking('hotel', hotel)}
                      disabled={isBooking}
                      className="w-full"
                    >
                      {isBooking ? 'Booking...' : 'Book Hotel'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Hotel Search Tab */}
        <TabsContent value="hotels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hotel className="h-5 w-5" />
                Hotel Search
              </CardTitle>
              <CardDescription>
                Find and book hotels with the best rates and amenities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={hotelForm.handleSubmit(searchHotels)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hotelDestination">Destination</Label>
                    <Input
                      id="hotelDestination"
                      {...hotelForm.register("destination")}
                      placeholder="City or hotel name"
                    />
                    {hotelForm.formState.errors.destination && (
                      <p className="text-sm text-destructive">
                        {hotelForm.formState.errors.destination.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="starRating">Star Rating (Optional)</Label>
                    <Select onValueChange={(value) => hotelForm.setValue("starRating", parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 Stars</SelectItem>
                        <SelectItem value="4">4 Stars</SelectItem>
                        <SelectItem value="3">3 Stars</SelectItem>
                        <SelectItem value="2">2 Stars</SelectItem>
                        <SelectItem value="1">1 Star</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>



                  <div className="space-y-2">
                    <Label htmlFor="guests">Guests</Label>
                    <Select onValueChange={(value) => hotelForm.setValue("guests", parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="1 Guest" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} Guest{num > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rooms">Rooms</Label>
                    <Select onValueChange={(value) => hotelForm.setValue("rooms", parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="1 Room" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} Room{num > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={isSearching} className="w-full">
                  {isSearching ? (
                    <>
                      <Search className="h-4 w-4 mr-2 animate-spin" />
                      Searching Hotels...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search Hotels
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Hotel Results */}
          {hotelResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Hotel Results</CardTitle>
                <CardDescription>
                  {hotelResults.length} hotels found
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hotelResults.map((hotel) => (
                  <div key={hotel.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{hotel.name}</h4>
                          <div className="flex">
                            {Array.from({ length: hotel.starRating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{hotel.address}</p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>{hotel.rating.score}/10</span>
                            <span className="text-muted-foreground">({hotel.rating.reviews} reviews)</span>
                          </div>
                          <Badge variant={hotel.cancellation === 'free' ? 'default' : 'secondary'}>
                            {hotel.cancellation === 'free' ? 'Free Cancellation' : 'Paid Cancellation'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          {hotel.amenities.slice(0, 4).map((amenity, index) => (
                            <div key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
                              {getAmenityIcon(amenity)}
                              <span>{amenity}</span>
                            </div>
                          ))}
                          {hotel.amenities.length > 4 && (
                            <span className="text-xs text-muted-foreground">+{hotel.amenities.length - 4} more</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-green-600">
                          ${hotel.price.amount}
                        </p>
                        <p className="text-sm text-muted-foreground">per {hotel.price.per}</p>
                        <Button 
                          className="mt-2"
                          onClick={() => handleBooking('hotel', hotel)}
                          disabled={isBooking}
                        >
                          {isBooking ? 'Booking...' : 'Book Hotel'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}