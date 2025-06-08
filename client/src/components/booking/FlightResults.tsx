import { Plane, Clock, MapPin, Calendar, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: { amount: number; currency: string };
  cabin: string;
  availability: number;
}

interface FlightResultsProps {
  flights: Flight[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight) => void;
  isSearching: boolean;
  isReturnFlight?: boolean;
}

export function FlightResults({
  flights,
  selectedFlight,
  onSelectFlight,
  isSearching,
  isReturnFlight = false,
}: FlightResultsProps) {
  if (isSearching) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium">No flights found</h3>
        <p className="text-muted-foreground">Try adjusting your search criteria</p>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'h:mm a');
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM d, yyyy');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">
        {isReturnFlight ? 'Return Flights' : 'Outbound Flights'}
      </h3>
      
      <div className="space-y-4">
        {flights.map((flight) => (
          <div
            key={flight.id}
            className={`border rounded-lg p-4 transition-colors ${
              selectedFlight?.id === flight.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'hover:border-blue-300'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Plane className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">
                    {flight.airline} {flight.flightNumber}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {flight.origin} <ArrowRight className="inline h-3 w-3 mx-1" /> {flight.destination}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="font-medium">{formatTime(flight.departureTime)}</div>
                  <div className="text-muted-foreground">{formatDate(flight.departureTime)}</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">{formatTime(flight.arrivalTime)}</div>
                  <div className="text-muted-foreground">{formatDate(flight.arrivalTime)}</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">${flight.price.amount}</div>
                  <div className="text-muted-foreground">
                    {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>

              <Button
                variant={selectedFlight?.id === flight.id ? 'default' : 'outline'}
                onClick={() => onSelectFlight(flight)}
                className="whitespace-nowrap"
              >
                {selectedFlight?.id === flight.id ? 'Selected' : 'Select'}
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{flight.duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{flight.availability} seat{flight.availability !== 1 ? 's' : ''} left</span>
              </div>
              <Badge variant="outline" className="ml-auto capitalize">
                {flight.cabin}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
