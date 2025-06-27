import SharedCompatibleHotelType from '@/types/SharedCompatibleHotelType';
import SharedDType from '@/types/SharedDType';
import SharedRType from '@/types/SharedRType';
import SharedAType from '@/types/SharedAType';
import SharedApiHotelType from '@/types/SharedApiHotelType';
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
import { toast, useToast } from '@/components/ui/use-toast';

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
    [key: string]: unknown;
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
  price: number | {
    amount: number;
    currency: string;
    formatted: string;
    taxes: number;
    fees: number;
    baseRate: number;
    total: number;
  };
  currency?: string;
  available: number;
  refundable: boolean;
  maxOccupancy: number;
  amenities: string[];
  description: string;
  bedConfiguration: string;
  bedType?: string; // Added for compatibility
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
  searchParams: URLSearchParams;
}

const HotelCard: React.FC<HotelCardProps> = ({
  hotel, 
  selected, 
  onSelect,
  onRoomSelect,
  selectedRoomId,
  isLoadingRooms,
  searchParams: urlSearchParams
}) => {
  const [showRooms, setShowRooms] = useState(false);
  const [rooms, setRooms] = useState<(RoomType | HotelRoom)[]>([]);

  const handleRoomSelect = (room: HotelRoom | RoomType) => {
    onRoomSelect(room as HotelRoom);
    onSelect(hotel, room as HotelRoom);
  };

  const toggleRooms = async () => {
    if (!showRooms && hotel.rooms.length === 0) {
      try {
        const searchParams: HotelSearchParams = {
          destination: urlSearchParams.get('destination') || '',
          checkIn: urlSearchParams.get('checkIn') || format(new Date(), 'yyyy-MM-dd'),
          checkOut: urlSearchParams.get('checkOut') || format(addDays(new Date(), 1), 'yyyy-MM-dd'),
          guests: {
            adults: parseInt(urlSearchParams.get('guests')?.toString() || '1'),
            children: 0,
            rooms: 1
          },
          sortBy: 'price'
        };
        const rooms = await hotelService.getAvailableRooms(
          hotel.id,
          searchParams.checkIn,
          searchParams.checkOut,
          searchParams.guests.adults
        );
        setRooms(rooms as (RoomType | HotelRoom)[]);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        toast({
          title: 'Error',
          description: 'Failed to load rooms. Please try again.',
          variant: 'destructive',
        });
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
                    <p className="text-sm text-muted-foreground">{room.bedConfiguration || 'Standard'}</p>
                    <div className="mt-1">
                      <span className="text-sm font-medium">
                        ${typeof room.price === 'number' ? room.price.toFixed(2) : room.price?.amount?.toFixed(2) || '0.00'}
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

const mapHotelRoomToRoomType = (room: HotelRoom): RoomType => {
  return {
    id: room.id,
    name: room.name || 'Standard Room',
    price: room.price,
    currency: room.price?.currency || 'USD',
    available: room.ratePlan?.available || 1,
    refundable: room.ratePlan?.refundable || false,
    maxOccupancy: room.maxOccupancy || 2,
    amenities: room.amenities || [],
    description: room.description || '',
    bedConfiguration: room.bedConfiguration || 'Queen',
    bedType: room.bedConfiguration || 'Queen', // Added for compatibility
    ratePlan: room.ratePlan,
    images: room.images
  };
};

const mapApiHotelToHotel = (apiHotel: SharedApiHotelType): Hotel => {
  // Ensure all required fields have proper defaults
  const hotel: Hotel = {
    id: apiHotel.id || '',
    name: apiHotel.name || 'Unnamed Hotel',
    starRating: apiHotel.starRating || 0,
    address: {
      line1: apiHotel.address?.line1 || '',
      city: apiHotel.address?.city || '',
      postalCode: apiHotel.address?.postalCode || '',
      country: apiHotel.address?.country || '',
      countryCode: apiHotel.address?.countryCode || 'US',
      timezone: apiHotel.address?.timezone || 'UTC',
      ...(apiHotel.address?.coordinates && {
        coordinates: {
          latitude: apiHotel.address.coordinates.latitude,
          longitude: apiHotel.address.coordinates.longitude
        }
      })
    },
    description: apiHotel.description || '',
    amenities: (apiHotel.amenities || []).map((a: SharedAType) => ({
      code: a.code || `amenity-${Math.random().toString(36).substr(2, 9)}`,
      name: a.name || 'Unnamed Amenity',
      category: a.category || 'general',
      isAvailable: a.isAvailable !== false
    })),
    images: apiHotel.images || [],
    checkInTime: apiHotel.checkInTime || '14:00',
    checkOutTime: apiHotel.checkOutTime || '12:00',
    contact: {
      phone: apiHotel.contact?.phone || '000-000-0000',
      ...(apiHotel.contact?.email && { email: apiHotel.contact.email }),
      ...(apiHotel.contact?.website && { website: apiHotel.contact.website })
    },
    rooms: (apiHotel.rooms || []).map((r: SharedRType) => ({
      id: r.id || `room-${Math.random().toString(36).substr(2, 9)}`,
      name: r.name || 'Standard Room',
      description: r.description || 'Comfortable room with standard amenities',
      maxOccupancy: r.maxOccupancy || 2,
      bedConfiguration: r.bedConfiguration || '1 Queen Bed',
      amenities: Array.isArray(r.amenities) ? r.amenities : [],
      price: {
        amount: r.price?.amount || 0,
        currency: r.price?.currency || 'USD',
        formatted: r.price?.formatted || '$0.00',
        taxes: r.price?.taxes || 0,
        fees: r.price?.fees || 0,
        baseRate: r.price?.baseRate || 0,
        total: r.price?.total || 0
      },
      cancellationPolicy: r.cancellationPolicy ? {
        type: r.cancellationPolicy.type || 'NON_REFUNDABLE',
        description: r.cancellationPolicy.description || 'Non-refundable',
        ...(r.cancellationPolicy.deadline && { deadline: r.cancellationPolicy.deadline }),
        ...(r.cancellationPolicy.penaltyAmount && { penaltyAmount: r.cancellationPolicy.penaltyAmount }),
        ...(r.cancellationPolicy.penaltyCurrency && { penaltyCurrency: r.cancellationPolicy.penaltyCurrency })
      } : undefined,
      ratePlan: {
        id: r.ratePlan?.id || `rate-${Math.random().toString(36).substr(2, 9)}`,
        name: r.ratePlan?.name || 'Standard Rate',
        ...(r.ratePlan?.mealPlan && { mealPlan: r.ratePlan.mealPlan }),
        nonSmoking: r.ratePlan?.nonSmoking !== false,
        refundable: r.ratePlan?.refundable || false,
        available: r.ratePlan?.available || 1
      },
      images: Array.isArray(r.images) ? r.images : []
    })),
    policies: {
      checkIn: {
        minAge: apiHotel.policies?.checkIn?.minAge || 18,
        ...(apiHotel.policies?.checkIn?.specialInstructions && {
          specialInstructions: apiHotel.policies.checkIn.specialInstructions
        })
      },
      checkOut: {
        lateCheckOutAvailable: apiHotel.policies?.checkOut?.lateCheckOutAvailable || false,
        ...(apiHotel.policies?.checkOut?.lateCheckOutFee && {
          lateCheckOutFee: apiHotel.policies.checkOut.lateCheckOutFee
        }),
        ...(apiHotel.policies?.checkOut?.lateCheckOutTime && {
          lateCheckOutTime: apiHotel.policies.checkOut.lateCheckOutTime
        })
      },
      pets: {
        allowed: apiHotel.policies?.pets?.allowed || false,
        ...(apiHotel.policies?.pets?.fee && { fee: apiHotel.policies.pets.fee }),
        ...(apiHotel.policies?.pets?.policy && { policy: apiHotel.policies.pets.policy })
      },
      fees: Array.isArray(apiHotel.policies?.fees) 
        ? apiHotel.policies.fees 
        : []
    },
    distanceFrom: (apiHotel.distanceFrom || []).map((d: SharedDType) => ({
      place: d.place || 'Location',
      distance: typeof d.distance === 'number' ? d.distance : 0,
      unit: d.unit === 'mi' || d.unit === 'km' ? d.unit : 'km',
      ...(typeof d.duration === 'number' && { duration: d.duration })
    })),
    ...(apiHotel.metadata && { metadata: apiHotel.metadata }),
    ...(typeof apiHotel.rating === 'number' && { rating: apiHotel.rating }),
    ...(apiHotel.price && {
      price: {
        amount: apiHotel.price.amount || 0,
        currency: apiHotel.price.currency || 'USD',
        ...(apiHotel.price.formatted && { formatted: apiHotel.price.formatted })
      }
    }),
    ...(typeof apiHotel.distanceFromCenter === 'number' && { distanceFromCenter: apiHotel.distanceFromCenter }),
    ...(typeof apiHotel.maxOccupancy === 'number' && { maxOccupancy: apiHotel.maxOccupancy }),
    ...(typeof apiHotel.freeCancellation === 'boolean' && { freeCancellation: apiHotel.freeCancellation })
  };

  return hotel;
};

const HotelSelectionStep: React.FC<HotelSelectionStepProps> = ({ formData, onBack, onNext }) => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => {
    const params = new URLSearchParams({
      destination: formData.destination || '',
      checkIn: formData.checkIn || format(new Date(), 'yyyy-MM-dd'),
      checkOut: formData.checkOut || format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      location: formData.destination || '',
      guests: formData.guests?.toString() || '1',
      sortBy: 'price',
    });
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
        guests: {
          adults: parseInt(searchParams.get('guests') || '1'),
          children: 0,
          rooms: 1
        },
        sortBy: 'price',
        page: 1,
        pageSize: 10,
        sortOrder: 'asc' // Add default sort order to match the interface
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
      // Create a compatible hotel object that matches the expected type
      const compatibleHotel: SharedCompatibleHotelType = {
        ...selectedHotel,
        // Ensure all required properties are present
        amenities: selectedHotel.amenities || [],
        images: selectedHotel.images || [],
        rooms: selectedHotel.rooms || [],
        distanceFrom: selectedHotel.distanceFrom || []
      };

      onNext({
        selectedHotel: compatibleHotel,
        selectedRoomType: selectedRoom,
        checkIn: searchParams.get('checkIn') || undefined,
        checkOut: searchParams.get('checkOut') || undefined,
        guests: { 
          adults: parseInt(searchParams.get('guests') || '1'),
          children: 0,
          rooms: 1 
        }
      } as unknown as Partial<BookingFormData>);
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
                selectedRoomId={formData.selectedRoomType?.id}
                isLoadingRooms={isLoadingRooms}
                searchParams={searchParams}
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
