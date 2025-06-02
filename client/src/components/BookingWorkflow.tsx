import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plane, Building, Clock, MapPin, Users, Star, Calendar, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as ReactCalendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

// Comprehensive client information schema
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

type ClientInfoValues = z.infer<typeof clientInfoSchema>;

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
  type?: string;
  departure?: { airport: string; time: string; date: string };
  arrival?: { airport: string; time: string; date: string };
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

export default function BookingWorkflow() {
  const { toast } = useToast();
  const { user, userId } = useAuth();
  
  // Workflow steps
  const [currentStep, setCurrentStep] = useState<'client-info' | 'flights' | 'hotels' | 'confirmation'>('client-info');
  const [isSearching, setIsSearching] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  
  // Data storage
  const [clientInfo, setClientInfo] = useState<ClientInfoValues | null>(null);
  const [flightResults, setFlightResults] = useState<FlightResult[]>([]);
  const [hotelResults, setHotelResults] = useState<HotelResult[]>([]);
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<FlightResult | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<FlightResult | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelResult | null>(null);
  
  // Filter states
  const [flightSortBy, setFlightSortBy] = useState<'price' | 'duration' | 'stops'>('price');
  const [maxStops, setMaxStops] = useState<number>(2);
  const [maxPrice, setMaxPrice] = useState<number>(2000);
  const [additionalTravelers, setAdditionalTravelers] = useState<Array<{firstName: string; lastName: string; dateOfBirth: string}>>([]);
  
  // Traveler management for sequential booking
  const [currentTravelerIndex, setCurrentTravelerIndex] = useState<number>(0);
  const [travelerBookings, setTravelerBookings] = useState<Array<{
    traveler: any;
    departureFlight?: FlightResult;
    returnFlight?: FlightResult;
  }>>([]);
  
  // Get all travelers for the booking
  const getAllTravelers = () => {
    const travelers = [];
    
    // Add primary traveler
    if (clientInfo) {
      travelers.push({
        firstName: clientInfo.primaryTraveler.firstName,
        lastName: clientInfo.primaryTraveler.lastName,
        email: clientInfo.primaryTraveler.email,
        phone: clientInfo.primaryTraveler.phone,
        dateOfBirth: clientInfo.primaryTraveler.dateOfBirth,
        isPrimary: true
      });
    }
    
    // Add additional travelers
    additionalTravelers.forEach(t => {
      travelers.push({
        firstName: t.firstName,
        lastName: t.lastName,
        email: '',
        phone: '',
        dateOfBirth: t.dateOfBirth,
        isPrimary: false
      });
    });
    
    return travelers;
  };
  
  const currentTraveler = getAllTravelers()[currentTravelerIndex];
  const totalTravelers = getAllTravelers().length;
  
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

  // Check for pre-filled data from URL parameters (team member booking)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const sequential = urlParams.get('sequential');
    const tripId = urlParams.get('trip');
    
    if (mode === 'group' && tripId) {
      // Get team data from sessionStorage
      const groupBookingData = sessionStorage.getItem('groupBookingData');
      if (groupBookingData) {
        try {
          const parsedTeamData = JSON.parse(groupBookingData);
          const travelers = parsedTeamData.travelers;
        
        if (travelers && travelers.length > 0) {
          // Set up additional travelers from team data
          setAdditionalTravelers(travelers.map((traveler: any) => ({
            firstName: traveler.name.split(' ')[0] || '',
            lastName: traveler.name.split(' ').slice(1).join(' ') || '',
            dateOfBirth: '',
            departureCity: traveler.departureCity,
            departureCountry: traveler.departureCountry,
            travelClass: traveler.travelClass,
            dietaryRequirements: traveler.dietaryRequirements,
            budget: traveler.budget
          })));
          
          // Pre-fill primary traveler with first team member
          const primaryTraveler = travelers[0];
          const origin = primaryTraveler.departureCity && primaryTraveler.departureCountry 
            ? `${primaryTraveler.departureCity}, ${primaryTraveler.departureCountry}`
            : 'Multiple Origins';
            
          clientForm.reset({
            origin: origin,
            destination: 'Group Destination (TBD)',
            departureDate: new Date().toISOString().split('T')[0],
            returnDate: '',
            tripType: 'round-trip',
            passengers: travelers.length,
            primaryTraveler: {
              firstName: primaryTraveler.name.split(' ')[0] || 'Group',
              lastName: primaryTraveler.name.split(' ').slice(1).join(' ') || 'Coordinator',
              email: primaryTraveler.email || user?.email || 'coordinator@company.com',
              phone: '000-000-0000',
              dateOfBirth: '1990-01-01',
            },
            emergencyContact: {
              name: 'Company HR',
              phone: '000-000-0000',
              relationship: 'Employer',
            },
            specialRequests: `Multi-origin group booking: ${travelers.map(t => `${t.name} from ${t.departureCity || 'TBD'}`).join(', ')}`,
            tripPurpose: 'business',
            companyName: 'Corporate Travel',
            costCenter: 'Group Travel',
          });

          // Group booking mode enabled
          
          toast({
            title: "Group coordinator booking",
            description: `Setting up coordinated booking for ${travelers.length} team members from multiple cities`,
          });
        }
        } catch (error) {
          console.error('Error parsing team data:', error);
        }
      }
    } else if (sequential === 'true') {
      // Handle sequential booking data from new workflow
      const currentFlightBooking = sessionStorage.getItem('currentFlightBooking');
      if (currentFlightBooking) {
        try {
          const flightData = JSON.parse(currentFlightBooking);
          
          // Pre-fill form with individual traveler data
          clientForm.reset({
            origin: flightData.departureCity || '',
            destination: flightData.arrivalCity || '',
            departureDate: flightData.departureDate || '',
            returnDate: flightData.returnDate || '',
            tripType: flightData.returnDate ? 'round-trip' : 'one-way',
            passengers: 1,
            primaryTraveler: {
              firstName: flightData.travelerName?.split(' ')[0] || '',
              lastName: flightData.travelerName?.split(' ').slice(1).join(' ') || '',
              email: flightData.travelerEmail || '',
              phone: flightData.travelerPhone || '',
              dateOfBirth: flightData.travelerDateOfBirth || '',
            },
            emergencyContact: {
              name: flightData.emergencyContact?.name || '',
              phone: flightData.emergencyContact?.phone || '',
              relationship: flightData.emergencyContact?.relationship || '',
            },
            specialRequests: flightData.dietaryRequirements || '',
            tripPurpose: 'business',
            companyName: '',
            costCenter: '',
          });
          
          // Set client info and automatically search flights
          setClientInfo({
            origin: flightData.departureCity || '',
            destination: flightData.arrivalCity || '',
            departureDate: flightData.departureDate || '',
            returnDate: flightData.returnDate || '',
            tripType: flightData.returnDate ? 'round-trip' : 'one-way',
            passengers: 1,
            primaryTraveler: {
              firstName: flightData.travelerName?.split(' ')[0] || '',
              lastName: flightData.travelerName?.split(' ').slice(1).join(' ') || '',
              email: flightData.travelerEmail || '',
              phone: flightData.travelerPhone || '',
              dateOfBirth: flightData.travelerDateOfBirth || '',
            },
            emergencyContact: {
              name: flightData.emergencyContact?.name || '',
              phone: flightData.emergencyContact?.phone || '',
              relationship: flightData.emergencyContact?.relationship || '',
            },
            specialRequests: flightData.dietaryRequirements || '',
            tripPurpose: 'business',
            companyName: '',
            costCenter: '',
          });

          // Skip client info step and go directly to flight search
          setCurrentStep('flights');
          setIsSearching(true);

          // Auto-search flights with the provided information
          setTimeout(async () => {
            try {
              // Convert city names to airport codes before searching
              const convertCityToAirportCode = async (cityName: string): Promise<string> => {
                try {
                  const response = await apiRequest('POST', '/api/locations/airport-code', { cityName });
                  if (response.ok) {
                    const data = await response.json();
                    return data.airportCode;
                  }
                } catch (error) {
                  console.error('Error converting city to airport code:', error);
                }
                return cityName; // Fallback to original if conversion fails
              };

              const originCode = await convertCityToAirportCode(flightData.departureCity);
              const destinationCode = await convertCityToAirportCode(flightData.arrivalCity);

              const searchParams = {
                origin: originCode,
                destination: destinationCode,
                departureDate: flightData.departureDate,
                returnDate: flightData.returnDate || undefined,
                passengers: 1,
                cabin: 'economy',
                tripType: flightData.returnDate ? 'round-trip' : 'one-way',
              };

              console.log('Sequential booking flight search params:', searchParams);
              console.log('Original flight data:', flightData);

              const response = await apiRequest('POST', '/api/bookings/flights/search', searchParams);
              
              console.log('Flight search response status:', response.status);
              console.log('Flight search response ok:', response.ok);
              
              if (response.ok) {
                const flightSearchData = await response.json();
                console.log('Flight search data received:', flightSearchData);
                console.log('Number of flights:', flightSearchData.flights?.length);
                
                // Transform flight data to match frontend interface
                const transformedFlights = (flightSearchData.flights || []).map((flight: any) => {
                  // Format departure and arrival times properly
                  const formatTime = (timeStr: string) => {
                    if (!timeStr) return '00:00';
                    // If it's already in HH:MM format, return as is
                    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
                    // If it's a longer format, extract HH:MM
                    return timeStr.substring(0, 5);
                  };

                  return {
                    id: flight.id,
                    airline: flight.airline,
                    flightNumber: flight.flightNumber,
                    origin: flight.departure?.airport || originCode,
                    destination: flight.arrival?.airport || destinationCode,
                    departureTime: formatTime(flight.departure?.time || '00:00'),
                    arrivalTime: formatTime(flight.arrival?.time || '00:00'),
                    duration: flight.duration || '0h 0m',
                    stops: flight.stops || 0,
                    price: {
                      amount: flight.price || 0,
                      currency: flight.currency || 'USD'
                    },
                    cabin: 'economy',
                    availability: 9,
                    bookingUrl: '#',
                    type: flight.type || 'outbound' // Add flight type for filtering
                  };
                });
                
                setFlightResults(transformedFlights);
                setCurrentStep('flights');
                
                toast({
                  title: "Sequential booking",
                  description: `Found ${flightSearchData.flights?.length || 0} flights for ${flightData.travelerName} from ${flightData.departureCity} to ${flightData.arrivalCity}`,
                });
              } else {
                const errorData = await response.text();
                console.log('Flight search error response:', errorData);
                throw new Error(`Flight search failed: ${response.status} - ${errorData}`);
              }
            } catch (error) {
              console.error('Error searching flights:', error);
              toast({
                title: "Search error",
                description: "Unable to search flights. Please check your travel details and try again.",
                variant: "destructive",
              });
              setCurrentStep('client-info'); // Fallback to client info if search fails
            } finally {
              setIsSearching(false);
            }
          }, 1000);
        
          toast({
            title: "Sequential booking",
            description: `Searching flights for ${flightData.travelerName}...`,
          });
        } catch (error) {
          console.error('Error parsing sequential flight booking data:', error);
        }
      }
    }
  }, [user?.email, toast, clientForm]);

  // Step 1: Handle client information submission
  const handleClientInfoSubmit = async (data: ClientInfoValues) => {
    setClientInfo(data);
    
    // Auto-search flights with the provided information
    setIsSearching(true);
    try {
      const searchParams = {
        origin: data.origin,
        destination: data.destination,
        departureDate: data.departureDate,
        returnDate: data.tripType === 'round-trip' ? data.returnDate : undefined,
        passengers: data.passengers,
        cabin: 'economy',
        tripType: data.tripType,
      };

      const response = await apiRequest('POST', '/api/bookings/flights/search', searchParams);
      
      if (response.ok) {
        const flightData = await response.json();
        setFlightResults(flightData.flights || []);
        
        toast({
          title: "Client Information Saved",
          description: `Found ${flightData.flights?.length || 0} flights for ${data.primaryTraveler.firstName}. Select your preferred flights.`,
        });
        
        setCurrentStep('flights');
      } else {
        throw new Error('Flight search failed');
      }
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Unable to search for flights. Please check your travel details.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Step 2: Handle flight selection and move to hotels
  const handleFlightSelectionComplete = async () => {
    if (!clientInfo || (!selectedDepartureFlight && !selectedReturnFlight)) {
      toast({
        title: "No Flights Selected",
        description: "Please select at least one flight to continue.",
        variant: "destructive",
      });
      return;
    }

    // Save current traveler's flight selections
    const updatedBookings = [...travelerBookings];
    const currentTravelerBooking = {
      traveler: currentTraveler,
      departureFlight: selectedDepartureFlight,
      returnFlight: selectedReturnFlight
    };

    if (updatedBookings[currentTravelerIndex]) {
      updatedBookings[currentTravelerIndex] = currentTravelerBooking;
    } else {
      updatedBookings.push(currentTravelerBooking);
    }
    setTravelerBookings(updatedBookings);

    // Check if there are more travelers to process
    if (currentTravelerIndex < totalTravelers - 1) {
      // Move to next traveler
      setCurrentTravelerIndex(currentTravelerIndex + 1);
      
      // Clear current selections for next traveler
      setSelectedDepartureFlight(null);
      setSelectedReturnFlight(null);
      
      toast({
        title: "Flights Saved",
        description: `Flights saved for ${currentTraveler?.firstName}. Now selecting flights for ${getAllTravelers()[currentTravelerIndex + 1]?.firstName}.`,
      });
      
      return; // Stay on flight selection step
    }

    // All travelers processed, move to hotels
    setIsSearching(true);
    try {
      const searchParams = {
        destination: clientInfo.destination,
        checkIn: clientInfo.departureDate,
        checkOut: clientInfo.returnDate || clientInfo.departureDate,
        guests: totalTravelers,
        rooms: totalTravelers, // Default to one room per traveler
      };

      const response = await apiRequest('POST', '/api/bookings/hotels/search', searchParams);
      
      if (response.ok) {
        const hotelData = await response.json();
        setHotelResults(hotelData.hotels || []);
        
        toast({
          title: "All Flights Selected",
          description: `Flights selected for all ${totalTravelers} travelers. Found ${hotelData.hotels?.length || 0} hotels for your stay.`,
        });
        
        setCurrentStep('hotels');
      } else {
        throw new Error('Hotel search failed');
      }
    } catch (error) {
      toast({
        title: "Hotel Search Failed",
        description: "Unable to search for hotels. You can skip this step and add accommodation later.",
        variant: "destructive",
      });
      setCurrentStep('confirmation');
    } finally {
      setIsSearching(false);
    }
  };

  // Step 3: Final trip creation
  const handleCreateTrip = async () => {
    if (!clientInfo || !userId) {
      toast({
        title: "Missing Information",
        description: "Please complete all required steps.",
        variant: "destructive",
      });
      return;
    }

    setIsBooking(true);
    try {
      const tripResponse = await apiRequest('POST', '/api/trips', {
        title: `Trip to ${clientInfo.destination}`,
        city: clientInfo.destination,
        country: 'United States', // You could enhance this to detect country from destination
        startDate: clientInfo.departureDate,
        endDate: clientInfo.returnDate || clientInfo.departureDate,
        userId: userId,
        description: `${clientInfo.tripPurpose} trip for ${clientInfo.primaryTraveler.firstName} ${clientInfo.primaryTraveler.lastName}`,
        notes: clientInfo.specialRequests || '',
        // Include all traveler information
        primaryTraveler: clientInfo.primaryTraveler,
        emergencyContact: clientInfo.emergencyContact,
        tripPurpose: clientInfo.tripPurpose,
        companyName: clientInfo.companyName,
        costCenter: clientInfo.costCenter,
        // Include booking information
        selectedFlights: {
          departure: selectedDepartureFlight,
          return: selectedReturnFlight
        },
        selectedHotel: selectedHotel,
      });

      if (tripResponse.ok) {
        const trip = await tripResponse.json();
        
        toast({
          title: "Trip Created Successfully",
          description: `Complete travel booking for ${clientInfo.primaryTraveler.firstName} ${clientInfo.primaryTraveler.lastName} has been created.`,
        });

        // Clear all data and redirect
        setClientInfo(null);
        setFlightResults([]);
        setHotelResults([]);
        setSelectedDepartureFlight(null);
        setSelectedReturnFlight(null);
        setSelectedHotel(null);
        setCurrentStep('client-info');
        
        window.location.href = `/trip/${trip.id}`;
      } else {
        throw new Error('Failed to create trip');
      }
    } catch (error) {
      toast({
        title: "Trip Creation Failed",
        description: "There was an error creating your trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const formatFlightTime = (timeString: string) => {
    // Handle time in HH:MM format (convert military time to standard)
    if (timeString && timeString.match(/^\d{2}:\d{2}$/)) {
      const [hours, minutes] = timeString.split(':');
      const hour24 = parseInt(hours);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${ampm}`;
    }
    // Fallback for datetime strings
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFlightDate = (dateString: string) => {
    // Handle date in YYYY-MM-DD format
    if (dateString && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
    // Fallback for datetime strings
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (duration: string) => {
    return duration.replace('PT', '').replace('H', 'h ').replace('M', 'm');
  };

  const isRedEyeFlight = (departureTime: string, arrivalTime: string) => {
    // Check if departure is after 9 PM or arrival is before 6 AM
    const depHour = parseInt(departureTime.split(':')[0]);
    const arrHour = parseInt(arrivalTime.split(':')[0]);
    return depHour >= 21 || arrHour <= 6;
  };

  // Filter and sort flights
  const filterAndSortFlights = (flights: FlightResult[], type: 'outbound' | 'return') => {
    let filtered = flights.filter(flight => {
      // Filter by type
      if (flight.type !== type) return false;
      
      // Filter by max stops
      if (flight.stops > maxStops) return false;
      
      // Filter by max price
      if (flight.price.amount > maxPrice) return false;
      
      return true;
    });

    // Sort flights
    filtered.sort((a, b) => {
      switch (flightSortBy) {
        case 'price':
          return a.price.amount - b.price.amount;
        case 'duration':
          // Convert duration string to minutes for comparison
          const aDuration = parseDurationToMinutes(a.duration);
          const bDuration = parseDurationToMinutes(b.duration);
          return aDuration - bDuration;
        case 'stops':
          return a.stops - b.stops;
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Helper function to parse duration string to minutes
  const parseDurationToMinutes = (duration: string): number => {
    const match = duration.match(/(\d+)h\s*(\d+)?m?/);
    if (!match) return 0;
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    return hours * 60 + minutes;
  };

  const formatTripDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Professional Travel Booking</h1>
        
        {/* Progress Steps */}
        <div className="flex items-center space-x-4 mb-6">
          {[
            { key: 'client-info', label: 'Client Information', number: 1 },
            { key: 'flights', label: 'Select Flights', number: 2 },
            { key: 'hotels', label: 'Select Hotel', number: 3 },
            { key: 'confirmation', label: 'Confirmation', number: 4 },
          ].map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step.key ? 'bg-blue-600 text-white' :
                ['client-info', 'flights', 'hotels'].indexOf(currentStep) > ['client-info', 'flights', 'hotels'].indexOf(step.key) ? 'bg-green-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {step.number}
              </div>
              <span className={`ml-2 text-sm ${
                currentStep === step.key ? 'font-medium text-blue-600' : 'text-gray-600'
              }`}>
                {step.label}
              </span>
              {index < 3 && <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Client Information */}
      {currentStep === 'client-info' && (
        <Card>
          <CardHeader>
            <CardTitle>Client & Travel Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={clientForm.handleSubmit(handleClientInfoSubmit)} className="space-y-6">
              {/* Travel Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Travel Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="origin">From (Origin) *</Label>
                    <Input
                      id="origin"
                      {...clientForm.register("origin")}
                      placeholder="e.g., New York, Cleveland"
                    />
                  </div>
                  <div>
                    <Label htmlFor="destination">To (Destination) *</Label>
                    <Input
                      id="destination"
                      {...clientForm.register("destination")}
                      placeholder="e.g., Miami, Detroit"
                    />
                  </div>
                  <div>
                    <Label htmlFor="departureDate">Departure Date *</Label>
                    <Input
                      id="departureDate"
                      type="date"
                      {...clientForm.register("departureDate")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="returnDate">Return Date</Label>
                    <Input
                      id="returnDate"
                      type="date"
                      {...clientForm.register("returnDate")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tripType">Trip Type *</Label>
                    <select
                      id="tripType"
                      {...clientForm.register("tripType")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="round-trip">Round Trip</option>
                      <option value="one-way">One Way</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="passengers">Passengers *</Label>
                    <Input
                      id="passengers"
                      type="number"
                      min="1"
                      max="10"
                      {...clientForm.register("passengers", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>

              {/* Primary Traveler Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Primary Traveler</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      {...clientForm.register("primaryTraveler.firstName")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      {...clientForm.register("primaryTraveler.lastName")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...clientForm.register("primaryTraveler.email")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      {...clientForm.register("primaryTraveler.phone")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...clientForm.register("primaryTraveler.dateOfBirth")}
                    />
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
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone">Contact Phone *</Label>
                    <Input
                      id="emergencyPhone"
                      {...clientForm.register("emergencyContact.phone")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="relationship">Relationship *</Label>
                    <Input
                      id="relationship"
                      placeholder="e.g., Spouse, Parent, Friend"
                      {...clientForm.register("emergencyContact.relationship")}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Travelers Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-medium">Additional Travelers</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdditionalTravelers([...additionalTravelers, { firstName: '', lastName: '', dateOfBirth: '' }])}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Traveler
                  </Button>
                </div>
                
                {additionalTravelers.map((traveler, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Traveler {index + 2}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAdditionalTravelers(additionalTravelers.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>First Name *</Label>
                        <Input
                          value={traveler.firstName}
                          onChange={(e) => {
                            const updated = [...additionalTravelers];
                            updated[index].firstName = e.target.value;
                            setAdditionalTravelers(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Last Name *</Label>
                        <Input
                          value={traveler.lastName}
                          onChange={(e) => {
                            const updated = [...additionalTravelers];
                            updated[index].lastName = e.target.value;
                            setAdditionalTravelers(updated);
                          }}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Date of Birth *</Label>
                        <Input
                          type="date"
                          value={traveler.dateOfBirth}
                          onChange={(e) => {
                            const updated = [...additionalTravelers];
                            updated[index].dateOfBirth = e.target.value;
                            setAdditionalTravelers(updated);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trip Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Trip Purpose & Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tripPurpose">Trip Purpose *</Label>
                    <select
                      id="tripPurpose"
                      {...clientForm.register("tripPurpose")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit"
                  disabled={isSearching}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSearching ? 'Searching Flights...' : 'Continue to Flight Selection'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Flight Selection */}
      {currentStep === 'flights' && clientInfo && (
        <Card>
          <CardHeader>
            <CardTitle>
              Select Flights for {currentTraveler ? `${currentTraveler.firstName} ${currentTraveler.lastName}` : 'Traveler'}
              {totalTravelers > 1 && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({currentTravelerIndex + 1} of {totalTravelers})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-gray-600">
                {clientInfo.origin} → {clientInfo.destination} • {formatTripDate(clientInfo.departureDate)}
                {clientInfo.returnDate && ` • Return: ${formatTripDate(clientInfo.returnDate)}`}
              </p>
            </div>

            {flightResults.length > 0 ? (
              <div className="space-y-4">
                <Tabs defaultValue="departure" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="departure">
                      <Plane className="h-4 w-4 mr-2" />
                      Departure Flights
                    </TabsTrigger>
                    {clientInfo.tripType === 'round-trip' && (
                      <TabsTrigger value="return">
                        <Plane className="h-4 w-4 mr-2 transform rotate-180" />
                        Return Flights
                      </TabsTrigger>
                    )}
                  </TabsList>

                <TabsContent value="departure" className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Select Departure Flight</h3>
                    <div className="text-sm text-gray-500">
                      {clientInfo.origin} → {clientInfo.destination}
                    </div>
                  </div>
                  
                  {/* Filter Controls */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Sort by:</label>
                        <select 
                          value={flightSortBy} 
                          onChange={(e) => setFlightSortBy(e.target.value as 'price' | 'duration' | 'stops')}
                          className="px-3 py-1 border rounded text-sm"
                        >
                          <option value="price">Cheapest first</option>
                          <option value="duration">Shortest duration</option>
                          <option value="stops">Fewest stops</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Max stops:</label>
                        <select 
                          value={maxStops} 
                          onChange={(e) => setMaxStops(parseInt(e.target.value))}
                          className="px-3 py-1 border rounded text-sm"
                        >
                          <option value="0">Direct only</option>
                          <option value="1">1 stop max</option>
                          <option value="2">2 stops max</option>
                          <option value="3">Any</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Max price:</label>
                        <select 
                          value={maxPrice} 
                          onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                          className="px-3 py-1 border rounded text-sm"
                        >
                          <option value="500">Under $500</option>
                          <option value="800">Under $800</option>
                          <option value="1200">Under $1,200</option>
                          <option value="2000">Under $2,000</option>
                          <option value="5000">Any price</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {filterAndSortFlights(flightResults, 'outbound').map((flight) => (
                      <div 
                        key={flight.id} 
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedDepartureFlight?.id === flight.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedDepartureFlight(flight)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-blue-600">
                                {flight.departure?.airport || 'JFK'} → {flight.arrival?.airport || 'SFO'}
                              </div>
                              <div className="text-sm font-medium text-gray-700">
                                {flight.airline} {flight.flightNumber}
                              </div>
                              {isRedEyeFlight(
                                flight.departure?.time || flight.departureTime, 
                                flight.arrival?.time || flight.arrivalTime
                              ) && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                  Red-eye
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">
                              {flight.departure ? formatFlightTime(flight.departure.time) : formatFlightTime(flight.departureTime)} - {flight.arrival ? formatFlightTime(flight.arrival.time) : formatFlightTime(flight.arrivalTime)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`} • {formatDuration(flight.duration)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">${flight.price.amount}</div>
                            <div className="text-sm text-gray-500 capitalize">{flight.cabin}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {clientInfo.tripType === 'round-trip' && (
                  <TabsContent value="return" className="space-y-4 mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Select Return Flight</h3>
                      <div className="text-sm text-gray-500">
                        {clientInfo.destination} → {clientInfo.origin}
                      </div>
                    </div>
                    
                    {/* Filter Controls */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">Sort by:</label>
                          <select 
                            value={flightSortBy} 
                            onChange={(e) => setFlightSortBy(e.target.value as 'price' | 'duration' | 'stops')}
                            className="px-3 py-1 border rounded text-sm"
                          >
                            <option value="price">Cheapest first</option>
                            <option value="duration">Shortest duration</option>
                            <option value="stops">Fewest stops</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">Max stops:</label>
                          <select 
                            value={maxStops} 
                            onChange={(e) => setMaxStops(parseInt(e.target.value))}
                            className="px-3 py-1 border rounded text-sm"
                          >
                            <option value="0">Direct only</option>
                            <option value="1">1 stop max</option>
                            <option value="2">2 stops max</option>
                            <option value="3">Any</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">Max price:</label>
                          <select 
                            value={maxPrice} 
                            onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                            className="px-3 py-1 border rounded text-sm"
                          >
                            <option value="500">Under $500</option>
                            <option value="800">Under $800</option>
                            <option value="1200">Under $1,200</option>
                            <option value="2000">Under $2,000</option>
                            <option value="5000">Any price</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {filterAndSortFlights(flightResults, 'return').map((flight) => (
                        <div 
                          key={flight.id} 
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            selectedReturnFlight?.id === flight.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedReturnFlight(flight)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="font-semibold text-blue-600">
                                  {flight.departure?.airport || 'SFO'} → {flight.arrival?.airport || 'JFK'}
                                </div>
                                <div className="text-sm font-medium text-gray-700">
                                  {flight.airline} {flight.flightNumber}
                                </div>
                                {isRedEyeFlight(
                                  flight.departure?.time || flight.departureTime, 
                                  flight.arrival?.time || flight.arrivalTime
                                ) && (
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                    Red-eye
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 font-medium">
                                {flight.departure ? formatFlightTime(flight.departure.time) : formatFlightTime(flight.departureTime)} - {flight.arrival ? formatFlightTime(flight.arrival.time) : formatFlightTime(flight.arrivalTime)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`} • {formatDuration(flight.duration)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">${flight.price.amount}</div>
                              <div className="text-sm text-gray-500 capitalize">{flight.cabin}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
                </Tabs>

                {/* Traveler Progress Indicator */}
                {totalTravelers > 1 && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-2">Booking Progress</h4>
                    <div className="flex flex-wrap gap-2">
                      {getAllTravelers().map((traveler, index) => (
                        <div 
                          key={index}
                          className={`px-3 py-1 rounded-full text-sm ${
                            index < currentTravelerIndex 
                              ? 'bg-green-100 text-green-800' 
                              : index === currentTravelerIndex 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {traveler.firstName} {index < currentTravelerIndex ? '✓' : index === currentTravelerIndex ? '→' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flight Selection Summary */}
                {(selectedDepartureFlight || selectedReturnFlight) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Selected Flights for {currentTraveler?.firstName}</h4>
                    {selectedDepartureFlight && (
                      <div className="flex justify-between">
                        <span>Departure: {selectedDepartureFlight.airline} {selectedDepartureFlight.flightNumber}</span>
                        <span>${selectedDepartureFlight.price.amount}</span>
                      </div>
                    )}
                    {selectedReturnFlight && (
                      <div className="flex justify-between">
                        <span>Return: {selectedReturnFlight.airline} {selectedReturnFlight.flightNumber}</span>
                        <span>${selectedReturnFlight.price.amount}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                      <span>Total Flight Cost:</span>
                      <span>${(selectedDepartureFlight?.price.amount || 0) + (selectedReturnFlight?.price.amount || 0)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentStep('client-info')}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Client Info
                  </Button>
                  <Button 
                    onClick={handleFlightSelectionComplete}
                    disabled={!selectedDepartureFlight && !selectedReturnFlight}
                  >
                    {currentTravelerIndex < totalTravelers - 1 
                      ? `Continue to Next Traveler (${getAllTravelers()[currentTravelerIndex + 1]?.firstName || 'Next'})` 
                      : 'Continue to Hotels'
                    }
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No flights found for your search criteria.</p>
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('client-info')}
                  className="mt-4"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back to Client Info
                </Button>
              </div>
            )}
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
            <div className="mb-4">
              <p className="text-gray-600">
                {clientInfo.destination} • {clientInfo.departureDate} to {clientInfo.returnDate || clientInfo.departureDate}
              </p>
            </div>

            {hotelResults.length > 0 ? (
              <div className="space-y-4">
                {hotelResults.map((hotel) => (
                  <div 
                    key={hotel.id} 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedHotel?.id === hotel.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedHotel(hotel)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{hotel.name}</h4>
                          <div className="flex">
                            {Array.from({ length: hotel.starRating }).map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{hotel.address}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-600">⭐ {hotel.rating.score}/10 ({hotel.rating.reviews} reviews)</span>
                          <span className="text-blue-600">{hotel.cancellation} cancellation</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {hotel.amenities.slice(0, 3).map((amenity, index) => (
                            <Badge key={index} variant="secondary">{amenity}</Badge>
                          ))}
                          {hotel.amenities.length > 3 && (
                            <Badge variant="outline">+{hotel.amenities.length - 3} more</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-bold text-green-600">${hotel.price.amount}</div>
                        <div className="text-sm text-gray-500">per {hotel.price.per}</div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentStep('flights')}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Flights
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentStep('confirmation')}
                    >
                      Skip Hotels
                    </Button>
                    <Button 
                      onClick={() => setCurrentStep('confirmation')}
                    >
                      Create Trip
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No hotels found for your destination.</p>
                <div className="flex justify-center gap-4 mt-4">
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentStep('flights')}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Flights
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep('confirmation')}
                  >
                    Continue Without Hotel
                  </Button>
                </div>
              </div>
            )}
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
              {/* Traveler Summary */}
              <div>
                <h3 className="font-medium mb-2">Traveler Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Name:</strong> {clientInfo.primaryTraveler.firstName} {clientInfo.primaryTraveler.lastName}</p>
                  <p><strong>Email:</strong> {clientInfo.primaryTraveler.email}</p>
                  <p><strong>Phone:</strong> {clientInfo.primaryTraveler.phone}</p>
                  <p><strong>Trip Purpose:</strong> {clientInfo.tripPurpose}</p>
                  {clientInfo.companyName && <p><strong>Company:</strong> {clientInfo.companyName}</p>}
                </div>
              </div>

              {/* Travel Summary */}
              <div>
                <h3 className="font-medium mb-2">Travel Summary</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Route:</strong> {clientInfo.origin} → {clientInfo.destination}</p>
                  <p><strong>Departure:</strong> {clientInfo.departureDate}</p>
                  {clientInfo.returnDate && <p><strong>Return:</strong> {clientInfo.returnDate}</p>}
                  <p><strong>Passengers:</strong> {clientInfo.passengers}</p>
                </div>
              </div>

              {/* Booking Summary */}
              <div>
                <h3 className="font-medium mb-2">Selected Services</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  {selectedDepartureFlight && (
                    <div className="flex justify-between">
                      <span>Departure Flight: {selectedDepartureFlight.airline} {selectedDepartureFlight.flightNumber}</span>
                      <span>${selectedDepartureFlight.price.amount}</span>
                    </div>
                  )}
                  {selectedReturnFlight && (
                    <div className="flex justify-between">
                      <span>Return Flight: {selectedReturnFlight.airline} {selectedReturnFlight.flightNumber}</span>
                      <span>${selectedReturnFlight.price.amount}</span>
                    </div>
                  )}
                  {selectedHotel && (
                    <div className="flex justify-between">
                      <span>Hotel: {selectedHotel.name}</span>
                      <span>${selectedHotel.price.amount} per {selectedHotel.price.per}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total Estimated Cost:</span>
                    <span>${
                      (selectedDepartureFlight?.price.amount || 0) + 
                      (selectedReturnFlight?.price.amount || 0) + 
                      (selectedHotel?.price.amount || 0)
                    }</span>
                  </div>
                </div>
              </div>

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
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}