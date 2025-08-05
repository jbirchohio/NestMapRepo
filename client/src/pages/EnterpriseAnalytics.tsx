import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users,
  Plane,
  Hotel,
  Car,
  Receipt,
  Target,
  AlertTriangle,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface AnalyticsData {
  overview: {
    totalSpend: number;
    totalTrips: number;
    totalTravelers: number;
    complianceRate: number;
    savingsFromPolicy: number;
    averageTripCost: number;
    monthOverMonth: number;
    yearOverYear: number;
  };
  spendByCategory: Array<{ category: string; amount: number; percentage: number }>;
  spendByDepartment: Array<{ department: string; amount: number; budget: number }>;
  topVendors: Array<{ vendor: string; spend: number; transactions: number }>;
  travelPatterns: Array<{ route: string; frequency: number; averageCost: number }>;
  forecast: Array<{ month: string; actual?: number; predicted: number; confidence: number }>;
  policyViolations: Array<{ policy: string; violations: number; cost: number }>;
  riskMetrics: {
    highRiskDestinations: number;
    overdueCheckIns: number;
    emergencyIncidents: number;
    travelAlerts: number;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function EnterpriseAnalytics() {
  const [dateRange, setDateRange] = useState('6months');
  const [department, setDepartment] = useState('all');
  const [viewType, setViewType] = useState<'spend' | 'compliance' | 'forecast' | 'risk'>('spend');

  // Calculate date range
  const endDate = new Date();
  const startDate = dateRange === '3months' 
    ? subMonths(endDate, 3)
    : dateRange === '6months'
    ? subMonths(endDate, 6)
    : subMonths(endDate, 12);

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['enterprise-analytics', startDate, endDate, department],
    queryFn: async () => {
      // This would fetch from multiple endpoints
      const response = await fetch(`/api/analytics/enterprise?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&department=${department}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  // Mock data for demonstration
  const mockAnalytics: AnalyticsData = {
    overview: {
      totalSpend: 487500,
      totalTrips: 142,
      totalTravelers: 56,
      complianceRate: 87.5,
      savingsFromPolicy: 62300,
      averageTripCost: 3433,
      monthOverMonth: 12.5,
      yearOverYear: 28.3
    },
    spendByCategory: [
      { category: 'Flights', amount: 285000, percentage: 58.5 },
      { category: 'Hotels', amount: 125000, percentage: 25.6 },
      { category: 'Local Transport', amount: 42000, percentage: 8.6 },
      { category: 'Meals', amount: 28000, percentage: 5.7 },
      { category: 'Other', amount: 7500, percentage: 1.6 }
    ],
    spendByDepartment: [
      { department: 'Sales', amount: 195000, budget: 200000 },
      { department: 'Engineering', amount: 125000, budget: 150000 },
      { department: 'Marketing', amount: 87500, budget: 100000 },
      { department: 'Executive', amount: 80000, budget: 75000 }
    ],
    topVendors: [
      { vendor: 'United Airlines', spend: 125000, transactions: 89 },
      { vendor: 'Marriott Hotels', spend: 85000, transactions: 56 },
      { vendor: 'Hertz', spend: 35000, transactions: 42 },
      { vendor: 'Delta Airlines', spend: 95000, transactions: 67 },
      { vendor: 'Hilton Hotels', spend: 40000, transactions: 31 }
    ],
    travelPatterns: [
      { route: 'SFO → NYC', frequency: 24, averageCost: 2850 },
      { route: 'LAX → CHI', frequency: 18, averageCost: 2200 },
      { route: 'SEA → BOS', frequency: 15, averageCost: 3100 },
      { route: 'DEN → MIA', frequency: 12, averageCost: 2500 },
      { route: 'ATL → DFW', frequency: 10, averageCost: 1800 }
    ],
    forecast: [
      { month: 'Jan', actual: 75000, predicted: 75000, confidence: 100 },
      { month: 'Feb', actual: 82000, predicted: 82000, confidence: 100 },
      { month: 'Mar', actual: 91000, predicted: 91000, confidence: 100 },
      { month: 'Apr', actual: 78000, predicted: 78000, confidence: 100 },
      { month: 'May', actual: 85000, predicted: 85000, confidence: 100 },
      { month: 'Jun', actual: 76500, predicted: 76500, confidence: 100 },
      { month: 'Jul', predicted: 88000, confidence: 85 },
      { month: 'Aug', predicted: 95000, confidence: 82 },
      { month: 'Sep', predicted: 92000, confidence: 78 },
      { month: 'Oct', predicted: 98000, confidence: 75 },
      { month: 'Nov', predicted: 85000, confidence: 72 },
      { month: 'Dec', predicted: 79000, confidence: 70 }
    ],
    policyViolations: [
      { policy: 'Flight Class', violations: 12, cost: 15600 },
      { policy: 'Booking Window', violations: 23, cost: 8900 },
      { policy: 'Hotel Rating', violations: 8, cost: 3200 },
      { policy: 'Meal Limits', violations: 45, cost: 2100 },
      { policy: 'Preferred Vendors', violations: 19, cost: 5400 }
    ],
    riskMetrics: {
      highRiskDestinations: 3,
      overdueCheckIns: 2,
      emergencyIncidents: 0,
      travelAlerts: 7
    }
  };

  const data = analytics || mockAnalytics;

  // Calculate KPI trends
  const kpiTrend = (value: number) => {
    if (value > 0) return { icon: TrendingUp, color: 'text-green-600' };
    if (value < 0) return { icon: TrendingDown, color: 'text-red-600' };
    return { icon: TrendingUp, color: 'text-gray-600' };
  };

  const exportData = () => {
    // Export analytics data as CSV
    const csv = generateCSV(data);
    downloadCSV(csv, `travel-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Enterprise Travel Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights and predictive analytics for travel management
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                ${data.overview.totalSpend.toLocaleString()}
              </span>
              <div className={`flex items-center ${kpiTrend(data.overview.monthOverMonth).color}`}>
                {React.createElement(kpiTrend(data.overview.monthOverMonth).icon, {
                  className: 'h-4 w-4 mr-1'
                })}
                <span className="text-sm font-medium">
                  {Math.abs(data.overview.monthOverMonth)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Compliance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {data.overview.complianceRate}%
              </span>
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Policy adherence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Savings from Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                ${data.overview.savingsFromPolicy.toLocaleString()}
              </span>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Travelers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {data.overview.totalTravelers}
              </span>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data.overview.totalTrips} trips
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={viewType} onValueChange={(v) => setViewType(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="spend">Spend Analysis</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="forecast">Forecasting</TabsTrigger>
          <TabsTrigger value="risk">Risk & Safety</TabsTrigger>
        </TabsList>

        <TabsContent value="spend" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Spend by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Spend by Category</CardTitle>
                <CardDescription>
                  Distribution of travel expenses across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.spendByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.category}: ${entry.percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {data.spendByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department Budget vs Actual */}
            <Card>
              <CardHeader>
                <CardTitle>Department Budget Utilization</CardTitle>
                <CardDescription>
                  Actual spend vs allocated budget by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.spendByDepartment}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="amount" fill="#3B82F6" name="Actual Spend" />
                    <Bar dataKey="budget" fill="#E5E7EB" name="Budget" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Vendors */}
          <Card>
            <CardHeader>
              <CardTitle>Top Vendors</CardTitle>
              <CardDescription>
                Highest spend vendors with transaction counts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topVendors.map((vendor, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-8 rounded`} style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <div>
                        <p className="font-medium">{vendor.vendor}</p>
                        <p className="text-sm text-gray-500">
                          {vendor.transactions} transactions
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold">
                      ${vendor.spend.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          {/* Policy Violations */}
          <Card>
            <CardHeader>
              <CardTitle>Policy Violations by Type</CardTitle>
              <CardDescription>
                Most common policy violations and their financial impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.policyViolations} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="policy" type="category" />
                  <Tooltip />
                  <Bar dataKey="violations" fill="#EF4444" name="Violations" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {data.policyViolations.map((violation, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{violation.policy}</span>
                    <span className="text-red-600 font-medium">
                      Cost impact: ${violation.cost.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Travel Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Frequent Travel Routes</CardTitle>
              <CardDescription>
                Most traveled routes and average costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.travelPatterns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="route" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
                  <Tooltip formatter={(value: number) => 
                    typeof value === 'number' && value > 100 
                      ? `$${value.toLocaleString()}` 
                      : value
                  } />
                  <Legend />
                  <Bar yAxisId="left" dataKey="frequency" fill="#3B82F6" name="Frequency" />
                  <Bar yAxisId="right" dataKey="averageCost" fill="#10B981" name="Avg Cost" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          {/* Spend Forecast */}
          <Card>
            <CardHeader>
              <CardTitle>Travel Spend Forecast</CardTitle>
              <CardDescription>
                Predictive analytics for upcoming travel expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.forecast}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#colorActual)"
                    name="Actual"
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorPredicted)"
                    name="Predicted"
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Forecast Summary:</strong> Based on historical patterns and seasonal trends,
                  travel spend is projected to increase by 15% in Q3 due to conference season.
                  Consider increasing budget allocations for Sales and Marketing departments.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Confidence Levels */}
          <Card>
            <CardHeader>
              <CardTitle>Forecast Confidence</CardTitle>
              <CardDescription>
                Prediction confidence levels by month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.forecast.filter(f => f.confidence)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Line 
                    type="monotone" 
                    dataKey="confidence" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          {/* Risk Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className={data.riskMetrics.highRiskDestinations > 0 ? 'border-orange-200' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  High Risk Destinations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    {data.riskMetrics.highRiskDestinations}
                  </span>
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Active trips</p>
              </CardContent>
            </Card>

            <Card className={data.riskMetrics.overdueCheckIns > 0 ? 'border-red-200' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Overdue Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    {data.riskMetrics.overdueCheckIns}
                  </span>
                  <Users className="h-5 w-5 text-red-600" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Travelers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Emergency Incidents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    {data.riskMetrics.emergencyIncidents}
                  </span>
                  <AlertTriangle className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-xs text-gray-500 mt-1">This period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Active Travel Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    {data.riskMetrics.travelAlerts}
                  </span>
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Warnings</p>
              </CardContent>
            </Card>
          </div>

          {/* Risk Map Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Traveler Risk Dashboard</CardTitle>
              <CardDescription>
                Real-time traveler locations and risk assessments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Interactive risk map would display here
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Showing real-time traveler locations with risk indicators
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
function generateCSV(data: AnalyticsData): string {
  // Generate CSV from analytics data
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Total Spend', data.overview.totalSpend],
    ['Total Trips', data.overview.totalTrips],
    ['Compliance Rate', data.overview.complianceRate],
    ['Savings from Policy', data.overview.savingsFromPolicy],
    // Add more rows as needed
  ];
  
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}