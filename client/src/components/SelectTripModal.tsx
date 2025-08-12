import React, { useState, useEffect } from 'react';
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
import { API_ENDPOINTS } from '@/lib/constants';

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
  const [step, setStep] = useState<'trip' | 'date'>('trip');
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<ClientTrip | null>(null);
  const [newTripName, setNewTripName] = useState(`${cityName} Trip`);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [activityDate, setActivityDate] = useState<Date | undefined>(undefined);
  const [activityTime, setActivityTime] = useState<string>('09:00');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [tripBudget, setTripBudget] = useState<number>(0);
  const [tripCurrency, setTripCurrency] = useState<string>('USD');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('trip');
      setMode('select');
      setSelectedTripId(null);
      setSelectedTrip(null);
      setActivityDate(undefined);

      // Set intelligent default time based on activity duration
      let defaultTime = '09:00';
      if (activity.duration) {
        const duration = activity.duration.toLowerCase();
        if (duration.includes('evening') || duration.includes('night')) {
          defaultTime = '19:00';
        } else if (duration.includes('afternoon')) {
          defaultTime = '14:00';
        } else if (duration.includes('full day') || duration.includes('8h')) {
          defaultTime = '08:00';
        }
      }
      setActivityTime(defaultTime);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow);
      setEndDate(addDays(tomorrow, 6));
    }
  }, [isOpen, activity]);

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
      }
    return null;
  };

  // Save activity mutation
  const saveActivityMutation = useMutation({
    mutationFn: async ({ tripId, date, time }: { tripId: string; date: string; time: string }) => {
      const response = await fetch('/api/viator/save-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...activity,
          city: cityName,
          tripId,
          date,
          time
        })
      });

      if (!response.ok) throw new Error('Failed to save activity');
      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Activity saved to your trip!');
      onSuccess(String(data.tripId));
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
          budget: tripBudget > 0 ? tripBudget : undefined,
          currency: tripCurrency,
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

      // Set the created trip as selected and move to date selection
      setSelectedTrip(newTrip);
      setSelectedTripId(newTrip.id);
      setActivityDate(startDate); // Default to first day of trip
      setStep('date');
    } catch (error) {
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

    const trip = trips.find(t => t.id === selectedTripId);
    if (trip) {
      setSelectedTrip(trip);
      setActivityDate(new Date(trip.startDate)); // Default to first day of trip
      setStep('date');
    }
  };

  const handleSaveActivity = () => {
    if (!activityDate) {
      toast.error('Please select a date for the activity');
      return;
    }

    if (!selectedTripId) {
      toast.error('No trip selected');
      return;
    }

    saveActivityMutation.mutate({
      tripId: String(selectedTripId),
      date: format(activityDate, 'yyyy-MM-dd'),
      time: activityTime
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'trip'
              ? `Save "${activity.productName}" to Trip`
              : `Select Date for Activity`
            }
          </DialogTitle>
          <DialogDescription>
            {step === 'trip'
              ? `Choose an existing trip or create a new one for this activity in ${cityName}.`
              : `When would you like to schedule this activity during your trip?`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'date' ? (
          // Date selection step
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-medium text-sm text-gray-700 mb-2">Selected Trip</div>
              <div className="font-semibold">{selectedTrip?.title}</div>
              <div className="text-sm text-gray-600">
                {selectedTrip && (
                  <>
                    {format(new Date(selectedTrip.startDate), 'MMM d')} - {format(new Date(selectedTrip.endDate), 'MMM d, yyyy')}
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Activity Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !activityDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {activityDate ? format(activityDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={activityDate}
                      onSelect={setActivityDate}
                      disabled={(date) => {
                        if (!selectedTrip) return true;
                        const tripStart = new Date(selectedTrip.startDate);
                        const tripEnd = new Date(selectedTrip.endDate);
                        return date < tripStart || date > tripEnd;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Select Time</Label>
                <Input
                  type="time"
                  value={activityTime}
                  onChange={(e) => setActivityTime(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  What time should this activity start?
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('trip');
                  setActivityDate(undefined);
                }}
              >
                Back to Trip Selection
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveActivity}
                  disabled={!activityDate || saveActivityMutation.isPending}
                >
                  {saveActivityMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save Activity
                </Button>
              </div>
            </div>
          </div>
        ) : mode === 'select' ? (
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
                  disabled={!selectedTripId}
                >
                  Next: Select Date
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

            {/* Budget Settings (Optional) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Trip Budget (Optional)</Label>
                <span className="text-xs text-gray-500">Set to track expenses</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={tripBudget || ''}
                    onChange={(e) => setTripBudget(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="100"
                  />
                  <span className="text-xs text-gray-500">Total budget amount</span>
                </div>
                <div className="space-y-2">
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={tripCurrency}
                    onChange={(e) => setTripCurrency(e.target.value)}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="CAD">CAD (C$)</option>
                  </select>
                  <span className="text-xs text-gray-500">Currency</span>
                </div>
              </div>
              {tripBudget > 0 && (
                <div className="text-sm text-green-600">
                  💰 Budget tracking enabled - You'll be able to track expenses for this trip
                </div>
              )}
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