import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Hotel, HotelSearchParams } from '../types';
import { HotelCard } from './HotelCard';

interface HotelSelectionStepProps {
  formData: {
    destination: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    rooms: number;
  };
  onBack: () => void;
  onNext: () => void;
}

export const HotelSelectionStep = ({ formData, onBack, onNext }: HotelSelectionStepProps) => {
  const [searchParams, setSearchParams] = useState<HotelSearchParams>({
    destination: formData.destination,
    checkIn: formData.checkIn,
    checkOut: formData.checkOut,
    guests: { adults: formData.guests },
    rooms: formData.rooms,
    filters: {
      minStarRating: 0,
      priceRange: { min: 0, max: 1000 },
      amenities: [],
      freeCancellation: false,
    },
  });

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  const searchHotels = useCallback(async () => {
    if (!searchParams.destination || !searchParams.checkIn || !searchParams.checkOut) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/hotels/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch hotels');
      }

      const data = await response.json();
      setHotels(data.hotels || []);
    } catch (err) {
      console.error('Error searching hotels:', err);
      setError('Failed to search for hotels. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  const handleSelectHotel = useCallback((hotel: Hotel) => {
    setSelectedHotel(hotel);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedHotel(null);
  }, []);

  useEffect(() => {
    searchHotels();
  }, [searchHotels]);

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Check-in Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {searchParams.checkIn ? (
                      format(new Date(searchParams.checkIn), 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={searchParams.checkIn ? new Date(searchParams.checkIn) : undefined}
                    onSelect={(date) => {
                      setSearchParams((prev) => ({
                        ...prev,
                        checkIn: date?.toISOString().split('T')[0],
                      }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Check-out Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {searchParams.checkOut ? (
                      format(new Date(searchParams.checkOut), 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={searchParams.checkOut ? new Date(searchParams.checkOut) : undefined}
                    onSelect={(date) => {
                      setSearchParams((prev) => ({
                        ...prev,
                        checkOut: date?.toISOString().split('T')[0],
                      }));
                    }}
                    initialFocus
                    disabled={(date) => date < new Date(searchParams.checkIn)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Number of Guests</Label>
              <Select
                value={searchParams.guests?.adults.toString()}
                onValueChange={(value) => {
                  setSearchParams((prev) => ({
                    ...prev,
                    guests: { adults: parseInt(value) },
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select number of guests" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} Guest{num > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hotel Results */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Available Hotels</h3>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center p-4">
            <p className="text-red-500">{error}</p>
            <Button
              variant="outline"
              onClick={searchHotels}
              className="mt-2"
            >
              Retry Search
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {hotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                isSelected={selectedHotel?.id === hotel.id}
                onSelect={handleSelectHotel}
                onClear={handleClearSelection}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!selectedHotel}>
          {selectedHotel ? 'Next' : 'Select hotel first'}
        </Button>
      </div>
    </div>
  );
};
