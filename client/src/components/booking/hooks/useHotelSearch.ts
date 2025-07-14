import { useState, useCallback, useEffect } from 'react';
import { bookingService } from '../services/bookingService';
import { HotelSearchParams, Hotel } from '../types/hotel';

interface UseHotelSearchProps {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms?: number;
}

export const useHotelSearch = ({
  destination,
  checkIn,
  checkOut,
  guests = 1,
  rooms = 1,
}: UseHotelSearchProps) => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    minStarRating: 0,
    priceRange: { min: 0, max: 1000 },
    amenities: [] as string[],
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
      const params: HotelSearchParams = {
        destination: destination,
        checkIn,
        checkOut,
        guests: {
          adults: guests,
          rooms: rooms
        },
        filters: {
          priceRange: {
            min: filters.priceRange.min,
            max: filters.priceRange.max
          },
          amenities: filters.amenities,
          minStarRating: filters.minStarRating
        }
      };

      const response = await bookingService.searchHotels(params);
      
      if (response.success && response.data?.hotels) {
        setHotels(response.data.hotels);
      } else {
        setError(response.error?.message || 'No hotels found');
        setHotels([]);
      }
    } catch (err) {
      console.error('Hotel search error:', err);
      setError('Failed to search for hotels. Please try again.');
      setHotels([]);
    } finally {
      setIsLoading(false);
    }
  }, [destination, checkIn, checkOut, guests, rooms, filters]);

  const selectHotel = useCallback((hotel: Hotel, roomId?: string) => {
    setSelectedHotel(hotel);
    if (roomId) {
      setSelectedRoom(roomId);
    } else if (hotel.rooms && hotel.rooms.length > 0) {
      setSelectedRoom(hotel.rooms[0].id);
    } else {
      setSelectedRoom(null);
    }
  }, []);

  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
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
