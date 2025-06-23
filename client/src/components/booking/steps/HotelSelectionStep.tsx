import { useState, useCallback, useEffect, useRef } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { Calendar as CalendarIcon, Star, MapPin, Hotel as HotelIcon, Bed, Users, Loader2 } from 'lucide-react'; // Added Loader2 for loading states
import { BookingFormData, Hotel, HotelSearchParams, RoomType } from '../types';
import { cn } from '@/lib/utils';
import { hotelService } from '@/services/hotelService';
import { useToast } from '@/components/ui/use-toast';

// Local UI Components
const Button = ({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none',
      'bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4',
      className
    )}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props}>
    {children}
  </div>
);

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
);

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
);

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
);

const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)} {...props} />
);

// HotelCard component for displaying hotel information
const HotelCard = ({ 
  hotel, 
  selected, 
  onSelect,
  onRoomSelect,
  selectedRoomId,
  isLoadingRooms
}: { 
  hotel: Hotel; 
  selected: boolean;
  onSelect: (hotel: Hotel, roomType: RoomType) => void;
  onRoomSelect: (roomType: RoomType) => void;
  selectedRoomId?: string;
  isLoadingRooms: boolean;
}) => {
  const handleRoomSelect = (room: RoomType) => {
    onRoomSelect(room);
    onSelect(hotel, room);
  };

  return (
    <div className={`border rounded-lg overflow-hidden mb-6 ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="md:flex">
        <div className="md:w-1/3 h-48 bg-gray-100 relative">
          {hotel.images?.[0]?.url ? (
            <img 
              src={hotel.images[0].url} 
              alt={hotel.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <HotelIcon className="h-12 w-12 text-gray-400" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center">
            <Star className="h-3 w-3 text-yellow-400 mr-1 fill-yellow-400" />
            {hotel.starRating?.toFixed(1) || 'N/A'}
          </div>
        </div>
        
        <div className="p-4 md:w-2/3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{hotel.name}</h3>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <MapPin className="h-4 w-4 mr-1" />
                {hotel.address.city}, {hotel.address.country}
              </div>
              
              {hotel.reviewScore && (
                <div className="mt-2 text-sm">
                  <span className="font-medium">
                    {hotel.reviewScore.toFixed(1)}/10
                  </span>
                  <span className="text-gray-500 ml-1">
                    ({hotel.reviewCount} reviews)
                  </span>
                </div>
              )}
              
              <div className="mt-2 flex flex-wrap gap-1">
                {hotel.amenities?.slice(0, 3).map(amenity => (
                  <span key={amenity.id} className="text-xs bg-gray-100 rounded-full px-2 py-1">
                    {amenity.name}
                  </span>
                ))}
                {hotel.amenities?.length > 3 && (
                  <span className="text-xs text-gray-500">+{hotel.amenities.length - 3} more</span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold">
                ${hotel.pricePerNight?.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">per night</div>
              {hotel.isRefundable && (
                <div className="text-xs text-green-600 mt-1">Free cancellation</div>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Select Room Type</label>
            <div className="space-y-2">
              {hotel.roomTypes?.map(room => (
                <div 
                  key={room.id} 
                  className={`border rounded p-3 cursor-pointer ${selectedRoomId === room.id ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => handleRoomSelect(room)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{room.name}</div>
                      <div className="text-sm text-gray-600 flex items-center">
                        <Bed className="h-3 w-3 mr-1" />
                        {room.bedType}
                        <span className="mx-2">•</span>
                        <Users className="h-3 w-3 mr-1" />
                        Max {room.maxOccupancy} {room.maxOccupancy > 1 ? 'guests' : 'guest'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${room.price.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">per night</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={() => onSelect(hotel)}
              disabled={!selectedRoomId}
              className={!selectedRoomId ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {selected ? 'Selected' : 'Select Room'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
interface HotelSelectionStepProps {
  formData: BookingFormData;
  onBack: () => void;
  onNext: (data?: Partial<BookingFormData>) => void;
}
export const HotelSelectionStep: React.FC<HotelSelectionStepProps> = ({ formData, onBack, onNext }) => {
    const [searchParams, setSearchParams] = useState<HotelSearchParams>({
      destination: formData.destination || '',
      checkIn: formData.checkIn || format(new Date(), 'yyyy-MM-dd'),
      checkOut: formData.checkOut || format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      guests: formData.guests || 1,
      rooms: formData.rooms || 1,
      filters: {
        minStarRating: 4,
        priceRange: { min: 0, max: 1000 },
        amenities: ['wifi', 'pool'],
        freeCancellation: true,
      },
    });
    
    const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(formData.selectedHotel || null);
    const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(formData.selectedRoomType || null);
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hotelRooms, setHotelRooms] = useState<Record<string, RoomType[]>>({});
    const abortControllerRef = useRef<AbortController | null>(null);
    const { toast } = useToast();
  
  // Fetch rooms for a specific hotel
  const fetchRooms = useCallback(async (hotelId: string) => {
    if (!hotelId || hotelRooms[hotelId]) return;
    
    setIsLoadingRooms(true);
    
    try {
      const rooms = await hotelService.getAvailableRooms(
        hotelId,
        searchParams.checkIn.toString(),
        searchParams.checkOut.toString(),
        typeof searchParams.guests === 'number' ? searchParams.guests : 1
      );
      
      setHotelRooms(prev => ({
        ...prev,
        [hotelId]: rooms
      }));
    } catch (err) {
      console.error(`Error fetching rooms for hotel ${hotelId}:`, err);
      toast({
        title: 'Error',
        description: 'Failed to load room availability. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingRooms(false);
    }
  }, [hotelRooms, searchParams.checkIn, searchParams.checkOut, searchParams.guests]);

  // Fetch hotels when component mounts or search params change
  const searchHotels = useCallback(async () => {
    if (!searchParams.destination) {
      setError('Please enter a destination');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    try {
      const hotels = await hotelService.searchHotels({
        ...searchParams,
        signal: abortControllerRef.current.signal,
        filters: {
          minStarRating: searchParams.filters?.minStarRating || 0,
          priceRange: searchParams.filters?.priceRange || { min: 0, max: 1000 },
          amenities: searchParams.filters?.amenities || [],
          freeCancellation: searchParams.filters?.freeCancellation || false
        }
      });
      
      setHotels(hotels);
      setSelectedHotel(null);
      setSelectedRoom(null);
      
      // If we have a previously selected hotel, try to find it in the new results
      if (formData.selectedHotel) {
        const foundHotel = hotels.find(h => h.id === formData.selectedHotel?.id);
        if (foundHotel) {
          setSelectedHotel(foundHotel);
          // Load rooms for the selected hotel
          fetchRooms(foundHotel.id);
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error searching hotels:', err);
        setError('Failed to search for hotels. Please try again.');
        toast({
          title: 'Error',
          description: 'Failed to search for hotels. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
    }
  }, [searchParams, formData.selectedHotel, fetchRooms]);
  
  // Initial data fetch
  useEffect(() => {
    searchHotels();
    
    // Cleanup function to abort any pending requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchHotels]);
  // Handle hotel selection
  const handleSelectHotel = useCallback((hotel: Hotel, roomType: RoomType) => {
    setSelectedHotel(hotel);
    setSelectedRoom(roomType);
    
    // If we haven't loaded rooms for this hotel yet, fetch them
    if (!hotelRooms[hotel.id]) {
      fetchRooms(hotel.id);
    }
  }, [fetchRooms, hotelRooms]);
  
  // Handle room selection
  const handleRoomSelect = useCallback((room: RoomType) => {
    setSelectedRoom(room);
    
    if (selectedHotel) {
      onNext({
        selectedHotel,
        selectedRoomType: room,
        hotel: selectedHotel.name,
        roomType: room.name,
        checkIn: searchParams.checkIn.toString(),
        checkOut: searchParams.checkOut.toString(),
        guests: typeof searchParams.guests === 'number' ? searchParams.guests : 1,
        rooms: searchParams.rooms
      });
    }
  }, [selectedHotel, searchParams, onNext]);
  
  // Handle search form submission
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    searchHotels();
  }, [searchHotels]);
    return (
      <div className="space-y-6">
        <form onSubmit={handleSearch}>
          <Card>
            <CardHeader>
              <CardTitle>Search Hotels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={searchParams.destination}
                    onChange={(e) => setSearchParams(prev => ({
                      ...prev,
                      destination: e.target.value
                    }))}
                    placeholder="City or hotel name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="checkin">Check-in</Label>
                  <Input
                    id="checkin"
                    type="date"
                    value={typeof searchParams.checkIn === 'string' ? searchParams.checkIn : format(searchParams.checkIn, 'yyyy-MM-dd')}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setSearchParams(prev => ({
                      ...prev,
                      checkIn: e.target.value
                    }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="checkout">Check-out</Label>
                  <Input
                    id="checkout"
                    type="date"
                    value={typeof searchParams.checkOut === 'string' ? searchParams.checkOut : format(searchParams.checkOut, 'yyyy-MM-dd')}
                    min={typeof searchParams.checkIn === 'string' ? searchParams.checkIn : format(searchParams.checkIn, 'yyyy-MM-dd')}
                    onChange={(e) => setSearchParams(prev => ({
                      ...prev,
                      checkOut: e.target.value
                    }))}
                    required
                  />
                </div>
                
                <div className="flex items-end">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : 'Search Hotels'}
                  </Button>
                </div>
              </div>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </form>

        {/* Hotel Results */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Available Hotels</h3>
            {hotels.length > 0 && (
              <span className="text-sm text-gray-500">
                {hotels.length} {hotels.length === 1 ? 'hotel' : 'hotels'} found
              </span>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="text-center p-8">
              <p className="text-red-500 mb-4">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => setSearchParams(prev => ({ ...prev }))}
              >
                Retry Search
              </Button>
            </div>
          ) : hotels.length === 0 ? (
            <div className="text-center p-8 border rounded-lg bg-gray-50">
              <p className="text-gray-500">No hotels found. Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {hotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  selected={selectedHotel?.id === hotel.id}
                  selectedRoomId={selectedRoom?.id}
                  isLoadingRooms={isLoadingRooms && selectedHotel?.id === hotel.id}
                  onSelect={handleSelectHotel}
                  onRoomSelect={handleRoomSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={() => {
              if (selectedHotel && selectedRoom) {
                onNext({
                  selectedHotel,
                  selectedRoomType: selectedRoom,
                  hotel: selectedHotel.name,
                  roomType: selectedRoom.name,
                  checkIn: searchParams.checkIn.toString(),
                  checkOut: searchParams.checkOut.toString(),
                  guests: typeof searchParams.guests === 'number' ? searchParams.guests : 1,
                  rooms: searchParams.rooms
                });
              }
            }}
            disabled={!selectedHotel || !selectedRoom}
          >
            {selectedHotel && selectedRoom ? 'Continue' : 'Select a room to continue'}
          </Button>
        </div>
    </div>);
};
