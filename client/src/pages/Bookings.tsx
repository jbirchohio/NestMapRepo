import BookingWorkflow from "@/components/BookingWorkflow";
import { TripTeamManagement } from "@/components/TripTeamManagement";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Plane } from "lucide-react";

export default function Bookings() {
  const { user, userId } = useAuth();
  
  // Check user permissions for booking access
  const { data: userPermissions } = useQuery({
    queryKey: ['/api/user/permissions'],
    queryFn: async () => {
      const response = await fetch('/api/user/permissions', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();
      return data.permissions || [];
    },
    enabled: !!user,
  });

  // Get trips for team management context - always call this hook
  const { data: trips = [] } = useQuery({
    queryKey: ['/api/trips/corporate'],
    enabled: !!user,
  });

  const hasBookingAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('CREATE_TRIPS') || 
    userPermissions.includes('MANAGE_ORGANIZATION') ||
    userPermissions.includes('manage_organizations')
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access the booking system.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasBookingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access the booking system. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Corporate Travel Management</h1>
          <p className="text-muted-foreground">Coordinate team bookings and multi-person trips</p>
        </div>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Flight Bookings
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Coordination
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="bookings">
            <BookingWorkflow />
          </TabsContent>
          
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip-Based Team Management</CardTitle>
                <p className="text-muted-foreground">
                  Select a trip below to manage team members and coordinate multi-origin travel
                </p>
              </CardHeader>
              <CardContent>
                {trips.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No corporate trips found. Create a trip first to manage team bookings.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trips.map((trip: any) => (
                      <div key={trip.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">{trip.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {trip.city}, {trip.country} • {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={trip.tripType === 'business' ? 'default' : 'secondary'}>
                            {trip.tripType || 'personal'}
                          </Badge>
                        </div>
                        <TripTeamManagement tripId={trip.id} userRole="admin" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}