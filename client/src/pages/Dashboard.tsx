import React, { useMemo, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Calendar, BarChart3, Settings, Building2, DollarSign, Users, Clock, FileText, Target, User } from 'lucide-react';
import NewTripModal from "@/components/NewTripModal";
import { useAuth } from '@/contexts/SecureJWTAuthContext';
import { useTrips } from '@/hooks/useTrips';
import { useAnalytics } from '@/hooks/useAnalytics';
import { TripStatus, UserRole } from '@/types/dtos/common';
import { TripDTO } from '@/types/dtos/trip';
import { AgencyAnalyticsDTO, CorporateAnalyticsDTO } from '@/types/dtos/analytics';
import OnboardingProgress from '@/components/OnboardingProgress';

const AnimatedCard = motion(Card);

export default function Dashboard() {
  const { user } = useAuth();
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const isCorporate = useMemo(() => user?.roles.includes(UserRole.CORPORATE), [user]);

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
  } = useAnalytics({ isCorporate });

  const isLoading = isLoadingTrips || isLoadingAnalytics;
  const error = tripsError || analyticsError;
  const trips = useMemo(() => (tripsData?.data || []) as TripDTO[], [tripsData]);

  const handleOnboardingTaskClick = (taskId: string, url: string) => {
    setLocation(url);
  };

  const analytics = useMemo(() => {
    if (!analyticsData) return null;

    if (isCorporate) {
      const corpData = analyticsData as CorporateAnalyticsDTO;
      return {
        totalTrips: corpData.overview?.totalTrips || 0,
        totalBudget: corpData.overview?.totalBudget || 0,
        avgDuration: corpData.overview?.averageTripLength || 0,
        teamSize: corpData.overview?.totalUsers || 0,
      };
    } else {
      const agencyData = analyticsData as AgencyAnalyticsDTO;
      return {
        totalProposals: agencyData.overview?.totalProposals || 0,
        totalRevenue: agencyData.overview?.totalRevenue || 0,
        winRate: agencyData.overview?.winRate || 0,
        activeClients: agencyData.overview?.activeClients || 0,
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

        {user && <OnboardingProgress user={user} onTaskClick={handleOnboardingTaskClick} />}

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
                <CardContent><div className="text-2xl font-bold">${analytics?.totalBudget.toLocaleString()}</div></CardContent>
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
                <CardContent><div className="text-2xl font-bold">${analytics?.totalRevenue.toLocaleString()}</div></CardContent>
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
                            {trip.name}
                          </Link>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{trip.destination}</p>
                        </div>
                        <div className="text-right">
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
        />
      </div>
    </div>
  );
}                <AnimatedCard className="hover:shadow-xl transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team Size</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.teamSize}</div>
                  </CardContent>
                </AnimatedCard>
              </>
            ) : (
              <>
                <AnimatedCard className="hover:shadow-xl transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.totalProposals}</div>
                  </CardContent>
                </AnimatedCard>
                <AnimatedCard className="hover:shadow-xl transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${analytics?.totalRevenue.toLocaleString()}</div>
                  </CardContent>
                </AnimatedCard>
                <AnimatedCard className="hover:shadow-xl transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.winRate}%</div>
                  </CardContent>
                </AnimatedCard>
                <AnimatedCard className="hover:shadow-xl transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.activeClients}</div>
                  </CardContent>
                </AnimatedCard>
              </>
            )}
          </div>

          {/* Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {dashboardConfig.sections.map((section, index) => (
              <Card key={index} className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <section.icon className="h-6 w-6 mr-2 text-gray-500" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {section.data.length > 0 ? (
                    <ul className="space-y-4">
                      {section.title === 'Upcoming Trips' && (section.data as TripDTO[]).map((trip: TripDTO) => (
                        <li key={trip.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div>
                            <Link to={`/trips/${trip.id}`} className="font-semibold text-blue-600 hover:underline">
                              {trip.name}
                            </Link>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{trip.destination}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{new Date(trip.startDate).toLocaleDateString()}</p>
                            <Badge variant={trip.status === TripStatus.PLANNING ? 'secondary' : 'default'}>{trip.status}</Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">{section.emptyMessage}</p>
                  )}
                </CardContent>
              </Card>
            ))}
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
          />
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden bg-gradient-to-br from-electric-500 via-electric-600 to-electric-700 text-white mb-8 rounded-2xl"
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
                      <Building2 className="w-8 h-8" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-electric-200" />
                      <span className="text-electric-100 text-sm font-medium">Corporate Dashboard</span>
                    </div>
                  </div>

                  <h1 className="text-5xl font-bold mb-4 tracking-tight">
                    {dashboardConfig.title}
                  </h1>
                  <p className="text-xl text-electric-100 mb-6 max-w-2xl">
                    {dashboardConfig.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-electric-100">Real-time tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      <span className="text-electric-100">Team collaboration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full" />
                      <span className="text-electric-100">Smart analytics</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Button 
                    onClick={() => setIsNewTripModalOpen(true)}
                    className="bg-white hover:bg-white/90 text-electric-600 font-semibold px-8 py-3 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Plan Team Trip
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Agency Header - Simple */
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {dashboardConfig.title}
            </h1>
            <p className="text-muted-foreground">
              {dashboardConfig.description}
            </p>
          </div>
        )}

        {/* Onboarding Progress - Only show for new users in corporate mode */}
        {isCorporate && trips.length === 0 && (
          <div className="mb-8">
            <OnboardingProgress onTaskClick={handleOnboardingTaskClick} />
          </div>
        )}

        {/* Quick Actions - Role-based layout */}
        {!isCorporate && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Button 
              onClick={() => setIsNewTripModalOpen(true)}
              className="h-16 flex items-center justify-center gap-3"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              Create Client Proposal
            </Button>
            
            <Button variant="outline" className="h-16 flex items-center justify-center gap-3" asChild>
              <Link href="/ai-generator">
                <Sparkles className="h-5 w-5" />
                AI Proposal Generator
              </Link>
            </Button>
            
            <Button variant="outline" className="h-16 flex items-center justify-center gap-3" asChild>
              <Link href="/analytics">
                <BarChart3 className="h-5 w-5" />
                Client Analytics
              </Link>
            </Button>
            
            <Button variant="outline" className="h-16 flex items-center justify-center gap-3" asChild>
              <Link href="/settings">
                <Settings className="h-5 w-5" />
                Agency Settings
              </Link>
            </Button>
          </div>
        )}

        {/* Metrics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: isCorporate ? 0.6 : 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {isCorporate ? (
            <>
              <AnimatedCard variant="soft" className="p-6">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Company Trips</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {trips.length}
                  </div>
                </CardContent>
              </AnimatedCard>
              <AnimatedCard variant="soft" className="p-6">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Travel Budget Used</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalBudget.toLocaleString()}
                  </div>
                </CardContent>
              </AnimatedCard>
              <AnimatedCard variant="soft" className="p-6">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Set(trips.map(trip => trip.userId)).size}
                  </div>
                </CardContent>
              </AnimatedCard>
              <AnimatedCard variant="soft" className="p-6">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Trip Duration</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {averageTripDuration} days
                  </div>
                </CardContent>
              </AnimatedCard>
            </>
          ) : (
            <>
              <AnimatedCard variant="soft" className="p-6">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics?.totalProposals || 0}
                  </div>
                </CardContent>
              </AnimatedCard>
              <AnimatedCard variant="soft" className="p-6">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${analytics?.totalRevenue || 0}
                  </div>
                </CardContent>
              </AnimatedCard>
              <AnimatedCard variant="soft" className="p-6">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Proposal Win Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics?.winRate || 0}%
                  </div>
                </CardContent>
              </AnimatedCard>
              <AnimatedCard variant="soft" className="p-6">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics?.activeClients || 0}
                  </div>
                </CardContent>
              </AnimatedCard>
            </>
          )}
        </motion.div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {dashboardConfig.sections.map((section, index) => {
            const IconComponent = section.icon;
            const sectionData = section.data || [];
            return (
              <AnimatedCard key={section.title} variant={isCorporate ? 'glow' : 'default'} className="p-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sectionData.length > 0 ? (
                    <div className="space-y-4">
                      {sectionData.map((trip, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:shadow-md hover:bg-muted/50 transition-all"
                          onClick={() => setLocation(`/trip/${trip.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{trip.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {isCorporate 
                                  ? trip.city || trip.country || trip.destination || 'Location TBD' 
                                  : `${trip.client_name || 'Client'} • ${trip.destination}`
                                }
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={trip.status === TripStatus.COMPLETED || trip.completed ? 'default' : 'secondary'}>
                              {trip.status === TripStatus.COMPLETED || trip.completed ? 'Completed' : trip.status || 'Active'}
                            </Badge>
                            {!isCorporate && hasBudget(trip) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                ${typeof trip.budget === 'string' 
                                  ? parseFloat(trip.budget.replace(/[^0-9.-]+/g, '')).toLocaleString() 
                                  : trip.budget.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <IconComponent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        {index === 0 ? 'No upcoming trips found' : 'No analytics data available'}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {index === 0 ? 'Start planning team trips' : 'No analytics data available'}
                      </p>
                      {index === 0 && (
                        <Button onClick={() => setIsNewTripModalOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Plan Team Trip
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </AnimatedCard>
            );
          })}
        </div>
      </div>

      <NewTripModal 
        isOpen={isNewTripModalOpen} 
        onClose={() => setIsNewTripModalOpen(false)} 
        onSuccess={() => setIsNewTripModalOpen(false)}
        userId={user?.id}
      />
    </div>
  );
}
