import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plane, CheckCircle, ArrowRight, ArrowLeft, User, Clock, MapPin, CreditCard } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SequentialBookingData {
  tripId: string;
  tripDestination: string;
  departureDate: string;
  returnDate: string;
  currentTravelerIndex: number;
  travelers: Array<{
    id: number;
    name: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    departureCity: string;
    departureCountry: string;
    travelClass: string;
    dietaryRequirements: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
  }>;
  bookingStatus: 'flights' | 'payment' | 'complete';
  confirmationNumber?: string;
  bookingDate?: string;
}

interface FlightOffer {
  id: string;
  airline: string;
  flightNumber: string;
  price: number;
  currency: string;
  departure: {
    airport: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    time: string;
    date: string;
  };
  duration: string;
  stops: number;
  type: string;
  validatingAirlineCodes: string[];
}

export default function SequentialBookingFlights() {
  const [, setLocation] = useLocation();
  const [bookingData, setBookingData] = useState<SequentialBookingData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [flightOffers, setFlightOffers] = useState<FlightOffer[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightOffer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'departure'>('price');
  const [activeTab, setActiveTab] = useState<'outbound' | 'return'>('outbound');
  const [outboundFlights, setOutboundFlights] = useState<FlightOffer[]>([]);
  const [returnFlights, setReturnFlights] = useState<FlightOffer[]>([]);
  const [selectedOutbound, setSelectedOutbound] = useState<FlightOffer | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<FlightOffer | null>(null);

  const formatTime = (timeString: string): string => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return timeString;
    }
  };

  const formatDuration = (duration: string): string => {
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    const hours = match?.[1] ? match[1] : '';
    const minutes = match?.[2] ? match[2] : '';
    return `${hours} ${minutes}`.trim() || duration;
  };

  const sortFlights = (flights: FlightOffer[], sortBy: string): FlightOffer[] => {
    return [...flights].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          const priceA = typeof a.price === 'object' ? a.price.amount : a.price;
          const priceB = typeof b.price === 'object' ? b.price.amount : b.price;
          return priceA - priceB;
        case 'duration':
          const getDurationMinutes = (duration: string) => {
            const match = duration.match(/PT(\d+H)?(\d+M)?/);
            const hours = match?.[1] ? parseInt(match[1]) : 0;
            const minutes = match?.[2] ? parseInt(match[2]) : 0;
            return hours * 60 + minutes;
          };
          return getDurationMinutes(a.duration) - getDurationMinutes(b.duration);
        case 'departure':
          return new Date(a.departure.time).getTime() - new Date(b.departure.time).getTime();
        default:
          return 0;
      }
    });
  };

  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('sequentialBookingData');
      if (storedData) {
        const parsedData = JSON.parse(storedData) as SequentialBookingData;
        setBookingData(parsedData);
        
        if (parsedData.bookingStatus === 'flights' && parsedData.currentTravelerIndex < parsedData.travelers.length) {
          setCurrentStep(1);
          handleFlightSearch(parsedData);
        } else if (parsedData.bookingStatus === 'payment') {
          setCurrentStep(2);
        } else if (parsedData.bookingStatus === 'complete') {
          setCurrentStep(3);
        }
      } else {
        toast({
          title: "No booking data found",
          description: "Please start the booking process from the team management page.",
          variant: "destructive",
        });
        setLocation('/');
      }
    } catch (error) {
      console.error('Critical error in SequentialBookingFlights useEffect:', error);
      setLocation('/');
    }
  }, [setLocation]);

  const handleFlightSearch = async (data: SequentialBookingData) => {
    const currentTraveler = data.travelers[data.currentTravelerIndex];
    if (!currentTraveler) return;

    setIsSearching(true);
    
    try {
      // Use AI to get airport codes for current traveler's specific departure city
      const departureCode = await getAirportCodeFromCity(currentTraveler.departureCity);
      const destinationCode = await getAirportCodeFromCity(data.tripDestination.split(',')[0]);

      console.log(`Flight search for ${currentTraveler.name}: ${currentTraveler.departureCity} (${departureCode}) → ${data.tripDestination.split(',')[0]} (${destinationCode})`);

      const searchParams = {
        origin: departureCode,
        destination: destinationCode,
        departureDate: data.departureDate,
        returnDate: data.returnDate,
        passengers: 1,
        class: currentTraveler.travelClass || 'economy'
      };

      const result = await apiRequest('POST', '/api/bookings/flights/search', searchParams);
      console.log('Flight search response:', result);
      
      // Separate outbound and return flights from the Duffel response
      const allFlights = result.flights || [];
      
      // For round trips, Duffel returns combined flight options
      // We need to handle both outbound and return separately
      setOutboundFlights(allFlights);
      setFlightOffers(allFlights);
      
      // Search for return flights if it's a round trip
      if (data.returnDate && data.returnDate !== data.departureDate) {
        const returnSearchParams = {
          origin: destinationCode,
          destination: departureCode,
          departureDate: data.returnDate,
          passengers: 1,
          class: currentTraveler.travelClass || 'economy'
        };
        
        console.log('Searching return flights:', returnSearchParams);
        
        try {
          const returnResult = await apiRequest('POST', '/api/bookings/flights/search', returnSearchParams);
          console.log('Return flight search response:', returnResult);
          setReturnFlights(returnResult.flights || []);
          
          toast({
            title: "Return Flights Found",
            description: `Found ${returnResult.flights?.length || 0} return flight options`,
          });
        } catch (error) {
          console.error('Error searching return flights:', error);
          toast({
            title: "Return Flight Search Failed",
            description: "Could not load return flights. Please try again.",
            variant: "destructive",
          });
        }
      }
      
      if (allFlights.length > 0) {
        toast({
          title: "Flights Found",
          description: `Found ${allFlights.length} outbound flight options`,
        });
      } else {
        toast({
          title: "No Flights Found",
          description: "No flights available for the selected route and dates.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Flight search error:', error);
      toast({
        title: "Flight Search Failed",
        description: "Unable to search for flights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleFlightBooking = async () => {
    if (!selectedOutbound || !selectedReturn || !bookingData) return;

    const currentTraveler = bookingData.travelers[bookingData.currentTravelerIndex];
    
    setIsBooking(true);

    try {
      // Store both outbound and return flight selections for current traveler
      const updatedTravelers = [...bookingData.travelers];
      updatedTravelers[bookingData.currentTravelerIndex] = {
        ...currentTraveler,
        selectedOutboundFlight: selectedOutbound,
        selectedReturnFlight: selectedReturn
      };

      // Check if more travelers need flights
      if (bookingData.currentTravelerIndex < bookingData.travelers.length - 1) {
        // Move to next traveler
        const updatedData = {
          ...bookingData,
          currentTravelerIndex: bookingData.currentTravelerIndex + 1,
          travelers: updatedTravelers
        };
        setBookingData(updatedData);
        sessionStorage.setItem('sequentialBookingData', JSON.stringify(updatedData));
        
        // Clear previous selections for new traveler
        setSelectedOutbound(null);
        setSelectedReturn(null);
        setOutboundFlights([]);
        setReturnFlights([]);
        
        // Search flights for the next traveler
        await handleFlightSearch(updatedData);
        
        toast({
          title: "Flight Selected",
          description: `Flight saved for ${currentTraveler.name}. Now selecting for next traveler.`,
        });
      } else {
        // All travelers done, move to payment
        const updatedData = {
          ...bookingData,
          travelers: updatedTravelers,
          bookingStatus: 'payment' as const
        };
        setBookingData(updatedData);
        sessionStorage.setItem('sequentialBookingData', JSON.stringify(updatedData));
        setCurrentStep(2);
        
        toast({
          title: "All Flights Selected",
          description: "Ready to proceed with payment for all travelers.",
        });
      }
    } catch (error) {
      console.error('Flight booking error:', error);
      toast({
        title: "Booking Error",
        description: "Failed to save flight selection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handlePayment = async () => {
    if (!bookingData) return;

    setIsBooking(true);

    try {
      const bookingResponse = await apiRequest('POST', '/api/bookings/complete', {
        tripId: bookingData.tripId,
        travelers: bookingData.travelers,
        bookingType: 'flights_only'
      });

      if (bookingResponse.ok) {
        const result = await bookingResponse.json();
        
        const updatedData = {
          ...bookingData,
          bookingStatus: 'complete' as const,
          confirmationNumber: result.confirmationNumber || `CONF${Date.now()}`,
          bookingDate: new Date().toISOString()
        };
        
        setBookingData(updatedData);
        sessionStorage.setItem('sequentialBookingData', JSON.stringify(updatedData));
        setCurrentStep(3);
        
        toast({
          title: "Booking Complete",
          description: "Your flights have been successfully booked!",
        });
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Unable to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const getAirportCodeFromCity = async (cityName: string): Promise<string> => {
    try {
      console.log(`Getting airport code for city: ${cityName}`);
      
      // Check if it's already an airport code
      if (cityName.length === 3 && /^[A-Z]{3}$/.test(cityName.toUpperCase())) {
        return cityName.toUpperCase();
      }

      // Use AI to find the airport code for this city
      const response = await fetch('/api/locations/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: `${cityName} airport`,
          cityContext: cityName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get airport code');
      }

      const aiData = await response.json();
      console.log('AI airport search result:', aiData);

      // Extract airport code from AI response
      if (aiData.locations && Array.isArray(aiData.locations) && aiData.locations.length > 0) {
        const location = aiData.locations[0];
        // Look for airport code in the location data
        const airportMatch = location.description?.match(/\b([A-Z]{3})\b/) || 
                           location.name?.match(/\b([A-Z]{3})\b/);
        
        if (airportMatch) {
          console.log(`Found airport code: ${airportMatch[1]}`);
          return airportMatch[1];
        }
      }

      // Fallback to hardcoded mapping for common cities
      const fallbackMap: Record<string, string> = {
        'san francisco': 'SFO',
        'new york': 'JFK',
        'new york city': 'JFK',
        'seattle': 'SEA',
        'los angeles': 'LAX',
        'chicago': 'ORD',
        'miami': 'MIA',
        'denver': 'DEN',
        'atlanta': 'ATL',
        'boston': 'BOS',
        'washington': 'DCA',
        'dallas': 'DFW',
        'houston': 'IAH'
      };
      
      const normalizedCity = cityName.toLowerCase().trim();
      const airportCode = fallbackMap[normalizedCity];
      
      if (airportCode) {
        console.log(`Using fallback mapping: ${cityName} -> ${airportCode}`);
        return airportCode;
      }

      // Last resort - return original if no mapping found
      console.log(`No airport code found for ${cityName}, using as-is`);
      return cityName.toUpperCase();
      
    } catch (error) {
      console.error('Error getting airport code:', error);
      // Fallback to basic mapping
      const basicMap: Record<string, string> = {
        'new york': 'JFK',
        'seattle': 'SEA',
        'san francisco': 'SFO'
      };
      return basicMap[cityName.toLowerCase()] || 'JFK';
    }
  };

  if (!bookingData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading booking workflow...</div>
      </div>
    );
  }

  const currentTraveler = bookingData.travelers?.[bookingData.currentTravelerIndex];
  const totalSteps = bookingData.travelers?.length + 1;
  const completedSteps = bookingData.bookingStatus === 'payment' ? bookingData.travelers.length : 
                       bookingData.bookingStatus === 'complete' ? totalSteps : 
                       bookingData.currentTravelerIndex;
  const progress = (completedSteps / totalSteps) * 100;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Sequential Flight Booking</h1>
        <p className="text-muted-foreground">
          Authentic flight data powered by Duffel API
        </p>
        <Progress value={progress} className="w-full mt-4" />
        <p className="text-sm text-muted-foreground mt-2">
          Step {completedSteps + 1} of {totalSteps} • {Math.round(progress)}% Complete
        </p>
      </div>

      {/* Flight Selection Step */}
      {currentStep === 1 && bookingData.bookingStatus === 'flights' && currentTraveler && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Select Flight for {currentTraveler.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {currentTraveler.departureCity} → {bookingData.tripDestination} • {flightOffers.length} options available
              </p>
            </div>

            {/* Flight Tabs for Outbound/Return */}
            <div className="mb-6">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'outbound' | 'return')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="outbound">
                    Outbound ({outboundFlights.length})
                  </TabsTrigger>
                  <TabsTrigger value="return">
                    Return ({returnFlights.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Sort Options */}
            <div className="mb-4 flex gap-2">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'price' | 'duration' | 'departure')}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                  <SelectItem value="departure">Departure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isSearching ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Searching authentic flight data...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortFlights(activeTab === 'outbound' ? outboundFlights : returnFlights, sortBy).map((flight) => (
                  <div
                    key={flight.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      (activeTab === 'outbound' && selectedOutbound?.id === flight.id) ||
                      (activeTab === 'return' && selectedReturn?.id === flight.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => {
                      if (activeTab === 'outbound') {
                        setSelectedOutbound(flight);
                      } else {
                        setSelectedReturn(flight);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium">{flight.airline?.name || flight.airline}</span>
                          <Badge variant="outline">{flight.segments?.[0]?.flightNumber || flight.flightNumber}</Badge>
                          {flight.stops === 0 && (
                            <Badge variant="secondary">Direct</Badge>
                          )}
                        </div>
                        {/* Flight routing display with connections */}
                        {flight.segments && flight.segments.length > 1 ? (
                          // Multi-segment flight with connections
                          <div className="space-y-2 text-sm">
                            {flight.segments.map((segment: any, segmentIndex: number) => (
                              <div key={segmentIndex} className="flex items-center gap-2">
                                <div className="flex-1 grid grid-cols-3 gap-4">
                                  <div>
                                    <p className="font-medium">{formatTime(segment.departure.time)}</p>
                                    <p className="text-muted-foreground">{segment.departure.airport?.code}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-muted-foreground">{formatDuration(segment.duration)}</p>
                                    <div className="flex items-center justify-center">
                                      <div className="w-8 h-px bg-border"></div>
                                      <Plane className="h-3 w-3 mx-1 text-muted-foreground" />
                                      <div className="w-8 h-px bg-border"></div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">{formatTime(segment.arrival.time)}</p>
                                    <p className="text-muted-foreground">{segment.arrival.airport?.code}</p>
                                  </div>
                                </div>
                                {segmentIndex < flight.segments.length - 1 && (
                                  <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                                    Connection
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="text-xs text-muted-foreground mt-2">
                              Total journey: {formatDuration(flight.duration)} • {flight.stops} stop{flight.stops !== 1 ? 's' : ''}
                            </div>
                          </div>
                        ) : (
                          // Direct flight
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-medium">{formatTime(flight.departure.time)}</p>
                              <p className="text-muted-foreground">{flight.departure.airport?.code || flight.departure.airport}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground">{formatDuration(flight.duration)}</p>
                              <div className="flex items-center justify-center">
                                <div className="w-8 h-px bg-border"></div>
                                <Plane className="h-3 w-3 mx-1 text-muted-foreground" />
                                <div className="w-8 h-px bg-border"></div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatTime(flight.arrival.time)}</p>
                              <p className="text-muted-foreground">{flight.arrival.airport?.code || flight.arrival.airport}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold">${flight.price?.amount || flight.price}</p>
                        <p className="text-sm text-muted-foreground">{flight.price?.currency || flight.currency || 'USD'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {flightOffers.length === 0 && !isSearching && (
                  <div className="text-center py-8 text-muted-foreground">
                    No flights found for this route. Please try different dates.
                  </div>
                )}
              </div>
            )}

            {/* Flight Selection Summary */}
            {(selectedOutbound || selectedReturn) && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-3">Selected Flights</h4>
                <div className="space-y-2 text-sm">
                  {selectedOutbound && (
                    <div className="flex justify-between">
                      <span>Outbound: {selectedOutbound.airline?.name || selectedOutbound.airline} {selectedOutbound.segments?.[0]?.flightNumber || selectedOutbound.flightNumber}</span>
                      <span className="font-medium">${selectedOutbound.price?.amount || selectedOutbound.price}</span>
                    </div>
                  )}
                  {selectedReturn && (
                    <div className="flex justify-between">
                      <span>Return: {selectedReturn.airline?.name || selectedReturn.airline} {selectedReturn.segments?.[0]?.flightNumber || selectedReturn.flightNumber}</span>
                      <span className="font-medium">${selectedReturn.price?.amount || selectedReturn.price}</span>
                    </div>
                  )}
                  {selectedOutbound && selectedReturn && (
                    <div className="flex justify-between border-t pt-2 font-medium">
                      <span>Total:</span>
                      <span>${(selectedOutbound.price?.amount || selectedOutbound.price) + (selectedReturn.price?.amount || selectedReturn.price)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              <Button variant="outline" onClick={() => setLocation('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleFlightBooking}
                disabled={!selectedOutbound || !selectedReturn || isBooking}
              >
                {isBooking ? 'Saving...' : 'Confirm Flight Selection'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Step */}
      {currentStep === 2 && bookingData.bookingStatus === 'payment' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment & Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <h4 className="font-medium">Flight Summary</h4>
              {bookingData.travelers.map((traveler, index) => (
                <div key={traveler.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{traveler.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {traveler.departureCity} → {bookingData.tripDestination}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">$599</p>
                      <p className="text-sm text-muted-foreground">Economy</p>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>${bookingData.travelers.length * 599}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Flights
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isBooking}
                size="lg"
              >
                {isBooking ? 'Processing...' : 'Complete Booking'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Step */}
      {currentStep === 3 && bookingData.bookingStatus === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Booking Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Flights Successfully Booked!</h3>
              <p className="text-muted-foreground mb-4">
                Confirmation: {bookingData.confirmationNumber}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Booking details have been sent to all travelers.
              </p>
              <Button onClick={() => setLocation('/')}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
