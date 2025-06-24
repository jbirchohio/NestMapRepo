import { Flight } from '@shared/types/flight';
import { FlightCard } from './FlightCard';

interface FlightListProps {
  flights: Flight[];
  selectedFlightId: string | null;
  onSelectFlight: (flight: Flight) => void;
  type: 'outbound' | 'return';
  isLoading?: boolean;
  emptyMessage?: string;
}

export const FlightList: React.FC<FlightListProps> = ({
  flights,
  selectedFlightId,
  onSelectFlight,
  type,
  isLoading = false,
  emptyMessage = 'No flights found',
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading {type} flights...</p>
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {flights.map((flight) => (
        <FlightCard
          key={flight.id}
          flight={flight}
          isSelected={flight.id === selectedFlightId}
          onSelect={() => onSelectFlight(flight)}
          type={type}
        />
      ))}
    </div>
  );
};
