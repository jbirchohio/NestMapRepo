import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, MapPin, Calendar, Activity, TrendingUp, Download, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AnalyticsData {
  overview: {
    totalTrips: number;
    totalUsers: number;
    totalActivities: number;
    averageTripLength: number;
    averageActivitiesPerTrip: number;
  };
  destinations: {
    city: string;
    country: string;
    tripCount: number;
    percentage: number;
  }[];
  tripDurations: {
    duration: string;
    count: number;
    percentage: number;
  }[];
  activityTags: {
    tag: string;
    count: number;
    percentage: number;
  }[];
  userEngagement: {
    usersWithTrips: number;
    usersWithMultipleTrips: number;
    averageTripsPerUser: number;
    tripCompletionRate: number;
    activityCompletionRate: number;
  };
  recentActivity: {
    newTripsLast7Days: number;
    newUsersLast7Days: number;
    activitiesAddedLast7Days: number;
  };
  growthMetrics: {
    date: string;
    trips: number;
    users: number;
    activities: number;
  }[];
  userFunnel: {
    totalUsers: number;
    usersWithTrips: number;
    usersWithActivities: number;
    usersWithCompletedTrips: number;
    usersWithExports: number;
  };
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export default function AnalyticsDashboard() {
  const { userId } = useAuth();
  
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["/api/analytics"],
    enabled: !!userId
  });

  const handleExportCSV = () => {
    window.open("/api/analytics/export", "_blank");
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        </div>
        <div className="text-center py-12">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading analytics data</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const tripDurationChartData = analytics.tripDurations.map(item => ({
    name: item.duration,
    value: item.count,
    percentage: item.percentage
  }));

  const destinationChartData = analytics.destinations.slice(0, 6).map(item => ({
    name: `${item.city}, ${item.country}`,
    value: item.tripCount
  }));

  const activityTagsChartData = analytics.activityTags.slice(0, 8).map(item => ({
    name: item.tag,
    value: item.count
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Platform insights and user engagement metrics</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalTrips}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.recentActivity.newTripsLast7Days} new this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.recentActivity.newUsersLast7Days} new this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalActivities}</div>
            <p className="text-xs text-muted-foreground">
              Avg {analytics.overview.averageActivitiesPerTrip} per trip
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Trip Length</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.averageTripLength}</div>
            <p className="text-xs text-muted-foreground">days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trip Completion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.userEngagement.tripCompletionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">trips completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Destinations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top Destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.destinations.slice(0, 8).map((destination, index) => (
                <div key={`${destination.city}-${destination.country}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="text-sm font-medium">
                      {destination.city}, {destination.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={destination.percentage} 
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground min-w-[3rem]">
                      {destination.tripCount} trips
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trip Duration Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Trip Duration Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tripDurationChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${percentage}%`}
                >
                  {tripDurationChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} trips`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {tripDurationChartData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-xs">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Tags Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Activity Types</CardTitle>
          <p className="text-sm text-muted-foreground">
            Most common activity tags across all trips
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityTagsChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} activities`, 'Count']} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Growth Trajectory Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Growth Trajectory</CardTitle>
          <p className="text-sm text-muted-foreground">
            Weekly trip creation trends over the last 8 weeks
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.growthMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
                formatter={(value) => [`${value} trips`, 'Trips Created']}
              />
              <Line 
                type="monotone" 
                dataKey="trips" 
                stroke="#8884d8" 
                strokeWidth={3}
                dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* User Funnel Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>User Conversion Funnel</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track user progression from signup to active engagement
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium">Total Users</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={100} className="w-32" />
                <span className="text-lg font-bold min-w-[3rem]">
                  {analytics.userFunnel.totalUsers}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <span className="font-medium">Created Trips</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={Math.round((analytics.userFunnel.usersWithTrips / analytics.userFunnel.totalUsers) * 100)} 
                  className="w-32" 
                />
                <span className="text-lg font-bold min-w-[3rem]">
                  {analytics.userFunnel.usersWithTrips}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
                <span className="font-medium">Added Activities</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={Math.round((analytics.userFunnel.usersWithActivities / analytics.userFunnel.totalUsers) * 100)} 
                  className="w-32" 
                />
                <span className="text-lg font-bold min-w-[3rem]">
                  {analytics.userFunnel.usersWithActivities}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                <span className="font-medium">Completed Trips</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={Math.round((analytics.userFunnel.usersWithCompletedTrips / analytics.userFunnel.totalUsers) * 100)} 
                  className="w-32" 
                />
                <span className="text-lg font-bold min-w-[3rem]">
                  {analytics.userFunnel.usersWithCompletedTrips}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Download className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="font-medium">Exported Data</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={Math.round((analytics.userFunnel.usersWithExports / analytics.userFunnel.totalUsers) * 100)} 
                  className="w-32" 
                />
                <span className="text-lg font-bold min-w-[3rem]">
                  {analytics.userFunnel.usersWithExports}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Trip Creation Rate</div>
              <div className="text-xl font-bold text-green-600">
                {Math.round((analytics.userFunnel.usersWithTrips / analytics.userFunnel.totalUsers) * 100)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Activity Rate</div>
              <div className="text-xl font-bold text-purple-600">
                {Math.round((analytics.userFunnel.usersWithActivities / analytics.userFunnel.totalUsers) * 100)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Completion Rate</div>
              <div className="text-xl font-bold text-orange-600">
                {Math.round((analytics.userFunnel.usersWithCompletedTrips / analytics.userFunnel.totalUsers) * 100)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Export Rate</div>
              <div className="text-xl font-bold text-indigo-600">
                {Math.round((analytics.userFunnel.usersWithExports / analytics.userFunnel.totalUsers) * 100)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}