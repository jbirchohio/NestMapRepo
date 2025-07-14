import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { ArrowLeft } from 'lucide-react';
import { tripService } from '@/services/tripService';
import { useCallback, useState, FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Import the ClientAccess type from shared types
type ClientAccessType = import('@/lib/types').ClientAccess;

// Extend the shared ClientAccess type with additional properties
interface ClientAccess extends Omit<ClientAccessType, 'access_level'> {
  // Required fields from shared type
  email: string;  // Make email required to match shared type
  access_level: 'view' | 'edit';  // Make access_level required with specific values
  
  // Additional fields for local use
  tracking_code?: string;
  share_url?: string;
  last_accessed?: string;
  access_count?: number;
  is_active?: boolean;
  notifications_enabled?: boolean;
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
  role?: string;
  client_email?: string; // Alias for backward compatibility
  phone?: string; // Optional phone number
}

// Define shared types aligned with Duffel API
interface Airline {
  name: string;
  iata_code: string;
  logo_lockup_url?: string;
  logo_symbol_url?: string;
}

interface Airport {
  iata_code: string;
  name: string;
  city?: string;
  country?: string;
  city_code?: string;
  country_code?: string;
  time_zone?: string;
  latitude?: number;
  longitude?: number;
}

interface Segment {
  id: string;
  origin: Airport;
  destination: Airport;
  departing_at: string;
  arriving_at: string;
  departure_time?: string;
  arrival_time?: string;
  airline: Airline;
  flight_number: string;
  operating_flight_number?: string;
  aircraft: {
    name: string;
    id: string;
    iata_code: string;
  } | string;
  operating_carrier: Airline | string;
  marketing_carrier?: Airline;
  cabin_class: string;
  available_services?: {
    baggages: Array<{
      type: 'carry_on' | 'checked';
      quantity: number;
    }>;
  };
  duration: string;
}

interface Offer {
  id: string;
  total_amount: string;
  total_currency: string;
  total_emissions_kg: string;
  owner?: {
    iata_code: string;
    name: string;
  };
  expires_at: string;
  passenger_identity_documents_required?: boolean;
  conditions?: {
    change_before_departure?: {
      penalty_amount?: string;
      penalty_currency?: string;
      allowed: boolean;
    };
    refund_before_departure?: {
      penalty_amount?: string;
      penalty_currency?: string;
      allowed: boolean;
    };
  };
  change_before_departure?: {
    allowed: boolean;
    penalty_amount?: string;
    penalty_currency?: string;
  };
  refund_before_departure?: {
    allowed: boolean;
    penalty_amount?: string;
    penalty_currency?: string;
  };
  total_tax_amount?: string;
  tax_currency?: string;
  base_amount?: string;
  base_currency?: string;
}

// Internal Flight interface for Duffel API data
interface Flight {
  id: string;
  // Required by types.ts
  departure: string;
  arrival: string;
  departure_time: string;
  arrival_time: string;
  airline: string;
  flight_number: string;
  price: number;
  
  // Additional properties from Duffel API
  origin?: Airport;
  destination?: Airport;
  departing_at?: string;
  arriving_at?: string;
  segments?: Segment[];
  offer?: Offer;
  booking_reference?: string;
  status?: 'scheduled' | 'active' | 'landed' | 'cancelled' | 'incident' | 'diverted' | 'redirected' | string;
  duration?: string;
  aircraft?: {
    name: string;
    id: string;
    iata_code: string;
  } | string;
  operating_carrier?: Airline | string;
  marketing_carrier?: Airline;
  cabin_class?: string;
  available_services?: {
    baggages: Array<{
      type: 'carry_on' | 'checked';
      quantity: number;
    }>;
  };
  operating_flight_number?: string;
  
  // Alias for origin/destination to match types.ts
  departure_airport?: string;
  arrival_airport?: string;
}

interface TripActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  duration: number;
  location: string;
  price: number;
  category: string;
  // Optional properties
  address?: string;
  notes?: string;
  booking_reference?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
  type?: 'meeting' | 'sightseeing' | 'dining' | 'transport' | 'other';
  cost?: number;
  currency?: string;
  start_time?: string;
  end_time?: string;
}

// Import the types we need from the shared types file
import { Accommodation, Meal, GeneratedTrip as ImportedGeneratedTrip } from '@/lib/types';

interface TripSummary extends Omit<import('@/lib/types').TripSummary, 'total_cost'> {
  // Required by shared type
  total_cost: number;
  
  // Additional properties for local use
  currency?: string;
  flights_cost?: number;
  accommodation_cost?: number;
  activities_cost?: number;
  meals_cost?: number;
  other_expenses?: number;
  savings?: number;
  currency_conversion_rates?: Record<string, number>;
  budget_status?: 'under_budget' | 'on_budget' | 'over_budget';
  recommendations?: string[];
  conflicts?: string[];
  warnings?: string[];
  notes?: string;
}

interface TripDay {
  date: string;
  activities: TripActivity[];
  meals: Meal[];
  accommodation?: Accommodation;
  notes?: string;
}

// This interface now extends the imported type to ensure compatibility
interface GeneratedTrip extends Omit<ImportedGeneratedTrip, 'accommodations' | 'meals' | 'flights'> {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  travelers: number;
  summary: string;
  days: TripDay[];
  flights: Flight[];
  accommodations: Accommodation[];
  activities: TripActivity[];
  meals: Meal[];
  tripSummary: TripSummary;  // Changed from trip_summary to tripSummary for consistency with camelCase
  trip_summary?: TripSummary; // Keep for backward compatibility
  client_access?: ClientAccess;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'confirmed' | 'cancelled' | 'completed' | string;
  tags?: string[];
  created_by: string;
  updated_by: string;
  recommendations?: string[];
  conflicts?: string[];
  notes?: string;
  city: string;
  country: string;
}

// Client component for creating and sharing itineraries
interface AITripGeneratorProps {
  // Add any props if needed
}



const AITripGenerator: FC<AITripGeneratorProps> = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState('');
  // Trip state with proper typing and update handlers
  const [trip, setTrip] = useState<GeneratedTrip | null>(null);
  
  // Update trip status (e.g., when booking is confirmed)
  const updateTripStatus = useCallback((status: string) => {
    if (trip) {
      setTrip({
        ...trip,
        status,
        updated_at: new Date().toISOString()
      });
    }
  }, [trip]);
  
  // Track loading states for mutations
  const [isCreating, setIsCreating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('planned');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [showClientForm, setShowClientForm] = useState(true);

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Initialize tracking code and share URL from trip if available
  useEffect(() => {
    const trackingCode = trip?.client_access?.tracking_code;
    if (trackingCode) {
      setTrackingCode(trackingCode);
      setShareUrl(trip?.client_access?.share_url || '');
    }
  }, [trip?.client_access]);

  // Toast wrapper for consistent usage
  const showToast = useCallback((title: string, message?: string, variant: 'default' | 'destructive' = 'default') => {
    const toastConfig = {
      title,
      variant,
      ...(message && { description: message })
    };
    toast(toastConfig);
  }, [toast]);
  
  // Initialize tracking code if it exists in trip
  useEffect(() => {
    const tripTrackingCode = trip?.client_access?.tracking_code;
    if (tripTrackingCode && !trackingCode) {
      setTrackingCode(tripTrackingCode);
    }
  }, [trip?.client_access, trackingCode]);

  // Map flight data from Duffel API format to the expected Flight type
  const mapFlightToExpectedFormat = (flight: Flight): Flight => {
    // If the flight already has the expected format, return it as is
    if (flight.departure && flight.arrival) {
      return flight;
    }

    // Safely get the airline name
    let airlineName = '';
    if (typeof flight.airline === 'string') {
      airlineName = flight.airline;
    } else if (flight.airline && typeof flight.airline === 'object') {
      // Handle case where airline is an object with a name property
      airlineName = (flight.airline as { name?: string }).name || '';
    }

    // Map from Duffel API format to expected format
    return {
      ...flight,
      departure: flight.origin?.iata_code || flight.departure_airport || '',
      arrival: flight.destination?.iata_code || flight.arrival_airport || '',
      departure_time: flight.departing_at || flight.departure_time || '',
      arrival_time: flight.arriving_at || flight.arrival_time || '',
      price: flight.offer ? parseFloat(flight.offer.total_amount) || 0 : 0,
      airline: airlineName,
      // Ensure we have all required Flight properties
      flight_number: flight.flight_number || flight.operating_flight_number || '',
      id: flight.id || `flight-${Date.now()}`
    } as Flight;
  };

  // Create client itinerary mutation
  const createClientItinerary = useCallback(async (data: { tripId: string; clientName: string; clientEmail: string }) => {
    try {
      if (!trip) return; // Ensure trip exists
      
      setIsCreating(true);
      
      // Create a properly typed trip object with mapped data
      // Map client access if it exists, ensuring all required fields are included
      const clientAccess = trip.client_access ? {
        // Required fields
        email: trip.client_access.client_email || trip.client_access.email || 'client@example.com',
        access_level: (trip.client_access.access_level as 'view' | 'edit') || 'view',
        
        // Optional fields
        ...(trip.client_access.phone && { phone: trip.client_access.phone }),
        ...(trip.client_access.tracking_code && { tracking_code: trip.client_access.tracking_code }),
        ...(trip.client_access.share_url && { share_url: trip.client_access.share_url }),
        ...(trip.client_access.last_accessed && { last_accessed: trip.client_access.last_accessed }),
        ...(trip.client_access.access_count !== undefined && { access_count: trip.client_access.access_count }),
        ...(trip.client_access.is_active !== undefined && { is_active: trip.client_access.is_active }),
        ...(trip.client_access.notifications_enabled !== undefined && { 
          notifications_enabled: trip.client_access.notifications_enabled 
        }),
        ...(trip.client_access.permissions && { permissions: trip.client_access.permissions }),
        ...(trip.client_access.created_at && { created_at: trip.client_access.created_at }),
        ...(trip.client_access.updated_at && { updated_at: trip.client_access.updated_at }),
        ...(trip.client_access.role && { role: trip.client_access.role })
      } : undefined;

      const mappedTrip: GeneratedTrip = {
        ...trip,
        // Ensure required properties are present
        id: trip.id || '',
        title: trip.title || 'Generated Trip',
        destination: trip.destination || '',
        start_date: trip.start_date || new Date().toISOString(),
        end_date: trip.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        budget: trip.budget || 0,
        travelers: trip.travelers || 1,
        summary: trip.summary || '',
        days: trip.days || [],
        
        // Map flights with proper typing
        flights: (trip.flights || []).map(flight => mapFlightToExpectedFormat(flight as Flight)),
        
        // Map accommodations with proper typing
        accommodations: (trip.accommodations || []).map(acc => ({
          id: acc.id,
          name: acc.name,
          address: acc.address,
          check_in: acc.check_in,
          check_out: acc.check_out,
          price_per_night: acc.price_per_night,
          rating: acc.rating
        })),

        
        // Map meals with proper typing
        meals: (trip.meals || []).map(meal => ({
          id: meal.id,
          name: meal.name,
          restaurant: meal.restaurant,
          time: meal.time,
          price: meal.price,
          cuisine: meal.cuisine
        })),

        
        // Map trip summary with all required fields
        tripSummary: {
          total_cost: trip.tripSummary?.total_cost || 0,
          duration_days: trip.tripSummary?.duration_days || 
            Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) || 1,
          activities_count: trip.activities?.length || 0,
          meals_count: trip.meals?.length || 0,
          flights_count: trip.flights?.length || 0,
          accommodations_count: trip.accommodations?.length || 0,
          // Include additional summary properties if they exist
          ...(trip.tripSummary?.currency && { currency: trip.tripSummary.currency }),
          ...(trip.tripSummary?.flights_cost !== undefined && { flights_cost: trip.tripSummary.flights_cost }),
          ...(trip.tripSummary?.accommodation_cost !== undefined && { accommodation_cost: trip.tripSummary.accommodation_cost }),
          ...(trip.tripSummary?.activities_cost !== undefined && { activities_cost: trip.tripSummary.activities_cost }),
          ...(trip.tripSummary?.meals_cost !== undefined && { meals_cost: trip.tripSummary.meals_cost }),
          ...(trip.tripSummary?.other_expenses !== undefined && { other_expenses: trip.tripSummary.other_expenses }),
          ...(trip.tripSummary?.savings !== undefined && { savings: trip.tripSummary.savings }),
          ...(trip.tripSummary?.currency_conversion_rates && { 
            currency_conversion_rates: trip.tripSummary.currency_conversion_rates 
          }),
          ...(trip.tripSummary?.budget_status && { budget_status: trip.tripSummary.budget_status }),
          ...(trip.tripSummary?.recommendations && { recommendations: trip.tripSummary.recommendations }),
          ...(trip.tripSummary?.conflicts && { conflicts: trip.tripSummary.conflicts }),
          ...(trip.tripSummary?.warnings && { warnings: trip.tripSummary.warnings }),
          ...(trip.tripSummary?.notes && { notes: trip.tripSummary.notes })
        },
        
        // Map client access if it exists
        ...(clientAccess && { client_access: clientAccess }),
        
        // Ensure other required properties
        created_at: trip.created_at || new Date().toISOString(),
        updated_at: trip.updated_at || new Date().toISOString(),
        status: trip.status || 'draft',
        created_by: trip.created_by || '',
        updated_by: trip.updated_by || trip.created_by || '',
        city: trip.city || '',
        country: trip.country || ''
      };
      
      const response = await tripService.createClientItinerary({
        tripData: mappedTrip, // Pass the mapped trip data
        clientEmail: data.clientEmail
      });
      
      // Handle the response based on the expected structure
      const responseData = response as { trackingCode: string; shareUrl?: string };
      setTrackingCode(responseData.trackingCode);
      if (responseData.shareUrl) {
        setShareUrl(responseData.shareUrl);
      }
      setShowClientForm(false);
      showToast('Success', 'Client itinerary created successfully');
      return responseData;
    } catch (error) {
      console.error('Error creating client itinerary:', error);
      showToast('Error', 'Failed to create client itinerary', 'destructive');
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [showToast]);

  // Share itinerary mutation
  const shareItineraryMutation = useCallback(async (code: string) => {
    try {
      setIsSharing(true);
      const { share_url: shareUrl } = await tripService.shareTripWithClient(code);
      setShareUrl(shareUrl);
      navigator.clipboard.writeText(shareUrl);
      showToast('Success', 'Shareable link copied to clipboard!');
      return shareUrl;
    } catch (error) {
      console.error('Error sharing itinerary:', error);
      showToast('Error', 'Failed to generate shareable link', 'destructive');
      throw error;
    } finally {
      setIsSharing(false);
    }
  }, [showToast]);  // Remove tripService from dependency array as it's not a state or prop

  const handleCreateItinerary = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip?.id) {
      showToast('Error', 'No trip selected', 'destructive');
      return;
    }
    if (!clientName.trim() || !clientEmail.trim()) {
      showToast('Error', 'Please fill in all required fields', 'destructive');
      return;
    }

    try {
      await createClientItinerary({
        tripId: trip.id,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim()
      });
    } catch (error) {
      // Error is already handled in createClientItinerary
    }
  }, [trip?.id, clientName, clientEmail, createClientItinerary, showToast]);

  const handleShareItinerary = useCallback(async () => {
    const codeToShare = trackingCode || trip?.client_access?.tracking_code;
    if (codeToShare) {
      try {
        await shareItineraryMutation(codeToShare);
      } catch (error) {
        // Error is already handled in shareItineraryMutation
      }
    } else {
      showToast('Sharing Error', 'No tracking code available to share', 'destructive');
    }
  }, [trackingCode, trip?.client_access?.tracking_code, shareItineraryMutation, showToast]);

  // --- Trip status update mutation ---
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const handleStatusUpdate = async () => {
    if (!trip) return;
    try {
      setIsUpdatingStatus(true);
      // TODO: integrate real API call once backend ready
      updateTripStatus(newStatus);
      showToast('Success', 'Trip status updated');
    } catch (error) {
      console.error('Error updating trip status:', error);
      showToast('Error', 'Failed to update trip status', 'destructive');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle form submission
  const handleSubmitClientForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateItinerary(e);
  };

  // Handle copying the share link
  const handleCopyLink = useCallback(() => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      showToast('Success', 'Link copied to clipboard!');
    } else {
      showToast('Error', 'No shareable link available', 'destructive');
    }
  }, [shareUrl, showToast]);

  // Update tracking code when it changes
  useEffect(() => {
    if (trip?.client_access?.tracking_code && !trackingCode) {
      setTrackingCode(trip.client_access.tracking_code);
    }
  }, [trip?.client_access?.tracking_code, trackingCode]);

  // Only render the component if we have a valid trip
  if (!trip) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No trip data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={handleBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Trip
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Share Itinerary</CardTitle>
          <CardDescription>
            Share this itinerary with clients or team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showClientForm ? (
            <form onSubmit={handleSubmitClientForm} className="space-y-4">
              <input type="hidden" name="tripId" value={trip.id} />
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name</Label>
                <Input
                  id="client-name"
                  type="text"
                  placeholder="Enter client's name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email">Client Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  placeholder="Enter client's email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={isCreating} className="w-full">
                  {isCreating ? 'Creating...' : 'Create Itinerary'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowClientForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Button onClick={handleShareItinerary} disabled={isSharing} className="w-full">
                {isSharing ? 'Sharing...' : 'Share Itinerary'}
              </Button>

              {trip?.client_access && (
                <div className="space-y-4">
                  {/* Status update */}
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="status-select">Status</Label>
                    <select
                      id="status-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="planned">Planned</option>
                      <option value="booked">Booked</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <Button onClick={handleStatusUpdate} disabled={isUpdatingStatus}>
                      {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                    </Button>
                  </div>

                  <div className="p-4 bg-muted rounded-md space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Shared with: {trip.client_access?.client_email ?? 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tracking Code: {trip.client_access?.tracking_code ?? ''}
                    </p>
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => navigator.clipboard.writeText(trip.client_access?.tracking_code ?? '')}>
                        Copy Tracking Code
                      </Button>
                      {shareUrl && (
                        <Button size="sm" onClick={handleCopyLink}>
                          Copy Share Link
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AITripGenerator;
