import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
  const { data: stats, isLoading } = useQuery({
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile-optimized header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Enterprise Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Travel Management Console</p>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" />
              New Project
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Trips</p>
                  <p className="text-2xl font-bold text-foreground">{displayStats.activeTrips}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600">+12% vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold text-foreground">{displayStats.totalClients}</p>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600">+8% vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold text-foreground">${displayStats.monthlyRevenue.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600">+23% vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{displayStats.completionRate}%</p>
                </div>
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600 dark:text-green-400">+2% vs last month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-3">
              <Link href="/ai-generator">
                <Button variant="outline" className="w-full h-auto p-4 border-dashed">
                  <div className="text-center">
                    <Sparkles className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-medium">AI Trip Generator</span>
                  </div>
                </Button>
              </Link>
              
              <Link href="/proposal-center">
                <Button variant="outline" className="w-full h-auto p-4 border-dashed">
                  <div className="text-center">
                    <FileText className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-medium">New Proposal</span>
                  </div>
                </Button>
              </Link>
              
              <Link href="/analytics">
                <Button variant="outline" className="w-full h-auto p-4 border-dashed">
                  <div className="text-center">
                    <BarChart3 className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-medium">Analytics</span>
                  </div>
                </Button>
              </Link>
              
              <Link href="/team">
                <Button variant="outline" className="w-full h-auto p-4 border-dashed">
                  <div className="text-center">
                    <Building2 className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-medium">Team Management</span>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm">
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {displayStats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
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
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Deadlines</CardTitle>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {displayStats.upcomingDeadlines.map((deadline, index) => (
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