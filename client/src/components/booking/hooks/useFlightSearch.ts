import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { bookingService } from '../services/bookingService';
import type { Flight } from '../types/flight';
import type { FlightSearchParams } from '../types';
interface UseFlightSearchProps {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    cabin: 'economy' | 'premium' | 'business' | 'first';
}
export const useFlightSearch = ({ origin, destination, departureDate, returnDate, passengers, cabin, }: UseFlightSearchProps) => {
    const { toast } = useToast();
    const [flights, setFlights] = useState<Flight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedOutbound, setSelectedOutbound] = useState<Flight | null>(null);
    const [selectedReturn, setSelectedReturn] = useState<Flight | null>(null);
    const searchFlights = useCallback(async () => {
        if (!origin || !destination || !departureDate) {
            setError('Please fill in all required fields');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const params: FlightSearchParams = {
                origin,
                destination,
                departureDate,
                returnDate: returnDate || '',
                passengers: passengers,
                cabin,
            };
            const response = await bookingService.searchFlights(params);
            if (response.success && response.data?.flights) {
                // Map the response to match the Flight type
                const mappedFlights = response.data.flights.map(flight => {
                    const flightData: Flight = {
                        id: flight.id,
                        type: 'departure',
                        segments: [{
                            id: flight.id,
                            departure: {
                                airport: {
                                    code: flight.departure.airport,
                                    name: flight.departure.airport,
                                    city: '',
                                    country: '',
                                    timezone: 'UTC'
                                },
                                time: flight.departure.time
                            },
                            arrival: {
                                airport: {
                                    code: flight.arrival.airport,
                                    name: flight.arrival.airport,
                                    city: '',
                                    country: '',
                                    timezone: 'UTC'
                                },
                                time: flight.arrival.time
                            },
                            carrier: {
                                code: flight.airline,
                                name: flight.airline
                            },
                            flightNumber: flight.flightNumber,
                            aircraft: {
                                code: '',
                                name: ''
                            },
                            duration: flight.duration,
                            cabin: cabin as 'economy' | 'premium' | 'business' | 'first',
                            bookingClass: 'economy',
                            fareBasis: '',
                            technicalStops: []
                        }],
                        price: {
                            amount: flight.price,
                            currency: 'USD',
                            formatted: `$${flight.price}`,
                            taxes: 0,
                            fees: 0,
                            baseFare: flight.price
                        },
                        duration: flight.duration,
                        stops: flight.stops,
                        departureTime: flight.departure.time,
                        arrivalTime: flight.arrival.time,
                        bookingClass: 'economy',
                        fareBasis: '',
                        baggageAllowance: {
                            cabin: '1 x 7kg',
                            checked: '1 x 23kg'
                        },
                        refundable: false,
                        changeable: false,
                        availableSeats: 9,
                        amenities: []
                    };
                    return flightData;
                });
                setFlights(mappedFlights);
            }
            else {
                setError(typeof response.error === 'string' ? response.error : 'No flights found');
                setFlights([]);
            }
        }
        catch (err) {
            console.error('Flight search error:', err);
            setError('Failed to search for flights. Please try again.');
            setFlights([]);
        }
        finally {
            setIsLoading(false);
        }
    }, [origin, destination, departureDate, returnDate, passengers, cabin]);
    const selectFlight = useCallback((flight: Flight, type: 'outbound' | 'return') => {
        if (type === 'outbound') {
            setSelectedOutbound(flight);
        }
        else {
            setSelectedReturn(flight);
        }
    }, []);
    const clearSelection = useCallback((type?: 'outbound' | 'return') => {
        if (!type) {
            setSelectedOutbound(null);
            setSelectedReturn(null);
        }
        else if (type === 'outbound') {
            setSelectedOutbound(null);
        }
        else {
            setSelectedReturn(null);
        }
    }, []);
    // Auto-search when required fields change
    useEffect(() => {
        if (origin && destination && departureDate) {
            searchFlights();
        }
    }, [origin, destination, departureDate, searchFlights]);
    return {
        flights,
        isLoading,
        error,
        selectedOutbound,
        selectedReturn,
        searchFlights,
        selectFlight,
        clearSelection,
    };
};
