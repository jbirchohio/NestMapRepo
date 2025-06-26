import { format, differenceInMinutes, parseISO } from 'date-fns';
import { Plane, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Flight, FlightSegment } from '@shared/types/flight';

interface FlightCardProps {
  flight: Flight;
  isSelected: boolean;
  onSelect: (flight: Flight) => void;
  type: 'outbound' | 'return';
}

export const FlightCard: React.FC<FlightCardProps> = ({
  flight,
  isSelected,
  onSelect,
  type,
}) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
  };

  // Format time from ISO string or Date
  const formatTime = (time: string | Date): string => {
    try {
      const date = typeof time === 'string' ? parseISO(time) : time;
      return format(date, 'h:mm a');
    } catch (e) {
      console.error('Error formatting time:', e);
      return '--:--';
    }
  };

  // Format date from ISO string or Date
  const formatDate = (date: string | Date): string => {
    try {
      const d = typeof date === 'string' ? parseISO(date) : date;
      return format(d, 'MMM d, yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return '--';
    }
  };

  // Helper function to get airport code with fallback
  const getAirportCode = (segment: FlightSegment, type: 'departure' | 'arrival'): string => {
    try {
      const airport = type === 'departure' ? segment.departure.airport : segment.arrival.airport;
      return airport?.iataCode || '---';
    } catch (e) {
      console.error('Error getting airport code:', e);
      return '---';
    }
  };

  // Calculate layover time between two segments in minutes
  const calculateLayover = (currentSegment?: FlightSegment, nextSegment?: FlightSegment): number => {
    try {
      if (!currentSegment || !nextSegment) return 0;
      const currentArrival = typeof currentSegment.arrival.scheduledTime === 'string' 
        ? parseISO(currentSegment.arrival.scheduledTime) 
        : currentSegment.arrival.scheduledTime;
      const nextDeparture = typeof nextSegment.departure.scheduledTime === 'string'
        ? parseISO(nextSegment.departure.scheduledTime)
        : nextSegment.departure.scheduledTime;
      return differenceInMinutes(nextDeparture, currentArrival);
    } catch (e) {
      console.error('Error calculating layover:', e);
      return 0;
    }
  };

  // Get first and last segments with null checks
  const firstSegment = flight.segments?.[0];
  const lastSegment = flight.segments?.[flight.segments.length - 1];
  const airline = firstSegment?.marketingCarrier?.name || 'Airline';
  const flightNumber = firstSegment?.flightNumber || '';
  const stops = flight.segments ? flight.segments.length - 1 : 0;
  const duration = flight.duration || (flight.segments || []).reduce(
    (sum, seg) => sum + (seg.duration || 0), 0
  );
  const price = flight.price?.amount ? `$${flight.price.amount.toFixed(2)}` : 'N/A';

  return (
    <div
      className={`border rounded-lg p-4 transition-colors cursor-pointer ${
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'hover:border-primary/50'
      }`}
      onClick={() => onSelect(flight)}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Airline and flight number */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">
              {airline} {flightNumber}
            </div>
            <div className="text-sm text-muted-foreground">
              {stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`}
            </div>
          </div>
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm flex-1 max-w-2xl">
          <div className="space-y-1">
            <div className="font-medium">{formatTime(flight.departureTime)}</div>
            <div className="text-muted-foreground text-xs">
              {firstSegment ? getAirportCode(firstSegment, 'departure') : '---'}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(flight.departureTime)}
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center text-center">
            <div className="text-xs text-muted-foreground mb-1">
              {formatDuration(duration)}
            </div>
            <div className="w-full flex items-center">
              <div className="h-px bg-border flex-1"></div>
              <ArrowRight className="h-4 w-4 mx-1 text-muted-foreground" />
              <div className="h-px bg-border flex-1"></div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stops > 0 ? `${stops} ${stops === 1 ? 'stop' : 'stops'}` : 'Nonstop'}
            </div>
          </div>
          
          <div className="space-y-1 text-right">
            <div className="font-medium">{formatTime(flight.arrivalTime)}</div>
            <div className="text-muted-foreground text-xs">
              {lastSegment ? getAirportCode(lastSegment, 'arrival') : '---'}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(flight.arrivalTime)}
            </div>
          </div>
        </div>

        {/* Price and select button */}
        <div className="flex flex-col items-end gap-2">
          <div className="font-bold text-lg">${price}</div>
          <Button
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            className="w-full md:w-auto"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(flight);
            }}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        </div>
      </div>

      {/* Flight details */}
      {isSelected && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm font-medium mb-2">Flight Details</div>
          <div className="space-y-3">
            {flight.segments.map((segment, idx) => (
              <div key={segment.id} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {segment.marketingCarrier?.name} {segment.flightNumber}
                  </span>
                  <span className="text-muted-foreground">
                    {segment.aircraft?.name} ({segment.aircraft?.code})
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span>{getAirportCode(segment, 'departure')}</span>
                  <span className="text-muted-foreground">
                    {formatTime(segment.departure.scheduledTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span>{getAirportCode(segment, 'arrival')}</span>
                  <span className="text-muted-foreground">
                    {formatTime(segment.arrival.scheduledTime)}
                  </span>
                </div>
                {idx < flight.segments.length - 1 && (
                  <div className="text-xs text-muted-foreground mt-2 mb-3">
                    {flight.segments?.[idx + 1] && (
                      <span>Layover: {calculateLayover(flight.segments[idx], flight.segments[idx + 1])} min</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <div className="font-medium">Price Details</div>
                <div className="text-muted-foreground">
                  1 Adult
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">${price}</div>
                <div className="text-xs text-muted-foreground">
                  {flight.price?.taxes ? `Includes $${flight.price.taxes} in taxes and fees` : 'Includes all taxes and fees'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
