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
import { Plane, Hotel, CheckCircle, ArrowRight, ArrowLeft, User } from 'lucide-react';
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
  bookingStatus: 'flights' | 'hotels' | 'complete';
}

export default function SequentialBooking() {
  const [, setLocation] = useLocation();
  const [bookingData, setBookingData] = useState<SequentialBookingData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

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
  const totalSteps = bookingData.travelers?.length + 1 || 1; // All travelers + hotels
  const progress = ((bookingData.currentTravelerIndex + (bookingData.bookingStatus === 'hotels' ? 1 : 0)) / totalSteps) * 100;

  // Handle case where no current traveler is available
  if (!currentTraveler && bookingData.bookingStatus !== 'hotels') {
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

  const handleFlightBooking = () => {
    // Pre-populate flight booking form with trip destination as arrival
    const flightBookingData = {
      travelerName: currentTraveler.name,
      travelerEmail: currentTraveler.email,
      travelerPhone: currentTraveler.phone,
      travelerDateOfBirth: currentTraveler.dateOfBirth,
      departureCity: currentTraveler.departureCity,
      arrivalCity: bookingData.tripDestination, // Auto-populate from trip
      departureDate: bookingData.departureDate,
      returnDate: bookingData.returnDate,
      travelClass: currentTraveler.travelClass,
      dietaryRequirements: currentTraveler.dietaryRequirements,
      emergencyContact: currentTraveler.emergencyContact
    };

    // Store current flight booking data
    sessionStorage.setItem('currentFlightBooking', JSON.stringify(flightBookingData));
    
    // Navigate to main bookings page with flight tab and pre-populated data
    window.location.href = `/bookings?tab=bookings&sequential=true&traveler=${currentTraveler.id}`;
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
      // All travelers done, move to hotels
      const updatedData = {
        ...bookingData,
        bookingStatus: 'hotels' as const
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
              <Button onClick={handleFlightBooking} className="flex-1">
                Book Flight for {currentTraveler.name}
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