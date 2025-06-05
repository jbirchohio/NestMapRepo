import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { jwtAuth } from "@/lib/jwtAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Plane, 
  Hotel, 
  CheckCircle, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  MapPin,
  CreditCard
} from "lucide-react";

interface SequentialBookingData {
  tripId: string;
  tripDestination: string;
  departureDate: string | Date;
  returnDate: string | Date;
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
  roomsNeeded: number;
  roomConfiguration: 'shared' | 'separate' | null;
  bookingStatus: 'flights' | 'hotels' | 'room-preferences' | 'payment' | 'complete';
  selectedHotel?: any;
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

export default function SequentialBooking() {
  const [, setLocation] = useLocation();
  const [bookingData, setBookingData] = useState<SequentialBookingData | null>(null);
  const [currentStep, setCurrentStep] = useState(0); // 0: traveler info, 1: flight selection, 2: booking confirmation
  const [flightOffers, setFlightOffers] = useState<FlightOffer[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightOffer | null>(null);
  const [hotelResults, setHotelResults] = useState<any[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    try {
      // Load sequential booking data from sessionStorage
      const storedData = sessionStorage.getItem('sequentialBookingData');
      console.log('Stored sequential booking data:', storedData);
      
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          console.log('Parsed sequential booking data:', data);
          
          // Validate that required data exists
          if (data && data.travelers && Array.isArray(data.travelers) && data.travelers.length > 0) {
            // Validate each traveler has required properties
            const validTravelers = data.travelers.every(t => 
              t && typeof t.name === 'string' && typeof t.email === 'string'
            );
            
            if (validTravelers) {
              setBookingData(data);
            } else {
              console.error('Invalid traveler data structure:', data.travelers);
              toast({
                title: "Invalid traveler data",
                description: "Please restart the booking process from the team management page.",
                variant: "destructive",
              });
              setLocation('/');
            }
          } else {
            console.error('Invalid booking data structure:', data);
            toast({
              title: "Invalid booking data",
              description: "Please restart the booking process from the team management page.",
              variant: "destructive",
            });
            setLocation('/');
          }
        } catch (parseError) {
          console.error('Error parsing booking data:', parseError);
          toast({
            title: "Error loading booking data",
            description: "Please restart the booking process from the team management page.",
            variant: "destructive",
          });
          setLocation('/');
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
      console.error('Critical error in SequentialBooking useEffect:', error);
      setLocation('/');
    }
  }, [setLocation]);

  if (!bookingData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading booking workflow...</div>
      </div>
    );
  }

  const currentTraveler = bookingData.travelers?.[bookingData.currentTravelerIndex];
  const totalSteps = bookingData.travelers?.length + 1 || 1; // All travelers + payment
  
  let completedSteps = bookingData.currentTravelerIndex;
  if (bookingData.bookingStatus === 'payment') {
    completedSteps = bookingData.travelers?.length || 0;
  } else if (bookingData.bookingStatus === 'complete') {
    completedSteps = totalSteps;
  }
  
  const progress = (completedSteps / totalSteps) * 100;

  // Handle case where no current traveler is available
  if (!currentTraveler && bookingData.bookingStatus !== 'payment' && bookingData.bookingStatus !== 'complete') {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No traveler found</h2>
          <p className="text-gray-600 mb-4">Unable to find traveler information for booking.</p>
          <Button onClick={() => setLocation('/')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const handleFlightBooking = async () => {
    // Check if date of birth is missing and show form to collect it
    if (!currentTraveler.dateOfBirth) {
      toast({
        title: "Missing Information",
        description: "Date of birth is required for flight booking. Please add this information in the team management page first.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);

    // Convert city names to airport codes for Amadeus API (local function)
    const convertCityToAirportCode = (cityName: string): string => {
      const airportMap: { [key: string]: string } = {
        'san francisco': 'SFO',
        'san francisco, ca': 'SFO',
        'san francisco, united states': 'SFO',
        'san francisco, california': 'SFO',
        'sf': 'SFO',
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
      
      console.log(`Converting city "${cityName}" (normalized: "${city}") to airport code`);
      
      // Direct match
      if (airportMap[city]) {
        console.log(`Direct match found: ${airportMap[city]}`);
        return airportMap[city];
      }
      
      // Check if it's already a 3-letter code
      if (city.length === 3 && /^[A-Za-z]{3}$/.test(city)) {
        console.log(`Already airport code: ${city.toUpperCase()}`);
        return city.toUpperCase();
      }
      
      // Try partial matches for compound city names - check if city starts with any key
      for (const [key, code] of Object.entries(airportMap)) {
        if (city.startsWith(key) || key.startsWith(city)) {
          console.log(`Partial match found: ${key} -> ${code}`);
          return code;
        }
      }
      
      // Try contains matches
      for (const [key, code] of Object.entries(airportMap)) {
        if (city.includes(key) || key.includes(city)) {
          console.log(`Contains match found: ${key} -> ${code}`);
          return code;
        }
      }
      
      console.log(`No match found for "${city}", defaulting to JFK`);
      return 'JFK'; // Default fallback
    };

    const originCode = convertCityToAirportCode(currentTraveler.departureCity);
    const destinationCode = convertCityToAirportCode(bookingData.tripDestination);

    console.log(`Converting "${currentTraveler.departureCity}" to "${originCode}" and "${bookingData.tripDestination}" to "${destinationCode}"`);

    // Format dates properly for API
    const formatDate = (date: string | Date | any): string => {
      if (!date) return '';
      if (typeof date === 'string' && date.includes('-')) return date;
      if (date instanceof Date) return date.toISOString().split('T')[0];
      if (typeof date === 'object' && Object.keys(date).length === 0) return '';
      return '';
    };

    const departureDateStr = formatDate(bookingData.departureDate);
    const returnDateStr = formatDate(bookingData.returnDate);

    if (!departureDateStr) {
      toast({
        title: "Missing Travel Dates",
        description: "Please select departure date to search for flights.",
        variant: "destructive",
      });
      setIsSearching(false);
      return;
    }

    // Search for flights using authentic Duffel API with same format as BookingWorkflow
    try {
      const searchParams = {
        origin: originCode,  // Use 'origin' to match case conversion middleware expectations
        destination: destinationCode,
        departureDate: departureDateStr,
        returnDate: returnDateStr || undefined,
        passengers: 1,
        class: 'economy'
      };

      console.log('Flight search params:', searchParams);

      const response = await apiRequest('POST', '/api/bookings/flights/search', searchParams);

      const flightData = await response.json();
      console.log('Flight search response:', flightData);
      
      if (flightData.flights && flightData.flights.length > 0) {
        setFlightOffers(flightData.flights);
        setCurrentStep(1);
        
        toast({
          title: "Flights Found",
          description: `Found ${flightData.flights.length} flights for ${currentTraveler.name} from ${currentTraveler.departureCity} to ${bookingData.tripDestination}`,
        });
      } else {
        toast({
          title: "No Flights Found",
          description: `No flights available for the selected route and dates.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error searching flights:', error);
      toast({
        title: "Flight Search Error",
        description: "Unable to search for flights. Please check your travel details and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleNextTraveler = () => {
    const nextIndex = bookingData.currentTravelerIndex + 1;
    
    if (nextIndex < bookingData.travelers.length) {
      // Move to next traveler
      const updatedData = {
        ...bookingData,
        currentTravelerIndex: nextIndex
      };
      setBookingData(updatedData);
      sessionStorage.setItem('sequentialBookingData', JSON.stringify(updatedData));
    } else {
      // All travelers done, move to payment
      const updatedData = {
        ...bookingData,
        bookingStatus: 'payment' as const
      };
      setBookingData(updatedData);
      sessionStorage.setItem('sequentialBookingData', JSON.stringify(updatedData));
    }
  };

  const handleHotelBooking = async () => {
    // Move to hotels step and search for hotels
    const updatedData = {
      ...bookingData,
      bookingStatus: 'hotels' as const
    };
    setBookingData(updatedData);
    sessionStorage.setItem('sequentialBookingData', JSON.stringify(updatedData));
    
    setIsSearching(true);
    
    try {
      const searchParams = {
        destination: bookingData.tripDestination,
        checkIn: bookingData.departureDate,
        checkOut: bookingData.returnDate,
        rooms: bookingData.roomsNeeded,
        guests: bookingData.travelers.length,
        roomConfiguration: bookingData.roomConfiguration
      };

      console.log('Hotel search params:', searchParams);

      const response = await apiRequest('POST', '/api/bookings/hotels/search', searchParams);

      if (response.ok) {
        const hotelData = await response.json();
        console.log('Hotel search response:', hotelData);
        
        if (hotelData.hotels && hotelData.hotels.length > 0) {
          setHotelResults(hotelData.hotels);
          
          toast({
            title: "Hotels Found",
            description: `Found ${hotelData.hotels.length} hotels in ${bookingData.tripDestination}`,
          });
        } else {
          toast({
            title: "No Hotels Found",
            description: "No hotels available for the selected dates and location.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error('Hotel search failed');
      }
    } catch (error) {
      console.error('Error searching hotels:', error);
      toast({
        title: "Hotel Search Error",
        description: "Unable to search for hotels. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleComplete = () => {
    // Clear sequential booking data and return to trip
    sessionStorage.removeItem('sequentialBookingData');
    sessionStorage.removeItem('currentFlightBooking');
    sessionStorage.removeItem('currentHotelBooking');
    
    toast({
      title: "Booking workflow complete",
      description: "All team members and accommodations have been processed.",
    });
    
    setLocation(`/trips/${bookingData.tripId}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Sequential Team Booking</h1>
        <p className="text-muted-foreground">
          Processing flights and hotels for your team trip to {bookingData.tripDestination}
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Booking Progress</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4" />
              <span>Individual Flights</span>
            </div>
            <div className="flex items-center gap-2">
              <Hotel className="h-4 w-4" />
              <span>Team Hotels</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Complete</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      {bookingData.bookingStatus === 'flights' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Flight Booking - {currentTraveler.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium">Departing From</label>
                <p className="text-lg">{currentTraveler.departureCity}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Arriving At</label>
                <p className="text-lg">{bookingData.tripDestination}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Departure Date</label>
                <p>{new Date(bookingData.departureDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Return Date</label>
                <p>{new Date(bookingData.returnDate).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Show missing information warning if date of birth is missing */}
            {!currentTraveler.dateOfBirth && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-orange-800 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Additional Information Required</span>
                </div>
                <p className="text-sm text-orange-700">
                  Date of birth is required for flight booking with Amadeus. This will be collected in the next step.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">
                {currentTraveler.travelClass.charAt(0).toUpperCase() + currentTraveler.travelClass.slice(1)}
              </Badge>
              {currentTraveler.dietaryRequirements && (
                <Badge variant="secondary">
                  {currentTraveler.dietaryRequirements}
                </Badge>
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleFlightBooking} 
                className="flex-1"
                disabled={isSearching}
              >
                {isSearching ? 'Searching Flights...' : (currentTraveler.dateOfBirth ? 'Search Flights' : 'Complete Info & Search Flights')} for {currentTraveler.name}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleNextTraveler}
                className="flex-1"
              >
                Skip & Continue to Next Traveler
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-3">
              Step {bookingData.currentTravelerIndex + 1} of {bookingData.travelers.length} travelers
            </p>
          </CardContent>
        </Card>
      )}

      {/* Flight Selection Step */}
      {currentStep === 1 && bookingData.bookingStatus === 'flights' && (
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

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {flightOffers.map((offer, index) => (
                <Card 
                  key={offer.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedFlight?.id === offer.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedFlight(offer)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="text-lg font-semibold">
                            {offer.departure?.airport} → {offer.arrival?.airport}
                          </div>
                          <Badge variant="outline">
                            {offer.airline} {offer.flightNumber}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {offer.departure?.time} - {offer.arrival?.time}
                          </div>
                          <div>Duration: {offer.duration}</div>
                          <div>Stops: {offer.stops}</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          ${parseFloat(offer.price).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">{offer.currency}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(0)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Traveler Info
              </Button>
              
              <Button 
                onClick={() => {
                  if (selectedFlight) {
                    // TODO: Implement actual booking
                    toast({
                      title: "Flight selected",
                      description: `Selected ${selectedFlight.currency} $${selectedFlight.price} flight for ${currentTraveler.name}`,
                    });
                    setCurrentStep(0);
                    handleNextTraveler();
                  }
                }}
                disabled={!selectedFlight}
                className="flex-1"
              >
                Confirm Flight Selection
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {bookingData.bookingStatus === 'room-preferences' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5" />
              Room Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">How would you like to arrange rooms?</h3>
              <p className="text-muted-foreground mb-4">
                You have {bookingData.travelers.length} travelers for your trip to {bookingData.tripDestination}
              </p>
            </div>

            <div className="space-y-4">
              <Card 
                className={`cursor-pointer border-2 transition-colors ${
                  bookingData.roomConfiguration === 'shared' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setBookingData(prev => prev ? {...prev, roomConfiguration: 'shared', roomsNeeded: 1} : null)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                      bookingData.roomConfiguration === 'shared' 
                        ? 'border-primary bg-primary' 
                        : 'border-border'
                    }`}></div>
                    <div>
                      <h4 className="font-semibold">Shared Room</h4>
                      <p className="text-sm text-muted-foreground">
                        One room with multiple beds for all travelers (recommended for 2 travelers)
                      </p>
                      <p className="text-sm font-medium mt-1">1 room needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer border-2 transition-colors ${
                  bookingData.roomConfiguration === 'separate' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setBookingData(prev => prev ? {...prev, roomConfiguration: 'separate', roomsNeeded: prev.travelers.length} : null)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                      bookingData.roomConfiguration === 'separate' 
                        ? 'border-primary bg-primary' 
                        : 'border-border'
                    }`}></div>
                    <div>
                      <h4 className="font-semibold">Separate Rooms</h4>
                      <p className="text-sm text-muted-foreground">
                        Individual rooms for each traveler (recommended for privacy)
                      </p>
                      <p className="text-sm font-medium mt-1">{bookingData.travelers.length} rooms needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                onClick={() => setBookingData(prev => prev ? {...prev, bookingStatus: 'hotels'} : null)}
                disabled={!bookingData.roomConfiguration}
                className="flex-1"
              >
                Continue to Hotel Search
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {bookingData.bookingStatus === 'hotels' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5" />
              Hotel Accommodation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium">Destination</label>
                <p className="text-lg">{bookingData.tripDestination}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Rooms Needed</label>
                <p className="text-lg">{bookingData.roomsNeeded} rooms</p>
              </div>
              <div>
                <label className="text-sm font-medium">Check-in</label>
                <p>{new Date(bookingData.departureDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Check-out</label>
                <p>{new Date(bookingData.returnDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleHotelBooking} className="flex-1">
                Book Hotels for Team
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleComplete}
                className="flex-1"
              >
                Skip Hotels & Complete
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-3">
              Final step: Accommodation for {bookingData.travelers.length} team members
            </p>
          </CardContent>
        </Card>
      )}

      {bookingData.bookingStatus === 'hotels' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5" />
              Hotel Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSearching ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Searching for hotels in {bookingData.tripDestination}...</p>
              </div>
            ) : hotelResults.length > 0 ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Available Hotels</h3>
                  <p className="text-muted-foreground">
                    Found {hotelResults.length} hotels for {bookingData.travelers.length} travelers ({bookingData.roomConfiguration} rooms)
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {hotelResults.map((hotel) => (
                    <Card
                      key={hotel.id}
                      className={`cursor-pointer transition-colors ${
                        selectedHotel?.id === hotel.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedHotel(hotel)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="text-lg font-semibold">{hotel.name}</div>
                              <Badge variant="outline">{hotel.starRating} ⭐</Badge>
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {hotel.address}
                              </div>
                              <div>Rooms: {bookingData.roomsNeeded}</div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              ${hotel.price.amount}
                            </div>
                            <div className="text-sm text-muted-foreground">per night</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setBookingData(prev => prev ? {...prev, bookingStatus: 'room-preferences'} : null)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Room Preferences
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      if (selectedHotel) {
                        const updatedData = {
                          ...bookingData,
                          bookingStatus: 'payment' as const,
                          selectedHotel: selectedHotel
                        };
                        setBookingData(updatedData);
                        sessionStorage.setItem('sequentialBookingData', JSON.stringify(updatedData));
                        
                        toast({
                          title: "Hotel Selected",
                          description: `Selected ${selectedHotel.name} for your team stay`,
                        });
                      }
                    }}
                    disabled={!selectedHotel}
                    className="flex-1"
                  >
                    Continue to Payment
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No hotels found for your search criteria.</p>
                <Button 
                  variant="outline" 
                  onClick={() => setBookingData(prev => prev ? {...prev, bookingStatus: 'room-preferences'} : null)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Room Preferences
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {bookingData.bookingStatus === 'payment' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment & Booking Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Booking Summary */}
              <div className="border rounded-lg p-4 bg-muted/20">
                <h3 className="font-semibold text-lg mb-4">Booking Summary</h3>
                
                {/* Flight Bookings */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Flights</h4>
                  {bookingData.travelers.map((traveler: any, index: number) => {
                    const selectedFlights = traveler.selectedFlights || [];
                    const totalFlightCost = selectedFlights.reduce((sum: number, flight: any) => sum + parseFloat(flight.price), 0);
                    
                    return (
                      <div key={index} className="flex justify-between items-center py-2 border-b">
                        <div>
                          <span className="font-medium">{traveler.name}</span>
                          <p className="text-sm text-muted-foreground">
                            {traveler.departureCity} → {bookingData.tripDestination}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">${totalFlightCost.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Hotel Booking */}
                {bookingData.selectedHotel && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Hotel</h4>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <span className="font-medium">{bookingData.selectedHotel.name}</span>
                        <p className="text-sm text-muted-foreground">
                          {bookingData.roomsNeeded} rooms for {bookingData.travelers.length} travelers
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">${(bookingData.selectedHotel.price.amount * 3).toFixed(2)}</span>
                        <p className="text-xs text-muted-foreground">3 nights total</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount</span>
                    <span>${(() => {
                      const flightTotal = bookingData.travelers.reduce((sum: number, traveler: any) => {
                        const selectedFlights = traveler.selectedFlights || [];
                        return sum + selectedFlights.reduce((flightSum: number, flight: any) => flightSum + parseFloat(flight.price), 0);
                      }, 0);
                      const hotelTotal = bookingData.selectedHotel ? (bookingData.selectedHotel.price.amount * 3) : 0;
                      return (flightTotal + hotelTotal).toFixed(2);
                    })()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Payment Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Card Number</label>
                    <input 
                      type="text" 
                      placeholder="1234 5678 9012 3456"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cardholder Name</label>
                    <input 
                      type="text" 
                      placeholder="John Doe"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Expiry Month</label>
                    <input 
                      type="text" 
                      placeholder="MM"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Expiry Year</label>
                    <input 
                      type="text" 
                      placeholder="YYYY"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">CVV</label>
                    <input 
                      type="text" 
                      placeholder="123"
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Billing Address</label>
                  <input 
                    type="text" 
                    placeholder="123 Main Street, City, State, ZIP"
                    className="w-full mt-1 p-2 border rounded-md"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setBookingData(prev => prev ? {...prev, bookingStatus: 'hotels'} : null)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Hotels
                </Button>
                
                <Button 
                  onClick={async () => {
                    setIsBooking(true);
                    
                    try {
                      // Process actual bookings here
                      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate processing
                      
                      const updatedData = {
                        ...bookingData,
                        bookingStatus: 'complete' as const,
                        confirmationNumber: `NM${Date.now()}`,
                        bookingDate: new Date().toISOString()
                      };
                      setBookingData(updatedData);
                      sessionStorage.setItem('sequentialBookingData', JSON.stringify(updatedData));
                      
                      toast({
                        title: "Booking Confirmed",
                        description: "All reservations have been successfully processed!",
                      });
                    } catch (error) {
                      toast({
                        title: "Booking Error",
                        description: "Failed to process booking. Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsBooking(false);
                    }
                  }}
                  disabled={isBooking}
                  className="flex-1"
                >
                  {isBooking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      Confirm & Pay
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {bookingData.bookingStatus === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Booking Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Confirmation Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">Payment Successful</span>
                </div>
                <p className="text-green-700">
                  All reservations have been confirmed for your team trip to {bookingData.tripDestination}
                </p>
              </div>

              {/* Confirmation Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Confirmation Number</label>
                    <p className="text-lg font-mono font-semibold">{bookingData.confirmationNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Booking Date</label>
                    <p className="text-lg">{new Date(bookingData.bookingDate || '').toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Flight Confirmations */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Flight Confirmations</h3>
                  {bookingData.travelers.map((traveler: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3 mb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium">{traveler.name}</span>
                          <p className="text-sm text-muted-foreground">
                            {traveler.departureCity} → {bookingData.tripDestination}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            FL{(Date.now() + index).toString().slice(-6)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Confirmation sent to: {traveler.email}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hotel Confirmation */}
                {bookingData.selectedHotel && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Hotel Confirmation</h3>
                    <div className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium">{bookingData.selectedHotel.name}</span>
                          <p className="text-sm text-muted-foreground">
                            {bookingData.roomsNeeded} rooms, 3 nights
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            HT{Date.now().toString().slice(-6)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Check-in: {new Date(bookingData.departureDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Amount */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-medium">Total Paid</span>
                    <span className="font-bold">${(() => {
                      const flightTotal = bookingData.travelers.reduce((sum: number, traveler: any) => {
                        const selectedFlights = traveler.selectedFlights || [];
                        return sum + selectedFlights.reduce((flightSum: number, flight: any) => flightSum + parseFloat(flight.price), 0);
                      }, 0);
                      const hotelTotal = bookingData.selectedHotel ? (bookingData.selectedHotel.price.amount * 3) : 0;
                      return (flightTotal + hotelTotal).toFixed(2);
                    })()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Charged to card ending in ****1234
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1">
                  Download Receipt
                </Button>
                <Button onClick={handleComplete} className="flex-1">
                  Return to Trip Details
                </Button>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Next Steps</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Confirmation emails sent to all travelers</li>
                  <li>• Check-in opens 24 hours before departure</li>
                  <li>• Hotel vouchers will be available in your account</li>
                  <li>• Contact support for any changes or questions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}