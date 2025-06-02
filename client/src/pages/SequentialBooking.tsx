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
  price: { amount: number; currency: string };
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrierCode: string;
      number: string;
      aircraft: { code: string };
      duration: string;
    }>;
  }>;
}

export default function SequentialBooking() {
  const [, setLocation] = useLocation();
  const [bookingData, setBookingData] = useState<SequentialBookingData | null>(null);
  const [currentStep, setCurrentStep] = useState(0); // 0: traveler info, 1: flight selection, 2: booking confirmation
  const [flightOffers, setFlightOffers] = useState<FlightOffer[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightOffer | null>(null);
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

    // Search for flights using authentic Amadeus API
    try {
      const response = await fetch('/api/bookings/search-flights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: currentTraveler.departureCity,
          destination: bookingData.tripDestination,
          departureDate: bookingData.departureDate,
          returnDate: bookingData.returnDate,
          adults: 1,
          travelClass: currentTraveler.travelClass || 'ECONOMY'
        }),
      });

      if (response.ok) {
        const flightData = await response.json();
        console.log('Flight search results:', flightData);
        
        // Set flight offers for selection
        setFlightOffers(flightData.offers || []);
        
        // Move to flight selection step
        setCurrentStep(1);
        
        toast({
          title: "Flights found",
          description: `Found ${flightData.offers?.length || 0} flight options for ${currentTraveler.name}`,
        });
      } else {
        toast({
          title: "Flight search failed",
          description: "Unable to search for flights. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Flight search error:', error);
      toast({
        title: "Flight search error",
        description: "Unable to search for flights. Please try again.",
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

  const handleHotelBooking = () => {
    // Pre-populate hotel booking with trip destination and room requirements
    const hotelBookingData = {
      destination: bookingData.tripDestination,
      checkInDate: bookingData.departureDate,
      checkOutDate: bookingData.returnDate,
      roomsNeeded: bookingData.roomsNeeded,
      roomConfiguration: bookingData.roomConfiguration,
      travelers: bookingData.travelers
    };

    sessionStorage.setItem('currentHotelBooking', JSON.stringify(hotelBookingData));
    window.location.href = `/bookings?tab=bookings&sequential=true&type=hotel&trip=${bookingData.tripId}`;
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
                            {offer.itineraries[0].segments[0].departure.iataCode} → {offer.itineraries[0].segments[offer.itineraries[0].segments.length - 1].arrival.iataCode}
                          </div>
                          <Badge variant="outline">
                            {offer.itineraries[0].segments[0].carrierCode} {offer.itineraries[0].segments[0].number}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(offer.itineraries[0].segments[0].departure.at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                            {new Date(offer.itineraries[0].segments[offer.itineraries[0].segments.length - 1].arrival.at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div>Duration: {offer.itineraries[0].duration.replace('PT', '').replace('H', 'h ').replace('M', 'm')}</div>
                          <div>Stops: {offer.itineraries[0].segments.length - 1}</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          ${parseFloat(offer.price.amount).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">{offer.price.currency}</div>
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
                      description: `Selected ${selectedFlight.price.currency} ${selectedFlight.price.amount} flight for ${currentTraveler.name}`,
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