import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { Plane, Clock, MapPin, Filter, ArrowRight, Wifi, Utensils, Luggage } from 'lucide-react';
interface FlightOffer {
    id: string;
    price: {
        amount: string;
        currency: string;
    };
    slices: Array<{
        origin: {
            iataCode: string;
            name: string;
            cityName: string;
        };
        destination: {
            iataCode: string;
            name: string;
            cityName: string;
        };
        departureDatetime: string;
        arrivalDatetime: string;
        duration: string;
        segments: Array<{
            airline: {
                name: string;
                iataCode: string;
                logoUrl: string;
            };
            flightNumber: string;
            aircraft: {
                name: string;
            } | null;
            origin: {
                iataCode: string;
                name: string;
            };
            destination: {
                iataCode: string;
                name: string;
            };
            departureDatetime: string;
            arrivaleDatetime: string;
            duration: string;
        }>;
    }>;
    passengers: Array<{
        type: string;
        baggage: Array<any>;
    }>;
    conditions: {
        changeBeforeDeparture?: {
            allowed: boolean;
            penaltyAmount?: string;
            penaltyCurrency?: string;
        };
        refundBeforeDeparture?: {
            allowed: boolean;
            penaltyAmount?: string;
            penaltyCurrency?: string;
        };
    };
}
export default function FlightResults() {
    const [location, setLocation] = useLocation();
    const [sortBy, setSortBy] = useState('price');
    const [filters, setFilters] = useState({
        maxPrice: '',
        airlines: [] as string[],
        stops: 'any'
    });
    // Get search params from URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchParams = {
        origin: urlParams.get('origin') || '',
        destination: urlParams.get('destination') || '',
        departure_date: urlParams.get('departure_date') || '',
        passengers: {
            adults: parseInt(urlParams.get('adults') || '1')
        },
        cabin_class: urlParams.get('cabin_class') || 'economy'
    };
    // Fetch flight results
    const { data: flightResults, isLoading, error } = useQuery({
        queryKey: ['flight-search', searchParams],
        queryFn: () => apiRequest('POST', '/api/flights/search', searchParams),
        enabled: !!(searchParams.origin && searchParams.destination && searchParams.departure_date)
    });
    const formatDuration = (duration: string) => {
        if (duration.includes('minutes')) {
            const minutes = parseInt(duration);
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}h ${remainingMinutes}m`;
        }
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (match) {
            const hours = match[1] ? parseInt(match[1]) : 0;
            const minutes = match[2] ? parseInt(match[2]) : 0;
            return `${hours}h ${minutes}m`;
        }
        return duration;
    };
    const formatDateTime = (dateTime: string) => {
        return new Date(dateTime).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    const formatTime = (dateTime: string) => {
        return new Date(dateTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    const sortFlights = (flights: FlightOffer[]) => {
        if (!flights)
            return [];
        return [...flights].sort((a, b) => {
            switch (sortBy) {
                case 'price':
                    return parseFloat(a.price.amount) - parseFloat(b.price.amount);
                case 'duration':
                    const aDuration = parseInt(a.slices[0]?.duration || '0');
                    const bDuration = parseInt(b.slices[0]?.duration || '0');
                    return aDuration - bDuration;
                case 'departure':
                    return new Date(a.slices[0]?.departureDatetime || 0).getTime() -
                        new Date(b.slices[0]?.departureDatetime || 0).getTime();
                default:
                    return 0;
            }
        });
    };
    const filterFlights = (flights: FlightOffer[]) => {
        if (!flights)
            return [];
        return flights.filter(flight => {
            // Price filter
            if (filters.maxPrice && parseFloat(flight.price.amount) > parseFloat(filters.maxPrice)) {
                return false;
            }
            // Airline filter
            if (filters.airlines.length > 0) {
                const flightAirlines = flight.slices.flatMap(slice => slice.segments.map(segment => segment.airline.iataCode));
                if (!filters.airlines.some(airline => flightAirlines.includes(airline))) {
                    return false;
                }
            }
            // Stops filter
            if (filters.stops !== 'any' && flight.slices[0]?.segments) {
                const stopCount = flight.slices[0].segments.length - 1;
                if (filters.stops === 'nonstop' && stopCount > 0)
                    return false;
                if (filters.stops === '1stop' && stopCount !== 1)
                    return false;
            }
            return true;
        });
    };
    const handleBookFlight = (offerId: string) => {
        setLocation(`/flights/book/${offerId}`);
    };
    if (isLoading) {
        return (<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"/>
          <h3 className="text-lg font-semibold mb-2">Searching Flights</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Finding the best flights for your trip...
          </p>
        </div>
      </div>);
    }
    if (error) {
        return (<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <Plane className="w-12 h-12 text-red-400 mx-auto mb-4"/>
              <h3 className="text-lg font-semibold mb-2">Search Failed</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Unable to search for flights. Please try again.
              </p>
              <Button onClick={() => setLocation('/flights')}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>);
    }
    const flights = sortFlights(filterFlights(flightResults?.data || []));
    const allAirlines: string[] = Array.from(new Set(flightResults?.data?.flatMap((flight: FlightOffer) => flight.slices.flatMap(slice => slice.segments.map(segment => segment.airline.iataCode))) || []));
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Search Summary */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Flight Results
            </h1>
            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4"/>
                {searchParams.origin} → {searchParams.destination}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4"/>
                {new Date(searchParams.departure_date).toLocaleDateString()}
              </div>
              <div>
                {searchParams.passengers.adults} passenger{searchParams.passengers.adults > 1 ? 's' : ''}
              </div>
              <Badge variant="secondary">{searchParams.cabin_class}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5"/>
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Sort */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort by</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Price (Low to High)</SelectItem>
                        <SelectItem value="duration">Duration</SelectItem>
                        <SelectItem value="departure">Departure Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Price</label>
                    <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Any price" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}/>
                  </div>

                  {/* Stops */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Stops</label>
                    <Select value={filters.stops} onValueChange={(value) => setFilters({ ...filters, stops: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any number of stops</SelectItem>
                        <SelectItem value="nonstop">Nonstop only</SelectItem>
                        <SelectItem value="1stop">1 stop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Airlines */}
                  {allAirlines.length > 0 && (<div>
                      <label className="text-sm font-medium mb-2 block">Airlines</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {allAirlines.map((airline: string) => (<label key={airline} className="flex items-center gap-2">
                            <input type="checkbox" checked={filters.airlines.includes(airline)} onChange={(e) => {
                    if (e.target.checked) {
                        setFilters({ ...filters, airlines: [...filters.airlines, airline] });
                    }
                    else {
                        setFilters({ ...filters, airlines: filters.airlines.filter(a => a !== airline) });
                    }
                }}/>
                            <span className="text-sm">{airline}</span>
                          </label>))}
                      </div>
                    </div>)}
                </CardContent>
              </Card>
            </div>

            {/* Flight Results */}
            <div className="lg:col-span-3">
              {flights.length === 0 ? (<Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Plane className="w-12 h-12 text-gray-400 mx-auto mb-4"/>
                      <h3 className="text-lg font-semibold mb-2">No Flights Found</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        No flights match your current filters. Try adjusting your search criteria.
                      </p>
                      <Button onClick={() => setLocation('/flights')}>
                        New Search
                      </Button>
                    </div>
                  </CardContent>
                </Card>) : (<div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Showing {flights.length} of {flightResults?.data?.length || 0} flights
                  </div>

                  {flights.map((flight: FlightOffer) => (<Card key={flight.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            {flight.slices.map((slice, sliceIndex) => (<div key={sliceIndex} className="mb-4 last:mb-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-4">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold">
                                        {formatTime(slice.departureDatetime)}
                                      </div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {slice.origin.iataCode}
                                      </div>
                                    </div>
                                    
                                    <div className="flex-1 text-center">
                                      <div className="flex items-center justify-center gap-2 mb-1">
                                        <div className="h-px bg-gray-300 flex-1"></div>
                                        <Plane className="w-4 h-4 text-gray-400"/>
                                        <div className="h-px bg-gray-300 flex-1"></div>
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {formatDuration(slice.duration)}
                                      </div>
                                      {slice.segments.length > 1 && (<div className="text-xs text-orange-600 dark:text-orange-400">
                                          {slice.segments.length - 1} stop{slice.segments.length > 2 ? 's' : ''}
                                        </div>)}
                                    </div>
                                    
                                    <div className="text-center">
                                      <div className="text-2xl font-bold">
                                        {formatTime(slice.arrivalDatetime)}
                                      </div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {slice.destination.iataCode}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Flight segments */}
                                <div className="flex gap-2 flex-wrap">
                                  {slice.segments.map((segment, segmentIndex) => (<div key={segmentIndex} className="flex items-center gap-2 text-xs">
                                      <img src={segment.airline.logoUrl} alt={segment.airline.name} className="w-4 h-4" onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}/>
                                      <span>{segment.airline.name}</span>
                                      <span className="text-gray-500">{segment.flightNumber}</span>
                                      {segment.aircraft && (<span className="text-gray-500">• {segment.aircraft.name}</span>)}
                                      {segmentIndex < slice.segments.length - 1 && (<ArrowRight className="w-3 h-3 text-gray-400"/>)}
                                    </div>))}
                                </div>
                              </div>))}
                          </div>

                          <div className="ml-6 text-right">
                            <div className="text-3xl font-bold text-primary">
                              {flight.price.currency} {flight.price.amount}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                              per person
                            </div>
                            
                            <Button onClick={() => handleBookFlight(flight.id)} className="w-full mb-2">
                              Select Flight
                            </Button>

                            {/* Conditions */}
                            <div className="text-xs space-y-1">
                              {flight.conditions.changeBeforeDeparture && (<div className={flight.conditions.changeBeforeDeparture.allowed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  Changes: {flight.conditions.changeBeforeDeparture.allowed ? 'Allowed' : 'Not allowed'}
                                  {flight.conditions.changeBeforeDeparture.penaltyAmount && (<span> (fee: {flight.conditions.changeBeforeDeparture.penaltyCurrency} {flight.conditions.changeBeforeDeparture.penaltyAmount})</span>)}
                                </div>)}
                              {flight.conditions.refundBeforeDeparture && (<div className={flight.conditions.refundBeforeDeparture.allowed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  Refunds: {flight.conditions.refundBeforeDeparture.allowed ? 'Allowed' : 'Not allowed'}
                                  {flight.conditions.refundBeforeDeparture.penaltyAmount && (<span> (fee: {flight.conditions.refundBeforeDeparture.penaltyCurrency} {flight.conditions.refundBeforeDeparture.penaltyAmount})</span>)}
                                </div>)}
                            </div>
                          </div>
                        </div>

                        {/* Baggage info */}
                        {flight.passengers[0]?.baggage && flight.passengers[0].baggage.length > 0 && (
                          <div className="border-t pt-3 mt-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Luggage className="w-4 h-4"/>
                              <span>Included: </span>
                              {flight.passengers[0].baggage.map((bag: any, index: number, array) => (
                                <span key={index}>
                                  {bag.quantity} {bag.type.replace('_', ' ')}
                                  {index < array.length - 1 && ', '}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>))}
                </div>)}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
