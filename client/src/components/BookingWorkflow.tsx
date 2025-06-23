import { useState } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { DollarSign, Plane, Hotel as HotelIcon, Calendar, MapPin, Clock, Users, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { FlightSearchForm } from './booking/FlightSearchForm';
import { FlightResults } from './booking/FlightResults';

// Type for flight search form data
interface TravelerInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
}

type TripType = 'one-way' | 'round-trip';

export interface FlightSearchData {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    tripType: TripType;
    passengers: number;
    cabin: string;
    budget?: number;
    primaryTraveler: TravelerInfo;
    additionalTravelers: TravelerInfo[];
    department: string;
    projectCode: string;
    costCenter: string;
}

// Comprehensive client information schema
type ClientInfo = {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string | null;
    tripType: 'one-way' | 'round-trip' | 'multi-city';
    passengers: number;
    primaryTraveler: TravelerInfo;
    additionalTravelers: TravelerInfo[];
    cabin: string;
    budget: number | null;
    department: string | null;
    projectCode: string | null;
    costCenter: string | null;
};

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
    cabin?: string;
    departureTime?: string;
    arrivalTime?: string;
}

interface Hotel {
    id: string;
    name: string;
    rating: {
        score: number;
        reviews: number;
    };
    address: string;
    amenities: string[];
    price: {
        amount: number;
        currency: string;
        per: string;
    };
    images: string[];
    starRating: number;
    cancellation: string;
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
    starRating?: number;
    cancellation?: string;
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
    }
    catch {
        return dateString;
    }
};

const formatDuration = (duration: string): string => {
    return duration || 'N/A';
};


interface SimpleFlight {
    id: string;
    airline: string;
    flightNumber: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    stops: number;
    price: {
        amount: number;
        currency: string;
    };
    cabin: string;
    availability: number;
}

function mapFlightResultToFlight(flight: FlightResult): SimpleFlight {
    return {
        id: flight.id,
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        origin: flight.departure.airport,
        destination: flight.arrival.airport,
        departureTime: flight.departure.time,
        arrivalTime: flight.arrival.time,
        duration: flight.duration,
        stops: flight.stops,
        price: {
            amount: flight.price.amount,
            currency: flight.price.currency
        },
        cabin: flight.cabin || 'ECONOMY',
        availability: 9
    };
}

export default function BookingWorkflow() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [currentStep, setCurrentStep] = useState<BookingStep>('client-info');
    const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
    const [formData, setFormData] = useState<FlightSearchData>({
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
        department: '',
        projectCode: '',
        costCenter: '',
    });

    const [flightResults, setFlightResults] = useState<SimpleFlight[]>([]);
    const [hotelResults, setHotelResults] = useState<Hotel[]>([]);
    const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<SimpleFlight | null>(null);
    const [selectedReturnFlight, setSelectedReturnFlight] = useState<SimpleFlight | null>(null);
    const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

    const [isSearching, setIsSearching] = useState(false);
    const [isBooking, setIsBooking] = useState(false);

    const [currentTravelerIndex, setCurrentTravelerIndex] = useState(0);
    const [travelerBookings, setTravelerBookings] = useState<Array<{
        traveler: string;
        departureFlight?: SimpleFlight | null;
        returnFlight?: SimpleFlight | null;
    }>>([]);

    const getAllTravelers = () => {
        if (!clientInfo)
            return [];
        const travelers = [
            `${clientInfo.primaryTraveler.firstName} ${clientInfo.primaryTraveler.lastName}`,
            ...clientInfo.additionalTravelers.map(t => `${t.firstName} ${t.lastName}`)
        ];
        return travelers.map((name) => ({
            firstName: name.split(' ')[0],
            lastName: name.split(' ')[1] || '',
            fullName: name
        }));
    };

    const totalTravelers = getAllTravelers().length;

    const getProgress = () => {
        switch (currentStep) {
            case 'client-info': return 25;
            case 'flights': return 50;
            case 'hotels': return 75;
            case 'confirmation': return 100;
            default: return 0;
        }
    };

    const handleClientInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Get the form data from the form element
            const form = e.currentTarget as HTMLFormElement;
            const formData = new FormData(form);
            
            // Convert FormData to plain object
            const formDataObj: Record<string, any> = {};
            formData.forEach((value, key) => {
                formDataObj[key] = value;
            });
            
            // Create ClientInfo object with proper types
            const clientInfo: ClientInfo = {
                origin: String(formDataObj.origin || ''),
                destination: String(formDataObj.destination || ''),
                departureDate: String(formDataObj.departureDate || ''),
                returnDate: formDataObj.returnDate ? String(formDataObj.returnDate) : null,
                tripType: (formDataObj.tripType as 'one-way' | 'round-trip') || 'round-trip',
                passengers: Number(formDataObj.passengers) || 1,
                cabin: String(formDataObj.cabin || 'economy'),
                primaryTraveler: {
                    firstName: String(formDataObj.primaryTraveler?.firstName || ''),
                    lastName: String(formDataObj.primaryTraveler?.lastName || ''),
                    email: String(formDataObj.primaryTraveler?.email || ''),
                    phone: String(formDataObj.primaryTraveler?.phone || ''),
                    dateOfBirth: String(formDataObj.primaryTraveler?.dateOfBirth || '')
                },
                additionalTravelers: [], // Initialize empty, you can populate this if needed
                department: formDataObj.department ? String(formDataObj.department) : null,
                projectCode: formDataObj.projectCode ? String(formDataObj.projectCode) : null,
                costCenter: formDataObj.costCenter ? String(formDataObj.costCenter) : null,
                budget: formDataObj.budget ? Number(formDataObj.budget) : null
            };
            
            setClientInfo(clientInfo);
            const travelers = getAllTravelers();
            setTravelerBookings(travelers.map(t => ({
                traveler: t.fullName,
                departureFlight: null,
                returnFlight: null
            })));
            setCurrentStep('flights');
            await searchFlights(clientInfo);
        }
        catch (error) {
            if (error instanceof Error) {
                toast({
                    title: "Validation Error",
                    children: error.message || "Please check your input",
                    variant: "destructive",
                });
            }
        }
    };

    const searchFlights = async (info: ClientInfo) => {
        setIsSearching(true);
        try {
            const response = await fetch('/api/flights/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    origin: info.origin,
                    destination: info.destination,
                    departureDate: info.departureDate,
                    returnDate: info.returnDate,
                    passengers: info.passengers,
                    cabin: info.cabin,
                }),
            });
            const data = await response.json();
            const flights = Array.isArray(data.flights) 
                ? data.flights.map((f: FlightResult) => mapFlightResultToFlight(f)) 
                : [];
            setFlightResults(flights);
        }
        catch (error) {
            toast({
                title: "Search Error",
                children: "Unable to search flights. Please try again.",
                variant: "destructive",
            });
            setFlightResults([]);
        }
        finally {
            setIsSearching(false);
        }
    };

    const searchHotels = async (info: ClientInfo) => {
        try {
            const response = await fetch('/api/hotels/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    destination: info.destination,
                    checkIn: info.departureDate,
                    checkOut: info.returnDate || info.departureDate,
                    guests: info.passengers,
                }),
            });
            const data = await response.json();
            const hotels = Array.isArray(data.hotels) 
                ? data.hotels.map((h: HotelResult) => ({
                    ...h,
                    rating: {
                        score: h.rating,
                        reviews: 0
                    },
                    price: {
                        ...h.price,
                        per: 'night'
                    },
                    starRating: h.starRating || 3,
                    cancellation: h.cancellation || 'Free cancellation available'
                } as Hotel))
                : [];
            setHotelResults(hotels);
        }
        catch (error) {
            toast({
                title: "Search Error",
                children: "Unable to search hotels. Please try again.",
                variant: "destructive",
            });
            setHotelResults([]);
        }
    };

    const handleFlightSelectionComplete = () => {
        if (currentTravelerIndex < totalTravelers - 1) {
            const updatedBookings = [...travelerBookings];
            updatedBookings[currentTravelerIndex] = {
                ...updatedBookings[currentTravelerIndex],
                departureFlight: selectedDepartureFlight,
                returnFlight: selectedReturnFlight
            };
            setTravelerBookings(updatedBookings);
            setSelectedDepartureFlight(null);
            setSelectedReturnFlight(null);
            setCurrentTravelerIndex(currentTravelerIndex + 1);
        }
        else {
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

    const handleCreateTrip = async () => {
        if (!clientInfo || !user)
            return;
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
            const response = await fetch('/api/trips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tripData),
            });
            if (response.ok) {
                toast({
                    title: "Trip Created Successfully",
                    children: "Your trip has been booked and saved.",
                });
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
            }
            else {
                throw new Error('Failed to create trip');
            }
        }
        catch (error) {
            toast({
                title: "Booking Error",
                children: "Unable to create trip. Please try again.",
                variant: "destructive",
            });
        }
        finally {
            setIsBooking(false);
        }
    };

    const calculateTotalCost = () => {
        const flightCost = travelerBookings.reduce((total, booking) => {
            return total + (booking.departureFlight?.price.amount || 0) + (booking.returnFlight?.price.amount || 0);
        }, 0);
        const hotelCost = selectedHotel?.price.amount || 0;
        return flightCost + hotelCost;
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Book Corporate Travel</h1>
                    <span className="text-lg font-medium flex items-center gap-1">
                        <DollarSign className="w-4 h-4"/> {getProgress()}% Complete
                    </span>
                </div>
                <div className="flex justify-between mt-4 text-sm">
                    <span className={currentStep === 'client-info' ? 'text-blue-600 font-medium flex items-center gap-1' : 'text-gray-500 flex items-center gap-1'}>
                        <MapPin className="w-4 h-4"/> Trip Details
                    </span>
                    <span className={currentStep === 'flights' ? 'text-blue-600 font-medium flex items-center gap-1' : 'text-gray-500 flex items-center gap-1'}>
                        <Plane className="w-4 h-4"/> Select Flights
                    </span>
                    <span className={currentStep === 'hotels' ? 'text-blue-600 font-medium flex items-center gap-1' : 'text-gray-500 flex items-center gap-1'}>
                        <HotelIcon className="w-4 h-4"/> Choose Hotel
                    </span>
                    <span className={currentStep === 'confirmation' ? 'text-blue-600 font-medium flex items-center gap-1' : 'text-gray-500 flex items-center gap-1'}>
                        <Briefcase className="w-4 h-4"/> Confirmation
                    </span>
                </div>
            </div>

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
                            flights={flightResults}
                            selectedFlight={selectedDepartureFlight}
                            onSelectFlight={setSelectedDepartureFlight}
                            isSearching={isSearching}
                            isReturnFlight={false}
                        />
                    </CardContent>
                </Card>
            )}

            {currentStep === 'hotels' && clientInfo && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Accommodation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {hotelResults.map(hotel => (
                                <div key={hotel.id} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium">{hotel.name}</h3>
                                            <div className="text-sm text-gray-600">{hotel.address}</div>
                                            <div className="text-sm text-gray-500">
                                                {hotel.rating.score} ({hotel.rating.reviews} reviews)
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium">${hotel.price.amount}</div>
                                            <div className="text-sm text-gray-500">per night</div>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <Button 
                                            variant={selectedHotel?.id === hotel.id ? 'default' : 'outline'}
                                            onClick={() => setSelectedHotel(hotel)}
                                            className="w-full"
                                        >
                                            {selectedHotel?.id === hotel.id ? 'Selected' : 'Select'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 'confirmation' && clientInfo && (
                <Card>
                    <CardHeader>
                        <CardTitle>Booking Confirmation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-medium mb-3">Trip Summary</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Route:</span>
                                        <span className="ml-2 font-medium">
                                            {clientInfo.origin} → {clientInfo.destination}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4 text-gray-600"/>
                                        <span className="text-gray-600">Dates:</span>
                                        <span className="ml-2 font-medium">
                                            {formatTripDate(clientInfo.departureDate)}
                                            {clientInfo.returnDate && ` - ${formatTripDate(clientInfo.returnDate)}`}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 flex items-center gap-1">
                                            <Users className="w-4 h-4"/> Travelers:
                                        </span>
                                        <span className="ml-2 font-medium">{clientInfo.passengers}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Class:</span>
                                        <span className="ml-2 font-medium capitalize">{clientInfo.cabin}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-medium">Flight Bookings</h3>
                                {travelerBookings.map((booking, index) => (
                                    <div key={index} className="border rounded-lg p-4">
                                        <div className="font-medium mb-2">{booking.traveler}</div>
                                        {booking.departureFlight && (
                                            <div className="text-sm space-y-1">
                                                <div className="flex justify-between">
                                                    <span>
                                                        Departure: {booking.departureFlight.airline} {booking.departureFlight.flightNumber}
                                                    </span>
                                                    <span className="font-medium">
                                                        ${booking.departureFlight.price.amount}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-muted-foreground gap-1">
                                                    <Clock className="w-3 h-3"/>
                                                    {formatDuration(booking.departureFlight.duration)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {selectedHotel && (
                                <div className="border rounded-lg p-4">
                                    <h3 className="font-medium mb-2">Accommodation</h3>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium">{selectedHotel.name}</div>
                                            <div className="text-sm text-gray-600">{selectedHotel.address}</div>
                                            <div className="text-sm text-gray-500">
                                                {selectedHotel.rating.score} ({selectedHotel.rating.reviews} reviews)
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium">${selectedHotel.price.amount}</div>
                                            <div className="text-sm text-gray-500">per night</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-medium flex items-center gap-1">
                                        <DollarSign className="w-4 h-4"/> Total Trip Cost
                                    </span>
                                    <span className="text-2xl font-bold text-blue-600">
                                        ${calculateTotalCost()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setCurrentStep('hotels')}
                                >
                                    Back
                                </Button>
                                <Button 
                                    onClick={handleCreateTrip}
                                    disabled={isBooking}
                                >
                                    {isBooking ? 'Processing...' : 'Confirm Booking'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep !== 'confirmation' && (
                <div className="flex justify-between mt-6">
                    <Button 
                        variant="outline" 
                        onClick={() => {
                            if (currentStep === 'flights') setCurrentStep('client-info');
                            else if (currentStep === 'hotels') setCurrentStep('flights');
                        }}
                        disabled={currentStep === 'client-info'}
                    >
                        Back
                    </Button>
                    <Button 
                        onClick={() => {
                            if (currentStep === 'client-info') setCurrentStep('flights');
                            else if (currentStep === 'flights') handleFlightSelectionComplete();
                            else if (currentStep === 'hotels') setCurrentStep('confirmation');
                        }}
                        disabled={
                            (currentStep === 'flights' && !selectedDepartureFlight) ||
                            (currentStep === 'hotels' && !selectedHotel)
                        }
                    >
                        {currentStep === 'hotels' ? 'Review Booking' : 'Next'}
                    </Button>
                </div>
            )}
        </div>
    );
}
