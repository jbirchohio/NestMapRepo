import { useState } from "react";
import { Link, useLocation } from "wouter";
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
import OnboardingProgress from "@/components/OnboardingProgress";

interface Trip {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  userId: number;
  city?: string;
  country?: string;
  budget?: string;
  completed?: boolean;
}

export default function CorporateDashboard() {
  const { userId, user } = useAuth();
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleOnboardingTaskClick = (taskId: string, url: string) => {
    setLocation(url);
  };

  const { data: trips = [], isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ['/api/trips/corporate'],
    enabled: !!user,
  });

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/corporate', { userId }],
    queryFn: async () => {
      const res = await fetch('/api/analytics', {
        credentials: 'include'
      });
      if (!res.ok) return { totalTrips: 0, totalBudget: 0, avgDuration: 0, teamSize: 0 };
      const data = await res.json();
      return {
        totalTrips: data.overview?.totalTrips || 0,
        totalBudget: data.overview?.totalBudget || 0,
        avgDuration: data.overview?.averageTripLength || 0,
        teamSize: data.overview?.totalUsers || 0
      };
    },
    enabled: !!user,
  });

  const recentTrips = trips.slice(0, 3);
  const upcomingTrips = trips.filter(trip => new Date(trip.startDate) > new Date()).slice(0, 3);

  // Calculate metrics from actual trip data
  const totalTrips = trips.length;

  const totalBudget = trips.reduce((sum, trip) => {
    const budget = trip.budget ? (typeof trip.budget === 'string' ? parseFloat(trip.budget.replace(/[^0-9.-]+/g, '')) : trip.budget) : 0;
    return sum + (isNaN(budget) ? 0 : budget);
  }, 0);

  const avgTripDuration = trips.length > 0 ? Math.round(
    trips.reduce((sum, trip) => {
      const startDate = trip.startDate;
      const endDate = trip.endDate;
      if (!startDate || !endDate) return sum;

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return sum;

      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + duration;
    }, 0) / trips.length
  ) : 0;

  // Count unique travelers by user ID (since trips are per user)
  const uniqueTravelers = new Set(trips.map(trip => trip.userId)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header with electric violet gradient */}
        <div className="mb-8 p-8 rounded-2xl bg-gradient-to-r from-electric-500 to-electric-600 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="h-8 w-8" />
            <h1 className="text-3xl font-bold">
              Company Travel Management Console
            </h1>
          </div>
          <p className="text-electric-100 text-lg">
            Streamline your organization's travel planning and expense management
          </p>
          
          {/* Primary Action Button */}
          <div className="mt-6">
            <Button 
              onClick={() => setIsNewTripModalOpen(true)}
              className="bg-white hover:bg-white/90 text-electric-600 font-semibold px-8 py-3 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Plan Team Trip
            </Button>
          </div>
        </div>

        {/* Onboarding Progress - Only show for new users */}
        {trips.length === 0 && (
          <div className="mb-8">
            <OnboardingProgress 
              onTaskClick={handleOnboardingTaskClick}
            />
          </div>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20 hover:shadow-lg hover:shadow-electric-500/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy-700 dark:text-navy-300">Total Company Trips</CardTitle>
              <div className="h-8 w-8 bg-electric-100 dark:bg-electric-900/30 rounded-lg flex items-center justify-center">
                <Building2 className="h-4 w-4 text-electric-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy-900 dark:text-white">{totalTrips}</div>
              <p className="text-xs text-navy-600 dark:text-navy-400">
                Active company trips
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20 hover:shadow-lg hover:shadow-electric-500/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy-700 dark:text-navy-300">Travel Budget Used</CardTitle>
              <div className="h-8 w-8 bg-electric-100 dark:bg-electric-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-electric-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy-900 dark:text-white">${totalBudget.toLocaleString()}</div>
              <p className="text-xs text-navy-600 dark:text-navy-400">
                Total travel spending
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20 hover:shadow-lg hover:shadow-electric-500/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy-700 dark:text-navy-300">Team Members</CardTitle>
              <div className="h-8 w-8 bg-electric-100 dark:bg-electric-900/30 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-electric-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy-900 dark:text-white">{uniqueTravelers}</div>
              <p className="text-xs text-navy-600 dark:text-navy-400">
                Unique travelers
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20 hover:shadow-lg hover:shadow-electric-500/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-navy-700 dark:text-navy-300">Avg Trip Duration</CardTitle>
              <div className="h-8 w-8 bg-electric-100 dark:bg-electric-900/30 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-electric-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy-900 dark:text-white">{avgTripDuration} days</div>
              <p className="text-xs text-navy-600 dark:text-navy-400">
                Optimal for business travel
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trip Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Trips */}
          <Card className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20 hover:shadow-lg hover:shadow-electric-500/10 transition-all duration-300">
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
                    <div 
                      key={trip.id} 
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:shadow-md hover:bg-muted/50 transition-all"
                      onClick={() => setLocation(`/trip/${trip.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{trip.title}</p>
                          <p className="text-sm text-muted-foreground">{trip.city || trip.country || 'Location TBD'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={trip.completed ? 'default' : 'secondary'}>
                          {trip.completed ? 'Completed' : 'Active'}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(() => {
                            const startDate = trip.startDate;
                            const endDate = trip.endDate;

                            if (!startDate || !endDate) return <p>Dates not set</p>;

                            const start = new Date(startDate);
                            const end = new Date(endDate);

                            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                              return <p>Invalid dates</p>;
                            }

                            const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                            return (
                              <div>
                                <p>{start.toLocaleDateString()} - {end.toLocaleDateString()}</p>
                                <p className="text-xs opacity-75">{duration} day{duration !== 1 ? 's' : ''}</p>
                              </div>
                            );
                          })()}
                        </div>
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
          <Card className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20 hover:shadow-lg hover:shadow-electric-500/10 transition-all duration-300">
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
                    <div 
                      key={trip.id} 
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:shadow-md hover:bg-muted/50 transition-all"
                      onClick={() => setLocation(`/trip/${trip.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{trip.title}</p>
                          <p className="text-sm text-muted-foreground">{trip.city || trip.country || 'Location TBD'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(trip.startDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          1 traveler
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