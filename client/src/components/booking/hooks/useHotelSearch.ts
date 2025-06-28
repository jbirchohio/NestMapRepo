import { useState, useCallback, useEffect, useMemo } from 'react';
import { bookingService } from '../services/bookingService';
import type { 
    Hotel,
    HotelSearchParams
} from '../types';

// Define PriceRange type to match the one in hotel.ts
type PriceRange = {
    min?: number;
    max?: number;
    currency?: string;
};

// Local type for the filters to match HotelSearchParams
interface HotelSearchFilters {
    minStarRating?: number;
    priceRange?: PriceRange;
    amenities?: string[];
    hotelChains?: string[];
    freeCancellation?: boolean;
    mealPlans?: string[];
}

// Define the response type for the hook
interface UseHotelSearchResponse {
    hotels: Hotel[];
    isLoading: boolean;
    error: string | null;
    selectedHotel: Hotel | null;
    selectedRoom: string | null;
    filters: HotelSearchFilters;
    searchHotels: () => Promise<void>;
    selectHotel: (hotel: Hotel, roomId?: string) => void;
    updateFilters: (newFilters: Partial<HotelSearchFilters>) => void;
    clearSelection: () => void;
}

interface UseHotelSearchProps {
    destination: string; 
    checkIn: string;
    checkOut: string;
    guests: { adults: number; children?: number; rooms?: number };
    initialFilters?: HotelSearchFilters;
    onError?: (error: string) => void;
}

const useHotelSearch = ({
    destination,
    checkIn,
    checkOut,
    guests,
    initialFilters,
    onError
}: UseHotelSearchProps): UseHotelSearchResponse => {
    // Normalize guests to match the expected type
    const guestsProp = guests;

    // Initialize filters with default values
    const defaultFilters: HotelSearchFilters = {
        minStarRating: 0,
        priceRange: {
            min: 0,
            max: 1000,
            currency: 'USD'
        },
        amenities: [],
        freeCancellation: false
    };

    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [filters, setFilters] = useState<HotelSearchFilters>(initialFilters ?? defaultFilters);
    
    // Initialize with default values if needed
    useEffect(() => {
        setFilters(prev => ({
            minStarRating: 3,
            priceRange: {
                min: 0,
                max: 1000,
                currency: 'USD'
            },
            ...prev
        }));
    }, []);

    const searchHotels = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Prepare the search parameters according to HotelSearchParams interface
            const searchParams: HotelSearchParams = {
                destination,
                checkIn,
                checkOut,
                rooms: guestsProp.rooms ?? 1, // Required at root level
                guests: guestsProp.adults, // Just the number of adults as per the type
                filters: {
                    ...filters,
                    priceRange: filters.priceRange ? {
                        min: filters.priceRange.min ?? 0, // Provide default value
                        max: filters.priceRange.max ?? 10000 // Provide default value
                    } : undefined
                }
                // Only include properties that exist in HotelSearchParams
            };

            const response = await bookingService.searchHotels(searchParams);
            
            if (response.success && response.data?.hotels) {
                setHotels(response.data.hotels);
            } else {
                const errorMessage = typeof response === 'object' && response !== null && 'error' in response
                    ? String((response as any).error?.message || 'Failed to fetch hotels')
                    : 'Failed to fetch hotels';
                throw new Error(errorMessage);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            onError?.(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    }, [destination, checkIn, checkOut, guestsProp, filters, onError]);

    const selectHotel = useCallback((hotel: Hotel, roomId?: string) => {
        setSelectedHotel(hotel);
        
        // Since we can't guarantee the structure of the hotel object,
        // we'll use the provided roomId or set to null
        setSelectedRoom(roomId || null);
    }, []);

    const updateFilters = useCallback((newFilters: Partial<HotelSearchFilters>) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            ...newFilters
        }));
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedHotel(null);
        setSelectedRoom(null);
    }, []);

    // Auto-search when required fields change
    useEffect(() => {
        if (destination && checkIn && checkOut) {
            searchHotels().catch(error => {
                setError(error instanceof Error ? error.message : String(error));
                onError?.(error instanceof Error ? error.message : String(error));
            });
        }
    }, [destination, checkIn, checkOut, searchHotels, onError]);

    return useMemo(() => ({
        hotels,
        isLoading,
        error,
        selectedHotel,
        selectedRoom,
        filters,
        searchHotels,
        selectHotel,
        updateFilters,
        clearSelection
    }), [
        hotels,
        isLoading,
        error,
        selectedHotel,
        selectedRoom,
        filters,
        searchHotels,
        selectHotel,
        updateFilters,
        clearSelection
    ]);
};

export default useHotelSearch;
