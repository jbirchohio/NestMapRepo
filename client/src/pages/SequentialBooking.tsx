import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plane, Hotel, CheckCircle, ArrowRight, ArrowLeft, User, Clock, MapPin } from 'lucide-react';
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
  roomsNeeded: number;
  roomConfiguration: 'shared' | 'separate' | null;
  bookingStatus: 'flights' | 'room-preferences' | 'hotels' | 'complete';
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
  const totalSteps = bookingData.travelers?.length + 2 || 1; // All travelers + room preferences + hotels
  
  let completedSteps = bookingData.currentTravelerIndex;
  if (bookingData.bookingStatus === 'room-preferences') {
    completedSteps = bookingData.travelers?.length || 0;
  } else if (bookingData.bookingStatus === 'hotels') {
    completedSteps = (bookingData.travelers?.length || 0) + 1;
  } else if (bookingData.bookingStatus === 'complete') {
    completedSteps = totalSteps;
  }
  
  const progress = (completedSteps / totalSteps) * 100;

  // Handle case where no current traveler is available
  if (!currentTraveler && bookingData.bookingStatus !== 'hotels' && bookingData.bookingStatus !== 'room-preferences') {
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

    // Search for flights using authentic Amadeus API with same format as BookingWorkflow
    try {
      const searchParams = {
        origin: originCode,
        destination: destinationCode,
        departureDate: bookingData.departureDate,
        returnDate: bookingData.returnDate,
        passengers: 1,
        cabin: currentTraveler.travelClass || 'economy',
        tripType: bookingData.returnDate ? 'round-trip' : 'one-way',
      };

      console.log('Flight search params:', searchParams);

      const response = await apiRequest('POST', '/api/bookings/flights/search', searchParams);

      if (response.ok) {
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
      } else {
        throw new Error('Flight search failed');
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
      // All travelers done, move to room preferences
      const updatedData = {
        ...bookingData,
        bookingStatus: 'room-preferences' as const
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
                          bookingStatus: 'complete' as const
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
                    Confirm Hotel Selection
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

      {bookingData.bookingStatus === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Booking Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-4">
              All bookings have been processed for your team trip to {bookingData.tripDestination}.
            </p>
            
            <Button onClick={handleComplete} className="w-full">
              Return to Trip Details
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}