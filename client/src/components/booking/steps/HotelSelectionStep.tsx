import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
// Input is not used, so it's removed
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CabinType } from '../types/booking';
import { Hotel, HotelSearchParams } from '../types/hotel';
import { HotelCard } from './HotelCard';

interface HotelSelectionStepProps {
  formData: {
    tripType: 'one-way' | 'round-trip';
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    primaryTraveler: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
    };
    additionalTravelers?: Array<{
      firstName: string;
      lastName: string;
      dateOfBirth: string;
    }>;
    cabin: CabinType; // 'economy' | 'premium-economy' | 'business' | 'first'
    budget?: number;
    department?: string;
    projectCode?: string;
    costCenter?: string;
  };
  onBack: () => void;
  onNext: () => void;
}

export const HotelSelectionStep = ({ formData, onBack, onNext }: HotelSelectionStepProps) => {
  // Ensure we have valid dates for check-in and check-out
  const defaultCheckIn = formData.departureDate || format(new Date(), 'yyyy-MM-dd');
  const defaultCheckOut = formData.returnDate || 
    format(new Date(new Date(defaultCheckIn).getTime() + 86400000), 'yyyy-MM-dd');

  const [searchParams, setSearchParams] = useState<HotelSearchParams>({
    destination: formData.destination,
    checkIn: defaultCheckIn,
    checkOut: defaultCheckOut,
    guests: {
      adults: formData.passengers,
      rooms: 1,
    },
    filters: {
      minStarRating: 3,
      priceRange: {
        currency: 'USD',
      },
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
                    selected={new Date(searchParams.checkIn)}
                    onSelect={(date) => {
                      if (date) {
                        const checkInDate = date.toISOString().split('T')[0];
                        setSearchParams(prev => ({
                          ...prev,
                          checkIn: checkInDate,
                          // Ensure check-out is after check-in
                          checkOut: prev.checkOut < checkInDate 
                            ? format(new Date(date.getTime() + 86400000), 'yyyy-MM-dd')
                            : prev.checkOut
                        }));
                      }
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
                    selected={new Date(searchParams.checkOut)}
                    onSelect={(date) => {
                      if (date) {
                        setSearchParams(prev => ({
                          ...prev,
                          checkOut: date.toISOString().split('T')[0]
                        }));
                      }
                    }}
                    initialFocus
                    disabled={(date) => date <= new Date(searchParams.checkIn)}
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
