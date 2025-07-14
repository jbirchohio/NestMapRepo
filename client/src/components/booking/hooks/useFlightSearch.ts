import { useState, useCallback, useEffect } from 'react';
import { bookingService } from '../services/bookingService';
import { FlightSearchParams } from '../types';
import { Flight } from '../types/flight';

interface UseFlightSearchProps {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabin: 'economy' | 'premium-economy' | 'business' | 'first';
}

export const useFlightSearch = ({
  origin,
  destination,
  departureDate,
  returnDate,
  passengers,
  cabin,
}: UseFlightSearchProps) => {
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
        passengers: {
          adults: passengers,
        },
        cabin,
      };

      if (returnDate) {
        params.returnDate = returnDate;
      }

      const response = await bookingService.searchFlights(params);
      
      if (response.success && response.data?.flights) {
        setFlights(response.data.flights);
      } else {
        setError(response.error?.message || 'No flights found');
        setFlights([]);
      }
    } catch (err) {
      console.error('Flight search error:', err);
      setError('Failed to search for flights. Please try again.');
      setFlights([]);
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, departureDate, returnDate, passengers, cabin]);

  const selectFlight = useCallback((flight: Flight, type: 'outbound' | 'return') => {
    if (type === 'outbound') {
      setSelectedOutbound(flight);
    } else {
      setSelectedReturn(flight);
    }
  }, []);

  const clearSelection = useCallback((type?: 'outbound' | 'return') => {
    if (!type) {
      setSelectedOutbound(null);
      setSelectedReturn(null);
    } else if (type === 'outbound') {
      setSelectedOutbound(null);
    } else {
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
