import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  Hotel, MapPin, Calendar, Users, Star, 
  Wifi, Car, Coffee, Dumbbell, Search,
  ExternalLink, TrendingUp, Heart
} from 'lucide-react';

interface HotelSearchProps {
  tripId?: string;
  destination?: string;
  checkIn?: Date;
  checkOut?: Date;
}

interface Hotel {
  id: string;
  name: string;
  image: string;
  rating: number;
  price: string;
  amenities: string[];
  bookingUrl: string;
  saved?: boolean;
}

export default function HotelSearch({ 
  tripId, 
  destination: defaultDestination = '', 
  checkIn: defaultCheckIn,
  checkOut: defaultCheckOut 
}: HotelSearchProps) {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [savedHotels, setSavedHotels] = useState<Set<string>>(new Set());
  
  const [searchData, setSearchData] = useState({
    destination: defaultDestination,
    checkIn: format(defaultCheckIn || addDays(new Date(), 7), 'yyyy-MM-dd'),
    checkOut: format(defaultCheckOut || addDays(new Date(), 9), 'yyyy-MM-dd'),
    guests: 2,
    rooms: 1
  });

  const amenityIcons: Record<string, any> = {
    'Free WiFi': Wifi,
    'WiFi': Wifi,
    'Pool': Hotel,
    'Gym': Dumbbell,
    'Parking': Car,
    'Free Breakfast': Coffee,
    'Restaurant': Coffee,
  };

  const handleSearch = async () => {
    if (!searchData.destination) {
      toast({
        title: "Missing destination",
        description: "Please enter where you want to stay",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await fetch('/api/hotels/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...searchData,
          tripId
        })
      });

      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setHotels(data.hotels || []);
      
      if (data.hotels?.length === 0) {
        toast({
          title: "No hotels found",
          description: "Try adjusting your search criteria",
        });
      }
    } catch (error) {
      console.error('Hotel search error:', error);
      toast({
        title: "Search failed",
        description: "We'll redirect you to Expedia to search directly",
      });
      
      // Fallback: Open Expedia in new tab
      const expediaUrl = `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(searchData.destination)}&startDate=${searchData.checkIn}&endDate=${searchData.checkOut}&adults=${searchData.guests}`;
      window.open(expediaUrl, '_blank');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookHotel = (hotel: Hotel) => {
    // Track the click
    if (tripId) {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          event: 'hotel_booking_click',
          properties: {
            hotelId: hotel.id,
            hotelName: hotel.name,
            tripId,
            price: hotel.price
          }
        })
      }).catch(console.error);
    }

    // Open in new tab
    window.open(hotel.bookingUrl, '_blank');
    
    toast({
      title: "Opening Expedia",
      description: "Complete your booking on Expedia. We'll save this hotel to your trip.",
    });
  };

  const toggleSaveHotel = (hotelId: string) => {
    const newSaved = new Set(savedHotels);
    if (newSaved.has(hotelId)) {
      newSaved.delete(hotelId);
      toast({ title: "Hotel removed from trip" });
    } else {
      newSaved.add(hotelId);
      toast({ title: "Hotel saved to trip!" });
    }
    setSavedHotels(newSaved);
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-purple-600" />
            Search Hotels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="destination">Destination</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="destination"
                  placeholder="City, hotel name, or landmark"
                  value={searchData.destination}
                  onChange={(e) => setSearchData(prev => ({ ...prev, destination: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="checkIn">Check-in</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="checkIn"
                  type="date"
                  value={searchData.checkIn}
                  onChange={(e) => setSearchData(prev => ({ ...prev, checkIn: e.target.value }))}
                  className="pl-9"
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="checkOut">Check-out</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="checkOut"
                  type="date"
                  value={searchData.checkOut}
                  onChange={(e) => setSearchData(prev => ({ ...prev, checkOut: e.target.value }))}
                  className="pl-9"
                  min={searchData.checkIn}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="guests">Guests</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="guests"
                  type="number"
                  min="1"
                  max="10"
                  value={searchData.guests}
                  onChange={(e) => setSearchData(prev => ({ ...prev, guests: parseInt(e.target.value) || 1 }))}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex-1">
              <Label htmlFor="rooms">Rooms</Label>
              <Input
                id="rooms"
                type="number"
                min="1"
                max="5"
                value={searchData.rooms}
                onChange={(e) => setSearchData(prev => ({ ...prev, rooms: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
          >
            {isSearching ? (
              <>
                <Hotel className="mr-2 h-4 w-4 animate-pulse" />
                Searching hotels...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Hotels
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Powered by Expedia • Prices include taxes and fees
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      {hotels.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {hotels.length} hotels found
            </h3>
            <Badge variant="secondary">
              <TrendingUp className="w-3 h-3 mr-1" />
              Best prices on Expedia
            </Badge>
          </div>

          {hotels.map((hotel, index) => (
            <motion.div
              key={hotel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="md:flex">
                  <div className="md:w-1/3 h-48 md:h-auto">
                    <img 
                      src={hotel.image} 
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="md:w-2/3 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-semibold mb-1">{hotel.name}</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i < Math.floor(hotel.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">{hotel.rating}/5</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">{hotel.price}</p>
                        <p className="text-sm text-gray-500">per night</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {hotel.amenities.map((amenity, i) => {
                        const Icon = amenityIcons[amenity] || Hotel;
                        return (
                          <Badge key={i} variant="secondary" className="text-xs">
                            <Icon className="w-3 h-3 mr-1" />
                            {amenity}
                          </Badge>
                        );
                      })}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleBookHotel(hotel)}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Book on Expedia
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleSaveHotel(hotel.id)}
                        className={savedHotels.has(hotel.id) ? 'text-red-500 hover:text-red-600' : ''}
                      >
                        <Heart className={`w-4 h-4 ${savedHotels.has(hotel.id) ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}