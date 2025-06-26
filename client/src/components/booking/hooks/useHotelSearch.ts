import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { bookingService } from '../services/bookingService';
import type { Hotel, HotelSearchParams, HotelSearchResponse } from '../types';

// Type guard to check if an error has a message property
function isErrorWithMessage(error: unknown): error is { message: string } {
    return typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string';
}

interface UseHotelSearchProps {
    destination: string;
    checkIn: string;
    checkOut: string;
    guests: {
        adults: number;
        children?: number;
        rooms?: number;
    } | number;  // Allow number for backward compatibility
    filters?: {
        minStarRating?: number;
        priceRange?: {
            min: number;
            max: number;
            currency?: string;
        };
        amenities?: string[];
        hotelChains?: string[];
        freeCancellation?: boolean;
        mealPlans?: string[];
    };
}

export const useHotelSearch = ({
    destination,
    checkIn,
    checkOut,
    guests: guestsProp,
    filters
}: UseHotelSearchProps) => {
    const { toast } = useToast();
    
    // Normalize guests to always be an object
    const guests = typeof guestsProp === 'number' 
        ? { adults: guestsProp, children: 0, rooms: 1 }
        : guestsProp;

    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [searchFilters, setSearchFilters] = useState<{
        minStarRating: number;
        priceRange: { min: number; max: number; };
        amenities: string[];
        freeCancellation: boolean;
    }>({
        minStarRating: 0,
        priceRange: { min: 0, max: 1000 },
        amenities: [],
        freeCancellation: false,
    });

    const searchHotels = useCallback(async () => {
        if (!destination || !checkIn || !checkOut) {
            setError('Please fill in all required fields');
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const response = await bookingService.searchHotels({
                destination,
                checkIn,
                checkOut,
                guests,
                filters: searchFilters,
            });

            if (response.success && response.data) {
                setHotels(response.data.hotels || []);
            } else {
                const errorMessage = response.error && isErrorWithMessage(response.error)
                    ? response.error.message
                    : 'No hotels found';
                setError(errorMessage);
                setHotels([]);
            }
        } catch (err) {
            console.error('Hotel search error:', err);
            setError('Failed to search for hotels. Please try again.');
            setHotels([]);
        } finally {
            setIsLoading(false);
        }
    }, [destination, checkIn, checkOut, guests, searchFilters]);

    const selectHotel = useCallback((hotel: Hotel, roomId?: string) => {
        setSelectedHotel(hotel);

        if (roomId) {
            setSelectedRoom(roomId);
        } else if (Array.isArray((hotel as any).rooms) && (hotel as any).rooms.length > 0) {
            setSelectedRoom((hotel as any).rooms[0].id);
        } else {
            setSelectedRoom(null);
        }
    }, []);

    const updateFilters = useCallback((newFilters: Partial<{
        minStarRating: number;
        priceRange: { min: number; max: number; };
        amenities: string[];
        freeCancellation: boolean;
    }>) => {
        setSearchFilters(prev => {
            if (!newFilters) return prev;
            return {
                ...prev,
                ...newFilters,
                priceRange: {
                    ...prev.priceRange,
                    ...(newFilters.priceRange || {})
                }
            };
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedHotel(null);
        setSelectedRoom(null);
    }, []);
    // Auto-search when required fields change
    useEffect(() => {
        if (destination && checkIn && checkOut) {
            searchHotels();
        }
    }, [destination, checkIn, checkOut, searchHotels]);
    return {
        hotels,
        isLoading,
        error,
        selectedHotel,
        selectedRoom,
        filters,
        searchHotels,
        selectHotel,
        updateFilters,
        clearSelection,
    };
};
