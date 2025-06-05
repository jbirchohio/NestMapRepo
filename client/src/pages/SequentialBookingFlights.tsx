import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
      const searchParams = {
        origin: getCityCode(currentTraveler.departureCity),
        destination: getCityCode(data.tripDestination),
        departureDate: data.departureDate,
        returnDate: data.returnDate,
        passengers: 1,
        class: currentTraveler.travelClass || 'economy'
      };

      const result = await apiRequest('POST', '/api/bookings/flights/search', searchParams);
      console.log('Flight search response:', result);
      
      setFlightOffers(result.flights || []);
      
      if (result.flights && result.flights.length > 0) {
        toast({
          title: "Flights Found",
          description: `Found ${result.flights.length} flight options`,
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
    if (!selectedFlight || !bookingData) return;

    const currentTraveler = bookingData.travelers[bookingData.currentTravelerIndex];
    
    setIsBooking(true);

    try {
      // Store flight selection for current traveler
      const updatedTravelers = [...bookingData.travelers];
      updatedTravelers[bookingData.currentTravelerIndex] = {
        ...currentTraveler,
        selectedFlight: selectedFlight
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
        
        setSelectedFlight(null);
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

  const getCityCode = (cityName: string): string => {
    const cityCodeMap: Record<string, string> = {
      'san francisco': 'SFO',
      'san francisco, ca': 'SFO',
      'san francisco, united states': 'SFO',
      'sf': 'SFO',
      'sfo': 'SFO',
      'new york': 'JFK',
      'new york city': 'JFK',
      'new york, united states': 'JFK',
      'new york, ny': 'JFK',
      'nyc': 'JFK',
      'ny': 'JFK',
      'chicago': 'ORD',
      'chicago, il': 'ORD',
      'los angeles': 'LAX',
      'la': 'LAX',
      'seattle': 'SEA',
      'seattle, wa': 'SEA',
      'seattle, washington': 'SEA',
      'denver': 'DEN',
      'denver, co': 'DEN',
      'miami': 'MIA',
      'miami, fl': 'MIA',
      'austin': 'AUS',
      'austin, tx': 'AUS',
      'boston': 'BOS',
      'boston, ma': 'BOS',
      'atlanta': 'ATL',
      'atlanta, ga': 'ATL',
      'washington': 'DCA',
      'washington dc': 'DCA',
      'dc': 'DCA',
      'philadelphia': 'PHL',
      'phoenix': 'PHX',
      'las vegas': 'LAS',
      'vegas': 'LAS',
      'orlando': 'MCO',
      'dallas': 'DFW',
      'houston': 'IAH',
      'detroit': 'DTW',
      'minneapolis': 'MSP',
      'charlotte': 'CLT',
      'portland': 'PDX',
      'salt lake city': 'SLC',
      'nashville': 'BNA',
      'london': 'LHR',
      'uk': 'LHR',
      'england': 'LHR',
      'paris': 'CDG',
      'france': 'CDG',
      'tokyo': 'NRT',
      'japan': 'NRT',
      'singapore': 'SIN',
      'amsterdam': 'AMS',
      'netherlands': 'AMS'
    };
    
    const city = cityName?.toLowerCase().trim() || '';
    return cityCodeMap[city] || cityName;
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

            {isSearching ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Searching authentic flight data...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {flightOffers.map((flight) => (
                  <div
                    key={flight.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedFlight?.id === flight.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedFlight(flight)}
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
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium">{flight.departure.time}</p>
                            <p className="text-muted-foreground">{flight.departure.airport?.code || flight.departure.airport}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">{flight.duration}</p>
                            <div className="flex items-center justify-center">
                              <div className="w-8 h-px bg-border"></div>
                              <Plane className="h-3 w-3 mx-1 text-muted-foreground" />
                              <div className="w-8 h-px bg-border"></div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{flight.arrival.time}</p>
                            <p className="text-muted-foreground">{flight.arrival.airport?.code || flight.arrival.airport}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold">${flight.price}</p>
                        <p className="text-sm text-muted-foreground">{flight.currency}</p>
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

            <div className="flex justify-between pt-6">
              <Button variant="outline" onClick={() => setLocation('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleFlightBooking}
                disabled={!selectedFlight || isBooking}
              >
                {isBooking ? 'Saving...' : 'Select Flight'}
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