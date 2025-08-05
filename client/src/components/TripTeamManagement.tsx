import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Users, UserPlus, MapPin, Plane, DollarSign, X } from 'lucide-react';
import { ClientTrip } from '@/lib/types';

interface TripTraveler {
  id: number;
  tripId?: number;
  userId?: number;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  departureCity?: string;
  departureCountry?: string;
  departureLatitude?: string;
  departureLongitude?: string;
  arrivalPreferences: Record<string, any>;
  accommodationPreferences: Record<string, any>;
  dietaryRequirements?: string;
  budgetAllocation?: number;
  travelClass: string;
  isTripOrganizer: boolean;
  status: string;
  notes?: string;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

interface TripTeamManagementProps {
  tripId: number;
  userRole: string;
}

const TRAVEL_CLASSES = {
  economy: { label: 'Economy', color: 'secondary' },
  premium: { label: 'Premium Economy', color: 'default' },
  business: { label: 'Business', color: 'destructive' },
  first: { label: 'First Class', color: 'destructive' }
};

export function TripTeamManagement({ tripId, userRole }: TripTeamManagementProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTraveler, setNewTraveler] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    departureCity: '',
    departureCountry: '',
    travelClass: 'economy',
    budgetAllocation: '',
    dietaryRequirements: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    notes: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: travelers = [], isLoading } = useQuery<TripTraveler[]>({
    queryKey: [`/api/trips/${tripId}/travelers`],
    enabled: !!tripId
  });

  // Fetch trip details to get destination information
  const { data: tripData } = useQuery<ClientTrip>({
    queryKey: [`/api/trips/${tripId}`],
    queryFn: () => apiRequest('GET', `/api/trips/${tripId}`),
    enabled: !!tripId
  });

  const addTravelerMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", `/api/trips/${tripId}/travelers`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/travelers`] });
      setIsAddModalOpen(false);
      setNewTraveler({
        name: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        departureCity: '',
        departureCountry: '',
        travelClass: 'economy',
        budgetAllocation: '',
        dietaryRequirements: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        notes: ''
      });
      toast({
        title: "Team member added",
        description: "The traveler has been added to the trip.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add team member",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeTravelerMutation = useMutation({
    mutationFn: (travelerId: number) =>
      apiRequest("DELETE", `/api/trips/${tripId}/travelers/${travelerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/travelers`] });
      toast({
        title: "Team member removed",
        description: "The traveler has been removed from the trip.",
      });
    },
  });

  const handleAddTraveler = () => {
    if (!newTraveler.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter the traveler's name.",
        variant: "destructive",
      });
      return;
    }

    if (!newTraveler.departureCity.trim()) {
      toast({
        title: "Departure city required",
        description: "Please enter the traveler's departure city.",
        variant: "destructive",
      });
      return;
    }

    if (!newTraveler.phone.trim()) {
      toast({
        title: "Phone number required",
        description: "Phone number is required for flight booking.",
        variant: "destructive",
      });
      return;
    }

    if (!newTraveler.dateOfBirth) {
      toast({
        title: "Date of birth required",
        description: "Date of birth is required for flight booking.",
        variant: "destructive",
      });
      return;
    }

    if (!newTraveler.emergencyContactName.trim()) {
      toast({
        title: "Emergency contact required",
        description: "Emergency contact information is required.",
        variant: "destructive",
      });
      return;
    }

    const travelerData = {
      trip_id: tripId,
      name: newTraveler.name,
      email: newTraveler.email,
      phone: newTraveler.phone,
      date_of_birth: newTraveler.dateOfBirth,
      emergency_contact_name: newTraveler.emergencyContactName,
      emergency_contact_phone: newTraveler.emergencyContactPhone,
      emergency_contact_relationship: newTraveler.emergencyContactRelationship,
      departure_city: newTraveler.departureCity,
      departure_country: newTraveler.departureCountry,
      travel_class: newTraveler.travelClass,
      dietary_requirements: newTraveler.dietaryRequirements,
      budget_allocation: newTraveler.budgetAllocation ? parseInt(newTraveler.budgetAllocation) * 100 : null,
      notes: newTraveler.notes
    };

    console.log('Adding traveler with data:', travelerData); // Debug log
    addTravelerMutation.mutate(travelerData);
  };

  const formatBudget = (cents?: number) => {
    if (!cents) return 'Not set';
    return `$${(cents / 100).toLocaleString()}`;
  };

  const getDepartureInfo = (traveler: TripTraveler) => {
    if (!traveler.departureCity && !traveler.departureCountry) return 'Not specified';
    return `${traveler.departureCity || 'Unknown city'}, ${traveler.departureCountry || 'Unknown country'}`;
  };

  const canManageTeam = userRole === 'admin' || userRole === 'editor';

  const handleCoordinatedGroupBooking = async () => {
    if (!travelers || travelers.length === 0) {
      toast({
        title: "No team members",
        description: "Please add team members before booking.",
        variant: "destructive",
      });
      return;
    }

    if (!tripData) {
      toast({
        title: "Trip data not available",
        description: "Please wait for trip details to load.",
        variant: "destructive",
      });
      return;
    }

    // Validate required trip data fields
    const city = tripData.city || tripData.location || 'Unknown';
    const country = tripData.country || 'Unknown';
    
    if (!city || city === 'Unknown') {
      toast({
        title: "Trip destination missing",
        description: "Please set the trip destination before starting sequential booking.",
        variant: "destructive",
      });
      return;
    }

    // Debug: Log complete trip data to identify date field names
    console.log('DEBUG: Complete tripData object:', tripData);
    console.log('DEBUG: Available date fields:', {
      startDate: tripData?.startDate,
      endDate: tripData?.endDate
    });

    // Create sequential booking workflow data using existing tripData
    const formatDateForBooking = (date: any): string => {
      if (!date) return '';
      if (typeof date === 'string' && date.length > 0) return date;
      if (date instanceof Date) return date.toISOString().split('T')[0];
      if (typeof date === 'object' && date.getTime) return date.toISOString().split('T')[0];
      // Handle empty objects from case conversion
      if (typeof date === 'object' && Object.keys(date).length === 0) return '';
      return '';
    };

    const sequentialBookingData = {
      tripId: tripId.toString(),
      tripDestination: `${city}, ${country}`,
      departureDate: formatDateForBooking(tripData?.startDate),
      returnDate: formatDateForBooking(tripData?.endDate),
      currentTravelerIndex: 0,
      travelers: travelers.map(traveler => ({
        id: traveler.id,
        name: traveler.name || '',
        email: traveler.email || '',
        phone: traveler.phone || '',
        dateOfBirth: traveler.dateOfBirth || '',
        departureCity: traveler.departureCity || '',
        departureCountry: traveler.departureCountry || '',
        travelClass: traveler.travelClass || 'economy',
        dietaryRequirements: traveler.dietaryRequirements || '',
        emergencyContact: {
          name: traveler.emergencyContactName || '',
          phone: traveler.emergencyContactPhone || '',
          relationship: traveler.emergencyContactRelationship || ''
        }
      })),
      roomsNeeded: travelers.length,
      bookingStatus: 'flights' // flights -> hotels -> complete
    };
    
    // Debug log the data being stored
    console.log('Sequential booking data being stored:', sequentialBookingData);
    
    // Store booking data for sequential processing
    sessionStorage.setItem('sequentialBookingData', JSON.stringify(sequentialBookingData));
    
    // Navigate directly to sequential booking (bypass general bookings tab)
    window.location.href = `/sequential-booking?trip=${tripId}`;
    
    toast({
      title: "Sequential booking started",
      description: `Starting with ${travelers[0].name || 'first traveler'}'s flight from ${travelers[0].departureCity || 'departure city'} to ${city}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({travelers.length})
          </CardTitle>
          {canManageTeam && (
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Traveler
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={newTraveler.name}
                      onChange={(e) => setNewTraveler({ ...newTraveler, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newTraveler.email}
                        onChange={(e) => setNewTraveler({ ...newTraveler, email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={newTraveler.phone}
                        onChange={(e) => setNewTraveler({ ...newTraveler, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={newTraveler.dateOfBirth}
                      onChange={(e) => setNewTraveler({ ...newTraveler, dateOfBirth: e.target.value })}
                      required
                    />
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Multi-Origin Travel Setup</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Each team member can depart from different cities (LA, NYC, etc.) and coordinate at the destination.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="departureCity" className="text-blue-900 dark:text-blue-100">
                          Departure City *
                        </Label>
                        <Input
                          id="departureCity"
                          value={newTraveler.departureCity}
                          onChange={(e) => setNewTraveler({ ...newTraveler, departureCity: e.target.value })}
                          placeholder="e.g. Los Angeles, New York"
                          className="border-blue-200 dark:border-blue-700"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="departureCountry" className="text-blue-900 dark:text-blue-100">
                          Country
                        </Label>
                        <Input
                          id="departureCountry"
                          value={newTraveler.departureCountry}
                          onChange={(e) => setNewTraveler({ ...newTraveler, departureCountry: e.target.value })}
                          placeholder="e.g. United States"
                          className="border-blue-200 dark:border-blue-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="travelClass">Travel Class</Label>
                      <Select value={newTraveler.travelClass} onValueChange={(value) => setNewTraveler({ ...newTraveler, travelClass: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="economy">Economy</SelectItem>
                          <SelectItem value="premium">Premium Economy</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="first">First Class</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="budgetAllocation">Budget ($)</Label>
                      <Input
                        id="budgetAllocation"
                        type="number"
                        value={newTraveler.budgetAllocation}
                        onChange={(e) => setNewTraveler({ ...newTraveler, budgetAllocation: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dietaryRequirements">Dietary Requirements</Label>
                    <Input
                      id="dietaryRequirements"
                      value={newTraveler.dietaryRequirements}
                      onChange={(e) => setNewTraveler({ ...newTraveler, dietaryRequirements: e.target.value })}
                      placeholder="e.g. Vegetarian, No nuts"
                    />
                  </div>

                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">Emergency Contact</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="emergencyContactName">Name *</Label>
                        <Input
                          id="emergencyContactName"
                          value={newTraveler.emergencyContactName}
                          onChange={(e) => setNewTraveler({ ...newTraveler, emergencyContactName: e.target.value })}
                          placeholder="Contact name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyContactPhone">Phone *</Label>
                        <Input
                          id="emergencyContactPhone"
                          type="tel"
                          value={newTraveler.emergencyContactPhone}
                          onChange={(e) => setNewTraveler({ ...newTraveler, emergencyContactPhone: e.target.value })}
                          placeholder="(555) 123-4567"
                          required
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <Label htmlFor="emergencyContactRelationship">Relationship *</Label>
                      <Input
                        id="emergencyContactRelationship"
                        value={newTraveler.emergencyContactRelationship}
                        onChange={(e) => setNewTraveler({ ...newTraveler, emergencyContactRelationship: e.target.value })}
                        placeholder="e.g. Spouse, Parent, Sibling"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Special Notes</Label>
                    <Textarea
                      id="notes"
                      value={newTraveler.notes}
                      onChange={(e) => setNewTraveler({ ...newTraveler, notes: e.target.value })}
                      placeholder="Any special requirements or notes"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleAddTraveler} 
                      disabled={addTravelerMutation.isPending}
                      className="flex-1"
                    >
                      {addTravelerMutation.isPending ? 'Adding...' : 'Add Team Member'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddModalOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading team members...</div>
        ) : travelers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No team members added yet</p>
            <p className="text-sm">Add travelers to coordinate multi-person trips</p>
          </div>
        ) : (
          <div className="space-y-4">
            {travelers.map((traveler: TripTraveler) => (
              <div key={traveler.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{traveler.name}</h4>
                      {traveler.isTripOrganizer && (
                        <Badge variant="default" className="text-xs">Organizer</Badge>
                      )}
                      <Badge 
                        variant={TRAVEL_CLASSES[traveler.travelClass as keyof typeof TRAVEL_CLASSES]?.color as any || 'secondary'} 
                        className="text-xs"
                      >
                        {TRAVEL_CLASSES[traveler.travelClass as keyof typeof TRAVEL_CLASSES]?.label || traveler.travelClass}
                      </Badge>
                    </div>
                    {traveler.email && (
                      <p className="text-sm text-muted-foreground">{traveler.email}</p>
                    )}
                  </div>
                  {canManageTeam && !traveler.isTripOrganizer && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTravelerMutation.mutate(traveler.id)}
                      disabled={removeTravelerMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{getDepartureInfo(traveler)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>{formatBudget(traveler.budgetAllocation)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {traveler.status}
                    </Badge>
                  </div>
                </div>

                {/* Flight Status */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-muted-foreground">Flight Status</h5>
                    <Badge variant="outline" className="text-xs">
                      {traveler.status === 'confirmed' ? 'Ready for booking' : traveler.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Departure: {getDepartureInfo(traveler)} → {tripData ? `${tripData.city}, ${tripData.country}` : 'Trip destination'}
                  </p>
                </div>

                {(traveler.dietaryRequirements || traveler.notes) && (
                  <div className="pt-2 border-t space-y-1">
                    {traveler.dietaryRequirements && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Dietary:</strong> {traveler.dietaryRequirements}
                      </p>
                    )}
                    {traveler.notes && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Notes:</strong> {traveler.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Coordinated Booking Section */}
        {travelers.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium">Coordinated Booking</h4>
                <p className="text-sm text-muted-foreground">
                  Book flights and hotels for all {travelers.length} team member{travelers.length !== 1 ? 's' : ''} at once
                </p>
              </div>
              <Button
                onClick={handleCoordinatedGroupBooking}
                disabled={travelers.length === 0}
                className="flex items-center gap-2"
              >
                <Plane className="h-4 w-4" />
                Book All Flights & Hotels
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium mb-2">Departure Cities</h5>
                <ul className="space-y-1">
                  {travelers.map((traveler) => (
                    <li key={traveler.id} className="flex items-center justify-between">
                      <span>{traveler.name}</span>
                      <span className="text-muted-foreground">{getDepartureInfo(traveler)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="font-medium mb-2">Accommodation</h5>
                <p className="text-muted-foreground">
                  {travelers.length} room{travelers.length !== 1 ? 's' : ''} needed at destination
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}