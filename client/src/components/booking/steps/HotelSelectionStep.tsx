import { useState, useCallback, useEffect, useRef } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { Calendar as CalendarIcon, Star, MapPin, Hotel as HotelIcon, Bed, Users, Loader2 } from 'lucide-react';
import type { BookingFormData } from '../types';
import type { Hotel as BaseHotel, HotelRoom, HotelSearchParams, HotelSearchResponse, HotelAmenity, HotelAddress } from '@/components/booking/types/hotel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hotelService } from '@/services/hotelService';
import { useToast } from '@/components/ui/use-toast';

// Extended Hotel interface to include all required properties
type Hotel = BaseHotel & {
  roomTypes: RoomType[];
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  isRefundable: boolean;
  isAvailable: boolean;
  cancellationPolicy?: string;
  reviewCount?: number;
  reviewScore?: number;
  checkInTime: string;
  checkOutTime: string;
  rooms: HotelRoom[];
  policies: {
    checkIn: { minAge: number };
    checkOut: { lateCheckOutAvailable: boolean };
    pets: { allowed: boolean; fee?: number };
    [key: string]: any;
  };
  distanceFrom: {
    text: string;
    value: number;
    unit: string;
  };
  address: HotelAddress & {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
};

// Local RoomType interface that matches the expected structure
interface RoomType {
  id: string;
  name: string;
  price: number;
  currency: string;
  bedType: string;
  available: number;
  refundable: boolean;
  maxOccupancy: number;
  amenities: string[];
  description?: string;
  bedConfiguration?: string;
  ratePlan?: {
    id: string;
    name: string;
    mealPlan?: string;
    nonSmoking: boolean;
    refundable: boolean;
    available: number;
  };
  images?: Array<{
    url: string;
    caption?: string;
    category: string;
    width?: number;
    height?: number;
  }>;
}

interface HotelCardProps {
  hotel: Hotel;
  selected: boolean;
  onSelect: (hotel: Hotel, room: HotelRoom) => void;
  onRoomSelect: (room: HotelRoom) => void;
  selectedRoomId?: string;
  isLoadingRooms: boolean;
}

const HotelCard: React.FC<HotelCardProps> = ({
  hotel, 
  selected, 
  onSelect,
  onRoomSelect,
  selectedRoomId,
  isLoadingRooms
}) => {
  const [showRooms, setShowRooms] = useState(false);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);

  const handleRoomSelect = (room: HotelRoom) => {
    onRoomSelect(room);
    onSelect(hotel, room);
  };

  const toggleRooms = async () => {
    if (!showRooms && hotel.rooms.length === 0) {
      try {
        // Fetch rooms if not already loaded
        const response = await hotelService.getHotelRooms(hotel.id);
        setRooms(response.rooms);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    } else {
      setShowRooms(!showRooms);
    }
  };

  return (
    <Card className={cn('mb-4', { 'border-2 border-primary': selected })}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{hotel.name}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
              {hotel.starRating} • {hotel.reviewScore?.toFixed(1)} ({hotel.reviewCount} reviews)
            </div>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              {hotel.address?.city}, {hotel.address?.country}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">
              ${hotel.pricePerNight?.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground">/night</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {hotel.isRefundable ? 'Free cancellation' : 'Non-refundable'}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleRooms}
          disabled={isLoadingRooms}
        >
          {isLoadingRooms ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : showRooms ? (
            'Hide Rooms'
          ) : (
            'Show Available Rooms'
          )}
        </Button>

        {showRooms && (
          <div className="mt-4 space-y-3">
            {(rooms.length > 0 ? rooms : hotel.rooms).map((room) => (
              <div 
                key={room.id} 
                className={cn(
                  'p-3 border rounded-md cursor-pointer hover:bg-accent',
                  { 'border-primary bg-accent/50': selectedRoomId === room.id }
                )}
                onClick={() => handleRoomSelect(room)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{room.name}</h4>
                    <p className="text-sm text-muted-foreground">{room.bedType}</p>
                    <div className="mt-1">
                      <span className="text-sm font-medium">
                        ${room.ratePlan?.pricePerNight?.toFixed(2) || room.pricePerNight?.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">/night</span>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant={selectedRoomId === room.id ? 'default' : 'outline'}
                  >
                    {selectedRoomId === room.id ? 'Selected' : 'Select'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface HotelSelectionStepProps {
  formData: BookingFormData;
  onBack: () => void;
  onNext: (data?: Partial<BookingFormData>) => void;
}

const mapHotelRoomToRoomType = (room: HotelRoom): RoomType => ({
  id: room.id,
  name: room.name,
  price: room.ratePlan?.pricePerNight || room.pricePerNight || 0,
  currency: room.currency || 'USD',
  bedType: room.bedConfiguration || 'Standard',
  available: room.ratePlan?.available || 0,
  refundable: room.ratePlan?.refundable || false,
  maxOccupancy: room.maxOccupancy || 2,
  amenities: room.amenities || [],
  description: room.description,
  bedConfiguration: room.bedConfiguration,
  ratePlan: room.ratePlan ? {
    id: room.ratePlan.id,
    name: room.ratePlan.name,
    mealPlan: room.ratePlan.mealPlan,
    nonSmoking: room.ratePlan.nonSmoking || false,
    refundable: room.ratePlan.refundable || false,
    available: room.ratePlan.available || 0
  } : undefined,
  images: room.images
});

const mapApiHotelToHotel = (apiHotel: any): Hotel => ({
  ...apiHotel,
  roomTypes: apiHotel.roomTypes || [],
  pricePerNight: apiHotel.pricePerNight || 0,
  totalPrice: apiHotel.totalPrice || 0,
  currency: apiHotel.currency || 'USD',
  isRefundable: apiHotel.isRefundable || false,
  isAvailable: apiHotel.isAvailable !== false,
  checkInTime: apiHotel.checkInTime || '14:00',
  checkOutTime: apiHotel.checkOutTime || '12:00',
  rooms: apiHotel.rooms || [],
  policies: {
    checkIn: { minAge: 18 },
    checkOut: { lateCheckOutAvailable: false },
    pets: { allowed: false },
    ...apiHotel.policies
  },
  distanceFrom: {
    text: '0.5 miles from center',
    value: 0.5,
    unit: 'miles',
    ...apiHotel.distanceFrom
  },
  address: {
    street: apiHotel.address?.street || '',
    city: apiHotel.address?.city || '',
    state: apiHotel.address?.state || '',
    country: apiHotel.address?.country || '',
    postalCode: apiHotel.address?.postalCode || '',
    coordinates: apiHotel.address?.coordinates,
    ...apiHotel.address
  },
  reviewCount: apiHotel.reviewCount || 0,
  reviewScore: apiHotel.reviewScore || 0
});

const HotelSelectionStep: React.FC<HotelSelectionStepProps> = ({ formData, onBack, onNext }) => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => {
    const params = new URLSearchParams();
    params.set('destination', formData.destination || '');
    params.set('checkIn', formData.checkIn || format(new Date(), 'yyyy-MM-dd'));
    params.set('checkOut', formData.checkOut || format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    params.set('guests', String(formData.guests?.adults || 1));
    return params;
  });

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchHotels = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params: HotelSearchParams = {
        destination: searchParams.get('destination') || '',
        checkIn: searchParams.get('checkIn') || format(new Date(), 'yyyy-MM-dd'),
        checkOut: searchParams.get('checkOut') || format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        guests: parseInt(searchParams.get('guests') || '1'),
        rooms: 1,
        sortBy: 'recommended',
        page: 1,
        limit: 10
      };
      
      const response = await hotelService.searchHotels(params, { signal: controller.signal });
      
      if (!controller.signal.aborted) {
        const mappedHotels = response.data?.map(mapApiHotelToHotel) || [];
        setHotels(mappedHotels);
        
        // If we have a selected hotel from formData, try to find and select it
        if (formData.selectedHotel) {
          const hotel = mappedHotels.find(h => h.id === formData.selectedHotel?.id);
          if (hotel) {
            setSelectedHotel(hotel);
            
            // If we have a selected room from formData, try to find and select it
            if (formData.selectedRoomType) {
              const room = hotel.rooms.find(r => r.id === formData.selectedRoomType?.id);
              if (room) {
                setSelectedRoom(mapHotelRoomToRoomType(room));
              }
            }
          }
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Error searching hotels:', error);
        setError('Failed to load hotels. Please try again.');
        toast({
          title: 'Error',
          description: 'Failed to load hotels. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [searchParams, formData, toast]);

  useEffect(() => {
    searchHotels();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchHotels]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchHotels();
  };

  const handleSelectHotel = useCallback((hotel: Hotel, room: HotelRoom) => {
    setSelectedHotel(hotel);
    const mappedRoom = mapHotelRoomToRoomType(room);
    setSelectedRoom(mappedRoom);
  }, []);

  const handleRoomSelect = useCallback((room: HotelRoom) => {
    const mappedRoom = mapHotelRoomToRoomType(room);
    setSelectedRoom(mappedRoom);
  }, []);

  const handleContinue = useCallback(() => {
    if (selectedHotel && selectedRoom) {
      onNext({
        selectedHotel,
        selectedRoomType: selectedRoom,
        checkIn: searchParams.get('checkIn') || undefined,
        checkOut: searchParams.get('checkOut') || undefined,
        guests: { adults: parseInt(searchParams.get('guests') || '1') }
      });
    }
  }, [selectedHotel, selectedRoom, onNext, searchParams]);

  const handleBack = () => {
    onBack();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch}>
        <Card>
          <CardHeader>
            <CardTitle>Find Your Hotel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={searchParams.get('destination') || ''}
                  onChange={(e) => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('destination', e.target.value);
                    setSearchParams(newParams);
                  }}
                  placeholder="City, region, or hotel name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="checkIn">Check-in</Label>
                <div className="relative">
                  <Input
                    id="checkIn"
                    type="date"
                    value={searchParams.get('checkIn') || ''}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.set('checkIn', e.target.value);
                      setSearchParams(newParams);
                    }}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="pl-10"
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="checkOut">Check-out</Label>
                <div className="relative">
                  <Input
                    id="checkOut"
                    type="date"
                    value={searchParams.get('checkOut') || ''}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.set('checkOut', e.target.value);
                      setSearchParams(newParams);
                    }}
                    min={searchParams.get('checkIn') || format(new Date(), 'yyyy-MM-dd')}
                    className="pl-10"
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="guests">Guests</Label>
                <div className="relative">
                  <Input
                    id="guests"
                    type="number"
                    min="1"
                    max="10"
                    value={searchParams.get('guests') || '1'}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.set('guests', e.target.value);
                      setSearchParams(newParams);
                    }}
                    className="pl-10"
                  />
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  'Search Hotels'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading hotels...</span>
        </div>
      ) : error ? (
        <div className="text-center text-destructive py-8">
          <p>{error}</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={searchHotels}
            disabled={isLoading}
          >
            Retry
          </Button>
        </div>
      ) : hotels.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Hotels</h2>
          
          <div className="space-y-4">
            {hotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                selected={selectedHotel?.id === hotel.id}
                onSelect={handleSelectHotel}
                onRoomSelect={handleRoomSelect}
                selectedRoomId={selectedRoom?.id}
                isLoadingRooms={isLoadingRooms}
              />
            ))}
          </div>
          
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={!selectedHotel || !selectedRoom}
            >
              Continue
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <HotelIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No hotels found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filters to find more options.
          </p>
        </div>
      )}
    </div>
  );
};

export default HotelSelectionStep;
