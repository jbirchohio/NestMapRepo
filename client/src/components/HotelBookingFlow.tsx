import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  Hotel, MapPin, Calendar, Users, Star, 
  Wifi, Car, Coffee, Dumbbell, Search,
  ExternalLink, TrendingUp, Heart, Package,
  Check, Clock, ChevronRight, Sparkles,
  Plane, BedDouble, Shield, DollarSign
} from 'lucide-react';

interface HotelBookingFlowProps {
  tripId: string;
  destination: string;
  checkIn: Date;
  checkOut: Date;
  onHotelConfirmed?: (hotel: any) => void;
}

interface HotelOption {
  id: string;
  name: string;
  image: string;
  rating: number;
  price: string;
  priceValue: number;
  amenities: string[];
  bookingUrl: string;
  saved?: boolean;
  popular?: boolean;
  dealType?: string;
}

export default function HotelBookingFlow({ 
  tripId, 
  destination,
  checkIn,
  checkOut,
  onHotelConfirmed
}: HotelBookingFlowProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'hotels' | 'packages'>('hotels');
  const [isSearching, setIsSearching] = useState(false);
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<HotelOption | null>(null);
  const [bookingTracking, setBookingTracking] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const [searchData, setSearchData] = useState({
    destination: destination,
    checkIn: format(checkIn, 'yyyy-MM-dd'),
    checkOut: format(checkOut, 'yyyy-MM-dd'),
    guests: 2,
    rooms: 1
  });

  // Auto-search on mount
  useEffect(() => {
    if (destination) {
      handleSearch();
    }
  }, [destination]);

  const handleSearch = async () => {
    setIsSearching(true);
    
    try {
      // Search both hotels and packages
      const [hotelResponse, packageResponse] = await Promise.all([
        fetch('/api/hotels/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ ...searchData, tripId })
        }),
        fetch('/api/packages/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ 
            ...searchData, 
            tripId,
            includeFlights: true 
          })
        })
      ]);

      if (hotelResponse.ok) {
        const hotelData = await hotelResponse.json();
        setHotels(hotelData.hotels || []);
      }

      if (packageResponse.ok) {
        const packageData = await packageResponse.json();
        setPackages(packageData.packages || []);
      }

      // Show package tab if packages have better deals
      if (packages.length > 0) {
        const avgHotelPrice = hotels.reduce((sum, h) => sum + (h.priceValue || 0), 0) / hotels.length;
        const avgPackagePrice = packages.reduce((sum, p) => sum + (p.totalPrice || 0), 0) / packages.length;
        
        if (avgPackagePrice < avgHotelPrice * 1.5) {
          setActiveTab('packages');
          toast({
            title: "💰 Bundle & Save!",
            description: "Flight + Hotel packages can save you up to 30%",
          });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fallback with mock data
      setHotels(getMockHotels());
      setPackages(getMockPackages());
    } finally {
      setIsSearching(false);
    }
  };

  const getMockHotels = (): HotelOption[] => {
    const expediaUrl = `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(destination)}&startDate=${searchData.checkIn}&endDate=${searchData.checkOut}`;
    
    return [
      {
        id: '1',
        name: 'Grand Plaza Hotel & Spa',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        rating: 4.8,
        price: '$189',
        priceValue: 189,
        amenities: ['Free WiFi', 'Pool', 'Spa', 'Restaurant', 'Gym'],
        bookingUrl: expediaUrl,
        popular: true,
        dealType: 'Member Price'
      },
      {
        id: '2',
        name: 'Boutique Downtown Inn',
        image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
        rating: 4.5,
        price: '$142',
        priceValue: 142,
        amenities: ['Free Breakfast', 'WiFi', 'Rooftop Bar'],
        bookingUrl: expediaUrl,
        dealType: 'Last Minute Deal'
      },
      {
        id: '3',
        name: 'Modern Business Suites',
        image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800',
        rating: 4.2,
        price: '$98',
        priceValue: 98,
        amenities: ['WiFi', 'Kitchen', 'Parking', 'Workspace'],
        bookingUrl: expediaUrl
      }
    ];
  };

  const getMockPackages = () => {
    const packageUrl = `https://www.expedia.com/Packages?packageType=fh&destination=${encodeURIComponent(destination)}&chkin=${searchData.checkIn}&chkout=${searchData.checkOut}`;
    
    return [
      {
        id: 'pkg1',
        hotel: getMockHotels()[0],
        flight: {
          airline: 'United Airlines',
          price: 450,
          departure: '8:00 AM',
          arrival: '11:30 AM'
        },
        totalPrice: 520,
        savings: 119,
        bookingUrl: packageUrl
      }
    ];
  };

  const handleBookHotel = async (hotel: HotelOption, isPackage = false) => {
    setSelectedHotel(hotel);
    const trackingId = `booking_${Date.now()}`;
    setBookingTracking(trackingId);

    // Save pending booking to database
    try {
      await fetch('/api/bookings/pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tripId,
          hotelId: hotel.id,
          hotelName: hotel.name,
          price: hotel.priceValue,
          trackingId,
          type: isPackage ? 'package' : 'hotel',
          checkIn: searchData.checkIn,
          checkOut: searchData.checkOut
        })
      });
    } catch (error) {
      console.error('Failed to save pending booking:', error);
    }

    // Open Expedia in new tab with tracking
    const trackingUrl = `${hotel.bookingUrl}&tracking=${trackingId}&ref=remvana`;
    window.open(trackingUrl, '_blank');

    // Show confirmation modal after delay
    setTimeout(() => {
      setShowConfirmation(true);
    }, 3000);
  };

  const confirmBooking = async (booked: boolean) => {
    if (booked && selectedHotel) {
      // Add hotel to trip
      try {
        await fetch('/api/trips/add-hotel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            tripId,
            hotel: selectedHotel,
            checkIn: searchData.checkIn,
            checkOut: searchData.checkOut,
            trackingId: bookingTracking
          })
        });

        toast({
          title: "✅ Hotel Added to Trip!",
          description: `${selectedHotel.name} has been added to your itinerary`,
        });

        if (onHotelConfirmed) {
          onHotelConfirmed(selectedHotel);
        }
      } catch (error) {
        console.error('Failed to add hotel to trip:', error);
      }
    }

    setShowConfirmation(false);
    setSelectedHotel(null);
    setBookingTracking(null);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Search Header */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hotel className="w-5 h-5 text-purple-600" />
                <span>Find Your Perfect Stay</span>
              </div>
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                <Shield className="w-3 h-3 mr-1" />
                Best Price Guarantee
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{destination}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{format(new Date(searchData.checkIn), 'MMM d')} - {format(new Date(searchData.checkOut), 'MMM d')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span>{searchData.guests} guests, {searchData.rooms} room</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Hotels vs Packages */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hotels">
              <BedDouble className="w-4 h-4 mr-2" />
              Hotels Only
            </TabsTrigger>
            <TabsTrigger value="packages">
              <Package className="w-4 h-4 mr-2" />
              Flight + Hotel
              <Badge className="ml-2 bg-green-500 text-white">Save 30%</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hotels" className="space-y-4">
            {isSearching ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Finding the best hotels...</p>
              </div>
            ) : (
              hotels.map((hotel, index) => (
                <motion.div
                  key={hotel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all">
                    <div className="md:flex">
                      <div className="md:w-1/3 h-48 md:h-auto relative">
                        <img 
                          src={hotel.image} 
                          alt={hotel.name}
                          className="w-full h-full object-cover"
                        />
                        {hotel.popular && (
                          <Badge className="absolute top-2 left-2 bg-orange-500 text-white">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                        {hotel.dealType && (
                          <Badge className="absolute top-2 right-2 bg-green-500 text-white">
                            {hotel.dealType}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="md:w-2/3 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-xl font-semibold mb-1">{hotel.name}</h4>
                            <div className="flex items-center gap-2">
                              <div className="flex">
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
                            <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                              {hotel.price}
                            </p>
                            <p className="text-sm text-gray-500">per night</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {hotel.amenities.map((amenity, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleBookHotel(hotel)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Book Now on Expedia
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="icon"
                          >
                            <Heart className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            {packages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-green-600" />
                        Bundle & Save Package
                      </CardTitle>
                      <Badge className="bg-green-500 text-white text-lg px-3 py-1">
                        Save ${pkg.savings}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Flight Section */}
                    <div className="flex items-center gap-4 p-4 bg-white rounded-lg">
                      <Plane className="w-8 h-8 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-semibold">{pkg.flight.airline}</p>
                        <p className="text-sm text-gray-600">
                          {pkg.flight.departure} → {pkg.flight.arrival}
                        </p>
                      </div>
                      <p className="text-lg font-semibold">${pkg.flight.price}</p>
                    </div>

                    {/* Hotel Section */}
                    <div className="flex items-center gap-4 p-4 bg-white rounded-lg">
                      <Hotel className="w-8 h-8 text-purple-600" />
                      <div className="flex-1">
                        <p className="font-semibold">{pkg.hotel.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < Math.floor(pkg.hotel.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-lg font-semibold">${pkg.hotel.priceValue}</p>
                    </div>

                    {/* Total */}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-500 line-through">
                            ${pkg.flight.price + pkg.hotel.priceValue} if booked separately
                          </p>
                          <p className="text-2xl font-bold text-green-600">
                            ${pkg.totalPrice} total
                          </p>
                        </div>
                        <Button
                          onClick={() => handleBookHotel(pkg.hotel, true)}
                          size="lg"
                          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-0"
                        >
                          <DollarSign className="w-5 h-5 mr-2" />
                          Book This Package
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <Hotel className="w-8 h-8 text-purple-600" />
                </div>
                
                <h3 className="text-xl font-semibold">Did you complete your booking?</h3>
                
                {selectedHotel && (
                  <div className="p-4 bg-gray-50 rounded-lg text-left">
                    <p className="font-medium">{selectedHotel.name}</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(searchData.checkIn), 'MMM d')} - {format(new Date(searchData.checkOut), 'MMM d')}
                    </p>
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  Let us know if you've booked this hotel so we can add it to your trip itinerary
                </p>

                <div className="flex gap-3">
                  <Button
                    onClick={() => confirmBooking(true)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Yes, I Booked It!
                  </Button>
                  <Button
                    onClick={() => confirmBooking(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Still Browsing
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}