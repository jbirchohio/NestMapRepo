import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  Users, 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Sparkles,
  Building2,
  FileText,
  Settings,
  Plus,
  ArrowUpRight,
  Clock,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  activeTrips: number;
  totalClients: number;
  monthlyRevenue: number;
  completionRate: number;
  recentActivity: {
    type: string;
    description: string;
    time: string;
    status: 'success' | 'pending' | 'warning';
  }[];
  upcomingDeadlines: {
    title: string;
    client: string;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export default function EnterpriseDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard-stats'],
    enabled: true
  });

  const mockStats: DashboardStats = {
    activeTrips: 24,
    totalClients: 156,
    monthlyRevenue: 89420,
    completionRate: 94,
    recentActivity: [
      { type: 'trip_created', description: 'New London trip for TechCorp', time: '2h ago', status: 'success' },
      { type: 'proposal_sent', description: 'Proposal sent to Acme Inc', time: '4h ago', status: 'pending' },
      { type: 'client_signed', description: 'Contract signed by RetailCo', time: '1d ago', status: 'success' },
      { type: 'payment_received', description: 'Payment received from StartupXYZ', time: '2d ago', status: 'success' }
    ],
    upcomingDeadlines: [
      { title: 'Tokyo Conference Trip', client: 'TechCorp Solutions', dueDate: '2024-06-15', priority: 'high' },
      { title: 'Client Presentation', client: 'Retail Holdings', dueDate: '2024-06-18', priority: 'medium' },
      { title: 'Team Building Event', client: 'StartupXYZ', dueDate: '2024-06-22', priority: 'low' }
    ]
  };

  const displayStats = stats || mockStats;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-soft-100 dark:bg-navy-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-electric-600 border-t-transparent rounded-full" />
        </div>
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
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-white/80" />
                  <span className="text-white/90 text-sm font-medium">Enterprise Console</span>
                </div>
              </div>

              <h1 className="text-5xl font-bold mb-4 tracking-tight text-white">
                Enterprise Dashboard
              </h1>
              <p className="text-xl text-white/90 mb-6 max-w-2xl">
                Comprehensive travel management console with client analytics, revenue tracking, and operational insights
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-white/80">Client management</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span className="text-white/80">Revenue analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span className="text-white/80">Performance metrics</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex gap-3"
            >
              <Link href="/trip-planner">
                <Button size="lg" variant="secondary" className="bg-white/10 hover:bg-white/20 border-white/20 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  New Project
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Trips</p>
                  <p className="text-2xl font-bold text-foreground">{displayStats?.activeTrips || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold text-foreground">{displayStats?.totalClients || 0}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-foreground">${(displayStats?.monthlyRevenue || 0).toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold text-foreground">{displayStats?.completionRate || 0}%</p>
                </div>
                <Target className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</CardTitle>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {(displayStats?.recentActivity || []).map((activity: any, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Deadlines</CardTitle>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {(displayStats?.upcomingDeadlines || []).map((deadline: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {deadline.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{deadline.client}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{deadline.dueDate}</p>
                  </div>
                  <Badge variant={
                    deadline.priority === 'high' ? 'destructive' :
                    deadline.priority === 'medium' ? 'default' : 'secondary'
                  }>
                    {deadline.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}