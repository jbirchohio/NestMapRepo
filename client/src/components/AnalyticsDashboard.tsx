import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, MapPin, Calendar, Activity, TrendingUp, Download, Globe } from "lucide-react";

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
    completionRate: number;
  };
  recentActivity: {
    newTripsLast7Days: number;
    newUsersLast7Days: number;
    activitiesAddedLast7Days: number;
  };
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export default function AnalyticsDashboard() {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["/api/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json() as Promise<AnalyticsData>;
    }
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
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.userEngagement.completionRate}%</div>
            <p className="text-xs text-muted-foreground">trips with progress</p>
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

      {/* User Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>User Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.userEngagement.usersWithTrips}
              </div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analytics.userEngagement.usersWithMultipleTrips}
              </div>
              <div className="text-sm text-muted-foreground">Repeat Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {analytics.userEngagement.averageTripsPerUser}
              </div>
              <div className="text-sm text-muted-foreground">Avg Trips/User</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round((analytics.userEngagement.usersWithMultipleTrips / analytics.userEngagement.usersWithTrips) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Retention Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}