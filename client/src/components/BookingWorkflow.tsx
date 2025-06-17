import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plane, Hotel, Calendar, Users, DollarSign, Clock, Star, ChevronLeft, ChevronRight, MapPin, Briefcase } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/auth/AuthContext';

// Import modular components
import { FlightSearchForm } from './booking/FlightSearchForm';
import { FlightResults } from './booking/FlightResults';
import { HotelResults } from './booking/HotelResults';

// Comprehensive client information schema
const clientInfoSchema = z.object({
  // Travel Details
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  departureDate: z.string().min(1, 'Departure date is required'),
  returnDate: z.string().optional(),
  tripType: z.enum(['one-way', 'round-trip']),
  passengers: z.number().min(1, 'At least 1 passenger required').max(9, 'Maximum 9 passengers'),
  
  // Primary Traveler Details
  primaryTraveler: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(1, 'Phone number is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
  }),
  
  // Additional Travelers (if any)
  additionalTravelers: z.array(z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
  })).optional().default([]),
  
  // Preferences
  cabin: z.enum(['economy', 'premium-economy', 'business', 'first']).default('economy'),
  budget: z.number().optional(),
  
  // Corporate Information
  department: z.string().optional(),
  projectCode: z.string().optional(),
  costCenter: z.string().optional(),
});

type ClientInfo = z.infer<typeof clientInfoSchema>;

// Flight and Hotel interfaces
interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  departure: {
    airport: string;
    time: string;
  };
  arrival: {
    airport: string;
    time: string;
  };
  duration: string;
  stops: number;
  price: {
    amount: number;
    currency: string;
  };
  cabin: string;
  departureTime: string;
  arrivalTime: string;
}

interface HotelResult {
  id: string;
  name: string;
  rating: number;
  address: string;
  amenities: string[];
  price: {
    amount: number;
    currency: string;
  };
  images: string[];
}

type BookingStep = 'client-info' | 'flights' | 'hotels' | 'confirmation';

// Helper functions for date and time formatting
const formatTripDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return dateString;
  }
};

const formatFlightTime = (timeString: string): string => {
  try {
    return new Date(timeString).toLocaleTimeString('en-US', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return timeString;
  }
};

const formatDuration = (duration: string): string => {
  return duration || 'N/A';
};

export default function BookingWorkflow() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [currentStep, setCurrentStep] = useState<BookingStep>('client-info');
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    tripType: 'round-trip' as 'one-way' | 'round-trip',
    passengers: 1,
    primaryTraveler: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
    },
    additionalTravelers: [] as Array<{
      firstName: string;
      lastName: string;
      dateOfBirth: string;
    }>,
    cabin: 'economy' as 'economy' | 'premium-economy' | 'business' | 'first',
    budget: undefined as number | undefined,
    department: '',
    projectCode: '',
    costCenter: '',
  });
  
  // Flight and hotel state
  const [flightResults, setFlightResults] = useState<FlightResult[]>([]);
  const [hotelResults, setHotelResults] = useState<HotelResult[]>([]);
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<FlightResult | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<FlightResult | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelResult | null>(null);
  
  // Loading states
  const [isSearching, setIsSearching] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  
  // Multi-traveler booking state
  const [currentTravelerIndex, setCurrentTravelerIndex] = useState(0);
  const [travelerBookings, setTravelerBookings] = useState<Array<{
    traveler: string;
    departureFlight?: FlightResult | null;
    returnFlight?: FlightResult | null;
  }>>([]);

  // Helper function to get all travelers
  const getAllTravelers = () => {
    if (!clientInfo) return [];
    
    const travelers = [
      `${clientInfo.primaryTraveler.firstName} ${clientInfo.primaryTraveler.lastName}`,
      ...clientInfo.additionalTravelers.map(t => `${t.firstName} ${t.lastName}`)
    ];
    
    return travelers.map((name, index) => ({
      firstName: name.split(' ')[0],
      lastName: name.split(' ')[1] || '',
      fullName: name
    }));
  };

  const totalTravelers = getAllTravelers().length;

  // Calculate progress
  const getProgress = () => {
    switch (currentStep) {
      case 'client-info': return 25;
      case 'flights': return 50;
      case 'hotels': return 75;
      case 'confirmation': return 100;
      default: return 0;
    }
  };

  // Handle client info submission
  const handleClientInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = clientInfoSchema.parse(formData);
      setClientInfo(validatedData);
      
      // Initialize traveler bookings
      const travelers = getAllTravelers();
      setTravelerBookings(travelers.map(t => ({
        traveler: t.fullName,
        departureFlight: null,
        returnFlight: null
      })));
      
      setCurrentStep('flights');
      await searchFlights(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0]?.message || "Please check your input",
          variant: "destructive",
        });
      }
    }
  };

  // Search flights
  const searchFlights = async (info: ClientInfo) => {
    setIsSearching(true);
    try {
      const response = await apiRequest('POST', '/api/flights/search', {
        origin: info.origin,
        destination: info.destination,
        departureDate: info.departureDate,
        returnDate: info.returnDate,
        passengers: info.passengers,
        cabin: info.cabin,
      });
      
      const data = await response.json();
      setFlightResults(data.flights || []);
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Unable to search flights. Please try again.",
        variant: "destructive",
      });
      setFlightResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Search hotels
  const searchHotels = async (info: ClientInfo) => {
    try {
      const response = await apiRequest('POST', '/api/hotels/search', {
        destination: info.destination,
        checkIn: info.departureDate,
        checkOut: info.returnDate || info.departureDate,
        guests: info.passengers,
      });
      
      const data = await response.json();
      setHotelResults(data.hotels || []);
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Unable to search hotels. Please try again.",
        variant: "destructive",
      });
      setHotelResults([]);
    }
  };

  // Handle flight selection completion
  const handleFlightSelectionComplete = () => {
    if (currentTravelerIndex < totalTravelers - 1) {
      // Save current traveler's flights and move to next
      const updatedBookings = [...travelerBookings];
      updatedBookings[currentTravelerIndex] = {
        ...updatedBookings[currentTravelerIndex],
        departureFlight: selectedDepartureFlight,
        returnFlight: selectedReturnFlight
      };
      setTravelerBookings(updatedBookings);
      
      // Reset selections and move to next traveler
      setSelectedDepartureFlight(null);
      setSelectedReturnFlight(null);
      setCurrentTravelerIndex(currentTravelerIndex + 1);
    } else {
      // All travelers done, save last traveler and proceed to hotels
      const updatedBookings = [...travelerBookings];
      updatedBookings[currentTravelerIndex] = {
        ...updatedBookings[currentTravelerIndex],
        departureFlight: selectedDepartureFlight,
        returnFlight: selectedReturnFlight
      };
      setTravelerBookings(updatedBookings);
      
      setCurrentStep('hotels');
      if (clientInfo) {
        searchHotels(clientInfo);
      }
    }
  };

  // Create trip
  const handleCreateTrip = async () => {
    if (!clientInfo || !user) return;
    
    setIsBooking(true);
    try {
      const tripData = {
        clientInfo,
        flights: {
          departure: selectedDepartureFlight,
          return: selectedReturnFlight
        },
        hotel: selectedHotel,
        travelerBookings,
        totalCost: calculateTotalCost(),
        createdBy: user.id
      };
      
      const response = await apiRequest('POST', '/api/trips', tripData);
      
      if (response.ok) {
        toast({
          title: "Trip Created Successfully",
          description: "Your trip has been booked and saved.",
        });
        
        // Reset workflow
        setCurrentStep('client-info');
        setClientInfo(null);
        setFormData({
          origin: '',
          destination: '',
          departureDate: '',
          returnDate: '',
          tripType: 'round-trip',
          passengers: 1,
          primaryTraveler: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            dateOfBirth: '',
          },
          additionalTravelers: [],
          cabin: 'economy',
          budget: undefined,
          department: '',
          projectCode: '',
          costCenter: '',
        });
        setFlightResults([]);
        setHotelResults([]);
        setSelectedDepartureFlight(null);
        setSelectedReturnFlight(null);
        setSelectedHotel(null);
        setTravelerBookings([]);
        setCurrentTravelerIndex(0);
      } else {
        throw new Error('Failed to create trip');
      }
    } catch (error) {
      toast({
        title: "Booking Error",
        description: "Unable to create trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  // Calculate total cost
  const calculateTotalCost = () => {
    const flightCost = travelerBookings.reduce((total, booking) => {
      return total + (booking.departureFlight?.price.amount || 0) + (booking.returnFlight?.price.amount || 0);
    }, 0);
    
    const hotelCost = selectedHotel?.price.amount || 0;
    return flightCost + hotelCost;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Book Corporate Travel</h1>
          <Badge variant="outline">{getProgress()}% Complete</Badge>
        </div>
        <Progress value={getProgress()} className="h-2" />
        
        <div className="flex justify-between mt-4 text-sm">
          <span className={currentStep === 'client-info' ? 'text-blue-600 font-medium flex items-center gap-1' : 'text-gray-500 flex items-center gap-1'}>
            <MapPin className="w-4 h-4" /> Trip Details
          </span>
          <span className={currentStep === 'flights' ? 'text-blue-600 font-medium flex items-center gap-1' : 'text-gray-500 flex items-center gap-1'}>
            <Plane className="w-4 h-4" /> Select Flights
          </span>
          <span className={currentStep === 'hotels' ? 'text-blue-600 font-medium flex items-center gap-1' : 'text-gray-500 flex items-center gap-1'}>
            <Hotel className="w-4 h-4" /> Choose Hotel
          </span>
          <span className={currentStep === 'confirmation' ? 'text-blue-600 font-medium flex items-center gap-1' : 'text-gray-500 flex items-center gap-1'}>
            <Briefcase className="w-4 h-4" /> Confirmation
          </span>
        </div>
      </div>

      {/* Step 1: Client Information */}
      {currentStep === 'client-info' && (
        <Card>
          <CardHeader>
            <CardTitle>Trip Information</CardTitle>
          </CardHeader>
          <CardContent>
            <FlightSearchForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleClientInfoSubmit}
              isSearching={isSearching}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Flight Selection */}
      {currentStep === 'flights' && clientInfo && (
        <Card>
          <CardHeader>
            <CardTitle>
              Select Flights
              {totalTravelers > 1 && (
                <span className="text-base font-normal text-gray-600 ml-2">
                  - {getAllTravelers()[currentTravelerIndex]?.firstName || 'Traveler'} ({currentTravelerIndex + 1} of {totalTravelers})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FlightResults
              clientInfo={clientInfo}
              flightResults={flightResults}
              selectedDepartureFlight={selectedDepartureFlight}
              selectedReturnFlight={selectedReturnFlight}
              onSelectDepartureFlight={setSelectedDepartureFlight}
              onSelectReturnFlight={setSelectedReturnFlight}
              isLoading={isSearching}
              onBack={() => setCurrentStep('client-info')}
              onContinue={handleFlightSelectionComplete}
              currentTravelerIndex={currentTravelerIndex}
              totalTravelers={totalTravelers}
              travelerBookings={travelerBookings}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Hotel Selection */}
      {currentStep === 'hotels' && clientInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Select Accommodation</CardTitle>
          </CardHeader>
          <CardContent>
            <HotelResults
              clientInfo={clientInfo}
              hotelResults={hotelResults}
              selectedHotel={selectedHotel}
              onSelectHotel={setSelectedHotel}
              travelerBookings={travelerBookings}
              onBack={() => setCurrentStep('flights')}
              onContinue={() => setCurrentStep('confirmation')}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 'confirmation' && clientInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Booking Confirmation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Trip Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-3">Trip Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Route:</span>
                    <span className="ml-2 font-medium">{clientInfo.origin} → {clientInfo.destination}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-600">Dates:</span>
                    <span className="ml-2 font-medium">
                      {formatTripDate(clientInfo.departureDate)}
                      {clientInfo.returnDate && ` - ${formatTripDate(clientInfo.returnDate)}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 flex items-center gap-1">
                      <Users className="w-4 h-4" /> Travelers:
                    </span>
                    <span className="ml-2 font-medium">{clientInfo.passengers}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Class:</span>
                    <span className="ml-2 font-medium capitalize">{clientInfo.cabin}</span>
                  </div>
                </div>
              </div>

              {/* Traveler Bookings Summary */}
              <div className="space-y-4">
                <h3 className="font-medium">Flight Bookings</h3>
                {travelerBookings.map((booking, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="font-medium mb-2">{booking.traveler}</div>
                    
                    {booking.departureFlight && (
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Departure: {booking.departureFlight.airline} {booking.departureFlight.flightNumber}</span>
                          <span className="font-medium">${booking.departureFlight.price.amount}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(booking.departureFlight.duration)}
                        </div>
                      </div>
                    )}
                    
                    {booking.returnFlight && (
                      <div className="text-sm space-y-1 mt-1">
                        <div className="flex justify-between">
                          <span>Return: {booking.returnFlight.airline} {booking.returnFlight.flightNumber}</span>
                          <span className="font-medium">${booking.returnFlight.price.amount}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(booking.returnFlight.duration)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Hotel Summary */}
              {selectedHotel && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Accommodation</h3>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{selectedHotel.name}</div>
                      <div className="text-sm text-gray-600">{selectedHotel.address}</div>
                    </div>
                  <div className="text-right">
                    <div className="font-medium">${selectedHotel.price.amount}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      {selectedHotel.rating}
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* Total Cost */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium flex items-center gap-1">
                    <DollarSign className="w-4 h-4" /> Total Trip Cost
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${calculateTotalCost()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('hotels')}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back to Hotels
                </Button>
                <Button
                  onClick={handleCreateTrip}
                  disabled={isBooking}
                  size="lg"
                >
                  {isBooking ? 'Creating Trip...' : 'Create Complete Trip'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
