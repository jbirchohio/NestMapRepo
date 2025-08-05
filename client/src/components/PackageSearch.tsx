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
  Plane, Hotel, MapPin, Calendar, Users, 
  TrendingDown, Package, Sparkles, ExternalLink
} from 'lucide-react';

interface PackageSearchProps {
  tripId?: string;
  destination?: string;
  origin?: string;
  startDate?: Date;
  endDate?: Date;
}

export default function PackageSearch({ 
  tripId, 
  destination: defaultDestination = '', 
  origin: defaultOrigin = '',
  startDate: defaultStartDate,
  endDate: defaultEndDate 
}: PackageSearchProps) {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  
  const [searchData, setSearchData] = useState({
    origin: defaultOrigin,
    destination: defaultDestination,
    depart: format(defaultStartDate || addDays(new Date(), 7), 'yyyy-MM-dd'),
    returnDate: format(defaultEndDate || addDays(new Date(), 14), 'yyyy-MM-dd'),
    adults: 2,
    rooms: 1
  });

  const handleSearch = async () => {
    if (!searchData.origin || !searchData.destination) {
      toast({
        title: "Missing information",
        description: "Please enter both origin and destination",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    
    try {
      // Generate Expedia package URL
      const packageUrl = await fetch('/api/packages/generate-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...searchData,
          tripId
        })
      }).then(r => r.json());

      // Track the search
      if (tripId) {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            event: 'package_search',
            properties: {
              origin: searchData.origin,
              destination: searchData.destination,
              tripId
            }
          })
        }).catch(console.error);
      }

      // Open Expedia packages in new tab
      window.open(packageUrl.url, '_blank');
      
      toast({
        title: "Opening Expedia Packages",
        description: "Find great bundle deals on flights + hotels!",
      });
    } catch (error) {
      console.error('Package search error:', error);
      
      // Fallback URL
      const fallbackUrl = `https://www.expedia.com/Packages?packageType=fh&ftla=${searchData.origin}&ttla=${searchData.destination}&chkin=${searchData.depart}&chkout=${searchData.returnDate}`;
      window.open(fallbackUrl, '_blank');
    } finally {
      setIsSearching(false);
    }
  };

  // Calculate estimated savings
  const nights = Math.ceil((new Date(searchData.returnDate).getTime() - new Date(searchData.depart).getTime()) / (1000 * 60 * 60 * 24));
  const estimatedHotelCost = nights * 150; // Average $150/night
  const estimatedFlightCost = 400; // Average domestic flight
  const estimatedSavings = Math.round((estimatedHotelCost + estimatedFlightCost) * 0.22);

  return (
    <div className="space-y-6">
      {/* Savings Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" />
              Bundle & Save
            </h3>
            <p className="mt-2 text-purple-100">
              Book flight + hotel together and save an average of 22%
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-purple-100">Estimated savings</p>
            <p className="text-3xl font-bold">${estimatedSavings}</p>
          </div>
        </div>
      </motion.div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Search Flight + Hotel Packages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origin">From</Label>
              <div className="relative">
                <Plane className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="origin"
                  placeholder="City or airport code"
                  value={searchData.origin}
                  onChange={(e) => setSearchData(prev => ({ ...prev, origin: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="destination">To</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="destination"
                  placeholder="City or airport code"
                  value={searchData.destination}
                  onChange={(e) => setSearchData(prev => ({ ...prev, destination: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="depart">Depart</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="depart"
                  type="date"
                  value={searchData.depart}
                  onChange={(e) => setSearchData(prev => ({ ...prev, depart: e.target.value }))}
                  className="pl-9"
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="return">Return</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="return"
                  type="date"
                  value={searchData.returnDate}
                  onChange={(e) => setSearchData(prev => ({ ...prev, returnDate: e.target.value }))}
                  className="pl-9"
                  min={searchData.depart}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="adults">Travelers</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="adults"
                  type="number"
                  min="1"
                  max="6"
                  value={searchData.adults}
                  onChange={(e) => setSearchData(prev => ({ ...prev, adults: parseInt(e.target.value) || 1 }))}
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
                max="3"
                value={searchData.rooms}
                onChange={(e) => setSearchData(prev => ({ ...prev, rooms: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
            size="lg"
          >
            {isSearching ? (
              <>
                <Package className="mr-2 h-4 w-4 animate-pulse" />
                Finding best deals...
              </>
            ) : (
              <>
                <TrendingDown className="mr-2 h-4 w-4" />
                Search Package Deals
              </>
            )}
          </Button>

          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Pro tip
              </Badge>
              Booking together saves an average of ${estimatedSavings} on this trip
            </p>
            <p className="text-xs text-center">
              Powered by Expedia • Real-time pricing • Instant confirmation
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold">Save 22% Average</p>
                <p className="text-sm text-gray-600">Bundle discount applied</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-pink-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <Hotel className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="font-semibold">One Booking</p>
                <p className="text-sm text-gray-600">Manage everything together</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold">Best Selection</p>
                <p className="text-sm text-gray-600">500K+ hotels worldwide</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}