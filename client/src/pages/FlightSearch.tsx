import SharedValueType from '@/types/SharedValueType';
import SharedErrorType from '@shared/schema/types/SharedErrorType';
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar"; // FIX: remove unused CalendarDays
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plane, Search, Clock, Users, MapPin, Calendar as CalendarIcon, ArrowRight, Wifi, Coffee, Luggage, Shield, Star, Info } from "lucide-react";
interface FlightSearchParams {
    origin: string;
    destination: string;
    departure_date: string;
    return_date?: string;
    passengers: {
        adults: number;
        children?: number;
        infants?: number;
    };
    cabin_class: 'economy' | 'premium_economy' | 'business' | 'first';
}
interface FlightOffer {
    id: string;
    price: {
        amount: string;
        currency: string;
    };
    slices: Array<{
        origin: {
            iata_code: string;
            name: string;
            city_name: string;
        };
        destination: {
            iata_code: string;
            name: string;
            city_name: string;
        };
        departure_datetime: string;
        arrival_datetime: string;
        duration: string;
        segments: Array<{
            airline: {
                name: string;
                iata_code: string;
                logo_url?: string;
            };
            flight_number: string;
            aircraft: {
                name: string;
            };
            origin: {
                iata_code: string;
                name: string;
            };
            destination: {
                iata_code: string;
                name: string;
            };
            departure_datetime: string;
            arrival_datetime: string;
            duration: string;
        }>;
    }>;
    passengers: Array<{
        type: string;
        cabin_class: string;
        baggage: Array<{
            type: string;
            quantity: number;
        }>;
    }>;
    conditions: {
        change_before_departure?: {
            allowed: boolean;
            penalty_amount?: string;
            penalty_currency?: string;
        };
        cancel_before_departure?: {
            allowed: boolean;
            penalty_amount?: string;
            penalty_currency?: string;
        };
    };
}
export default function FlightSearch() {
    const [searchParams, setSearchParams] = useState<FlightSearchParams>({
        origin: '',
        destination: '',
        departure_date: '',
        passengers: {
            adults: 1
        },
        cabin_class: 'economy'
    });
    const [departureDate, setDepartureDate] = useState<Date>();
    const [returnDate, setReturnDate] = useState<Date>();
    const [isRoundTrip, setIsRoundTrip] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState<FlightOffer | null>(null);
    const { toast } = useToast();
    const searchFlightsMutation = useMutation({
        mutationFn: (params: FlightSearchParams) => apiRequest('POST', '/api/flights/search', params),
        onSuccess: (data) => {
            console.log('Flight search results:', data);
        },
        onError: (error: SharedErrorType) => {
            toast({
                title: "Search Failed",
                description: error.message || "Unable to search flights",
                variant: "destructive"
            });
        }
    });
    const handleSearch = () => {
        if (!searchParams.origin || !searchParams.destination || !departureDate) {
            toast({
                title: "Missing Information",
                description: "Please fill in origin, destination, and departure date",
                variant: "destructive"
            });
            return;
        }
        const params = {
            ...searchParams,
            departure_date: format(departureDate, 'yyyy-MM-dd'),
            return_date: isRoundTrip && returnDate ? format(returnDate, 'yyyy-MM-dd') : undefined
        };
        searchFlightsMutation.mutate(params);
    };
    const formatDuration = (duration: string) => {
        if (duration.includes('min'))
            return duration;
        // Convert PT4H15M to "4h 15m"
        const match = duration.match(/PT(\d+)H(\d+)M/);
        if (match) {
            return `${match[1]}h ${match[2]}m`;
        }
        return duration;
    };
    const formatDateTime = (datetime: string) => {
        const date = new Date(datetime);
        return {
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
    };
    return (<div className="min-h-screen bg-gradient-to-br from-blue-50 via-electric-50 to-electric-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Flight Search
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Search and book flights with real-time availability and pricing
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-600"/>
                Search Flights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Trip Type */}
              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input type="radio" checked={!isRoundTrip} onChange={() => setIsRoundTrip(false)} className="w-4 h-4 text-blue-600"/>
                  <span>One Way</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" checked={isRoundTrip} onChange={() => setIsRoundTrip(true)} className="w-4 h-4 text-blue-600"/>
                  <span>Round Trip</span>
                </label>
              </div>

              {/* Origin and Destination */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origin">From</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"/>
                    <Input id="origin" placeholder="Origin airport (e.g., LAX)" value={searchParams.origin} onChange={(e) => setSearchParams(prev => ({ ...prev, origin: e.target.value.toUpperCase() }))} className="pl-9" maxLength={3}/>
                  </div>
                </div>
                <div>
                  <Label htmlFor="destination">To</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"/>
                    <Input id="destination" placeholder="Destination airport (e.g., JFK)" value={searchParams.destination} onChange={(e) => setSearchParams(prev => ({ ...prev, destination: e.target.value.toUpperCase() }))} className="pl-9" maxLength={3}/>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Departure Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4"/>
                        {departureDate ? format(departureDate, "PPP") : "Select departure date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={departureDate} onSelect={setDepartureDate} disabled={(date) => date < new Date()} initialFocus/>
                    </PopoverContent>
                  </Popover>
                </div>
                {isRoundTrip && (<div>
                    <Label>Return Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4"/>
                          {returnDate ? format(returnDate, "PPP") : "Select return date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={returnDate} onSelect={setReturnDate} disabled={(date) => date < (departureDate || new Date())} initialFocus/>
                      </PopoverContent>
                    </Popover>
                  </div>)}
              </div>

              {/* Passengers and Class */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adults">Passengers</Label>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground"/>
                    <Select value={searchParams.passengers.adults.toString()} onValueChange={(value) => setSearchParams(prev => ({
            ...prev,
            passengers: { ...prev.passengers, adults: parseInt(value) }
        }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (<SelectItem key={num} value={num.toString()}>
                            {num} Adult{num > 1 ? 's' : ''}
                          </SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="class">Cabin Class</Label>
                  <Select value={searchParams.cabin_class} onValueChange={(value: SharedValueType) => setSearchParams(prev => ({ ...prev, cabin_class: value }))}>
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
              </div>

              {/* Search Button */}
              <Button onClick={handleSearch} disabled={searchFlightsMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                {searchFlightsMutation.isPending ? (<div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"/>) : (<Search className="w-4 h-4 mr-2"/>)}
                Search Flights
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search Results */}
        {searchFlightsMutation.data?.success && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Flight Results</span>
                  <Badge variant="outline">
                    {searchFlightsMutation.data.data.length} flights found
                  </Badge>
                </CardTitle>
                {searchFlightsMutation.data.source === 'duffel_api' && (<p className="text-sm text-green-600 flex items-center gap-1">
                    <Shield className="w-4 h-4"/>
                    Live flight data from Duffel API
                  </p>)}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchFlightsMutation.data.data.map((flight: FlightOffer, index: number) => (<motion.div key={flight.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedFlight(flight)}>
                      {flight.slices.map((slice, sliceIndex) => (<div key={sliceIndex} className="mb-4 last:mb-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                  {formatDateTime(slice.departure_datetime).time}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {slice.origin.iata_code}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDateTime(slice.departure_datetime).date}
                                </div>
                              </div>
                              
                              <div className="flex-1 flex items-center">
                                <div className="w-full relative">
                                  <div className="border-t-2 border-dashed border-slate-300"></div>
                                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 px-2">
                                    <Plane className="w-4 h-4 text-blue-600"/>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-center">
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                  {formatDateTime(slice.arrival_datetime).time}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {slice.destination.iata_code}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDateTime(slice.arrival_datetime).date}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                ${flight.price.amount}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {flight.price.currency}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-4">
                              {slice.segments.map((segment, segIndex) => (<div key={segIndex} className="flex items-center gap-2">
                                  {segment.airline.logo_url && (<img src={segment.airline.logo_url} alt={segment.airline.name} className="w-6 h-6"/>)}
                                  <span>{segment.airline.name}</span>
                                  <span>{segment.flight_number}</span>
                                  <span>{segment.aircraft.name}</span>
                                </div>))}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3"/>
                              <span>{formatDuration(slice.duration)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {flight.passengers[0]?.baggage.map((bag, bagIndex) => (<div key={bagIndex} className="flex items-center gap-1">
                                <Luggage className="w-3 h-3"/>
                                <span>{bag.quantity} {bag.type.replace('_', ' ')}</span>
                              </div>))}
                            {flight.conditions?.change_before_departure?.allowed && (<div className="flex items-center gap-1">
                                <Info className="w-3 h-3"/>
                                <span>Changeable</span>
                              </div>)}
                            {flight.conditions?.cancel_before_departure?.allowed && (<div className="flex items-center gap-1">
                                <Info className="w-3 h-3"/>
                                <span>Refundable</span>
                              </div>)}
                          </div>
                        </div>))}
                    </motion.div>))}
                </div>
              </CardContent>
            </Card>
          </motion.div>)}

        {/* Error Message */}
        {searchFlightsMutation.isError && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4">
                <p className="text-red-700 dark:text-red-300">
                  {searchFlightsMutation.error?.message || 'Failed to search flights'}
                </p>
              </CardContent>
            </Card>
          </motion.div>)}
      </div>
    </div>);
}
