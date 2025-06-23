import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { tripService } from '@/services/tripService';
import { useCallback, useState, FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Define the ClientAccess interface with all required fields
interface ClientAccess {
    tracking_code: string;
    share_url: string;
    last_accessed?: string;
    access_count?: number;
    is_active?: boolean;
    notifications_enabled?: boolean;
    permissions?: string[];
    created_at?: string;
    updated_at: string;
    role?: string;
    client_email?: string;
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
interface Flight {
    id: string;
    origin: Airport;
    destination: Airport;
    departing_at: string;
    arriving_at: string;
    departure_time?: string;
    arrival_time?: string;
    airline: Airline;
    flight_number: string;
    segments: Segment[];
    offer?: Offer;
    booking_reference?: string;
    status?: 'scheduled' | 'active' | 'landed' | 'cancelled' | 'incident' | 'diverted' | 'redirected' | string;
    duration: string;
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
}
interface TripActivity {
    id: string;
    type: 'meeting' | 'sightseeing' | 'dining' | 'transport' | 'other';
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    location: string;
    address?: string;
    cost?: number;
    currency?: string;
    notes?: string;
    booking_reference?: string;
    status?: 'confirmed' | 'pending' | 'cancelled';
    category?: string;
}
interface Accommodation {
    id: string;
    name: string;
    check_in: string;
    check_out: string;
    location: string;
    address: string;
    room_type: string;
    cost_per_night: number;
    currency: string;
    booking_reference?: string;
    amenities?: string[];
    status?: 'confirmed' | 'pending' | 'cancelled';
    stars?: number;
    pricePerNight?: number;
}
interface Meal {
    id: string;
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
    name: string;
    description: string;
    time: string;
    location: string;
    address?: string;
    cost?: number;
    currency?: string;
    notes?: string;
    booking_reference?: string;
    status?: 'confirmed' | 'pending' | 'cancelled';
    restaurant?: string;
    cuisine?: string;
    estimatedCost: number; // Changed from optional to required as it's used in calculations
}
interface TripSummary {
    total_cost: number;
    currency: string;
    flights_cost: number;
    accommodation_cost: number;
    activities_cost: number;
    meals_cost: number;
    other_expenses: number;
    savings?: number;
    currency_conversion_rates?: Record<string, number>;
    budget_status: 'under_budget' | 'on_budget' | 'over_budget';
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
interface GeneratedTrip {
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
    tripSummary: TripSummary; // Changed from trip_summary to tripSummary for consistency with camelCase
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
    // Create client itinerary mutation
    const createClientItinerary = useCallback(async (data: {
        tripId: string;
        clientName: string;
        clientEmail: string;
    }) => {
        try {
            if (!trip)
                return; // Ensure trip exists
            setIsCreating(true);
            const response = await tripService.createClientItinerary({
                tripData: trip, // Pass the full trip data
                clientEmail: data.clientEmail
            });
            // Handle the response based on the expected structure
            const responseData = response as {
                trackingCode: string;
                shareUrl?: string;
            };
            setTrackingCode(responseData.trackingCode);
            if (responseData.shareUrl) {
                setShareUrl(responseData.shareUrl);
            }
            setShowClientForm(false);
            showToast('Success', 'Client itinerary created successfully');
            return responseData;
        }
        catch (error) {
            console.error('Error creating client itinerary:', error);
            showToast('Error', 'Failed to create client itinerary', 'destructive');
            throw error;
        }
        finally {
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
        }
        catch (error) {
            console.error('Error sharing itinerary:', error);
            showToast('Error', 'Failed to generate shareable link', 'destructive');
            throw error;
        }
        finally {
            setIsSharing(false);
        }
    }, [showToast]); // Remove tripService from dependency array as it's not a state or prop
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
        }
        catch (error) {
            // Error is already handled in createClientItinerary
        }
    }, [trip?.id, clientName, clientEmail, createClientItinerary, showToast]);
    const handleShareItinerary = useCallback(async () => {
        const codeToShare = trackingCode || trip?.client_access?.tracking_code;
        if (codeToShare) {
            try {
                await shareItineraryMutation(codeToShare);
            }
            catch (error) {
                // Error is already handled in shareItineraryMutation
            }
        }
        else {
            showToast('Sharing Error', 'No tracking code available to share', 'destructive');
        }
    }, [trackingCode, trip?.client_access?.tracking_code, shareItineraryMutation, showToast]);
    // --- Trip status update mutation ---
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const handleStatusUpdate = async () => {
        if (!trip)
            return;
        try {
            setIsUpdatingStatus(true);
            // TODO: integrate real API call once backend ready
            updateTripStatus(newStatus);
            showToast('Success', 'Trip status updated');
        }
        catch (error) {
            console.error('Error updating trip status:', error);
            showToast('Error', 'Failed to update trip status', 'destructive');
        }
        finally {
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
        }
        else {
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
        return (<div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No trip data available</p>
      </div>);
    }
    return (<div className="space-y-4">
      <Button variant="outline" onClick={handleBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2"/> Back to Trip
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Share Itinerary</CardTitle>
          <CardDescription>
            Share this itinerary with clients or team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showClientForm ? (<form onSubmit={handleSubmitClientForm} className="space-y-4">
              <input type="hidden" name="tripId" value={trip.id}/>
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name</Label>
                <Input id="client-name" type="text" placeholder="Enter client's name" value={clientName} onChange={(e) => setClientName(e.target.value)} required/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email">Client Email</Label>
                <Input id="client-email" type="email" placeholder="Enter client's email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required/>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={isCreating} className="w-full">
                  {isCreating ? 'Creating...' : 'Create Itinerary'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowClientForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>) : (<div className="space-y-4">
              <Button onClick={handleShareItinerary} disabled={isSharing} className="w-full">
                {isSharing ? 'Sharing...' : 'Share Itinerary'}
              </Button>

              {trip?.client_access && (<div className="space-y-4">
                  {/* Status update */}
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="status-select">Status</Label>
                    <select id="status-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="border rounded px-2 py-1">
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
                      {shareUrl && (<Button size="sm" onClick={handleCopyLink}>
                          Copy Share Link
                        </Button>)}
                    </div>
                  </div>
                </div>)}
            </div>)}
        </CardContent>
      </Card>
    </div>);
};
export default AITripGenerator;
