import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Plane, 
  Hotel, 
  Car, 
  Train, 
  Calendar as CalendarIcon,
  Clock,
  CreditCard,
  Search,
  Star
} from 'lucide-react';
import { format } from 'date-fns';

interface BookingRequest {
  type: 'flight' | 'hotel' | 'car' | 'train';
  departure?: string;
  destination?: string;
  departureDate?: Date;
  returnDate?: Date;
  passengers?: number;
  rooms?: number;
  class?: string;
}

interface BookingResult {
  id: string;
  type: string;
  provider: string;
  price: number;
  currency: string;
  description: string;
  duration?: string;
  rating?: number;
  features: string[];
  refundable: boolean;
  availability: number;
}

export default function BookingSystem() {
  const [activeTab, setActiveTab] = useState<'flight' | 'hotel' | 'car' | 'train'>('flight');
  const [bookingRequest, setBookingRequest] = useState<BookingRequest>({
    type: 'flight',
    passengers: 1,
    rooms: 1,
    class: 'economy'
  });
  const [searchResults, setSearchResults] = useState<BookingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (request: BookingRequest) => {
      const response = await apiRequest('POST', '/api/bookings/search', request);
      return response.data;
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
      setIsSearching(false);
      toast({
        title: "Search Complete",
        description: `Found ${data.results?.length || 0} options`,
      });
    },
    onError: (error: any) => {
      setIsSearching(false);
      toast({
        title: "Search Failed",
        description: error.message || "Unable to search for bookings",
        variant: "destructive"
      });
    }
  });

  // Book mutation
  const bookMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiRequest('POST', `/api/bookings/${bookingId}/book`);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Booking Successful",
        description: "Your booking has been confirmed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Unable to complete booking",
        variant: "destructive"
      });
    }
  });

  const handleSearch = () => {
    if (!bookingRequest.departure || !bookingRequest.destination || !bookingRequest.departureDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    searchMutation.mutate({
      ...bookingRequest,
      type: activeTab
    });
  };

  const handleBook = (bookingId: string) => {
    bookMutation.mutate(bookingId);
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'flight': return <Plane className="h-4 w-4" />;
      case 'hotel': return <Hotel className="h-4 w-4" />;
      case 'car': return <Car className="h-4 w-4" />;
      case 'train': return <Train className="h-4 w-4" />;
      default: return <Plane className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Booking System</h1>
        <p className="text-muted-foreground">
          Search and book flights, hotels, cars, and trains all in one place
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="flight" className="flex items-center gap-2">
            {getTabIcon('flight')}
            Flights
          </TabsTrigger>
          <TabsTrigger value="hotel" className="flex items-center gap-2">
            {getTabIcon('hotel')}
            Hotels
          </TabsTrigger>
          <TabsTrigger value="car" className="flex items-center gap-2">
            {getTabIcon('car')}
            Cars
          </TabsTrigger>
          <TabsTrigger value="train" className="flex items-center gap-2">
            {getTabIcon('train')}
            Trains
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flight" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Flight Search
              </CardTitle>
              <CardDescription>Find and book flights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departure">Departure</Label>
                  <Input
                    id="departure"
                    placeholder="From where?"
                    value={bookingRequest.departure || ''}
                    onChange={(e) => setBookingRequest(prev => ({ ...prev, departure: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    placeholder="To where?"
                    value={bookingRequest.destination || ''}
                    onChange={(e) => setBookingRequest(prev => ({ ...prev, destination: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Departure Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingRequest.departureDate ? format(bookingRequest.departureDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={bookingRequest.departureDate}
                        onSelect={(date) => setBookingRequest(prev => ({ ...prev, departureDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Return Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingRequest.returnDate ? format(bookingRequest.returnDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={bookingRequest.returnDate}
                        onSelect={(date) => setBookingRequest(prev => ({ ...prev, returnDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passengers">Passengers</Label>
                  <Select
                    value={bookingRequest.passengers?.toString()}
                    onValueChange={(value) => setBookingRequest(prev => ({ ...prev, passengers: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'Passenger' : 'Passengers'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select
                  value={bookingRequest.class}
                  onValueChange={(value) => setBookingRequest(prev => ({ ...prev, class: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy</SelectItem>
                    <SelectItem value="premium_economy">Premium Economy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="first">First Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSearch} 
                className="w-full" 
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Flights
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Similar structure for other tabs (hotel, car, train) */}
        <TabsContent value="hotel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hotel className="h-5 w-5" />
                Hotel Search
              </CardTitle>
              <CardDescription>Find and book accommodations</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Hotel className="h-4 w-4" />
                <AlertDescription>
                  Hotel booking functionality is being integrated. Please use the flight booking for now.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="car">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Car Rental
              </CardTitle>
              <CardDescription>Rent cars for your trip</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Car className="h-4 w-4" />
                <AlertDescription>
                  Car rental booking functionality is being integrated. Please use the flight booking for now.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="train">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Train className="h-5 w-5" />
                Train Tickets
              </CardTitle>
              <CardDescription>Book train tickets</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Train className="h-4 w-4" />
                <AlertDescription>
                  Train booking functionality is being integrated. Please use the flight booking for now.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Results ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {searchResults.map((result) => (
              <Card key={result.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{result.provider}</Badge>
                        {result.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{result.rating}</span>
                          </div>
                        )}
                        {result.refundable && (
                          <Badge variant="outline" className="text-green-600">
                            Refundable
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="font-semibold">{result.description}</h3>
                      
                      {result.duration && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {result.duration}
                        </div>
                      )}
                      
                      {result.features.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {result.features.slice(0, 3).map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {result.features.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{result.features.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right space-y-2">
                      <div className="text-2xl font-bold">
                        {result.currency} {result.price.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.availability} seats left
                      </div>
                      <Button 
                        onClick={() => handleBook(result.id)}
                        disabled={bookMutation.isPending}
                        className="w-full"
                      >
                        {bookMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Booking...
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Book Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
