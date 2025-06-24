import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plane, ArrowRight } from 'lucide-react';
import { FlightSearchForm } from './FlightSearchForm';
import { FlightList } from './FlightList';
import { Flight } from '@shared/types/flight';
import { FlightSearchParams } from '@shared/types/flight';
import { flightService } from '@/services/api/flightService';
import { BookingFormData } from '../types';

interface FlightSelectionStepProps {
  formData: BookingFormData;
  onBack: () => void;
  onNext: (data: Partial<BookingFormData>) => void;
}

export const FlightSelectionStep: React.FC<FlightSelectionStepProps> = ({
  formData,
  onBack,
  onNext,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'outbound' | 'return'>('outbound');
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [isRoundTrip, setIsRoundTrip] = useState(formData.tripType === 'round-trip');
  
  // Flight data state
  const [flights, setFlights] = useState<{
    outbound: Flight[];
    return: Flight[];
  }>({ outbound: [], return: [] });
  
  const [selectedFlights, setSelectedFlights] = useState<{
    outbound: Flight | null;
    return: Flight | null;
  }>({ outbound: null, return: null });

  // Handle flight search
  const handleSearch = useCallback(async (searchParams: FlightSearchParams) => {
    setIsSearching(true);
    setSearchPerformed(true);

    try {
      // Call the flight service to search for flights
      const [outboundResponse, returnResponse] = await Promise.all([
        // Outbound flight search
        flightService.searchFlights({
          ...searchParams,
          returnDate: undefined, // Don't include return date in the outbound search
        }),
        
        // Return flight search (only if round trip)
        isRoundTrip && searchParams.returnDate
          ? flightService.searchFlights({
              ...searchParams,
              origin: searchParams.destination,
              destination: searchParams.origin,
              departureDate: searchParams.returnDate,
              returnDate: undefined,
            })
          : Promise.resolve([]),
      ]);

      setFlights({
        outbound: outboundResponse,
        return: isRoundTrip ? (returnResponse || []) : [],
      });

      // Auto-select the first outbound flight if none selected
      if (outboundResponse.length > 0 && !selectedFlights.outbound) {
        setSelectedFlights(prev => ({
          ...prev,
          outbound: outboundResponse[0]
        }));
      }

    } catch (error) {
      console.error('Error searching flights:', error);
      toast({
        title: 'Error',
        children: 'Failed to search for flights. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  }, [isRoundTrip, selectedFlights.outbound, toast]);

  // Handle flight selection
  const handleSelectFlight = (flight: Flight, type: 'outbound' | 'return') => {
    setSelectedFlights(prev => ({
      ...prev,
      [type]: flight
    }));
    
    // If selecting an outbound flight and it's a round trip, switch to return tab
    if (type === 'outbound' && isRoundTrip) {
      setActiveTab('return');
    }
  };

  // Handle continue to next step
  const handleContinue = () => {
    if (!selectedFlights.outbound) {
      toast({
        title: 'No flight selected',
        description: 'Please select an outbound flight',
        variant: 'destructive',
      });
      return;
    }

    if (isRoundTrip && !selectedFlights.return) {
      // If it's a round trip but no return flight selected, ask if they want to skip
      const shouldSkip = window.confirm('No return flight selected. Continue without a return flight?');
      if (!shouldSkip) return;
    }

    // Prepare data for the next step
    const flightData: Partial<BookingFormData> = {
      origin: selectedFlights.outbound.origin,
      destination: selectedFlights.outbound.destination,
      departureDate: selectedFlights.outbound.departureTime,
      returnDate: selectedFlights.return?.departureTime,
      passengers: 1, // This should come from search params
      cabin: selectedFlights.outbound.cabin,
      selectedFlight: selectedFlights.outbound,
      selectedReturnFlight: selectedFlights.return || undefined,
      tripType: isRoundTrip ? 'round-trip' : 'one-way',
    };

    onNext(flightData);
  };

  // Toggle between one-way and round-trip
  const toggleRoundTrip = () => {
    const newIsRoundTrip = !isRoundTrip;
    setIsRoundTrip(newIsRoundTrip);
    
    // If switching to one-way, clear return flight selection
    if (!newIsRoundTrip) {
      setSelectedFlights(prev => ({
        ...prev,
        return: null
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="px-0"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Search form */}
      <FlightSearchForm
        initialValues={{
          origin: formData.origin,
          destination: formData.destination,
          departureDate: formData.departureDate,
          returnDate: formData.returnDate,
          passengers: { adults: formData.passengers || 1 },
          cabin: formData.cabin || 'economy',
        }}
        isRoundTrip={isRoundTrip}
        onToggleRoundTrip={toggleRoundTrip}
        onSearch={handleSearch}
        isLoading={isSearching}
      />

      {/* Search results */}
      {searchPerformed && (
        <div className="space-y-6">
          {/* Flight tabs */}
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as 'outbound' | 'return')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="outbound" disabled={isSearching}>
                <Plane className="h-4 w-4 mr-2" />
                Outbound
                {selectedFlights.outbound && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
                    ✓
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="return" 
                disabled={!isRoundTrip || isSearching}
              >
                <Plane className="h-4 w-4 mr-2 transform rotate-180" />
                Return
                {selectedFlights.return && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
                    ✓
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Outbound flights */}
            <TabsContent value="outbound" className="mt-6">
              <FlightList
                flights={flights.outbound}
                selectedFlightId={selectedFlights.outbound?.id || null}
                onSelectFlight={(flight) => handleSelectFlight(flight, 'outbound')}
                type="outbound"
                isLoading={isSearching}
                emptyMessage="No outbound flights found. Try adjusting your search criteria."
              />
            </TabsContent>

            {/* Return flights */}
            <TabsContent value="return" className="mt-6">
              <FlightList
                flights={flights.return}
                selectedFlightId={selectedFlights.return?.id || null}
                onSelectFlight={(flight) => handleSelectFlight(flight, 'return')}
                type="return"
                isLoading={isSearching}
                emptyMessage="No return flights found. Try adjusting your search criteria or continue without a return flight."
              />
            </TabsContent>
          </Tabs>

          {/* Continue button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleContinue}
              disabled={!selectedFlights.outbound || (isRoundTrip && !selectedFlights.return)}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
