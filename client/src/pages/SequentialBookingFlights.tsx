import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plane, CheckCircle, ArrowRight, CreditCard } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Helper functions
const formatTime = (dateTime: string): string => {
  return new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const getAirportCode = (location: string | { code?: string; iataCode?: string }): string => {
  if (!location) return '';
  if (typeof location === 'string') return location;
  return location.iataCode || location.code || '';
};

const getAirlineName = (airline: string | { name?: string; code?: string }): string => {
  if (!airline) return 'Unknown Airline';
  if (typeof airline === 'string') return airline;
  return airline.name || airline.code || 'Unknown Airline';
};

const getFlightNumber = (segment?: { carrierCode?: string; number?: string; flightNumber?: string }): string => {
  if (!segment) return '';
  return segment.flightNumber || 
         (segment.carrierCode && segment.number ? `${segment.carrierCode}${segment.number}` : '') ||
         '';
};

const getPriceAmount = (price: number | { amount: number; currency: string }): number => {
  if (typeof price === 'number') return price;
  return price?.amount || 0;
};

const getPriceCurrency = (price: number | { amount: number; currency: string }): string => {
  if (typeof price === 'number') return 'USD';
  return price?.currency || 'USD';
};

const sortFlights = (
  flights: FlightOffer[], 
  sortBy: 'price' | 'duration' | 'departure'
): FlightOffer[] => {
  if (!flights) return [];
  
  return [...flights].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return getPriceAmount(a.price) - getPriceAmount(b.price);
      case 'duration': {
        const durationA = typeof a.duration === 'string' ? parseInt(a.duration) : a.duration || 0;
        const durationB = typeof b.duration === 'string' ? parseInt(b.duration) : b.duration || 0;
        return durationA - durationB;
      }
      case 'departure':
        return new Date(a.departure.time).getTime() - new Date(b.departure.time).getTime();
      default:
        return 0;
    }
  });
};

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
    selectedOutboundFlight?: FlightOffer;
    selectedReturnFlight?: FlightOffer;
}

interface FlightBookingState {
    bookingData: SequentialBookingData | null;
    currentStep: number;
    flightOffers: FlightOffer[];
    isSearching: boolean;
    isBooking: boolean;
    sortBy: 'price' | 'duration' | 'departure';
    activeTab: 'outbound' | 'return';
    outboundFlights: FlightOffer[];
    returnFlights: FlightOffer[];
    selectedOutbound: FlightOffer | null;
    selectedReturn: FlightOffer | null;
}

interface Airline {
    name?: string;
    code?: string;
    [key: string]: unknown;
}

interface FlightSegment {
    id: string;
    departure: {
        iataCode: string;
        at: string;
        terminal?: string;
        time?: string;
        airport?: string | { code?: string };
    };
    arrival: {
        iataCode: string;
        at: string;
        terminal?: string;
        time?: string;
        airport?: string | { code?: string };
    };
    carrierCode: string;
    number: string;
    flightNumber?: string;
    aircraft?: {
        code: string;
    };
    operating?: {
        carrierCode: string;
    };
    duration?: string | number;
    stops?: number;
}

interface FlightOffer {
    id: string;
    airline: string | Airline;
    flightNumber: string;
    price: number | { amount: number; currency: string };
    currency?: string;
    departure: {
        airport: string | { code?: string; iataCode?: string };
        time: string;
        date: string;
        iataCode?: string;
    };
    arrival: {
        airport: string | { code?: string; iataCode?: string };
        time: string;
        date: string;
        iataCode?: string;
    };
    duration: string | number;
    stops: number;
    type: string;
    validatingAirlineCodes: string[];
    segments?: FlightSegment[];
    source?: string;
}

export default function SequentialBookingFlights() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [state, setState] = useState<FlightBookingState>({
        bookingData: null,
        flightOffers: [],
        outboundFlights: [],
        returnFlights: [],
        selectedOutbound: null,
        selectedReturn: null,
        activeTab: 'outbound',
        sortBy: 'price',
        isSearching: false,
        isBooking: false,
        currentStep: 0,
    });

    const updateState = (updates: Partial<FlightBookingState>) => {
        setState(prev => ({
            ...prev,
            ...updates
        }));
    };

    const currentTraveler = state.bookingData?.travelers[state.bookingData.currentTravelerIndex];
    const totalSteps = state.bookingData?.travelers.length || 1;
    const completedSteps = state.bookingData?.currentTravelerIndex || 0;
    const progress = state.bookingData 
        ? Math.round((completedSteps / totalSteps) * 100)
        : 0;

    const {
        bookingData,
        currentStep,
        
        isSearching,
        isBooking,
        sortBy,
        activeTab,
        outboundFlights,
        returnFlights,
        selectedOutbound,
        selectedReturn
    } = state;

    useEffect(() => {
        const fetchBookingData = async () => {
            try {
                const storedData = sessionStorage.getItem('sequentialBookingData');
                if (storedData) {
                    const parsedData = JSON.parse(storedData) as SequentialBookingData;
                    updateState({ 
                        bookingData: parsedData,
                        selectedOutbound: parsedData.selectedOutboundFlight || null,
                        selectedReturn: parsedData.selectedReturnFlight || null
                    });
                    
                    if (parsedData.bookingStatus === 'flights' && parsedData.currentTravelerIndex < parsedData.travelers.length) {
                        updateState({ currentStep: 1 });
                        await handleFlightSearch(parsedData);
                    } else if (parsedData.bookingStatus === 'payment') {
                        updateState({ currentStep: 2 });
                    } else if (parsedData.bookingStatus === 'complete') {
                        updateState({ currentStep: 3 });
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
                console.error('Error in SequentialBookingFlights:', error);
                toast({
                    title: "Error",
                    description: "Failed to load booking data. Please try again.",
                    variant: "destructive",
                });
                setLocation('/');
            }
        };

        fetchBookingData();
    }, [setLocation, toast]);

    const handleFlightSearch = async (data: SequentialBookingData) => {
        if (!currentTraveler) return;
        
        updateState({ isSearching: true });
        
        try {
            const departureCity = currentTraveler.departureCity;
            const destinationCity = data.tripDestination.split(',')[0];
            
            if (!departureCity || !destinationCity) {
                throw new Error('Missing departure or destination city');
            }
            
            updateState({
                selectedOutbound: null,
                selectedReturn: null,
                activeTab: 'outbound',
                flightOffers: []
            });

            const departureCode = await apiRequest('POST', '/api/locations/airport-code', { cityName: departureCity })
                .then(res => res.airportCode)
                .catch(() => 'JFK');
                
            const destinationCode = await apiRequest('POST', '/api/locations/airport-code', { cityName: destinationCity })
                .then(res => res.airportCode)
                .catch(() => 'JFK');
            
            const searchParams = {
                origin: departureCode,
                destination: destinationCode,
                departureDate: data.departureDate,
                returnDate: data.returnDate,
                passengers: 1,
                class: currentTraveler.travelClass || 'economy'
            };

            const result = await apiRequest('POST', '/api/bookings/flights/search', searchParams);
            const allFlights = result.flights || [];
            
            updateState({
                flightOffers: allFlights,
                outboundFlights: allFlights,
                returnFlights: [],
                isSearching: false
            });

            if (data.returnDate && data.returnDate !== data.departureDate) {
                const returnSearchParams = {
                    origin: destinationCode,
                    destination: departureCode,
                    departureDate: data.returnDate,
                    passengers: 1,
                    class: currentTraveler.travelClass || 'economy'
                };

                try {
                    const returnResult = await apiRequest('POST', '/api/bookings/flights/search', returnSearchParams);
                    updateState({ returnFlights: returnResult.flights || [] });
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
            updateState({ isSearching: false });
        }
    };

    const handleSelectFlight = (flight: FlightOffer, isReturn: boolean = false) => {
        if (isReturn) {
            updateState({ 
                selectedReturn: flight,
                activeTab: 'outbound' // Switch back to outbound tab after selection
            });
        } else {
            updateState({ 
                selectedOutbound: flight,
                activeTab: 'return' // Switch to return tab after selection
            });
        }
    };

    const handleConfirmSelection = async () => {
        if (!bookingData || !selectedOutbound) return;
        
        updateState({ isBooking: true });
        
        try {
            // Update the booking data with selected flights
            const updatedBookingData: SequentialBookingData = {
                ...bookingData,
                selectedOutboundFlight: selectedOutbound,
                selectedReturnFlight: selectedReturn || undefined,
                currentTravelerIndex: bookingData.currentTravelerIndex + 1,
                bookingStatus: bookingData.currentTravelerIndex + 1 >= bookingData.travelers.length 
                    ? 'payment' 
                    : 'flights'
            };

            // Save to session storage
            sessionStorage.setItem('sequentialBookingData', JSON.stringify(updatedBookingData));
            
            // If this was the last traveler, move to payment
            if (bookingData.currentTravelerIndex + 1 >= bookingData.travelers.length) {
                updateState({ 
                    bookingData: updatedBookingData,
                    currentStep: 2,
                    isBooking: false
                });
            } else {
                // Move to next traveler
                updateState({ 
                    bookingData: updatedBookingData,
                    currentStep: 1,
                    isBooking: false
                });
                await handleFlightSearch(updatedBookingData);
            }
        } catch (error) {
            console.error('Error confirming flight selection:', error);
            toast({
                title: "Error",
                description: "Failed to save flight selection. Please try again.",
                variant: "destructive",
            });
            updateState({ isBooking: false });
        }
    };

    const renderFlightCard = (flight: FlightOffer, isSelected: boolean, isReturn: boolean = false) => {
        const departureTime = flight.segments?.[0]?.departure.at || flight.departure.time;
        const arrivalTime = flight.segments?.[flight.segments.length - 1]?.arrival.at || flight.arrival.time;
        const duration = typeof flight.duration === 'number' 
            ? formatDuration(flight.duration) 
            : flight.duration || 'N/A';

        return (
            <div 
                key={flight.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'hover:shadow-md'
                }`}
                onClick={() => handleSelectFlight(flight, isReturn)}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-muted p-2 rounded-lg">
                            <Plane className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-medium">{getAirlineName(flight.airline)}</h4>
                            <p className="text-sm text-muted-foreground">
                                {getFlightNumber(flight.segments?.[0])}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-medium">
                            {getPriceAmount(flight.price).toLocaleString('en-US', {
                                style: 'currency',
                                currency: getPriceCurrency(flight.price)
                            })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                    <div className="text-center">
                        <div className="font-medium">{formatTime(departureTime)}</div>
                        <div className="text-sm text-muted-foreground">
                            {getAirportCode(flight.departure.airport)}
                        </div>
                    </div>
                    
                    <div className="flex-1 px-4">
                        <div className="relative">
                            <div className="h-px bg-border w-full absolute top-1/2"></div>
                            <div className="relative flex justify-center">
                                <span className="bg-background px-2 text-xs text-muted-foreground">
                                    {duration}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center">
                        <div className="font-medium">{formatTime(arrivalTime)}</div>
                        <div className="text-sm text-muted-foreground">
                            {getAirportCode(flight.arrival.airport)}
                        </div>
                    </div>
                </div>
                
                {isSelected && (
                    <div className="mt-3 pt-3 border-t flex justify-end">
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                            Selected
                        </Badge>
                    </div>
                )}
            </div>
        );
    };

    const renderFlightSelection = () => {
        const currentFlights = activeTab === 'outbound' ? outboundFlights : returnFlights;
        const selectedFlight = activeTab === 'outbound' ? selectedOutbound : selectedReturn;
        const isReturn = activeTab === 'return';
        const hasFlights = currentFlights.length > 0;

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                        {isReturn ? 'Return Flights' : 'Outbound Flights'}
                    </h3>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Sort by:</span>
                        <Select
                            value={sortBy}
                            onValueChange={(value: 'price' | 'duration' | 'departure') => 
                                updateState({ sortBy: value })
                            }
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="price">Price (Lowest)</SelectItem>
                                <SelectItem value="duration">Duration (Shortest)</SelectItem>
                                <SelectItem value="departure">Departure (Earliest)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {isSearching ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : hasFlights ? (
                    <div className="space-y-4">
                        {sortFlights(currentFlights, sortBy).map(flight => 
                            renderFlightCard(flight, selectedFlight?.id === flight.id, isReturn)
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">
                            {isReturn 
                                ? 'No return flights found for the selected dates.' 
                                : 'No outbound flights found for the selected dates.'}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderSelectedFlights = () => {
        if (!selectedOutbound && !selectedReturn) return null;

        return (
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Selected Flights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {selectedOutbound && (
                        <div>
                            <h4 className="font-medium mb-2">Outbound Flight</h4>
                            {renderFlightCard(selectedOutbound, false)}
                        </div>
                    )}
                    
                    {selectedReturn && (
                        <div>
                            <h4 className="font-medium mb-2">Return Flight</h4>
                            {renderFlightCard(selectedReturn, true)}
                        </div>
                    )}
                    
                    <div className="flex justify-end pt-4">
                        <Button 
                            onClick={handleConfirmSelection}
                            disabled={isBooking || !selectedOutbound || (returnFlights.length > 0 && !selectedReturn)}
                        >
                            {isBooking ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {bookingData?.currentTravelerIndex === (bookingData?.travelers?.length || 0) - 1
                                        ? 'Continue to Payment' 
                                        : 'Confirm Selection'}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderPaymentForm = () => {
        if (!bookingData) return null;
        
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-medium mb-2">Traveler Details</h4>
                            {bookingData.travelers.map((traveler, index) => (
                                <div key={index} className="border rounded-lg p-4 mb-4">
                                    <h5 className="font-medium">{traveler.name}</h5>
                                    <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-muted-foreground">
                                        <div>Email: {traveler.email}</div>
                                        <div>Phone: {traveler.phone}</div>
                                        <div>Class: {traveler.travelClass}</div>
                                        <div>Special Requests: {traveler.dietaryRequirements || 'None'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="pt-4 border-t">
                            <h4 className="font-medium mb-4">Payment Method</h4>
                            <div className="space-y-4">
                                <Button variant="outline" className="w-full justify-start">
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Credit or Debit Card
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                                    </svg>
                                    Pay with PayPal
                                </Button>
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-medium">Total</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {bookingData.travelers.length} traveler{bookingData.travelers.length > 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">
                                        {(() => {
                                            const total = bookingData.travelers.reduce((sum, _, index) => {
                                                const outboundPrice = getPriceAmount(bookingData.selectedOutboundFlight?.price || 0);
                                                const returnPrice = getPriceAmount(bookingData.selectedReturnFlight?.price || 0);
                                                return sum + outboundPrice + returnPrice;
                                            }, 0);
                                            
                                            return total.toLocaleString('en-US', {
                                                style: 'currency',
                                                currency: getPriceCurrency(bookingData.selectedOutboundFlight?.price || 0)
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-4">
                            <Button className="w-full" size="lg">
                                Complete Booking
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderConfirmation = () => {
        if (!bookingData) return null;
        
        return (
            <div className="text-center py-12">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="mt-4 text-2xl font-bold">Booking Confirmed!</h2>
                <p className="mt-2 text-muted-foreground">
                    Your booking reference is: <span className="font-mono font-medium">{bookingData.confirmationNumber}</span>
                </p>
                <p className="mt-4">
                    We've sent a confirmation email to {bookingData.travelers[0]?.email} with all the details.
                </p>
                <div className="mt-8">
                    <Button onClick={() => setLocation('/')}>
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        );
    };

    if (!bookingData) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2">Book Flights</h1>
                <p className="text-muted-foreground">
                    {currentTraveler 
                        ? `Booking for ${currentTraveler.name} (${currentTraveler.departureCity} → ${bookingData.tripDestination.split(',')[0]})`
                        : 'Loading traveler information...'}
                </p>
                
                <div className="mt-6 mb-8">
                    <div className="flex justify-between mb-2 text-sm">
                        <span>Progress</span>
                        <span>{completedSteps} of {totalSteps} travelers</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            </div>

            {currentStep === 1 && (
                <>
                    <Tabs 
                        value={state.activeTab} 
                        onValueChange={(value) => {
                            if (value === 'outbound' || value === 'return') {
                                updateState({ activeTab: value });
                            }
                        }}
                        className="mb-6"
>
                        <TabsList>
                            <TabsTrigger value="outbound">Outbound</TabsTrigger>
                            {returnFlights.length > 0 && (
                                <TabsTrigger value="return">Return</TabsTrigger>
                            )}
                        </TabsList>
                    </Tabs>
                    
                    {renderFlightSelection()}
                    {renderSelectedFlights()}
                </>
            )}

            {currentStep === 2 && renderPaymentForm()}
            {currentStep === 3 && renderConfirmation()}
        </div>
    );
}