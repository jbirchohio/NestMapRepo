import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plane, Clock, MapPin, Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  departure: {
    airport: string;
    time: string;
  };
  arrival: {
    airport: string;
    time: string;
  };
  duration: string;
  stops: number;
  price: {
    amount: number;
    currency: string;
  };
  cabin: string;
  departureTime: string;
  arrivalTime: string;
}

interface FlightResultsProps {
  clientInfo: {
    origin: string;
    destination: string;
    departureDate: string;
    tripType: "one-way" | "round-trip";
    returnDate?: string;
    passengers: number;
    cabin: string;
    primaryTraveler: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
    };
    additionalTravelers: Array<{
      firstName: string;
      lastName: string;
      dateOfBirth: string;
    }>;
  };
  flightResults: FlightResult[];
  selectedDepartureFlight: FlightResult | null;
  selectedReturnFlight: FlightResult | null;
  onSelectDepartureFlight: (flight: FlightResult | null) => void;
  onSelectReturnFlight: (flight: FlightResult | null) => void;
  isLoading: boolean;
  onBack: () => void;
  onContinue: () => void;
  currentTravelerIndex: number;
  totalTravelers: number;
  travelerBookings: Array<{
    traveler: string;
    departureFlight?: FlightResult | null;
    returnFlight?: FlightResult | null;
  }>;
}

const formatFlightTime = (timeString: string): string => {
  try {
    return new Date(timeString).toLocaleTimeString('en-US', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return timeString;
  }
};

const formatDuration = (duration: string): string => {
  return duration || 'N/A';
};

const filterAndSortFlights = (flights: FlightResult[], type: string) => {
  return flights.filter(flight => {
    if (type === 'outbound' || type === 'departure') return true;
    if (type === 'return') return true;
    return true;
  }).sort((a, b) => a.price.amount - b.price.amount);
};

export function FlightResults({ 
  clientInfo, 
  flightResults, 
  selectedDepartureFlight, 
  selectedReturnFlight, 
  onSelectDepartureFlight, 
  onSelectReturnFlight, 
  isLoading, 
  onBack, 
  onContinue, 
  currentTravelerIndex, 
  totalTravelers, 
  travelerBookings 
}: FlightResultsProps) {
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'departure'>('price');

  const getAllTravelers = () => {
    const travelers = [
      `${clientInfo.primaryTraveler.firstName} ${clientInfo.primaryTraveler.lastName}`,
      ...clientInfo.additionalTravelers.map(t => `${t.firstName} ${t.lastName}`)
    ];
    
    return travelers.map((name, index) => ({
      firstName: name.split(' ')[0],
      lastName: name.split(' ')[1] || '',
      fullName: name
    }));
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Searching for flights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Flight Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">
              {clientInfo.origin} → {clientInfo.destination}
            </h3>
            <p className="text-sm text-gray-600">
              {clientInfo.passengers} passenger{clientInfo.passengers > 1 ? 's' : ''} • {clientInfo.cabin}
            </p>
          </div>
          {totalTravelers > 1 && (
            <div className="text-right">
              <div className="text-sm font-medium">
                Traveler {currentTravelerIndex + 1} of {totalTravelers}
              </div>
              <div className="text-sm text-gray-600">
                {getAllTravelers()[currentTravelerIndex]?.firstName || 'Current'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flight Selection */}
      {flightResults.length > 0 ? (
        <div className="space-y-4">
          <Tabs defaultValue="departure" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="departure">
                <Plane className="h-4 w-4 mr-2" />
                Departure Flights
              </TabsTrigger>
              {clientInfo.tripType === 'round-trip' && (
                <TabsTrigger value="return">
                  <Plane className="h-4 w-4 mr-2 transform rotate-180" />
                  Return Flights
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="departure" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Select Departure Flight</h3>
                <div className="text-sm text-gray-500">
                  {clientInfo.origin} → {clientInfo.destination}
                </div>
              </div>
              
              <div className="space-y-3">
                {filterAndSortFlights(flightResults, 'outbound').map((flight) => (
                  <div 
                    key={flight.id} 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedDepartureFlight?.id === flight.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectDepartureFlight(flight)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-blue-600">
                            {flight.departure?.airport || 'JFK'} → {flight.arrival?.airport || 'SFO'}
                          </div>
                          <div className="text-sm font-medium text-gray-700">
                            {flight.airline} {flight.flightNumber}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          {flight.departure ? formatFlightTime(flight.departure.time) : formatFlightTime(flight.departureTime)} - {flight.arrival ? formatFlightTime(flight.arrival.time) : formatFlightTime(flight.arrivalTime)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`} • {formatDuration(flight.duration)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">${flight.price.amount}</div>
                        <div className="text-sm text-gray-500 capitalize">{flight.cabin}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {clientInfo.tripType === 'round-trip' && (
              <TabsContent value="return" className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Select Return Flight</h3>
                  <div className="text-sm text-gray-500">
                    {clientInfo.destination} → {clientInfo.origin}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {filterAndSortFlights(flightResults, 'return').map((flight) => (
                    <div 
                      key={flight.id} 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedReturnFlight?.id === flight.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => onSelectReturnFlight(flight)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-blue-600">
                              {flight.departure?.airport || flight.departure?.airport} → {flight.arrival?.airport || flight.arrival?.airport}
                            </div>
                            <div className="text-sm font-medium text-gray-700">
                              {flight.airline} {flight.flightNumber}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 font-medium">
                            {flight.departure ? formatFlightTime(flight.departure.time) : formatFlightTime(flight.departureTime)} - {flight.arrival ? formatFlightTime(flight.arrival.time) : formatFlightTime(flight.arrivalTime)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`} • {formatDuration(flight.duration)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">${flight.price.amount}</div>
                          <div className="text-sm text-gray-500 capitalize">{flight.cabin}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Traveler Progress Indicator */}
          {totalTravelers > 1 && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Booking Progress</h4>
              <div className="space-y-2">
                {travelerBookings.map((booking, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className={index === currentTravelerIndex ? 'font-medium text-blue-600' : 'text-gray-600'}>
                      {index + 1}. {booking.traveler}
                    </span>
                    <span className={booking.departureFlight ? 'text-green-600' : 'text-gray-400'}>
                      {booking.departureFlight ? '✓ Booked' : index < currentTravelerIndex ? '✓ Complete' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Flight Summary */}
          {(selectedDepartureFlight || selectedReturnFlight) && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Selected Flights</h4>
              <div className="space-y-2 text-sm">
                {selectedDepartureFlight && (
                  <div className="flex justify-between">
                    <span>Departure: {selectedDepartureFlight.airline} {selectedDepartureFlight.flightNumber}</span>
                    <span className="font-medium">${selectedDepartureFlight.price.amount}</span>
                  </div>
                )}
                {selectedReturnFlight && (
                  <div className="flex justify-between">
                    <span>Return: {selectedReturnFlight.airline} {selectedReturnFlight.flightNumber}</span>
                    <span className="font-medium">${selectedReturnFlight.price.amount}</span>
                  </div>
                )}
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total Flight Cost:</span>
                <span>${(selectedDepartureFlight?.price.amount || 0) + (selectedReturnFlight?.price.amount || 0)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button 
              variant="outline"
              onClick={onBack}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Client Info
            </Button>
            <Button 
              onClick={onContinue}
              disabled={!selectedDepartureFlight && !selectedReturnFlight}
            >
              {currentTravelerIndex < totalTravelers - 1 
                ? `Continue to Next Traveler (${getAllTravelers()[currentTravelerIndex + 1]?.firstName || 'Next'})` 
                : 'Continue to Hotels'
              }
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No flights found for your search criteria.</p>
          <Button 
            variant="outline"
            onClick={onBack}
            className="mt-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Client Info
          </Button>
        </div>
      )}
    </div>
  );
}