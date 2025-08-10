import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, MapPin, Plus, Check, Loader2 } from 'lucide-react';
import { ClientTrip } from '@/lib/types';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/config';

interface SelectTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: {
    productCode: string;
    productName: string;
    price?: number;
    duration?: string;
    affiliateLink?: string;
  };
  cityName: string;
  onSuccess: (tripId: string) => void;
}

export default function SelectTripModal({
  isOpen,
  onClose,
  activity,
  cityName,
  onSuccess
}: SelectTripModalProps) {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [newTripName, setNewTripName] = useState(`${cityName} Trip`);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  // Fetch user's trips
  const { data: trips = [], isLoading: tripsLoading } = useQuery<ClientTrip[]>({
    queryKey: ['trips'],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.TRIPS, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch trips');
      return response.json();
    },
    enabled: isOpen
  });

  // Geocode city to get coordinates
  const geocodeCity = async (city: string) => {
    try {
      const response = await fetch(`/api/geocode?location=${encodeURIComponent(city)}`);
      if (response.ok) {
        const data = await response.json();
        return {
          latitude: data.latitude,
          longitude: data.longitude
        };
      }
    } catch (error) {
      console.error('Failed to geocode city:', error);
    }
    return null;
  };

  // Save activity mutation
  const saveActivityMutation = useMutation({
    mutationFn: async ({ tripId }: { tripId: string }) => {
      const response = await fetch('/api/viator/save-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...activity,
          city: cityName,
          tripId
        })
      });
      
      if (!response.ok) throw new Error('Failed to save activity');
      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Activity saved to your trip!');
      onSuccess(data.tripId);
      onClose();
    },
    onError: () => {
      toast.error('Failed to save activity. Please try again.');
    }
  });

  const handleCreateTrip = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select trip dates');
      return;
    }

    setIsCreatingTrip(true);
    try {
      // Get city coordinates
      const coordinates = await geocodeCity(cityName);
      
      // Create the trip
      const response = await fetch(API_ENDPOINTS.TRIPS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: newTripName,
          description: `Trip to ${cityName}`,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          city: cityName,
          cityLatitude: coordinates?.latitude,
          cityLongitude: coordinates?.longitude,
          status: 'active'
        })
      });

      if (!response.ok) throw new Error('Failed to create trip');
      
      const newTrip = await response.json();
      
      // Now save the activity to the new trip
      await saveActivityMutation.mutateAsync({ tripId: newTrip.id });
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip. Please try again.');
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const handleSelectTrip = () => {
    if (!selectedTripId) {
      toast.error('Please select a trip');
      return;
    }
    saveActivityMutation.mutate({ tripId: selectedTripId });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save "{activity.productName}" to Trip</DialogTitle>
          <DialogDescription>
            Choose an existing trip or create a new one for this activity in {cityName}.
          </DialogDescription>
        </DialogHeader>

        {mode === 'select' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select a trip</Label>
              {tripsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : trips.length > 0 ? (
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {trips.map((trip) => (
                    <Card
                      key={trip.id}
                      className={cn(
                        "cursor-pointer transition-all",
                        selectedTripId === trip.id
                          ? "border-purple-600 bg-purple-50"
                          : "hover:border-gray-400"
                      )}
                      onClick={() => setSelectedTripId(trip.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{trip.title}</div>
                            <div className="text-sm text-gray-600">
                              {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                            </div>
                            {trip.city && (
                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                {trip.city}
                              </div>
                            )}
                          </div>
                          {selectedTripId === trip.id && (
                            <Check className="h-5 w-5 text-purple-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No trips found. Create a new one below.
                </p>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setMode('create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Trip
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSelectTrip}
                  disabled={!selectedTripId || saveActivityMutation.isPending}
                >
                  {saveActivityMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save to Trip
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Trip Name</Label>
              <Input
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                placeholder="Enter trip name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (date && !endDate) {
                          setEndDate(addDays(date, 7));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startDate ? date < startDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2" />
                Trip location: <span className="font-medium ml-1">{cityName}</span>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setMode('select')}
              >
                Back to Trip Selection
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTrip}
                  disabled={isCreatingTrip || !startDate || !endDate}
                >
                  {isCreatingTrip && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create Trip & Save Activity
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}