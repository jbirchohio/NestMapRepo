import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { 
  Building2, 
  Users, 
  Calendar, 
  TrendingUp, 
  MapPin, 
  DollarSign,
  Plane,
  Clock,
  Plus,
  BarChart3,
  Settings,
  Sparkles
} from "lucide-react";
import MainNavigation from "@/components/MainNavigation";
import NewTripModal from "@/components/NewTripModal";

interface Trip {
  id: number;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: string;
  budget?: number;
  traveler_count?: number;
}

export default function CorporateDashboard() {
  const { userId, user } = useAuth();
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);

  const { data: trips = [], isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ['/api/trips', { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/trips?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch trips");
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/corporate', { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/corporate?userId=${userId}`);
      if (!res.ok) return { totalTrips: 0, totalBudget: 0, avgDuration: 0, teamSize: 0 };
      return res.json();
    },
    enabled: !!userId,
  });

  const recentTrips = trips.slice(0, 3);
  const upcomingTrips = trips.filter(trip => new Date(trip.start_date) > new Date()).slice(0, 3);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Company Travel Management Console
          </h1>
          <p className="text-muted-foreground">
            Streamline your organization's travel planning and expense management
          </p>
        </div>

        {/* Primary Action */}
        <div className="mb-8">
          <Button 
            onClick={() => setIsNewTripModalOpen(true)}
            className="h-16 px-8 flex items-center justify-center gap-3 bg-blue-600 text-white hover:bg-blue-700 border-0"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Plan Team Trip
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Company Trips</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalTrips || 0}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last quarter
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Travel Budget Used</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics?.totalBudget?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                73% of annual budget
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.teamSize || 0}</div>
              <p className="text-xs text-muted-foreground">
                Across all departments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Trip Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.avgDuration || 0} days</div>
              <p className="text-xs text-muted-foreground">
                Optimal for business travel
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trip Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Trips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Company Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tripsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : recentTrips.length > 0 ? (
                <div className="space-y-4">
                  {recentTrips.map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{trip.title}</p>
                          <p className="text-sm text-muted-foreground">{trip.destination}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={trip.status === 'completed' ? 'default' : 'secondary'}>
                          {trip.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(() => {
                            const date = trip.start_date || trip.startDate;
                            if (!date) return 'No date set';
                            const parsed = new Date(date);
                            return isNaN(parsed.getTime()) ? 'Invalid date' : parsed.toLocaleDateString();
                          })()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No company trips yet</h3>
                  <p className="text-muted-foreground mb-4">Start planning your team's first business trip</p>
                  <Button onClick={() => setIsNewTripModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Plan First Trip
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Trips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Upcoming Business Travel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTrips.length > 0 ? (
                <div className="space-y-4">
                  {upcomingTrips.map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{trip.title}</p>
                          <p className="text-sm text-muted-foreground">{trip.destination}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(trip.start_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {trip.traveler_count} travelers
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No upcoming trips</h3>
                  <p className="text-muted-foreground">Plan ahead for better rates and availability</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <NewTripModal 
        isOpen={isNewTripModalOpen} 
        onClose={() => setIsNewTripModalOpen(false)} 
        onSuccess={() => setIsNewTripModalOpen(false)}
        userId={userId!}
      />
    </div>
  );
}