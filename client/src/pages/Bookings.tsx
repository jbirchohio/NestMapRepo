// Hooks
import { useAuth } from "@/contexts/auth/AuthContext";
import { useQuery } from "@tanstack/react-query";

// UI Components
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Icons
import { Shield, Users, Plane, Sparkles } from "lucide-react";

// Components
import BookingWorkflow from "@/components/BookingWorkflow";
import { TripTeamManagement } from "@/components/TripTeamManagement";

// Animation
import { motion } from "framer-motion";

// Types
interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  end_date?: string; // For backward compatibility
  // Add other trip properties as needed
}

interface ApiResponse<T> {
  data: T;
  // Add other common API response fields if needed
}

export default function Bookings() {
  const { user } = useAuth();
  
  // Check user permissions for booking access
  const { data: userPermissions } = useQuery<{ permissions: any }>({
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

  // Get trips for team management context
  const { data: tripsResponse } = useQuery<ApiResponse<Trip[]>>({
    queryKey: ['/api/trips/corporate'],
    queryFn: async () => {
      const response = await fetch('/api/trips/corporate', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch trips');
      return response.json();
    },
    enabled: !!user,
    placeholderData: { data: [] },
  });
  
  const trips = tripsResponse?.data || [];

  const hasBookingAccess = userPermissions?.permissions && (
    userPermissions.permissions.canCreateTrips || 
    userPermissions.permissions.canViewTrips ||
    userPermissions.permissions.canManageOrganization ||
    userPermissions.permissions.canAccessAdmin ||
    user?.role === 'admin'
  );
  
  // Filter to show only current and future trips
  const getCurrentAndUpcomingTrips = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return trips.filter((trip) => {
      const tripEndDate = new Date(trip.endDate || trip.end_date || '');
      return tripEndDate >= today;
    });
  };
  
  const currentAndUpcomingTrips = getCurrentAndUpcomingTrips();

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
    <div className="min-h-screen bg-soft-100 dark:bg-navy-900">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden bg-gradient-to-br from-electric-500 via-electric-600 to-electric-700 text-white"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative container mx-auto px-6 py-16">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                  <Plane className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-white/80" />
                  <span className="text-white/90 text-sm font-medium">Corporate Travel</span>
                </div>
              </div>

              <h1 className="text-5xl font-bold mb-4 tracking-tight text-white">
                Travel Bookings
              </h1>
              <p className="text-xl text-white/90 mb-6 max-w-2xl">
                Coordinate team bookings and multi-person trips with intelligent flight search and team management
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-white/80">Real-time availability</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span className="text-white/80">Group coordination</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-electric-400 rounded-full" />
                  <span className="text-white/80">Instant booking</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">

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
                {(() => {
                  if (currentAndUpcomingTrips.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No current or upcoming corporate trips found. Create a trip to manage team bookings.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {currentAndUpcomingTrips.map((trip: any) => (
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
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
