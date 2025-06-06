import React, { useState } from 'react';
import { useAuth } from "@/contexts/JWTAuthContext";
import { useQuery } from "@tanstack/react-query";
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from 'wouter';
import NewTripModal from "@/components/NewTripModal";
import OnboardingProgress from "@/components/OnboardingProgress";
import { AnimatedCard } from "@/components/ui/animated-card";
import {
  Building2,
  Sparkles,
  Plus,
  BarChart3,
  Settings,
  FileText,
  DollarSign,
  Target,
  User,
  Briefcase,
  TrendingUp,
  MapPin,
  Calendar,
  Clock,
  Users,
  Home
} from 'lucide-react';

interface Trip {
  id: number;
  title: string;
  destination: string;
  city?: string;
  country?: string;
  start_date?: string;
  end_date?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  budget?: number | string;
  client_name?: string;
  userId?: number;
  completed?: boolean;
}

export default function Dashboard() {
  const { userId, user, roleType } = useAuth();
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleOnboardingTaskClick = (taskId: string, url: string) => {
    setLocation(url);
  };

  // Unified trip query - adapts based on role
  const { data: trips = [], isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: roleType === 'agency' ? ['/api/trips', { userId }] : ['/api/trips/corporate'],
    queryFn: async () => {
      if (roleType === 'agency') {
        const res = await fetch(`/api/trips?userId=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch trips");
        return res.json();
      } else {
        const res = await fetch('/api/trips/corporate', { credentials: 'include' });
        if (!res.ok) throw new Error("Failed to fetch corporate trips");
        return res.json();
      }
    },
    enabled: !!userId,
  });

  // Unified analytics query - adapts based on role
  const { data: analytics } = useQuery({
    queryKey: roleType === 'agency' ? ['/api/analytics/agency', { userId }] : ['/api/analytics/corporate', { userId }],
    queryFn: async () => {
      if (roleType === 'agency') {
        const res = await fetch(`/api/analytics/agency?userId=${userId}`);
        if (!res.ok) return { totalProposals: 0, totalRevenue: 0, winRate: 0, activeClients: 0 };
        return res.json();
      } else {
        const res = await fetch('/api/analytics', { credentials: 'include' });
        if (!res.ok) return { totalTrips: 0, totalBudget: 0, avgDuration: 0, teamSize: 0 };
        const data = await res.json();
        return {
          totalTrips: data.overview?.totalTrips || 0,
          totalBudget: data.overview?.totalBudget || 0,
          avgDuration: data.overview?.averageTripLength || 0,
          teamSize: data.overview?.totalUsers || 0
        };
      }
    },
    enabled: !!user,
  });

  // Process trips based on role
  const processedTrips = roleType === 'agency' 
    ? {
        recent: trips.slice(0, 3),
        active: trips.filter(trip => trip.status === 'in_progress' || trip.status === 'pending').slice(0, 3)
      }
    : {
        recent: trips.slice(0, 3),
        upcoming: trips.filter(trip => {
          const startDate = trip.startDate || trip.start_date;
          return startDate && new Date(startDate) > new Date();
        }).slice(0, 3)
      };

  // Calculate metrics for corporate dashboard
  const corporateMetrics = roleType === 'corporate' ? {
    totalTrips: trips.length,
    totalBudget: trips.reduce((sum, trip) => {
      const budget = trip.budget ? (typeof trip.budget === 'string' ? parseFloat(trip.budget.replace(/[^0-9.-]+/g, '')) : trip.budget) : 0;
      return sum + (isNaN(budget) ? 0 : budget);
    }, 0),
    avgTripDuration: trips.length > 0 ? Math.round(
      trips.reduce((sum, trip) => {
        const startDate = trip.startDate || trip.start_date;
        const endDate = trip.endDate || trip.end_date;
        if (!startDate || !endDate) return sum;

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return sum;

        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + duration;
      }, 0) / trips.length
    ) : 0,
    uniqueTravelers: new Set(trips.map(trip => trip.userId)).size
  } : null;

  // Role-based content configuration
  const config = {
    agency: {
      title: "Client Travel Proposal Workspace",
      subtitle: "Create compelling travel proposals and manage client relationships",
      heroTitle: "Client Travel Proposal Workspace",
      heroSubtitle: "Create compelling travel proposals and manage client relationships",
      createButtonText: "Create Client Proposal",
      aiGeneratorText: "AI Proposal Generator",
      analyticsText: "Client Analytics",
      settingsText: "Agency Settings",
      metrics: [
        { label: "Total Proposals", value: analytics?.totalProposals || 0, icon: FileText, suffix: "", growth: "+18% from last month" },
        { label: "Revenue Generated", value: analytics?.totalRevenue || 0, icon: DollarSign, prefix: "$", suffix: "", growth: "Commission + markups" },
        { label: "Proposal Win Rate", value: analytics?.winRate || 0, icon: Target, suffix: "%", growth: "Above industry average" },
        { label: "Active Clients", value: analytics?.activeClients || 0, icon: User, suffix: "", growth: "Ongoing relationships" }
      ],
      sections: [
        { title: "Recent Client Proposals", icon: FileText, data: processedTrips.recent },
        { title: "Active Client Projects", icon: TrendingUp, data: processedTrips.active }
      ]
    },
    corporate: {
      title: "Company Travel Management",
      subtitle: "Streamline your organization's travel planning, expense management, and team coordination",
      heroTitle: "Company Travel Management",
      heroSubtitle: "Streamline your organization's travel planning, expense management, and team coordination",
      createButtonText: "Plan Team Trip",
      aiGeneratorText: "AI Trip Generator",
      analyticsText: "Travel Analytics",
      settingsText: "Company Settings",
      metrics: [
        { label: "Total Company Trips", value: corporateMetrics?.totalTrips || 0, icon: Building2, suffix: "", growth: "" },
        { label: "Travel Budget Used", value: corporateMetrics?.totalBudget || 0, icon: DollarSign, prefix: "$", suffix: "", growth: "" },
        { label: "Team Members", value: corporateMetrics?.uniqueTravelers || 0, icon: Users, suffix: "", growth: "" },
        { label: "Avg Trip Duration", value: corporateMetrics?.avgTripDuration || 0, icon: Clock, suffix: " days", growth: "" }
      ],
      sections: [
        { title: "Recent Company Trips", icon: Calendar, data: processedTrips.recent },
        { title: "Upcoming Team Travel", icon: MapPin, data: processedTrips.upcoming }
      ]
    }
  };

  const currentConfig = config[roleType as keyof typeof config] || config.corporate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Header - Enhanced for Corporate */}
        {roleType === 'corporate' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
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
                    {currentConfig.heroTitle}
                  </h1>
                  <p className="text-xl text-electric-100 mb-6 max-w-2xl">
                    {currentConfig.heroSubtitle}
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
                    {currentConfig.createButtonText}
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Agency Header - Simple */
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {currentConfig.title}
            </h1>
            <p className="text-muted-foreground">
              {currentConfig.subtitle}
            </p>
          </div>
        )}

        {/* Onboarding Progress - Only show for new users in corporate mode */}
        {roleType === 'corporate' && trips.length === 0 && (
          <div className="mb-8">
            <OnboardingProgress onTaskClick={handleOnboardingTaskClick} />
          </div>
        )}

        {/* Quick Actions - Role-based layout */}
        {roleType === 'agency' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Button 
              onClick={() => setIsNewTripModalOpen(true)}
              className="h-16 flex items-center justify-center gap-3"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              {currentConfig.createButtonText}
            </Button>
            
            <Button variant="outline" className="h-16 flex items-center justify-center gap-3" asChild>
              <Link href="/ai-generator">
                <Sparkles className="h-5 w-5" />
                {currentConfig.aiGeneratorText}
              </Link>
            </Button>
            
            <Button variant="outline" className="h-16 flex items-center justify-center gap-3" asChild>
              <Link href="/analytics">
                <BarChart3 className="h-5 w-5" />
                {currentConfig.analyticsText}
              </Link>
            </Button>
            
            <Button variant="outline" className="h-16 flex items-center justify-center gap-3" asChild>
              <Link href="/settings">
                <Settings className="h-5 w-5" />
                {currentConfig.settingsText}
              </Link>
            </Button>
          </div>
        )}

        {/* Metrics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: roleType === 'corporate' ? 0.6 : 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {currentConfig.metrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <AnimatedCard key={metric.label} variant={roleType === 'corporate' ? 'soft' : 'default'} className="p-6">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metric.prefix || ''}{metric.value.toLocaleString()}{metric.suffix || ''}
                  </div>
                  {metric.growth && (
                    <p className="text-xs text-muted-foreground">
                      {metric.growth}
                    </p>
                  )}
                </CardContent>
              </AnimatedCard>
            );
          })}
        </motion.div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {currentConfig.sections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <AnimatedCard key={section.title} variant={roleType === 'corporate' ? 'glow' : 'default'} className="p-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tripsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : section.data.length > 0 ? (
                    <div className="space-y-4">
                      {section.data.map((trip) => (
                        <div 
                          key={trip.id} 
                          className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:shadow-md hover:bg-muted/50 transition-all"
                          onClick={() => setLocation(`/trip/${trip.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{trip.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {roleType === 'agency' 
                                  ? `${trip.client_name || 'Client'} • ${trip.destination}` 
                                  : trip.city || trip.country || trip.destination || 'Location TBD'
                                }
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={trip.status === 'completed' || trip.completed ? 'default' : 'secondary'}>
                              {trip.status === 'completed' || trip.completed ? 'Completed' : trip.status || 'Active'}
                            </Badge>
                            {roleType === 'agency' && trip.budget && (
                              <p className="text-xs text-muted-foreground mt-1">
                                ${typeof trip.budget === 'string' ? parseFloat(trip.budget.replace(/[^0-9.-]+/g, '')).toLocaleString() : trip.budget.toLocaleString()}
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
                        {roleType === 'agency' 
                          ? (index === 0 ? 'No client proposals yet' : 'No active projects')
                          : (index === 0 ? 'No company trips yet' : 'No upcoming travel')
                        }
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {roleType === 'agency' 
                          ? (index === 0 ? 'Start creating proposals to win new business' : 'Win proposals to see active client work here')
                          : (index === 0 ? 'Start planning team trips' : 'Schedule upcoming travel to see it here')
                        }
                      </p>
                      {index === 0 && (
                        <Button onClick={() => setIsNewTripModalOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          {roleType === 'agency' ? 'Create First Proposal' : 'Plan First Trip'}
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
        userId={userId!}
      />
    </div>
  );
}