import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Calendar, Building2, DollarSign, Users, Clock, FileText, Target, User } from 'lucide-react';
import NewTripModal from "@/components/NewTripModal";
import { useAuth } from '@/providers/AuthProvider';
import { useTrips } from '@/hooks/useTrips';
import { useAnalytics } from '@/hooks/useAnalytics';
import { TripStatus, UserRole } from '@/types/dtos/common';
import { TripDTO } from '@/types/dtos/trip';
import { AgencyAnalyticsDTO, CorporateAnalyticsDTO } from '@/types/dtos/analytics';
import OnboardingProgress from '@/components/OnboardingProgress';

const AnimatedCard = motion(Card);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const isCorporate = useMemo(() => user?.role === UserRole.CORPORATE, [user]);

  const { 
    data: tripsData, 
    isLoading: isLoadingTrips, 
    error: tripsError 
  } = useTrips({ 
    page: 1, 
    pageSize: 5, 
    sortBy: 'startDate',
    sortDirection: 'asc' as const
  });

  const {
    data: analyticsData,
    isLoading: isLoadingAnalytics,
    error: analyticsError
  } = useAnalytics();

  const isLoading = isLoadingTrips || isLoadingAnalytics;
  const error = tripsError || analyticsError;
  const trips = useMemo(() => (tripsData?.data || []) as TripDTO[], [tripsData]);

  const handleOnboardingTaskClick = (_taskId: string, url: string) => {
    navigate(url);
  };

  const analytics = useMemo(() => {
    if (!analyticsData) return null;

    if (isCorporate) {
      const corpData = analyticsData as CorporateAnalyticsDTO;
      return {
        totalTrips: corpData.overview?.totalTrips || 0,
        totalBudget: corpData.overview?.totalBudget || 0,
        avgDuration: corpData.overview?.avgDuration || 0,
        teamSize: corpData.overview?.teamSize || 0,
        activeTrips: corpData.overview?.activeTrips || 0,
        upcomingTrips: corpData.overview?.upcomingTrips || 0,
        completedTrips: corpData.overview?.completedTrips || 0
      };
    } else {
      const agencyData = analyticsData as AgencyAnalyticsDTO;
      return {
        totalProposals: agencyData.overview?.totalProposals || 0,
        totalRevenue: agencyData.overview?.totalRevenue || 0,
        winRate: agencyData.overview?.winRate || 0,
        activeClients: agencyData.overview?.activeClients || 0,
        pendingApprovals: agencyData.overview?.pendingApprovals || 0,
        upcomingTrips: agencyData.overview?.upcomingTrips || 0
      };
    }
  }, [analyticsData, isCorporate]);

  const upcomingTrips = useMemo(() => {
    return trips
      .filter(trip => trip.startDate && new Date(trip.startDate) > new Date())
      .slice(0, 3);
  }, [trips]);

  const dashboardConfig = useMemo(() => ({
    title: isCorporate ? 'Corporate Dashboard' : 'Agency Dashboard',
    description: isCorporate 
      ? 'Manage your corporate travel program' 
      : 'Manage your travel agency operations',
  }), [isCorporate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading dashboard data: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{dashboardConfig.title}</h1>
          <p className="text-md text-gray-600 dark:text-gray-300 mt-1">{dashboardConfig.description}</p>
        </motion.div>

        {user && <OnboardingProgress 
          onTaskClick={handleOnboardingTaskClick} 
          className="mt-6" 
        />}

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isCorporate ? (
            <>
              <AnimatedCard>
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Trips</CardTitle><Building2 className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{analytics?.totalTrips}</div></CardContent>
              </AnimatedCard>
              <AnimatedCard>
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Budget</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">${(analytics?.totalBudget ?? 0).toLocaleString()}</div></CardContent>
              </AnimatedCard>
              <AnimatedCard>
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg. Trip Duration</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{analytics?.avgDuration} Days</div></CardContent>
              </AnimatedCard>
              <AnimatedCard>
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Team Size</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{analytics?.teamSize}</div></CardContent>
              </AnimatedCard>
            </>
          ) : (
            <>
              <AnimatedCard>
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Proposals</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{analytics?.totalProposals}</div></CardContent>
              </AnimatedCard>
              <AnimatedCard>
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">${(analytics?.totalRevenue ?? 0).toLocaleString()}</div></CardContent>
              </AnimatedCard>
              <AnimatedCard>
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Win Rate</CardTitle><Target className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{analytics?.winRate}%</div></CardContent>
              </AnimatedCard>
              <AnimatedCard>
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active Clients</CardTitle><User className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{analytics?.activeClients}</div></CardContent>
              </AnimatedCard>
            </>
          )}
        </div>

        {/* Upcoming Trips Section */}
        <div className="grid grid-cols-1 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-6 w-6 mr-2 text-gray-500" />
                  Upcoming Trips
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingTrips.length > 0 ? (
                  <ul className="space-y-4">
                    {upcomingTrips.map((trip: TripDTO) => (
                      <li key={trip.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <Link to={`/trips/${trip.id}`} className="font-semibold text-blue-600 hover:underline">
                            {trip.title || 'Untitled Trip'}
                          </Link>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{trip.destination}</p>
                        </div>
                        <div className="text-right">
                          <h3 className="font-medium">{trip.title || 'Untitled Trip'}</h3>
                          <p className="text-sm font-medium">{new Date(trip.startDate).toLocaleDateString()}</p>
                          <Badge variant={trip.status === TripStatus.PLANNING ? 'secondary' : 'default'}>{trip.status}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No upcoming trips scheduled.</p>
                )}
              </CardContent>
            </Card>
        </div>

        {/* CTA Button */}
        <div className="text-center mt-12">
          <Button size="lg" onClick={() => setIsNewTripModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
            <Plus className="mr-2 h-5 w-5" />
            {isCorporate ? 'Plan a New Trip' : 'Create New Proposal'}
          </Button>
        </div>

        <NewTripModal 
          isOpen={isNewTripModalOpen} 
          onClose={() => setIsNewTripModalOpen(false)}
          onSuccess={() => {
            setIsNewTripModalOpen(false);
            // Optionally refresh trips data
            // queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
          }}
          userId={user?.id ? Number(user.id) : 0}
        />
      </div>
    </div>
  );
}
