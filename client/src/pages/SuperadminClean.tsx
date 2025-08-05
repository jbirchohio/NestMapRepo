import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { format, formatDistanceToNow } from 'date-fns';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Users as UsersIcon, CreditCard as CreditCardIcon, Activity as ActivityIcon, Activity, Server, Cpu, HardDrive, Clock, CheckCircle2, XCircle, AlertCircle, ScrollText, Search, Download, Filter, ShieldAlert, UserCheck, Headphones, MessageSquare, UserX, StickyNote, Zap, RefreshCw, RefreshCcw, PieChart, Target, MousePointer, Gauge, Database, Rocket, Palette, Shield, PlusCircle, Megaphone, Mail, Send, Bell, Pin, CreditCard } from 'lucide-react';
import { SuperadminNavigation } from '@/components/SuperadminNavigation';
import { AnimatedCard } from '@/components/ui/animated-card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Settings, Key, Globe, Wrench } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Organization {
  id: number;
  name: string;
  type: string;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
  plan?: string;
  userCount?: number;
  subscriptionStatus?: string;
}

interface User {
  id: number;
  email: string;
  role: string;
  organizationName?: string;
  lastLogin?: string;
  isActive: boolean;
  createdAt: string;
}

interface AuditLog {
  id: number;
  action: string;
  targetType: string;
  targetId: number;
  createdAt: string;
  adminUserId?: number;
  riskLevel?: string;
}

// System Settings Component
function SystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['/api/superadmin/settings'],
    queryFn: () => apiRequest('GET', '/api/superadmin/settings'),
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/superadmin/settings/categories'],
    queryFn: () => apiRequest('GET', '/api/superadmin/settings/categories'),
  });

  // Ensure settings is always an array
  const settings = Array.isArray(settingsData) ? settingsData : [];

  // Group settings by category
  const settingsByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    if (Array.isArray(settings)) {
      settings.forEach((setting: any) => {
        if (!grouped[setting.category]) {
          grouped[setting.category] = [];
        }
        grouped[setting.category].push(setting);
      });
    }
    return grouped;
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setUnsavedChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      const updates = Object.entries(unsavedChanges).map(([key, value]) => ({
        key,
        value
      }));

      await apiRequest('PUT', '/api/superadmin/settings', { settings: updates });
      
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/settings'] });
      setUnsavedChanges({});
      
      toast({
        title: "Settings saved",
        description: `Updated ${updates.length} settings successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const toggleSensitive = (key: string) => {
    setShowSensitive(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getValue = (setting: any) => {
    const key = setting.settingKey;
    if (unsavedChanges[key]) {
      return unsavedChanges[key];
    }
    return setting.settingValue || '';
  };

  const categoryIcons: Record<string, any> = {
    api: Key,
    email: Mail,
    security: Shield,
    platform: Globe,
    maintenance: Wrench,
    performance: Settings,
    branding: Palette
  };

  if (isLoading) {
    return (
      <div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
            System Settings
          </h1>
          <p className="text-navy-600 dark:text-navy-300">
            Configure system-wide settings and preferences
          </p>
        </motion.div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
        </div>
      </div>
    );
  }


  if (settings.length === 0) {
    return (
      <div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
            System Settings
          </h1>
          <p className="text-navy-600 dark:text-navy-300">
            Configure system-wide settings and preferences
          </p>
        </motion.div>
        <AnimatedCard variant="glow" className="p-6">
          <div className="text-center py-8 text-gray-500">
            No system settings found. Please run the system settings seeder.
          </div>
        </AnimatedCard>
      </div>
    );
  }

  return (
    <div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
          System Settings
        </h1>
        <p className="text-navy-600 dark:text-navy-300">
          Configure system-wide settings and preferences
        </p>
      </motion.div>

      {Object.keys(unsavedChanges).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              You have {Object.keys(unsavedChanges).length} unsaved changes
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnsavedChanges({})}
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </div>
        </motion.div>
      )}

      <Tabs defaultValue={Object.keys(settingsByCategory)[0] || 'api'} className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
          {Object.entries(settingsByCategory).map(([category, _]) => {
            const Icon = categoryIcons[category] || Settings;
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            return (
              <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{categoryName}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(settingsByCategory).map(([category, categorySettings]) => (
          <TabsContent key={category} value={category}>
            <AnimatedCard variant="glow" className="p-6">
              <div className="space-y-6">
                {categorySettings.map((setting: any) => {
                  const key = setting.settingKey;
                  const isSensitive = setting.isSensitive;
                  const value = getValue(setting);
                  const isBoolean = setting.settingType === 'boolean';
                  const displayValue = isSensitive && value === '********' && !unsavedChanges[key] ? '' : value;
                  
                  return (
                    <div key={setting.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={key} className="text-sm font-medium">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Label>
                        {isSensitive && value !== '********' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSensitive(key)}
                          >
                            {showSensitive[key] ? 'Hide' : 'Show'}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {setting.description}
                      </p>
                      {isBoolean ? (
                        <Switch
                          id={key}
                          checked={value === 'true'}
                          onCheckedChange={(checked) => handleChange(key, checked.toString())}
                        />
                      ) : (
                        <Input
                          id={key}
                          type={isSensitive && !showSensitive[key] ? 'password' : 'text'}
                          value={displayValue}
                          onChange={(e) => handleChange(key, e.target.value)}
                          className="max-w-xl"
                          placeholder={isSensitive ? 'Enter API key or password' : 'Enter value'}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </AnimatedCard>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// Revenue Dashboard Component
function RevenueDashboard() {
  const { toast } = useToast();
  
  // Fetch revenue overview
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['/api/superadmin/revenue/overview'],
    queryFn: () => apiRequest('GET', '/api/superadmin/revenue/overview'),
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    const isPositive = value > 0;
    return (
      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
        {isPositive ? '+' : ''}{value}%
      </span>
    );
  };

  const { current = {}, chart = [], recentEvents = [], paymentFailures = {} } = revenueData || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
          Revenue Dashboard
        </h1>
        <p className="text-navy-600 dark:text-navy-300">
          Track MRR, customer growth, and financial health
        </p>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Monthly Recurring Revenue</h3>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(current.mrr)}</div>
          <p className="text-sm text-gray-500 mt-1">
            {formatPercentage(current.growthRate)} from last month
          </p>
        </AnimatedCard>

        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Annual Recurring Revenue</h3>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(current.arr)}</div>
          <p className="text-sm text-gray-500 mt-1">
            {formatCurrency(current.mrr * 12)} projected
          </p>
        </AnimatedCard>

        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Customers</h3>
            <UsersIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold">{current.totalCustomers}</div>
          <p className="text-sm text-gray-500 mt-1">
            ARPU: {formatCurrency(current.averageRevenuePerUser)}
          </p>
        </AnimatedCard>

        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Churn Rate</h3>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold">{current.churnRate}%</div>
          <p className="text-sm text-gray-500 mt-1">
            Monthly average
          </p>
        </AnimatedCard>
      </div>

      {/* Payment Failures Alert */}
      {paymentFailures.totalFailures > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
            <span className="text-sm text-red-800 dark:text-red-200">
              {paymentFailures.totalFailures} payment failures totaling {formatCurrency(paymentFailures.failedAmount)} affecting {paymentFailures.affectedOrgs} organizations
            </span>
          </div>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </motion.div>
      )}

      {/* Revenue Chart */}
      <AnimatedCard variant="glow" className="p-6">
        <h3 className="text-lg font-semibold mb-4">MRR Trend (Last 30 Days)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM d')}
                stroke="#666"
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                stroke="#666"
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
              />
              <Area 
                type="monotone" 
                dataKey="mrr" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.1} 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </AnimatedCard>

      {/* Recent Subscription Events */}
      <AnimatedCard variant="glow" className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Subscription Events</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentEvents.map((event: any) => (
              <TableRow key={event.id}>
                <TableCell>{event.organizationName || 'Unknown'}</TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      event.eventType?.includes('created') ? 'default' :
                      event.eventType?.includes('upgraded') ? 'default' :
                      event.eventType?.includes('cancelled') ? 'destructive' :
                      'secondary'
                    }
                  >
                    {event.eventType?.replace('subscription.', '')}
                  </Badge>
                </TableCell>
                <TableCell>{event.planName}</TableCell>
                <TableCell>{formatCurrency(event.amount)}</TableCell>
                <TableCell>{format(new Date(event.occurredAt), 'MMM d, h:mm a')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AnimatedCard>
    </div>
  );
}

// Monitoring Dashboard Component
function MonitoringDashboard() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('24h');
  
  // Fetch monitoring overview
  const { data: monitoringData, isLoading } = useQuery({
    queryKey: ['/api/superadmin/monitoring/overview'],
    queryFn: () => apiRequest('GET', '/api/superadmin/monitoring/overview'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch system metrics for chart
  const { data: systemChartData = [] } = useQuery({
    queryKey: ['/api/superadmin/monitoring/metrics', 'system', selectedPeriod],
    queryFn: () => apiRequest('GET', `/api/superadmin/monitoring/metrics?type=system&period=${selectedPeriod}`),
  });

  const { 
    healthScore = 0, 
    systemMetrics = [], 
    apiPerformance = [], 
    serviceHealth = [], 
    recentErrors = [],
    databaseMetrics = {}
  } = monitoringData || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
      </div>
    );
  }

  // Get health score color
  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get service status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  // Format metrics data for chart
  const formatSystemMetrics = () => {
    const grouped: Record<string, any[]> = {};
    systemChartData.forEach((item: any) => {
      const hour = format(new Date(item.hour), 'HH:mm');
      if (!grouped[hour]) {
        grouped[hour] = { hour } as any;
      }
      grouped[hour][item.metricName || item.metric_name] = item.value;
    });
    return Object.values(grouped);
  };

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
          System Health Monitoring
        </h1>
        <p className="text-navy-600 dark:text-navy-300">
          Real-time system performance and health metrics
        </p>
      </motion.div>

      {/* Health Score */}
      <AnimatedCard variant="glow" className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Overall System Health</h3>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-bold ${getHealthColor(healthScore)}`}>
                {healthScore}%
              </span>
              <span className="text-gray-600">Health Score</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Last updated</p>
            <p className="text-sm font-medium">{format(new Date(), 'h:mm:ss a')}</p>
          </div>
        </div>
      </AnimatedCard>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {systemMetrics.map((metric: any) => (
          <AnimatedCard key={metric.metricName || metric.metric_name} variant="glow" className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">
                {(metric.metricName || metric.metric_name)?.replace(/_/g, ' ').toUpperCase()}
              </h3>
              {metric.metricName?.includes('cpu') && <Cpu className="w-5 h-5 text-blue-600" />}
              {metric.metricName?.includes('memory') && <Server className="w-5 h-5 text-purple-600" />}
              {metric.metricName?.includes('disk') && <HardDrive className="w-5 h-5 text-green-600" />}
            </div>
            <div className="text-2xl font-bold">
              {Math.round(metric.avgValue || metric.avg_value)}%
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Max: {Math.round(metric.maxValue || metric.max_value)}%
            </p>
          </AnimatedCard>
        ))}
      </div>

      {/* Database Metrics */}
      <AnimatedCard variant="glow" className="p-6">
        <h3 className="text-lg font-semibold mb-4">Database Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Queries/hour</p>
            <p className="text-xl font-bold">{databaseMetrics.queryCount || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Query Time</p>
            <p className="text-xl font-bold">{databaseMetrics.avgQueryTimeMs || 0}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Connections</p>
            <p className="text-xl font-bold">{databaseMetrics.connectionCount || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Cache Hit Rate</p>
            <p className="text-xl font-bold">{databaseMetrics.cacheHitRatio || 0}%</p>
          </div>
        </div>
      </AnimatedCard>

      {/* Service Health */}
      <AnimatedCard variant="glow" className="p-6">
        <h3 className="text-lg font-semibold mb-4">Service Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {serviceHealth.map((service: any) => (
            <div key={service.serviceName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(service.status)}
                <span className="font-medium capitalize">
                  {service.serviceName?.replace('_', ' ')}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {service.responseTimeMs}ms
              </span>
            </div>
          ))}
        </div>
      </AnimatedCard>

      {/* API Performance */}
      <AnimatedCard variant="glow" className="p-6">
        <h3 className="text-lg font-semibold mb-4">API Performance</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Endpoint</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Requests</TableHead>
              <TableHead>Avg Response</TableHead>
              <TableHead>Success Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiPerformance.map((api: any) => (
              <TableRow key={`${api.endpoint}-${api.method}`}>
                <TableCell className="font-mono text-sm">{api.endpoint}</TableCell>
                <TableCell>
                  <Badge variant="outline">{api.method}</Badge>
                </TableCell>
                <TableCell>{api.requestCount}</TableCell>
                <TableCell>{Math.round(api.avgResponseTime)}ms</TableCell>
                <TableCell>
                  <span className={api.successRate >= 99 ? 'text-green-600' : 'text-yellow-600'}>
                    {api.successRate}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AnimatedCard>

      {/* Recent Errors */}
      {recentErrors.length > 0 && (
        <AnimatedCard variant="glow" className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Errors</h3>
          <div className="space-y-2">
            {recentErrors.map((error: any) => (
              <div key={error.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">
                      {error.errorType}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                      {error.errorMessage}
                    </p>
                    {error.endpoint && (
                      <p className="text-xs text-gray-600 mt-1">
                        Endpoint: {error.endpoint}
                      </p>
                    )}
                  </div>
                  <Badge variant="destructive">
                    {error.severity}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {formatDistanceToNow(new Date(error.timestamp), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </AnimatedCard>
      )}
    </div>
  );
}

function AuditTrail() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [dateRange, setDateRange] = useState('7d');

  // Fetch audit logs
  const { data: auditData, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/superadmin/audit/logs', selectedCategory, dateRange],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('action_category', selectedCategory);
      if (dateRange !== 'all') {
        const endDate = new Date();
        const startDate = new Date();
        switch (dateRange) {
          case '24h':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case '7d':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(startDate.getDate() - 30);
            break;
        }
        params.append('start_date', startDate.toISOString());
        params.append('end_date', endDate.toISOString());
      }
      return apiRequest('GET', `/api/superadmin/audit/logs?${params.toString()}`);
    },
  });

  // Fetch audit statistics
  const { data: auditStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/superadmin/audit/stats'],
    queryFn: () => apiRequest('GET', '/api/superadmin/audit/stats'),
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch security events
  const { data: securityEvents } = useQuery({
    queryKey: ['/api/superadmin/audit/security-events', selectedSeverity],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSeverity !== 'all') params.append('severity', selectedSeverity);
      params.append('resolved', 'false');
      return apiRequest('GET', `/api/superadmin/audit/security-events?${params.toString()}`);
    },
  });

  const handleExportAudit = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange !== 'all') {
        const endDate = new Date();
        const startDate = new Date();
        switch (dateRange) {
          case '24h':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case '7d':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(startDate.getDate() - 30);
            break;
        }
        params.append('start_date', startDate.toISOString());
        params.append('end_date', endDate.toISOString());
      }
      
      // Create a download link
      const response = await fetch(`/api/superadmin/audit/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Export Successful',
        description: 'Audit logs have been exported to CSV',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export audit logs',
        variant: 'destructive',
      });
    }
  };

  const handleResolveSecurityEvent = async (eventId: number) => {
    try {
      await apiRequest('PUT', `/api/superadmin/audit/security-events/${eventId}/resolve`);
      toast({
        title: 'Security Event Resolved',
        description: 'The security event has been marked as resolved',
      });
      // Refetch security events
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Resolution Failed',
        description: 'Failed to resolve security event',
        variant: 'destructive',
      });
    }
  };

  const filteredLogs = useMemo(() => {
    if (!auditData?.logs) return [];
    return auditData.logs.filter((log: any) =>
      searchTerm === '' ||
      log.actionType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resourceName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [auditData, searchTerm]);

  if (logsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-600"></div>
      </div>
    );
  }

  return (
    <div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
              Audit Trail
            </h1>
            <p className="text-navy-600 dark:text-navy-300">
              Track all system changes and security events
            </p>
          </div>
          <Button
            onClick={handleExportAudit}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Actions (24h)</p>
              <p className="text-2xl font-bold text-electric-600">
                {auditStats?.adminActions?.totalActions || 0}
              </p>
            </div>
            <ActivityIcon className="w-8 h-8 text-electric-600/20" />
          </div>
        </AnimatedCard>

        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Admins</p>
              <p className="text-2xl font-bold text-blue-600">
                {auditStats?.adminActions?.activeAdmins || 0}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-blue-600/20" />
          </div>
        </AnimatedCard>

        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical Actions</p>
              <p className="text-2xl font-bold text-red-600">
                {auditStats?.adminActions?.criticalActions || 0}
              </p>
            </div>
            <ShieldAlert className="w-8 h-8 text-red-600/20" />
          </div>
        </AnimatedCard>

        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unresolved Events</p>
              <p className="text-2xl font-bold text-orange-600">
                {securityEvents?.events?.filter((e: any) => !e.resolved).length || 0}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600/20" />
          </div>
        </AnimatedCard>
      </div>

      {/* Security Alerts */}
      {securityEvents?.events?.filter((e: any) => !e.resolved && (e.severity === 'critical' || e.severity === 'high')).length > 0 && (
        <AnimatedCard variant="glow" className="p-6 mb-8 border-red-500/20 bg-red-50/5">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-600">Active Security Alerts</h3>
          </div>
          <div className="space-y-3">
            {securityEvents.events
              .filter((e: any) => !e.resolved && (e.severity === 'critical' || e.severity === 'high'))
              .slice(0, 5)
              .map((event: any) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-red-50/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={event.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {event.severity}
                    </Badge>
                    <div>
                      <p className="font-medium">{event.eventType}</p>
                      <p className="text-sm text-gray-600">
                        {event.username || 'Unknown user'} • {formatDistanceToNow(new Date(event.timestamp))} ago
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveSecurityEvent(event.id)}
                  >
                    Resolve
                  </Button>
                </div>
              ))}
          </div>
        </AnimatedCard>
      )}

      {/* Filters */}
      <AnimatedCard variant="glow" className="p-6 mb-8">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-navy-800"
          >
            <option value="all">All Categories</option>
            <option value="AUTH">Authentication</option>
            <option value="ORGANIZATION">Organization</option>
            <option value="USER">User</option>
            <option value="BILLING">Billing</option>
            <option value="SETTINGS">Settings</option>
            <option value="DATA">Data Access</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-navy-800"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-navy-800"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
        </div>
      </AnimatedCard>

      {/* Activity Timeline Chart */}
      {auditStats?.trend && (
        <AnimatedCard variant="glow" className="p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={auditStats.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                tickFormatter={(date) => format(new Date(date), 'MMM dd')}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
              />
              <Area 
                type="monotone" 
                dataKey="actionCount" 
                stroke="#10B981" 
                fill="#10B98130"
                name="Actions"
              />
            </AreaChart>
          </ResponsiveContainer>
        </AnimatedCard>
      )}

      {/* Audit Logs Table */}
      <AnimatedCard variant="glow" className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.username || 'System'}</p>
                        <p className="text-xs text-gray-500">{log.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.actionType}</Badge>
                    </TableCell>
                    <TableCell>{log.actionCategory}</TableCell>
                    <TableCell>
                      {log.resourceType && (
                        <div>
                          <p className="text-sm">{log.resourceType}</p>
                          {log.resourceName && (
                            <p className="text-xs text-gray-500">{log.resourceName}</p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {log.ipAddress || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </AnimatedCard>
    </div>
  );
}

function CustomerSupport() {
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [impersonateModal, setImpersonateModal] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Fetch support tickets
  const { data: ticketsData, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ['/api/superadmin/support/tickets', statusFilter, priorityFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      return apiRequest('GET', `/api/superadmin/support/tickets?${params.toString()}`);
    },
  });

  // Fetch support metrics
  const { data: metricsData } = useQuery({
    queryKey: ['/api/superadmin/support/metrics'],
    queryFn: () => apiRequest('GET', '/api/superadmin/support/metrics'),
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch ticket messages when a ticket is selected
  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/superadmin/support/tickets', selectedTicket?.id, 'messages'],
    queryFn: () => apiRequest('GET', `/api/superadmin/support/tickets/${selectedTicket.id}/messages`),
    enabled: !!selectedTicket,
  });

  // Fetch canned responses
  const { data: cannedResponses } = useQuery({
    queryKey: ['/api/superadmin/support/canned-responses'],
    queryFn: () => apiRequest('GET', '/api/superadmin/support/canned-responses'),
  });

  const handleSendMessage = async () => {
    if (!selectedTicket || !messageText.trim()) return;

    try {
      await apiRequest('POST', `/api/superadmin/support/tickets/${selectedTicket.id}/messages`, {
        message: messageText,
        is_internal_note: isInternalNote,
      });

      toast({
        title: 'Message Sent',
        description: isInternalNote ? 'Internal note added' : 'Message sent to customer',
      });

      setMessageText('');
      setIsInternalNote(false);
      refetchMessages();
      refetchTickets();
    } catch (error) {
      toast({
        title: 'Send Failed',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTicketStatus = async (ticketId: number, status: string) => {
    try {
      await apiRequest('PUT', `/api/superadmin/support/tickets/${ticketId}`, { status });
      toast({
        title: 'Status Updated',
        description: `Ticket status changed to ${status}`,
      });
      refetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      });
    }
  };

  const handleImpersonate = async () => {
    if (!selectedUserId || !impersonateReason.trim()) return;

    try {
      const result = await apiRequest('POST', '/api/superadmin/support/impersonate', {
        target_user_id: selectedUserId,
        reason: impersonateReason,
      });

      toast({
        title: 'Impersonation Started',
        description: `Now impersonating ${result.targetUser.email}`,
      });

      // Store impersonation token
      localStorage.setItem('impersonation_token', result.sessionToken);
      
      // Redirect to main app as impersonated user
      window.location.href = '/';
    } catch (error) {
      toast({
        title: 'Impersonation Failed',
        description: 'Failed to start impersonation session',
        variant: 'destructive',
      });
    }
  };

  const useCannedResponse = (response: any) => {
    setMessageText(response.content);
  };

  if (ticketsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-600"></div>
      </div>
    );
  }

  return (
    <div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
          Customer Support
        </h1>
        <p className="text-navy-600 dark:text-navy-300">
          Manage support tickets and assist customers
        </p>
      </motion.div>

      {/* Metrics Overview */}
      {metricsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Open Tickets</p>
                <p className="text-2xl font-bold text-electric-600">
                  {metricsData.currentStats?.openTickets || 0}
                </p>
              </div>
              <Headphones className="w-8 h-8 text-electric-600/20" />
            </div>
          </AnimatedCard>

          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Urgent Priority</p>
                <p className="text-2xl font-bold text-red-600">
                  {metricsData.currentStats?.urgentTickets || 0}
                </p>
              </div>
              <Zap className="w-8 h-8 text-red-600/20" />
            </div>
          </AnimatedCard>

          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {metricsData.currentStats?.inProgressTickets || 0}
                </p>
              </div>
              <RefreshCw className="w-8 h-8 text-blue-600/20" />
            </div>
          </AnimatedCard>

          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Resolution</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(metricsData.currentStats?.avgResolutionHours || 0)}h
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600/20" />
            </div>
          </AnimatedCard>
        </div>
      )}

      {/* Filters */}
      <AnimatedCard variant="glow" className="p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-navy-800"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_customer">Waiting Customer</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-navy-800"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </AnimatedCard>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          <AnimatedCard variant="glow" className="p-4 h-[600px] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Support Tickets</h3>
            <div className="space-y-3">
              {ticketsData?.tickets?.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No tickets found</p>
              ) : (
                ticketsData?.tickets?.map((ticket: any) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={cn(
                      "p-4 rounded-lg cursor-pointer transition-all",
                      selectedTicket?.id === ticket.id
                        ? "bg-electric-500/20 border border-electric-500/30"
                        : "bg-gray-50 dark:bg-navy-700/50 hover:bg-gray-100 dark:hover:bg-navy-700"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        {ticket.ticketNumber}
                      </span>
                      <Badge
                        variant={
                          ticket.priority === 'urgent' ? 'destructive' :
                          ticket.priority === 'high' ? 'secondary' :
                          'outline'
                        }
                      >
                        {ticket.priority}
                      </Badge>
                    </div>
                    <h4 className="font-medium mb-1">{ticket.subject}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">
                        {ticket.userEmail}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AnimatedCard>
        </div>

        {/* Ticket Details & Messages */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <AnimatedCard variant="glow" className="p-6 h-[600px] flex flex-col">
              {/* Ticket Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedTicket.subject}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedTicket.ticketNumber} • {selectedTicket.userEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUserId(selectedTicket.userId);
                        setImpersonateModal(true);
                      }}
                    >
                      <UserX className="w-4 h-4 mr-1" />
                      Impersonate
                    </Button>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-navy-800"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_customer">Waiting Customer</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {messagesData?.messages?.map((message: any) => (
                  <div
                    key={message.id}
                    className={cn(
                      "p-4 rounded-lg",
                      message.isInternalNote
                        ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                        : message.senderRole === 'superadmin'
                        ? "bg-blue-50 dark:bg-blue-900/20 ml-8"
                        : "bg-gray-50 dark:bg-gray-800 mr-8"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {message.senderUsername || message.senderEmail}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(message.createdAt))} ago
                      </span>
                    </div>
                    <p className="text-sm">{message.message}</p>
                    {message.isInternalNote && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Internal Note
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                {/* Canned Responses */}
                {cannedResponses?.responses?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quick responses:</p>
                    <div className="flex flex-wrap gap-2">
                      {cannedResponses.responses.slice(0, 3).map((response: any) => (
                        <Button
                          key={response.id}
                          size="sm"
                          variant="outline"
                          onClick={() => useCannedResponse(response)}
                        >
                          {response.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-lg resize-none"
                    rows={3}
                  />
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                      />
                      Internal
                    </label>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim()}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          ) : (
            <AnimatedCard variant="glow" className="p-6 h-[600px] flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Select a ticket to view details</p>
              </div>
            </AnimatedCard>
          )}
        </div>
      </div>

      {/* Impersonation Modal */}
      {impersonateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <AnimatedCard variant="glow" className="p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Start Impersonation Session</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You're about to impersonate a user. This action will be logged and audited.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Reason for impersonation</label>
              <textarea
                value={impersonateReason}
                onChange={(e) => setImpersonateReason(e.target.value)}
                placeholder="e.g., Customer requested help with account settings"
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleImpersonate}
                disabled={!impersonateReason.trim()}
              >
                Start Impersonation
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setImpersonateModal(false);
                  setImpersonateReason('');
                }}
              >
                Cancel
              </Button>
            </div>
          </AnimatedCard>
        </div>
      )}
    </div>
  );
}

function AnalyticsDashboard() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch analytics overview
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['/api/superadmin/analytics/overview', selectedPeriod],
    queryFn: () => apiRequest('GET', `/api/superadmin/analytics/overview?period=${selectedPeriod}`),
  });

  // Fetch user behavior analytics
  const { data: behaviorData } = useQuery({
    queryKey: ['/api/superadmin/analytics/user-behavior', selectedPeriod],
    queryFn: () => apiRequest('GET', `/api/superadmin/analytics/user-behavior?period=${selectedPeriod}`),
    enabled: activeTab === 'behavior',
  });

  // Fetch funnel analytics
  const { data: funnelData } = useQuery({
    queryKey: ['/api/superadmin/analytics/funnels'],
    queryFn: () => apiRequest('GET', '/api/superadmin/analytics/funnels'),
    enabled: activeTab === 'funnels',
  });

  // Fetch performance analytics
  const { data: performanceData } = useQuery({
    queryKey: ['/api/superadmin/analytics/performance', selectedPeriod],
    queryFn: () => apiRequest('GET', `/api/superadmin/analytics/performance?period=${selectedPeriod}`),
    enabled: activeTab === 'performance',
  });

  // Fetch user segments
  const { data: segmentsData } = useQuery({
    queryKey: ['/api/superadmin/analytics/segments'],
    queryFn: () => apiRequest('GET', '/api/superadmin/analytics/segments'),
    enabled: activeTab === 'segments',
  });

  // Fetch business metrics
  const { data: metricsData } = useQuery({
    queryKey: ['/api/superadmin/analytics/business-metrics', selectedPeriod],
    queryFn: () => apiRequest('GET', `/api/superadmin/analytics/business-metrics?period=${selectedPeriod}`),
    enabled: activeTab === 'metrics',
  });

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-600"></div>
      </div>
    );
  }

  return (
    <div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
              Analytics
            </h1>
            <p className="text-navy-600 dark:text-navy-300">
              Deep insights into user behavior and platform performance
            </p>
          </div>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-navy-800"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </motion.div>

      {/* Key Metrics */}
      {overviewData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-electric-600">
                  {overviewData.keyMetrics?.totalUsers || 0}
                </p>
              </div>
              <UsersIcon className="w-8 h-8 text-electric-600/20" />
            </div>
          </AnimatedCard>

          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {overviewData.keyMetrics?.totalSessions || 0}
                </p>
              </div>
              <MousePointer className="w-8 h-8 text-blue-600/20" />
            </div>
          </AnimatedCard>

          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Events</p>
                <p className="text-2xl font-bold text-green-600">
                  {overviewData.keyMetrics?.totalEvents || 0}
                </p>
              </div>
              <ActivityIcon className="w-8 h-8 text-green-600/20" />
            </div>
          </AnimatedCard>

          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Days</p>
                <p className="text-2xl font-bold text-purple-600">
                  {overviewData.keyMetrics?.activeDays || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-600/20" />
            </div>
          </AnimatedCard>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="funnels">Funnels</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {/* User Growth Chart */}
          {overviewData?.userGrowth && (
            <AnimatedCard variant="glow" className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">User Growth</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={overviewData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                    labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="newUsers" 
                    stroke="#10B981" 
                    fill="#10B98130"
                    name="New Users"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </AnimatedCard>
          )}

          {/* Top Events & Feature Usage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Events */}
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-lg font-semibold mb-4">Top Events</h3>
              <div className="space-y-3">
                {overviewData?.topEvents?.map((event: any) => (
                  <div key={`${event.eventType}-${event.eventName}`} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{event.eventName}</p>
                      <p className="text-sm text-gray-500">{event.eventType}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{event.eventCount}</p>
                      <p className="text-sm text-gray-500">{event.uniqueUsers} users</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedCard>

            {/* Feature Usage */}
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-lg font-semibold mb-4">Feature Usage</h3>
              <div className="space-y-3">
                {overviewData?.featureUsage?.map((feature: any) => (
                  <div key={feature.featureName} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{feature.featureName.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-500">
                        Last used {formatDistanceToNow(new Date(feature.lastUsed))} ago
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{feature.totalUsage}</p>
                      <p className="text-sm text-gray-500">{feature.uniqueUsers} users</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedCard>
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="mt-6">
          {behaviorData && (
            <>
              {/* Activity Heatmap */}
              <AnimatedCard variant="glow" className="p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Activity Patterns</h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  User activity by day of week and hour
                </div>
                <div className="grid grid-cols-25 gap-1 mt-4">
                  {/* Render heatmap grid here based on activityPatterns data */}
                  <p className="text-gray-500">Activity heatmap visualization</p>
                </div>
              </AnimatedCard>

              {/* Session Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <AnimatedCard variant="glow" className="p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Session Duration</p>
                  <p className="text-2xl font-bold text-electric-600">
                    {Math.round(behaviorData.sessionStats?.avgSessionDurationMinutes || 0)}m
                  </p>
                </AnimatedCard>

                <AnimatedCard variant="glow" className="p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Median Session Duration</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(behaviorData.sessionStats?.medianSessionDurationMinutes || 0)}m
                  </p>
                </AnimatedCard>

                <AnimatedCard variant="glow" className="p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Events per Session</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(behaviorData.sessionStats?.avgEventsPerSession || 0)}
                  </p>
                </AnimatedCard>

                <AnimatedCard variant="glow" className="p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {behaviorData.sessionStats?.totalSessions || 0}
                  </p>
                </AnimatedCard>
              </div>

              {/* User Flow */}
              <AnimatedCard variant="glow" className="p-6">
                <h3 className="text-lg font-semibold mb-4">User Flow</h3>
                <div className="space-y-2">
                  {behaviorData.userFlow?.slice(0, 10).map((flow: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4">
                      <Badge variant="outline">{flow.previousEvent}</Badge>
                      <span className="text-gray-500">→</span>
                      <Badge variant="outline">{flow.nextEvent}</Badge>
                      <span className="text-sm text-gray-500 ml-auto">
                        {flow.transitionCount} transitions
                      </span>
                    </div>
                  ))}
                </div>
              </AnimatedCard>
            </>
          )}
        </TabsContent>

        <TabsContent value="funnels" className="mt-6">
          {funnelData && (
            <>
              {/* Funnel Conversion Rates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {funnelData.conversionRates?.map((funnel: any) => (
                  <AnimatedCard key={funnel.funnelName} variant="glow" className="p-6">
                    <h4 className="font-semibold mb-4">{funnel.funnelName} Funnel</h4>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-3xl font-bold text-electric-600">
                          {funnel.overallConversionRate}%
                        </p>
                        <p className="text-sm text-gray-500">Overall Conversion</p>
                      </div>
                      <Target className="w-12 h-12 text-electric-600/20" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Total Users</p>
                        <p className="font-medium">{funnel.totalUsers}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Completed</p>
                        <p className="font-medium">{funnel.completedUsers}</p>
                      </div>
                    </div>
                  </AnimatedCard>
                ))}
              </div>

              {/* Funnel Steps */}
              <AnimatedCard variant="glow" className="p-6">
                <h3 className="text-lg font-semibold mb-4">Funnel Steps</h3>
                <div className="space-y-4">
                  {funnelData.funnelSteps?.map((step: any) => (
                    <div key={`${step.funnelName}-${step.stepName}`} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{step.funnelName}</span>
                          <span className="mx-2 text-gray-500">•</span>
                          <span>{step.stepName}</span>
                        </div>
                        <Badge variant={step.completionRate > 80 ? 'default' : step.completionRate > 50 ? 'secondary' : 'destructive'}>
                          {step.completionRate}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-electric-600 h-2 rounded-full transition-all"
                          style={{ width: `${step.completionRate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>{step.usersReached} reached</span>
                        <span>{step.usersCompleted} completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </AnimatedCard>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          {performanceData && (
            <>
              {/* Performance Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                {performanceData.performanceDistribution?.map((category: any) => (
                  <AnimatedCard key={category.performanceCategory} variant="glow" className="p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.performanceCategory}
                    </p>
                    <p className="text-2xl font-bold text-electric-600">{category.percentage}%</p>
                    <p className="text-sm text-gray-500">{category.count} requests</p>
                  </AnimatedCard>
                ))}
              </div>

              {/* Performance Over Time */}
              <AnimatedCard variant="glow" className="p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData.performanceOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#9CA3AF"
                      tickFormatter={(hour) => format(new Date(hour), 'MMM dd HH:mm')}
                    />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                      labelFormatter={(hour) => format(new Date(hour), 'MMM dd, HH:mm')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgLoadTime" 
                      stroke="#EF4444" 
                      name="Load Time (ms)"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgTtfb" 
                      stroke="#F59E0B" 
                      name="TTFB (ms)"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgFcp" 
                      stroke="#10B981" 
                      name="FCP (ms)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </AnimatedCard>

              {/* Performance by Page */}
              <AnimatedCard variant="glow" className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance by Page</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page URL</TableHead>
                        <TableHead>Avg Load Time</TableHead>
                        <TableHead>Median</TableHead>
                        <TableHead>P95</TableHead>
                        <TableHead>Samples</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceData.performanceByPage?.map((page: any) => (
                        <TableRow key={page.pageUrl}>
                          <TableCell className="font-medium">{page.pageUrl}</TableCell>
                          <TableCell>{Math.round(page.avgLoadTime)}ms</TableCell>
                          <TableCell>{Math.round(page.medianLoadTime)}ms</TableCell>
                          <TableCell>{Math.round(page.p95LoadTime)}ms</TableCell>
                          <TableCell>{page.sampleCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AnimatedCard>
            </>
          )}
        </TabsContent>

        <TabsContent value="segments" className="mt-6">
          {segmentsData && (
            <>
              {/* User Segments */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {segmentsData.segments?.map((segment: any) => (
                  <AnimatedCard key={segment.id} variant="glow" className="p-6">
                    <h4 className="font-semibold mb-2">{segment.segmentName}</h4>
                    <p className="text-sm text-gray-500 mb-4">{segment.segmentDescription}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-electric-600">{segment.memberCount}</p>
                        <p className="text-sm text-gray-500">members</p>
                      </div>
                      <UsersIcon className="w-8 h-8 text-electric-600/20" />
                    </div>
                    {segment.lastMemberJoined && (
                      <p className="text-xs text-gray-500 mt-2">
                        Last joined {formatDistanceToNow(new Date(segment.lastMemberJoined))} ago
                      </p>
                    )}
                  </AnimatedCard>
                ))}
              </div>

              {/* Segment Growth */}
              {segmentsData.segmentGrowth && (
                <AnimatedCard variant="glow" className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Segment Growth</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={segmentsData.segmentGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                        tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                      />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                        labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                      />
                      {/* Dynamic lines for each segment */}
                      <Line type="monotone" dataKey="newMembers" stroke="#10B981" name="New Members" />
                    </LineChart>
                  </ResponsiveContainer>
                </AnimatedCard>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          {metricsData && (
            <>
              {/* Metric Summaries */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {metricsData.summaries?.slice(0, 6).map((summary: any) => (
                  <AnimatedCard key={summary.metricName} variant="glow" className="p-6">
                    <h4 className="font-medium mb-2">{summary.metricName.replace('_', ' ')}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Average</p>
                        <p className="font-medium">{Math.round(summary.avgValue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Max</p>
                        <p className="font-medium">{Math.round(summary.maxValue)}</p>
                      </div>
                    </div>
                  </AnimatedCard>
                ))}
              </div>

              {/* Business Metrics Chart */}
              <AnimatedCard variant="glow" className="p-6">
                <h3 className="text-lg font-semibold mb-4">Business Metrics</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={metricsData.metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                    />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                      labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                    />
                    {/* Dynamic lines based on available metrics */}
                  </LineChart>
                </ResponsiveContainer>
              </AnimatedCard>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DevOpsDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('deployments');

  // Fetch deployments
  const { data: deployments = [], isLoading: deploymentsLoading } = useQuery({
    queryKey: ['/api/superadmin/devops/deployments'],
    queryFn: () => apiRequest('GET', '/api/superadmin/devops/deployments'),
    refetchInterval: 30000
  });

  // Fetch infrastructure
  const { data: infrastructureData, isLoading: infraLoading } = useQuery({
    queryKey: ['/api/superadmin/devops/infrastructure'],
    queryFn: () => apiRequest('GET', '/api/superadmin/devops/infrastructure'),
    refetchInterval: 60000
  });

  // Fetch health checks
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['/api/superadmin/devops/health'],
    queryFn: () => apiRequest('GET', '/api/superadmin/devops/health'),
    refetchInterval: 10000
  });

  const infrastructure = infrastructureData?.resources || [];
  const healthChecks = healthData?.services || [];

  // Fetch pipeline runs
  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
    queryKey: ['/api/superadmin/devops/pipelines'],
    queryFn: () => apiRequest('GET', '/api/superadmin/devops/pipelines'),
    refetchInterval: 30000
  });

  // Fetch SSL certificates
  const { data: certificates = [], isLoading: certsLoading } = useQuery({
    queryKey: ['/api/superadmin/devops/certificates'],
    queryFn: () => apiRequest('GET', '/api/superadmin/devops/certificates'),
    refetchInterval: 60000
  });

  // Fetch backups
  const { data: backups = [], isLoading: backupsLoading } = useQuery({
    queryKey: ['/api/superadmin/devops/backups'],
    queryFn: () => apiRequest('GET', '/api/superadmin/devops/backups'),
    refetchInterval: 60000
  });

  const handleDeploy = async (environment: string) => {
    try {
      await apiRequest('POST', '/api/superadmin/devops/deployments', {
        environment,
        deploymentType: 'manual'
      });
      toast({
        title: 'Deployment Started',
        description: `Deployment to ${environment} has been initiated`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/devops/deployments'] });
    } catch (error) {
      toast({
        title: 'Deployment Failed',
        description: 'Failed to start deployment',
        variant: 'destructive',
      });
    }
  };

  const handleBackupNow = async () => {
    try {
      await apiRequest('POST', '/api/superadmin/devops/backups', {
        backupType: 'manual',
        source: 'database'
      });
      toast({
        title: 'Backup Started',
        description: 'Manual backup has been initiated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/devops/backups'] });
    } catch (error) {
      toast({
        title: 'Backup Failed',
        description: 'Failed to start backup',
        variant: 'destructive',
      });
    }
  };

  const infraCost = infrastructureData?.totalMonthlyCost || infrastructure.reduce((sum: number, resource: any) => sum + (resource.costPerMonth || 0), 0);

  return (
    <div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
          DevOps & Infrastructure
        </h1>
        <p className="text-navy-600 dark:text-navy-300">
          Manage deployments, infrastructure, and system operations
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="certificates">SSL</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
        </TabsList>

        <TabsContent value="deployments" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Recent Deployments</h3>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleDeploy('staging')}>
                <Rocket className="w-4 h-4 mr-2" />
                Deploy to Staging
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDeploy('production')}>
                <Rocket className="w-4 h-4 mr-2" />
                Deploy to Production
              </Button>
            </div>
          </div>

          <AnimatedCard variant="glow" className="p-6">
            {deploymentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.map((deployment: any) => (
                    <TableRow key={deployment.id}>
                      <TableCell className="font-mono">{deployment.version}</TableCell>
                      <TableCell>
                        <Badge variant={deployment.environment === 'production' ? 'destructive' : 'default'}>
                          {deployment.environment}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={deployment.status === 'success' ? 'default' : deployment.status === 'failed' ? 'destructive' : 'secondary'}>
                          {deployment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{deployment.deploymentType}</TableCell>
                      <TableCell>{format(new Date(deployment.startedAt), 'MMM dd HH:mm')}</TableCell>
                      <TableCell>
                        {deployment.completedAt ? 
                          `${Math.round((new Date(deployment.completedAt).getTime() - new Date(deployment.startedAt).getTime()) / 1000)}s` 
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Resources</h3>
              <p className="text-2xl font-bold">{infrastructure.length}</p>
            </AnimatedCard>
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Monthly Cost</h3>
              <p className="text-2xl font-bold">${infraCost.toFixed(2)}</p>
            </AnimatedCard>
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Active Services</h3>
              <p className="text-2xl font-bold">{infrastructure.filter((r: any) => r.status === 'active').length}</p>
            </AnimatedCard>
          </div>

          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Infrastructure Resources</h3>
            {infraLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost/Month</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {infrastructure.map((resource: any) => (
                    <TableRow key={resource.id}>
                      <TableCell className="font-medium">{resource.resourceName}</TableCell>
                      <TableCell>{resource.resourceType}</TableCell>
                      <TableCell>{resource.provider}</TableCell>
                      <TableCell>{resource.region}</TableCell>
                      <TableCell>
                        <Badge variant={resource.status === 'active' ? 'default' : 'secondary'}>
                          {resource.status}
                        </Badge>
                      </TableCell>
                      <TableCell>${resource.costPerMonth?.toFixed(2) || '0.00'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>
        </TabsContent>

        <TabsContent value="pipelines" className="space-y-4">
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">CI/CD Pipeline Runs</h3>
            {pipelinesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Run #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelines.map((pipeline: any) => (
                    <TableRow key={pipeline.id}>
                      <TableCell className="font-medium">{pipeline.pipelineName}</TableCell>
                      <TableCell>#{pipeline.runNumber}</TableCell>
                      <TableCell>
                        <Badge variant={
                          pipeline.status === 'success' ? 'default' : 
                          pipeline.status === 'failed' ? 'destructive' : 
                          pipeline.status === 'running' ? 'secondary' : 'outline'
                        }>
                          {pipeline.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{pipeline.gitBranch}</TableCell>
                      <TableCell>{pipeline.triggerType}</TableCell>
                      <TableCell>{pipeline.durationSeconds ? `${pipeline.durationSeconds}s` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthLoading ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              healthChecks.map((check: any) => (
                <AnimatedCard key={check.id} variant="glow" className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{check.serviceName}</h4>
                    <Badge variant={check.status === 'healthy' ? 'default' : 'destructive'}>
                      {check.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span>{check.checkType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Response Time:</span>
                      <span>{check.responseTimeMs}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Check:</span>
                      <span>{format(new Date(check.checkedAt), 'HH:mm:ss')}</span>
                    </div>
                  </div>
                </AnimatedCard>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">SSL Certificates</h3>
            {certsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Issuer</TableHead>
                    <TableHead>Valid From</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Auto Renew</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert: any) => {
                    const daysUntilExpiry = Math.floor((new Date(cert.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">{cert.domain}</TableCell>
                        <TableCell>{cert.issuer}</TableCell>
                        <TableCell>{format(new Date(cert.validFrom), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{format(new Date(cert.validUntil), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant={cert.autoRenew ? 'default' : 'secondary'}>
                            {cert.autoRenew ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={daysUntilExpiry > 30 ? 'default' : daysUntilExpiry > 7 ? 'secondary' : 'destructive'}>
                            {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expired'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>
        </TabsContent>

        <TabsContent value="backups" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Backup Records</h3>
            <Button size="sm" onClick={handleBackupNow}>
              <Database className="w-4 h-4 mr-2" />
              Backup Now
            </Button>
          </div>

          <AnimatedCard variant="glow" className="p-6">
            {backupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Backup ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup: any) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-mono text-sm">{backup.backupId}</TableCell>
                      <TableCell>{backup.backupType}</TableCell>
                      <TableCell>{backup.source}</TableCell>
                      <TableCell>{backup.sizeBytes ? `${(backup.sizeBytes / 1024 / 1024).toFixed(2)} MB` : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={backup.status === 'completed' ? 'default' : backup.status === 'failed' ? 'destructive' : 'secondary'}>
                          {backup.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(backup.startedAt), 'MMM dd HH:mm')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WhiteLabelManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('configs');
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // Fetch white label configs
  const { data: configs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['/api/superadmin/whitelabel/configs'],
    queryFn: () => apiRequest('GET', '/api/superadmin/whitelabel/configs'),
    refetchInterval: 30000
  });

  // Fetch theme presets
  const { data: themes = [], isLoading: themesLoading } = useQuery({
    queryKey: ['/api/superadmin/whitelabel/themes'],
    queryFn: () => apiRequest('GET', '/api/superadmin/whitelabel/themes')
  });

  // Fetch pages for selected org
  const { data: pages = [], isLoading: pagesLoading } = useQuery({
    queryKey: selectedConfig ? ['/api/superadmin/whitelabel/pages', selectedConfig.organizationId] : [],
    queryFn: () => apiRequest('GET', `/api/superadmin/whitelabel/pages/${selectedConfig.organizationId}`),
    enabled: !!selectedConfig
  });

  // Fetch templates for selected org
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: selectedConfig ? ['/api/superadmin/whitelabel/templates', selectedConfig.organizationId] : [],
    queryFn: () => apiRequest('GET', `/api/superadmin/whitelabel/templates/${selectedConfig.organizationId}`),
    enabled: !!selectedConfig
  });

  const handleUpdateConfig = async (configId: number, updates: any) => {
    try {
      await apiRequest('PUT', `/api/superadmin/whitelabel/configs/${configId}`, updates);
      toast({
        title: 'Config Updated',
        description: 'White label configuration has been updated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/whitelabel/configs'] });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update configuration',
        variant: 'destructive',
      });
    }
  };

  const handleCreatePage = async () => {
    try {
      await apiRequest('POST', '/api/superadmin/whitelabel/pages', {
        organization_id: selectedConfig.organizationId,
        slug: 'new-page',
        title: 'New Page',
        content: '<h1>New Page</h1><p>Edit this content...</p>',
        is_public: true
      });
      toast({
        title: 'Page Created',
        description: 'New custom page has been created',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/whitelabel/pages'] });
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: 'Failed to create page',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePage = async (pageId: number, updates: any) => {
    try {
      await apiRequest('PUT', `/api/superadmin/whitelabel/pages/${pageId}`, updates);
      toast({
        title: 'Page Updated',
        description: 'Custom page has been updated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/whitelabel/pages'] });
      setEditingPage(null);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update page',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTemplate = async (templateId: number, updates: any) => {
    try {
      await apiRequest('PUT', `/api/superadmin/whitelabel/templates/${templateId}`, updates);
      toast({
        title: 'Template Updated',
        description: 'Email template has been updated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/whitelabel/templates'] });
      setEditingTemplate(null);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyDomain = async (orgId: number, domain: string) => {
    try {
      const result = await apiRequest('POST', '/api/superadmin/whitelabel/verify-domain', {
        organization_id: orgId,
        domain
      });
      toast({
        title: 'Domain Verification Started',
        description: 'Add the following TXT record to your DNS: ' + result.dnsRecord.value,
      });
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: 'Failed to start domain verification',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
          White Label Management
        </h1>
        <p className="text-navy-600 dark:text-navy-300">
          Configure custom branding and domains for organizations
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configs">Configurations</TabsTrigger>
          <TabsTrigger value="themes">Theme Presets</TabsTrigger>
          <TabsTrigger value="pages" disabled={!selectedConfig}>
            Custom Pages {selectedConfig && `(${pages.length})`}
          </TabsTrigger>
          <TabsTrigger value="templates" disabled={!selectedConfig}>
            Email Templates {selectedConfig && `(${templates.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configs" className="space-y-4">
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">White Label Configurations</h3>
            {configsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Brand Name</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Templates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config: any) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.organizationName}</TableCell>
                      <TableCell>
                        <a href={`https://${config.domain}`} target="_blank" rel="noopener noreferrer" 
                           className="text-blue-500 hover:underline">
                          {config.domain}
                        </a>
                      </TableCell>
                      <TableCell>{config.brandName}</TableCell>
                      <TableCell>{config.customPagesCount || 0}</TableCell>
                      <TableCell>{config.emailTemplatesCount || 0}</TableCell>
                      <TableCell>
                        <Badge variant={config.isActive ? 'default' : 'secondary'}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedConfig(config)}
                          >
                            <Palette className="w-4 h-4 mr-1" />
                            Manage
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerifyDomain(config.organizationId, config.domain)}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>

          {selectedConfig && (
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Edit Configuration: {selectedConfig.brandName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Primary Color</Label>
                  <Input
                    type="color"
                    value={selectedConfig.primaryColor || '#3B82F6'}
                    onChange={(e) => {
                      const updated = { ...selectedConfig, primaryColor: e.target.value };
                      setSelectedConfig(updated);
                    }}
                  />
                </div>
                <div>
                  <Label>Secondary Color</Label>
                  <Input
                    type="color"
                    value={selectedConfig.secondaryColor || '#1E40AF'}
                    onChange={(e) => {
                      const updated = { ...selectedConfig, secondaryColor: e.target.value };
                      setSelectedConfig(updated);
                    }}
                  />
                </div>
                <div>
                  <Label>Accent Color</Label>
                  <Input
                    type="color"
                    value={selectedConfig.accentColor || '#10B981'}
                    onChange={(e) => {
                      const updated = { ...selectedConfig, accentColor: e.target.value };
                      setSelectedConfig(updated);
                    }}
                  />
                </div>
                <div>
                  <Label>Font Family</Label>
                  <Input
                    value={selectedConfig.fontFamily || 'Inter'}
                    onChange={(e) => {
                      const updated = { ...selectedConfig, fontFamily: e.target.value };
                      setSelectedConfig(updated);
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Custom CSS</Label>
                  <textarea
                    className="w-full h-32 px-3 py-2 border rounded-md bg-background"
                    value={selectedConfig.customCss || ''}
                    onChange={(e) => {
                      const updated = { ...selectedConfig, customCss: e.target.value };
                      setSelectedConfig(updated);
                    }}
                    placeholder="/* Custom CSS rules */"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => handleUpdateConfig(selectedConfig.id, {
                  primary_color: selectedConfig.primaryColor,
                  secondary_color: selectedConfig.secondaryColor,
                  accent_color: selectedConfig.accentColor,
                  font_family: selectedConfig.fontFamily,
                  custom_css: selectedConfig.customCss
                })}>
                  Save Changes
                </Button>
              </div>
            </AnimatedCard>
          )}
        </TabsContent>

        <TabsContent value="themes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {themesLoading ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              themes.map((theme: any) => (
                <AnimatedCard key={theme.id} variant="glow" className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">{theme.name}</h4>
                    {theme.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{theme.description}</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <span className="text-sm">Primary: {theme.colors.primary}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: theme.colors.secondary }}
                      />
                      <span className="text-sm">Secondary: {theme.colors.secondary}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                      <span className="text-sm">Accent: {theme.colors.accent}</span>
                    </div>
                  </div>
                  <div className="mt-4 text-sm">
                    <p>Heading Font: {theme.fonts.heading}</p>
                    <p>Body Font: {theme.fonts.body}</p>
                  </div>
                </AnimatedCard>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Custom Pages</h3>
            <Button size="sm" onClick={handleCreatePage}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Page
            </Button>
          </div>

          <AnimatedCard variant="glow" className="p-6">
            {pagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : pages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No custom pages created yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page: any) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.title}</TableCell>
                      <TableCell className="font-mono text-sm">/{page.slug}</TableCell>
                      <TableCell>
                        <Badge variant={page.isPublic ? 'default' : 'secondary'}>
                          {page.isPublic ? 'Public' : 'Private'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(page.updatedAt), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingPage(page)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>

          {editingPage && (
            <AnimatedCard variant="glow" className="p-6">
              <h4 className="font-semibold mb-4">Edit Page: {editingPage.title}</h4>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={editingPage.title}
                    onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Content (HTML)</Label>
                  <textarea
                    className="w-full h-64 px-3 py-2 border rounded-md bg-background font-mono text-sm"
                    value={editingPage.content}
                    onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingPage(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => handleUpdatePage(editingPage.id, {
                    title: editingPage.title,
                    content: editingPage.content,
                    is_public: editingPage.isPublic
                  })}>
                    Save Page
                  </Button>
                </div>
              </div>
            </AnimatedCard>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Email Templates</h3>
            {templatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No email templates configured
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template: any) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        {template.templateType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell>
                        <Badge variant={template.isActive ? 'default' : 'secondary'}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingTemplate(template)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>

          {editingTemplate && (
            <AnimatedCard variant="glow" className="p-6">
              <h4 className="font-semibold mb-4">
                Edit Template: {editingTemplate.templateType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </h4>
              <div className="space-y-4">
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  />
                </div>
                <div>
                  <Label>HTML Content</Label>
                  <textarea
                    className="w-full h-64 px-3 py-2 border rounded-md bg-background font-mono text-sm"
                    value={editingTemplate.htmlContent}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, htmlContent: e.target.value })}
                    placeholder="<h1>{{brand_name}}</h1>..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => handleUpdateTemplate(editingTemplate.id, {
                    subject: editingTemplate.subject,
                    html_content: editingTemplate.htmlContent,
                    is_active: editingTemplate.isActive
                  })}>
                    Save Template
                  </Button>
                </div>
              </div>
            </AnimatedCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CommunicationHub() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('announcements');
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'general',
    severity: 'info',
    target_audience: 'all',
    is_pinned: false
  });
  const [newBroadcast, setNewBroadcast] = useState({
    subject: '',
    content: '',
    recipient_type: 'all_users',
    scheduled_at: ''
  });
  const [editingChangelog, setEditingChangelog] = useState<any>(null);

  // Fetch data
  const { data: stats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/superadmin/communications/stats'],
    queryFn: () => apiRequest('GET', '/api/superadmin/communications/stats'),
    refetchInterval: 30000
  });

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ['/api/superadmin/communications/announcements'],
    queryFn: () => apiRequest('GET', '/api/superadmin/communications/announcements'),
    refetchInterval: 30000
  });

  const { data: broadcasts = [], isLoading: broadcastsLoading } = useQuery({
    queryKey: ['/api/superadmin/communications/broadcasts'],
    queryFn: () => apiRequest('GET', '/api/superadmin/communications/broadcasts')
  });

  const { data: changelog = [], isLoading: changelogLoading } = useQuery({
    queryKey: ['/api/superadmin/communications/changelog'],
    queryFn: () => apiRequest('GET', '/api/superadmin/communications/changelog')
  });

  const handleCreateAnnouncement = async () => {
    try {
      await apiRequest('POST', '/api/superadmin/communications/announcements', newAnnouncement);
      toast({
        title: 'Announcement Created',
        description: 'New announcement has been published',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/communications/announcements'] });
      setNewAnnouncement({
        title: '',
        content: '',
        type: 'general',
        severity: 'info',
        target_audience: 'all',
        is_pinned: false
      });
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: 'Failed to create announcement',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAnnouncement = async (id: number, updates: any) => {
    try {
      await apiRequest('PUT', `/api/superadmin/communications/announcements/${id}`, updates);
      toast({
        title: 'Announcement Updated',
        description: 'Announcement has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/communications/announcements'] });
      setEditingAnnouncement(null);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update announcement',
        variant: 'destructive',
      });
    }
  };

  const handleCreateBroadcast = async () => {
    try {
      await apiRequest('POST', '/api/superadmin/communications/broadcasts', newBroadcast);
      toast({
        title: 'Broadcast Created',
        description: 'Broadcast message has been created',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/communications/broadcasts'] });
      setNewBroadcast({
        subject: '',
        content: '',
        recipient_type: 'all_users',
        scheduled_at: ''
      });
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: 'Failed to create broadcast',
        variant: 'destructive',
      });
    }
  };

  const handleSendBroadcast = async (id: number) => {
    try {
      await apiRequest('POST', `/api/superadmin/communications/broadcasts/${id}/send`);
      toast({
        title: 'Broadcast Sent',
        description: 'Broadcast message is being sent',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/communications/broadcasts'] });
    } catch (error) {
      toast({
        title: 'Send Failed',
        description: 'Failed to send broadcast',
        variant: 'destructive',
      });
    }
  };

  const handleCreateChangelog = async (entry: any) => {
    try {
      await apiRequest('POST', '/api/superadmin/communications/changelog', entry);
      toast({
        title: 'Changelog Created',
        description: 'New changelog entry has been created',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/communications/changelog'] });
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: 'Failed to create changelog entry',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateChangelog = async (id: number, updates: any) => {
    try {
      await apiRequest('PUT', `/api/superadmin/communications/changelog/${id}`, updates);
      toast({
        title: 'Changelog Updated',
        description: 'Changelog entry has been updated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/communications/changelog'] });
      setEditingChangelog(null);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update changelog',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
          Communication Hub
        </h1>
        <p className="text-navy-600 dark:text-navy-300">
          Manage announcements, broadcasts, and system communications
        </p>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Announcements</p>
              <p className="text-2xl font-bold">{stats.activeAnnouncements || 0}</p>
            </div>
            <Megaphone className="w-8 h-8 text-electric-500" />
          </div>
        </AnimatedCard>
        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Broadcasts</p>
              <p className="text-2xl font-bold">{stats.totalBroadcasts || 0}</p>
            </div>
            <Mail className="w-8 h-8 text-electric-500" />
          </div>
        </AnimatedCard>
        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Messages Sent</p>
              <p className="text-2xl font-bold">{stats.totalMessagesSent || 0}</p>
            </div>
            <Send className="w-8 h-8 text-electric-500" />
          </div>
        </AnimatedCard>
        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unread Notifications</p>
              <p className="text-2xl font-bold">{stats.unreadNotifications || 0}</p>
            </div>
            <Bell className="w-8 h-8 text-electric-500" />
          </div>
        </AnimatedCard>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="broadcasts">Broadcasts</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-4">
          {/* Create Announcement Form */}
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Create Announcement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  placeholder="Announcement title"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Type</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={newAnnouncement.type}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                  >
                    <option value="general">General</option>
                    <option value="feature">Feature</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="security">Security</option>
                    <option value="product_update">Product Update</option>
                  </select>
                </div>
                <div>
                  <Label>Severity</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={newAnnouncement.severity}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, severity: e.target.value })}
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Content</Label>
                <textarea
                  className="w-full h-24 px-3 py-2 border rounded-md bg-background"
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  placeholder="Announcement content..."
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newAnnouncement.is_pinned}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, is_pinned: e.target.checked })}
                  />
                  <span>Pin to top</span>
                </label>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCreateAnnouncement}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create Announcement
                </Button>
              </div>
            </div>
          </AnimatedCard>

          {/* Announcements List */}
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Active Announcements</h3>
            {announcementsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No announcements created yet
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement: any) => (
                  <div key={announcement.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {announcement.isPinned && (
                            <Pin className="w-4 h-4 text-yellow-500" />
                          )}
                          <h4 className="font-semibold">{announcement.title}</h4>
                          <Badge variant={
                            announcement.severity === 'error' ? 'destructive' :
                            announcement.severity === 'warning' ? 'secondary' :
                            announcement.severity === 'success' ? 'default' : 'outline'
                          }>
                            {announcement.severity}
                          </Badge>
                          <Badge variant="outline">{announcement.type}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{announcement.content}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Created {format(new Date(announcement.createdAt), 'MMM dd, yyyy')}</span>
                          <span>{announcement.readCount || 0} reads</span>
                          <span>Target: {announcement.targetAudience}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingAnnouncement(announcement)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateAnnouncement(announcement.id, { is_active: false })}
                        >
                          Archive
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AnimatedCard>
        </TabsContent>

        <TabsContent value="broadcasts" className="space-y-4">
          {/* Create Broadcast Form */}
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Create Broadcast Message</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Subject</Label>
                <Input
                  value={newBroadcast.subject}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, subject: e.target.value })}
                  placeholder="Email subject"
                />
              </div>
              <div>
                <Label>Message Content</Label>
                <textarea
                  className="w-full h-32 px-3 py-2 border rounded-md bg-background"
                  value={newBroadcast.content}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, content: e.target.value })}
                  placeholder="Message content..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Recipients</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={newBroadcast.recipient_type}
                    onChange={(e) => setNewBroadcast({ ...newBroadcast, recipient_type: e.target.value })}
                  >
                    <option value="all_users">All Users</option>
                    <option value="active_users">Active Users Only</option>
                    <option value="admins">Admins Only</option>
                  </select>
                </div>
                <div>
                  <Label>Schedule (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={newBroadcast.scheduled_at}
                    onChange={(e) => setNewBroadcast({ ...newBroadcast, scheduled_at: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCreateBroadcast}>
                  <Mail className="w-4 h-4 mr-2" />
                  Create Broadcast
                </Button>
              </div>
            </div>
          </AnimatedCard>

          {/* Broadcasts List */}
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Broadcast History</h3>
            {broadcastsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcasts.map((broadcast: any) => (
                    <TableRow key={broadcast.id}>
                      <TableCell className="font-medium">{broadcast.subject}</TableCell>
                      <TableCell>
                        {broadcast.totalRecipients} {broadcast.recipientType.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          broadcast.status === 'sent' ? 'default' :
                          broadcast.status === 'sending' ? 'secondary' :
                          broadcast.status === 'scheduled' ? 'outline' : 'secondary'
                        }>
                          {broadcast.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {broadcast.sentAt ? format(new Date(broadcast.sentAt), 'MMM dd HH:mm') : '-'}
                      </TableCell>
                      <TableCell>{broadcast.createdByEmail}</TableCell>
                      <TableCell>
                        {broadcast.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handleSendBroadcast(broadcast.id)}
                          >
                            Send Now
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>
        </TabsContent>

        <TabsContent value="changelog" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Version Changelog</h3>
            <Button
              onClick={() => setEditingChangelog({
                version: '',
                release_date: new Date().toISOString().split('T')[0],
                type: 'minor',
                title: '',
                description: '',
                features: [],
                fixes: [],
                breaking_changes: []
              })}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              New Release
            </Button>
          </div>

          {editingChangelog && (
            <AnimatedCard variant="glow" className="p-6">
              <h4 className="font-semibold mb-4">
                {editingChangelog.id ? 'Edit' : 'Create'} Changelog Entry
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Version</Label>
                  <Input
                    value={editingChangelog.version}
                    onChange={(e) => setEditingChangelog({ ...editingChangelog, version: e.target.value })}
                    placeholder="2.5.0"
                  />
                </div>
                <div>
                  <Label>Release Date</Label>
                  <Input
                    type="date"
                    value={editingChangelog.release_date}
                    onChange={(e) => setEditingChangelog({ ...editingChangelog, release_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={editingChangelog.type}
                    onChange={(e) => setEditingChangelog({ ...editingChangelog, type: e.target.value })}
                  >
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                    <option value="patch">Patch</option>
                  </select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={editingChangelog.title}
                    onChange={(e) => setEditingChangelog({ ...editingChangelog, title: e.target.value })}
                    placeholder="Release title"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <textarea
                    className="w-full h-24 px-3 py-2 border rounded-md bg-background"
                    value={editingChangelog.description}
                    onChange={(e) => setEditingChangelog({ ...editingChangelog, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingChangelog(null)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  if (editingChangelog.id) {
                    handleUpdateChangelog(editingChangelog.id, editingChangelog);
                  } else {
                    handleCreateChangelog(editingChangelog);
                  }
                }}>
                  {editingChangelog.id ? 'Update' : 'Create'} Entry
                </Button>
              </div>
            </AnimatedCard>
          )}

          <AnimatedCard variant="glow" className="p-6">
            {changelogLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : changelog.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No changelog entries yet
              </div>
            ) : (
              <div className="space-y-6">
                {changelog.map((entry: any) => (
                  <div key={entry.id} className="border-b pb-6 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-semibold">v{entry.version}</h4>
                        <Badge variant={
                          entry.type === 'major' ? 'destructive' :
                          entry.type === 'minor' ? 'default' : 'secondary'
                        }>
                          {entry.type}
                        </Badge>
                        {entry.isPublished && (
                          <Badge variant="outline">Published</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {format(new Date(entry.releaseDate), 'MMMM dd, yyyy')}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingChangelog(entry)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                    <h5 className="font-medium mb-2">{entry.title}</h5>
                    {entry.description && (
                      <p className="text-sm text-gray-600 mb-4">{entry.description}</p>
                    )}
                    {entry.features && entry.features.length > 0 && (
                      <div className="mb-3">
                        <h6 className="font-medium text-sm mb-1">🚀 New Features</h6>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {(Array.isArray(entry.features) ? entry.features : []).map((feature: string, idx: number) => (
                            <li key={idx}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entry.fixes && entry.fixes.length > 0 && (
                      <div className="mb-3">
                        <h6 className="font-medium text-sm mb-1">🐛 Bug Fixes</h6>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {(Array.isArray(entry.fixes) ? entry.fixes : []).map((fix: string, idx: number) => (
                            <li key={idx}>{fix}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entry.breakingChanges && entry.breakingChanges.length > 0 && (
                      <div>
                        <h6 className="font-medium text-sm mb-1 text-red-600">⚠️ Breaking Changes</h6>
                        <ul className="list-disc list-inside text-sm text-red-600">
                          {(Array.isArray(entry.breakingChanges) ? entry.breakingChanges : []).map((change: string, idx: number) => (
                            <li key={idx}>{change}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </AnimatedCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeatureFlagsWithAB() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [showExperiment, setShowExperiment] = useState(false);
  const [experimentConfig, setExperimentConfig] = useState({
    hypothesis: '',
    variants: {
      control: { name: 'Control (Current)', weight: 50 },
      treatment: { name: 'Treatment (New)', weight: 50 }
    },
    successMetrics: {
      primary: { name: 'conversion_rate', target: 20, type: 'percentage_increase' },
      secondary: []
    },
    duration: 14
  });

  // Fetch feature flags
  const { data: featureFlags = [], isLoading: flagsLoading } = useQuery({
    queryKey: ['/api/superadmin/flags'],
    queryFn: () => apiRequest('GET', '/api/superadmin/flags')
  });

  // Fetch experiment data for selected flag
  const { data: experimentData, isLoading: experimentLoading } = useQuery({
    queryKey: [`/api/superadmin/flags/${selectedFlag?.id}/experiments`],
    queryFn: () => apiRequest('GET', `/api/superadmin/flags/${selectedFlag?.id}/experiments`),
    enabled: !!selectedFlag?.id && selectedFlag?.isExperiment
  });

  const handleToggleFlag = async (flag: any, enabled: boolean) => {
    try {
      await apiRequest('PUT', `/api/superadmin/flags/${flag.id}`, {
        default_value: enabled
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/flags'] });
      toast({
        title: "Feature flag updated",
        description: `${flag.flagName} has been ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update feature flag",
        variant: "destructive",
      });
    }
  };

  const handleStartExperiment = async () => {
    if (!selectedFlag) return;
    
    try {
      await apiRequest('PUT', `/api/superadmin/flags/${selectedFlag.id}/experiment`, {
        is_experiment: true,
        experiment_config: {
          hypothesis: experimentConfig.hypothesis,
          variants: experimentConfig.variants,
          targeting: { segments: ['all'], percentage: 100 }
        },
        variant_distribution: {
          control: experimentConfig.variants.control.weight,
          treatment: experimentConfig.variants.treatment.weight
        },
        success_metrics: experimentConfig.successMetrics,
        experiment_status: 'active',
        experiment_start_date: new Date().toISOString(),
        experiment_end_date: new Date(Date.now() + experimentConfig.duration * 24 * 60 * 60 * 1000).toISOString()
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/flags'] });
      setShowExperiment(false);
      setSelectedFlag(null);
      toast({
        title: "Experiment started",
        description: `A/B test for ${selectedFlag.flagName} is now active`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start experiment",
        variant: "destructive",
      });
    }
  };

  const handleEndExperiment = async (flag: any, winner?: string) => {
    try {
      await apiRequest('POST', `/api/superadmin/flags/${flag.id}/experiment/end`, {
        winner_variant: winner,
        apply_winner: !!winner
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/flags'] });
      toast({
        title: "Experiment ended",
        description: winner ? `${winner} variant has been applied` : 'Experiment concluded without a winner',
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end experiment",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
          Feature Flags with A/B Testing
        </h1>
        <p className="text-navy-600 dark:text-navy-300">
          Control features and run experiments to optimize your platform
        </p>
      </motion.div>

      <AnimatedCard variant="glow" className="p-6">
        {flagsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
          </div>
        ) : featureFlags.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No feature flags configured
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Experiment</TableHead>
                <TableHead>Toggle</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {featureFlags.map((flag: any) => (
                <TableRow key={flag.id}>
                  <TableCell className="font-medium">{flag.flagName}</TableCell>
                  <TableCell>{flag.description || 'No description'}</TableCell>
                  <TableCell>
                    <Badge variant={flag.defaultValue ? 'default' : 'secondary'}>
                      {flag.defaultValue ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {flag.isExperiment ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-50">
                          <Zap className="w-3 h-3 mr-1" />
                          {flag.experimentStatus}
                        </Badge>
                        {flag.experimentStatus === 'active' && flag.winnerVariant && (
                          <Badge variant="default" className="bg-green-600">
                            Winner: {flag.winnerVariant}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={flag.defaultValue}
                      onCheckedChange={(enabled) => handleToggleFlag(flag, enabled)}
                      disabled={flag.isExperiment && flag.experimentStatus === 'active'}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!flag.isExperiment ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedFlag(flag);
                            setShowExperiment(true);
                          }}
                        >
                          <Zap className="w-4 h-4 mr-1" />
                          A/B Test
                        </Button>
                      ) : flag.experimentStatus === 'active' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEndExperiment(flag)}
                        >
                          End Test
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AnimatedCard>

      {/* Active Experiments Summary */}
      {featureFlags.some((f: any) => f.isExperiment && f.experimentStatus === 'active') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6"
        >
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Active Experiments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featureFlags
                .filter((f: any) => f.isExperiment && f.experimentStatus === 'active')
                .map((flag: any) => (
                  <div key={flag.id} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">{flag.flagName}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Started:</span>
                        <span>
                          {flag.experimentStartDate 
                            ? format(new Date(flag.experimentStartDate), 'MMM d, yyyy')
                            : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ends:</span>
                        <span>
                          {flag.experimentEndDate 
                            ? format(new Date(flag.experimentEndDate), 'MMM d, yyyy')
                            : 'No end date'}
                        </span>
                      </div>
                      <div className="pt-2">
                        <div className="flex justify-between text-xs">
                          <span>Control: {flag.variantDistribution?.control || 50}%</span>
                          <span>Treatment: {flag.variantDistribution?.treatment || 50}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded mt-1 flex">
                          <div 
                            className="bg-blue-500 rounded-l"
                            style={{ width: `${flag.variantDistribution?.control || 50}%` }}
                          />
                          <div 
                            className="bg-electric-600 rounded-r"
                            style={{ width: `${flag.variantDistribution?.treatment || 50}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </AnimatedCard>
        </motion.div>
      )}
    </div>
  );
}

function StripeWebhookMonitoring() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Fetch overview data
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['/api/superadmin/stripe/webhooks/overview'],
    queryFn: () => apiRequest('GET', '/api/superadmin/stripe/webhooks/overview'),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch webhook events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/superadmin/stripe/webhooks/events', statusFilter, typeFilter],
    queryFn: () => apiRequest('GET', '/api/superadmin/stripe/webhooks/events', {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined
    })
  });

  // Fetch alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/superadmin/stripe/webhooks/alerts'],
    queryFn: () => apiRequest('GET', '/api/superadmin/stripe/webhooks/alerts')
  });

  // Fetch metrics
  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/superadmin/stripe/webhooks/metrics'],
    queryFn: () => apiRequest('GET', '/api/superadmin/stripe/webhooks/metrics')
  });

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await apiRequest('PUT', `/api/superadmin/stripe/webhooks/alerts/${alertId}/acknowledge`);
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/stripe/webhooks/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/stripe/webhooks/overview'] });
      toast({
        title: 'Alert Acknowledged',
        description: 'The alert has been marked as acknowledged',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'processed':
      case 'success':
        return 'default';
      case 'failed':
      case 'error':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'retrying':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
          Stripe Webhook Monitoring
        </h1>
        <p className="text-navy-600 dark:text-navy-300">
          Monitor and manage Stripe webhook events and performance
        </p>
      </motion.div>

      {/* Overview Cards */}
      {overviewLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <AnimatedCard key={i} variant="glow" className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </AnimatedCard>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Events Today</span>
              <Activity className="w-4 h-4 text-electric-600" />
            </div>
            <div className="text-2xl font-bold">{overview?.metrics?.total_events || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {overview?.metrics?.successful_events || 0} successful
            </p>
          </AnimatedCard>

          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Active Alerts</span>
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold">{overview?.activeAlerts || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Requires attention</p>
          </AnimatedCard>

          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Success Rate</span>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold">
              {overview?.metrics?.total_events > 0 
                ? Math.round((overview.metrics.successful_events / overview.metrics.total_events) * 100)
                : 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {overview?.metrics?.failed_events || 0} failed
            </p>
          </AnimatedCard>

          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Avg Processing Time</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">
              {Math.round(overview?.metrics?.avg_processing_time || 0)}ms
            </div>
            <p className="text-xs text-gray-500 mt-1">Response time</p>
          </AnimatedCard>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Events */}
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Events</h3>
              {overview?.recentEvents?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent events</p>
              ) : (
                <div className="space-y-3">
                  {overview?.recentEvents?.map((event: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.type}</p>
                        <p className="text-xs text-gray-500">
                          {event.created ? formatDistanceToNow(new Date(event.created), { addSuffix: true }) : 'Unknown'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(event.status)}>
                          {event.status}
                        </Badge>
                        <span className="text-xs text-gray-500">{event.processing_time_ms}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AnimatedCard>

            {/* Event Distribution */}
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-lg font-semibold mb-4">Event Distribution (24h)</h3>
              {overview?.eventDistribution?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No event data</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview?.eventDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="type" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </AnimatedCard>
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <AnimatedCard variant="glow" className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Webhook Events</h3>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="processed">Processed</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                  <option value="retrying">Retrying</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="payment_intent.succeeded">Payment Succeeded</option>
                  <option value="payment_intent.failed">Payment Failed</option>
                  <option value="customer.subscription.created">Subscription Created</option>
                  <option value="customer.subscription.updated">Subscription Updated</option>
                  <option value="invoice.payment_succeeded">Invoice Paid</option>
                </select>
              </div>
            </div>

            {eventsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : events.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No events found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Processing Time</TableHead>
                    <TableHead>Retries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event: any) => (
                    <TableRow key={event.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {event.stripe_event_id?.slice(0, 20)}...
                      </TableCell>
                      <TableCell className="text-sm">{event.type}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(event.status)}>
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {event.created ? format(new Date(event.created), 'MMM d, HH:mm:ss') : 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {event.processing_time_ms || '-'}ms
                      </TableCell>
                      <TableCell className="text-sm">{event.retries || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Active Alerts</h3>
            {alertsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : alerts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active alerts</p>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert: any) => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          <h4 className="font-medium">{alert.message}</h4>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    {alert.details && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <pre>{JSON.stringify(alert.details, null, 2)}</pre>
                      </div>
                    )}
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="mt-3"
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </AnimatedCard>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Webhook Metrics (7 days)</h3>
            {metricsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Success/Failure Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="metric_date" 
                        tickFormatter={(date) => format(new Date(date), 'MMM d')}
                      />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="successful_events" 
                        stroke="#10B981" 
                        name="Successful"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="failed_events" 
                        stroke="#EF4444" 
                        name="Failed"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Metrics Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Success</TableHead>
                      <TableHead>Failed</TableHead>
                      <TableHead>Avg Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((metric: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {format(new Date(metric.metric_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">{metric.event_type}</TableCell>
                        <TableCell>{metric.total_events}</TableCell>
                        <TableCell className="text-green-600">
                          {metric.successful_events}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {metric.failed_events}
                        </TableCell>
                        <TableCell>
                          {Math.round(metric.avg_processing_time_ms)}ms
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </AnimatedCard>
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints">
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Webhook Endpoints</h3>
            {overview?.endpoints?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No endpoints configured</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview?.endpoints?.map((endpoint: any) => (
                    <TableRow key={endpoint.id}>
                      <TableCell className="font-mono text-sm">
                        {endpoint.url}
                      </TableCell>
                      <TableCell>
                        <Badge variant={endpoint.status === 'enabled' ? 'default' : 'secondary'}>
                          {endpoint.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {endpoint.enabled_events?.length || 0} events
                      </TableCell>
                      <TableCell className="text-sm">
                        {endpoint.created_at 
                          ? format(new Date(endpoint.created_at), 'MMM d, yyyy')
                          : 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PricingExperiments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('plans');
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [newExperiment, setNewExperiment] = useState({
    name: '',
    description: '',
    type: 'price_test',
    variant_configs: {
      control: { name: 'Control', price_change: 0 },
      variant_a: { name: 'Variant A', price_change: 10 }
    },
    success_metrics: { primary: 'conversion_rate', secondary: ['revenue', 'churn_rate'] },
    traffic_allocation: 50
  });
  const [newDiscount, setNewDiscount] = useState<{
    code: string;
    description: string;
    discount_type: string;
    discount_value: number;
    max_uses: number | null;
    valid_until: string;
  }>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    max_uses: null,
    valid_until: ''
  });

  // Fetch data
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['/api/superadmin/pricing/plans'],
    queryFn: () => apiRequest('GET', '/api/superadmin/pricing/plans')
  });

  const { data: experiments = [], isLoading: experimentsLoading } = useQuery({
    queryKey: ['/api/superadmin/pricing/experiments'],
    queryFn: () => apiRequest('GET', '/api/superadmin/pricing/experiments')
  });

  const { data: discounts = [], isLoading: discountsLoading } = useQuery({
    queryKey: ['/api/superadmin/pricing/discounts'],
    queryFn: () => apiRequest('GET', '/api/superadmin/pricing/discounts')
  });

  const { data: customerScores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ['/api/superadmin/pricing/customer-success'],
    queryFn: () => apiRequest('GET', '/api/superadmin/pricing/customer-success')
  });

  const handleUpdatePlan = async (syncToStripe = false) => {
    try {
      const response = await apiRequest('POST', '/api/superadmin/pricing/plans', {
        ...editingPlan,
        sync_to_stripe: syncToStripe
      });
      
      if (response.warning) {
        toast({
          title: 'Plan Updated with Warning',
          description: response.warning,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Plan Updated',
          description: syncToStripe ? 'Pricing plan updated and synced to Stripe' : 'Pricing plan updated locally',
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/pricing/plans'] });
      setEditingPlan(null);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update pricing plan',
        variant: 'destructive',
      });
    }
  };

  const handleSyncAllToStripe = async () => {
    try {
      const response = await apiRequest('POST', '/api/superadmin/pricing/sync-to-stripe');
      toast({
        title: 'Sync Complete',
        description: response.message || 'All pricing plans synced to Stripe',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/pricing/plans'] });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync pricing plans to Stripe',
        variant: 'destructive',
      });
    }
  };

  const handleCreateExperiment = async () => {
    try {
      await apiRequest('POST', '/api/superadmin/pricing/experiments', newExperiment);
      toast({
        title: 'Experiment Created',
        description: 'New pricing experiment has been created',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/pricing/experiments'] });
      setNewExperiment({
        name: '',
        description: '',
        type: 'price_test',
        variant_configs: {
          control: { name: 'Control', price_change: 0 },
          variant_a: { name: 'Variant A', price_change: 10 }
        },
        success_metrics: { primary: 'conversion_rate', secondary: ['revenue', 'churn_rate'] },
        traffic_allocation: 50
      });
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: 'Failed to create experiment',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateExperimentStatus = async (id: number, status: string) => {
    try {
      await apiRequest('PUT', `/api/superadmin/pricing/experiments/${id}/status`, { status });
      toast({
        title: 'Status Updated',
        description: `Experiment ${status}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/pricing/experiments'] });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update experiment status',
        variant: 'destructive',
      });
    }
  };

  const handleCreateDiscount = async () => {
    try {
      await apiRequest('POST', '/api/superadmin/pricing/discounts', newDiscount);
      toast({
        title: 'Discount Created',
        description: 'New discount code has been created',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/pricing/discounts'] });
      setNewDiscount({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        max_uses: null,
        valid_until: ''
      });
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: 'Failed to create discount code',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
          Pricing & Experiments
        </h1>
        <p className="text-navy-600 dark:text-navy-300">
          Manage pricing plans, run experiments, and track customer success
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="plans">Pricing Plans</TabsTrigger>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
          <TabsTrigger value="discounts">Discount Codes</TabsTrigger>
          <TabsTrigger value="success">Customer Success</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <AnimatedCard variant="glow" className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Current Pricing Plans</h3>
              <Button size="sm" variant="outline" onClick={handleSyncAllToStripe}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Sync All to Stripe
              </Button>
            </div>
            {plansLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan: any) => (
                  <div key={plan.id} className={cn(
                    "border rounded-lg p-6",
                    plan.isPopular && "border-electric-500 shadow-lg"
                  )}>
                    {plan.isPopular && (
                      <Badge className="mb-2" variant="default">Most Popular</Badge>
                    )}
                    <h4 className="text-xl font-semibold mb-2">{plan.displayName}</h4>
                    <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">${plan.priceMonthly}</span>
                      <span className="text-gray-500">/month</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      ${plan.priceYearly}/year (save ${(plan.priceMonthly * 12 - plan.priceYearly).toFixed(0)})
                    </div>
                    <ul className="space-y-2 mb-6">
                      {(Array.isArray(plan.features) ? plan.features : []).map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-center text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => setEditingPlan(plan)}
                    >
                      Edit Plan
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </AnimatedCard>

          {editingPlan && (
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-lg font-semibold mb-4">Edit Plan: {editingPlan.displayName}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={editingPlan.displayName}
                    onChange={(e) => setEditingPlan({ ...editingPlan, displayName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Internal Name</Label>
                  <Input
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    disabled
                  />
                </div>
                <div>
                  <Label>Monthly Price</Label>
                  <Input
                    type="number"
                    value={editingPlan.priceMonthly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Yearly Price</Label>
                  <Input
                    type="number"
                    value={editingPlan.priceYearly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceYearly: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={editingPlan.description}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingPlan(null)}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={() => handleUpdatePlan(false)}>
                  Save Locally
                </Button>
                <Button onClick={() => handleUpdatePlan(true)}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Save & Sync to Stripe
                </Button>
              </div>
            </AnimatedCard>
          )}
        </TabsContent>

        <TabsContent value="experiments" className="space-y-4">
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Experiment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Experiment Name</Label>
                <Input
                  value={newExperiment.name}
                  onChange={(e) => setNewExperiment({ ...newExperiment, name: e.target.value })}
                  placeholder="Q1 Price Test"
                />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={newExperiment.type}
                  onChange={(e) => setNewExperiment({ ...newExperiment, type: e.target.value })}
                >
                  <option value="price_test">Price Test</option>
                  <option value="feature_test">Feature Test</option>
                  <option value="ui_test">UI Test</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input
                  value={newExperiment.description}
                  onChange={(e) => setNewExperiment({ ...newExperiment, description: e.target.value })}
                  placeholder="Testing 10% price increase impact on conversion"
                />
              </div>
              <div>
                <Label>Traffic Allocation (%)</Label>
                <Input
                  type="number"
                  value={newExperiment.traffic_allocation}
                  onChange={(e) => setNewExperiment({ ...newExperiment, traffic_allocation: parseInt(e.target.value) })}
                  min="0"
                  max="100"
                />
              </div>
              <div className="flex justify-end items-end">
                <Button onClick={handleCreateExperiment}>
                  <Zap className="w-4 h-4 mr-2" />
                  Create Experiment
                </Button>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Active Experiments</h3>
            {experimentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : experiments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No experiments created yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Conversions</TableHead>
                    <TableHead>Conv. Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiments.map((exp: any) => {
                    const convRate = exp.participantCount > 0 
                      ? ((exp.conversionCount / exp.participantCount) * 100).toFixed(2)
                      : '0.00';
                    return (
                      <TableRow key={exp.id}>
                        <TableCell className="font-medium">{exp.name}</TableCell>
                        <TableCell>{exp.type}</TableCell>
                        <TableCell>
                          <Badge variant={
                            exp.status === 'active' ? 'default' :
                            exp.status === 'completed' ? 'secondary' : 'outline'
                          }>
                            {exp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{exp.participantCount || 0}</TableCell>
                        <TableCell>{exp.conversionCount || 0}</TableCell>
                        <TableCell>{convRate}%</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {exp.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateExperimentStatus(exp.id, 'active')}
                              >
                                Start
                              </Button>
                            )}
                            {exp.status === 'active' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleUpdateExperimentStatus(exp.id, 'completed')}
                              >
                                End
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>
        </TabsContent>

        <TabsContent value="discounts" className="space-y-4">
          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Create Discount Code</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Code</Label>
                <Input
                  value={newDiscount.code}
                  onChange={(e) => setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER20"
                />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={newDiscount.discount_type}
                  onChange={(e) => setNewDiscount({ ...newDiscount, discount_type: e.target.value })}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  type="number"
                  value={newDiscount.discount_value}
                  onChange={(e) => setNewDiscount({ ...newDiscount, discount_value: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Max Uses (Optional)</Label>
                <Input
                  type="number"
                  value={newDiscount.max_uses || ''}
                  onChange={(e) => setNewDiscount({ ...newDiscount, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input
                  value={newDiscount.description}
                  onChange={(e) => setNewDiscount({ ...newDiscount, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Valid Until (Optional)</Label>
                <Input
                  type="date"
                  value={newDiscount.valid_until}
                  onChange={(e) => setNewDiscount({ ...newDiscount, valid_until: e.target.value })}
                />
              </div>
              <div className="flex justify-end items-end">
                <Button onClick={handleCreateDiscount}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create Code
                </Button>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Active Discount Codes</h3>
            {discountsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.map((discount: any) => (
                    <TableRow key={discount.id}>
                      <TableCell className="font-mono font-medium">{discount.code}</TableCell>
                      <TableCell>{discount.description}</TableCell>
                      <TableCell>
                        {discount.discountType === 'percentage' 
                          ? `${discount.discountValue}%`
                          : `$${discount.discountValue}`}
                      </TableCell>
                      <TableCell>
                        {discount.usedCount || 0}
                        {discount.maxUses && ` / ${discount.maxUses}`}
                      </TableCell>
                      <TableCell>
                        {discount.validUntil 
                          ? format(new Date(discount.validUntil), 'MMM dd, yyyy')
                          : 'No expiry'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={discount.isActive ? 'default' : 'secondary'}>
                          {discount.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>
        </TabsContent>

        <TabsContent value="success" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">At Risk</h3>
              <p className="text-2xl font-bold text-red-500">
                {customerScores.filter((s: any) => s.riskLevel === 'high').length}
              </p>
            </AnimatedCard>
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Needs Attention</h3>
              <p className="text-2xl font-bold text-yellow-500">
                {customerScores.filter((s: any) => s.riskLevel === 'medium').length}
              </p>
            </AnimatedCard>
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Healthy</h3>
              <p className="text-2xl font-bold text-green-500">
                {customerScores.filter((s: any) => s.riskLevel === 'low').length}
              </p>
            </AnimatedCard>
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Score</h3>
              <p className="text-2xl font-bold">
                {customerScores.length > 0 
                  ? Math.round(customerScores.reduce((sum: number, s: any) => sum + s.overallScore, 0) / customerScores.length)
                  : 0}
              </p>
            </AnimatedCard>
          </div>

          <AnimatedCard variant="glow" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Customer Health Scores</h3>
            {scoresLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Feature Adoption</TableHead>
                    <TableHead>Support</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>MRR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerScores.map((score: any) => (
                    <TableRow key={score.id}>
                      <TableCell className="font-medium">{score.organizationName}</TableCell>
                      <TableCell>{score.healthScore}/100</TableCell>
                      <TableCell>{score.engagementScore}/100</TableCell>
                      <TableCell>{score.featureAdoptionScore}/100</TableCell>
                      <TableCell>{score.supportScore}/100</TableCell>
                      <TableCell>{score.paymentScore}/100</TableCell>
                      <TableCell className="font-medium">{score.overallScore}/100</TableCell>
                      <TableCell>
                        <Badge variant={
                          score.riskLevel === 'high' ? 'destructive' :
                          score.riskLevel === 'medium' ? 'secondary' : 'default'
                        }>
                          {score.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>${score.mrr || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatedCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SuperadminClean() {
  const { section } = useParams();
  const activeSection = section || 'overview';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Individual API queries for each section (original working approach)
  const { data: organizations = [], isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ['/api/superadmin/organizations'],
    queryFn: () => apiRequest('GET', '/api/superadmin/organizations'),
    retry: false
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/superadmin/users'],
    queryFn: () => apiRequest('GET', '/api/superadmin/users'),
    retry: false
  });

  const { data: activeSessions = [] } = useQuery<any[]>({
    queryKey: ['/api/superadmin/sessions'],
    queryFn: () => apiRequest('GET', '/api/superadmin/sessions'),
    retry: false
  });

  const { data: backgroundJobs = [] } = useQuery<any[]>({
    queryKey: ['/api/superadmin/jobs'],
    queryFn: () => apiRequest('GET', '/api/superadmin/jobs'),
    retry: false
  });

  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ['/api/superadmin/activity'],
    queryFn: () => apiRequest('GET', '/api/superadmin/activity'),
    retry: false
  });

  const { data: billingData = [] } = useQuery<any[]>({
    queryKey: ['/api/superadmin/billing'],
    queryFn: () => apiRequest('GET', '/api/superadmin/billing'),
    retry: false
  });

  const { data: featureFlags = [] } = useQuery<any[]>({
    queryKey: ['/api/superadmin/flags'],
    queryFn: async () => {
      const flags = await apiRequest('GET', '/api/superadmin/flags');
      console.log('Received feature flags:', flags);
      console.log('First flag:', flags[0]);
      return flags;
    },
    retry: false
  });

  // Use dashboard query only for overview metrics
  const { data: dashboardData = {}, isLoading: dashboardLoading, error: dashboardError } = useQuery<any>({
    queryKey: ['/api/superadmin/dashboard'],
    queryFn: () => apiRequest('GET', '/api/superadmin/dashboard'),
    enabled: activeSection === 'overview',
    staleTime: 1000 * 60 * 5,
  });

  const renderDashboardOverview = () => (
    <div className="space-y-8">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-electric-500/10 via-electric-600/20 to-electric-700/30 p-8 border border-electric-200/30 backdrop-blur-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="relative">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
            System Overview
          </h1>
          <p className="text-navy-600 dark:text-navy-300 text-lg">
            Comprehensive platform administration and monitoring
          </p>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Organizations', value: organizations.length, color: 'from-blue-500 to-blue-600' },
          { label: 'Total Users', value: users.length, color: 'from-green-500 to-green-600' },
          { label: 'Active Sessions', value: activeSessions.length, color: 'from-purple-500 to-purple-600' },
          { label: 'Background Jobs', value: backgroundJobs.filter(j => j.status === 'running').length || '0', color: 'from-orange-500 to-orange-600' }
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <AnimatedCard variant="glow" className="p-6 text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${metric.color} text-white text-xl font-bold mb-3`}>
                {typeof metric.value === 'string' ? metric.value.charAt(0) : metric.value.toString().charAt(0)}
              </div>
              <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-1">{metric.value}</h3>
              <p className="text-navy-600 dark:text-navy-300">{metric.label}</p>
            </AnimatedCard>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-navy-900 dark:text-white mb-6">Recent Activity</h2>
        <AnimatedCard variant="glow" className="p-6">
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.slice(0, 5).map((log: AuditLog) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-navy-800 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-electric-600 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</p>
                    <p className="text-sm text-gray-500">{log.targetType} #{log.targetId}</p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatedCard>
      </motion.div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
      case '':
        return renderDashboardOverview();

      case 'organizations':
        return (
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
                Organizations
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                Manage organization accounts and settings
              </p>
            </motion.div>

            <AnimatedCard variant="glow" className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">All Organizations</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Create CSV content
                    const headers = ['ID', 'Name', 'Type', 'Plan', 'Members', 'Status', 'Created Date'];
                    const rows = organizations.map((org: Organization) => [
                      org.id,
                      org.name,
                      org.type || 'Standard',
                      org.plan || 'Basic',
                      org.userCount || 0,
                      org.subscriptionStatus || 'Inactive',
                      format(new Date(org.createdAt), 'yyyy-MM-dd')
                    ]);
                    
                    // Convert to CSV
                    const csvContent = [
                      headers.join(','),
                      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                    ].join('\n');
                    
                    // Download
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `organizations_${format(new Date(), 'yyyy-MM-dd')}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    toast({
                      title: 'Export Complete',
                      description: `Exported ${organizations.length} organizations to CSV`,
                    });
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              {orgsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
                </div>
              ) : organizations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No organizations found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org: Organization) => (
                      <TableRow 
                        key={org.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => window.location.href = `/superadmin/organizations/${org.id}`}
                      >
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{org.plan || 'Basic'}</Badge>
                        </TableCell>
                        <TableCell>{org.userCount || 0}</TableCell>
                        <TableCell>
                          <Badge variant={org.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                            {org.subscriptionStatus || 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(org.createdAt), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </AnimatedCard>
          </div>
        );

      case 'users':
        const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
        const [bulkAction, setBulkAction] = useState('');

        const handleSelectAll = (checked: boolean) => {
          if (checked) {
            setSelectedUsers(users.map((u: User) => u.id));
          } else {
            setSelectedUsers([]);
          }
        };

        const handleSelectUser = (userId: number, checked: boolean) => {
          if (checked) {
            setSelectedUsers([...selectedUsers, userId]);
          } else {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
          }
        };

        const handleBulkAction = async () => {
          if (!bulkAction || selectedUsers.length === 0) return;

          try {
            switch (bulkAction) {
              case 'activate':
                await Promise.all(selectedUsers.map(id => 
                  apiRequest('PUT', `/api/superadmin/users/${id}`, { is_active: true })
                ));
                toast({
                  title: 'Users Activated',
                  description: `${selectedUsers.length} users have been activated`,
                });
                break;
              case 'deactivate':
                await Promise.all(selectedUsers.map(id => 
                  apiRequest('PUT', `/api/superadmin/users/${id}`, { is_active: false })
                ));
                toast({
                  title: 'Users Deactivated',
                  description: `${selectedUsers.length} users have been deactivated`,
                });
                break;
              case 'export':
                const selectedUserData = users.filter((u: User) => selectedUsers.includes(u.id));
                const headers = ['ID', 'Email', 'Role', 'Organization', 'Status', 'Created'];
                const rows = selectedUserData.map((user: User) => [
                  user.id,
                  user.email,
                  user.role,
                  user.organizationName || 'N/A',
                  user.isActive ? 'Active' : 'Inactive',
                  format(new Date(user.createdAt), 'yyyy-MM-dd')
                ]);
                const csvContent = [
                  headers.join(','),
                  ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                ].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `users_${format(new Date(), 'yyyy-MM-dd')}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                toast({
                  title: 'Export Complete',
                  description: `Exported ${selectedUsers.length} users to CSV`,
                });
                break;
            }
            queryClient.invalidateQueries({ queryKey: ['/api/superadmin/users'] });
            setSelectedUsers([]);
            setBulkAction('');
          } catch (error) {
            toast({
              title: 'Bulk Action Failed',
              description: 'Failed to perform bulk action',
              variant: 'destructive',
            });
          }
        };

        return (
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
                Users
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                Manage user accounts and permissions
              </p>
            </motion.div>

            <AnimatedCard variant="glow" className="p-6">
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm">{selectedUsers.length} users selected</span>
                  <select
                    className="px-3 py-1 border rounded-md bg-background text-sm"
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                  >
                    <option value="">Select action...</option>
                    <option value="activate">Activate</option>
                    <option value="deactivate">Deactivate</option>
                    <option value="export">Export to CSV</option>
                  </select>
                  <Button size="sm" onClick={handleBulkAction} disabled={!bulkAction}>
                    Apply
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedUsers([])}>
                    Clear Selection
                  </Button>
                </div>
              )}
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No users found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>{user.organizationName || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(user.createdAt), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </AnimatedCard>
          </div>
        );

      case 'activity':
        return (
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
                System Activity ({auditLogs.length})
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                System audit log and recent activities
              </p>
            </motion.div>

            <AnimatedCard variant="glow" className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell>{log.adminUserId ? `Admin ${log.adminUserId}` : 'System'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          log.riskLevel === 'critical' ? 'destructive' : 
                          log.riskLevel === 'high' ? 'secondary' : 
                          log.riskLevel === 'medium' ? 'outline' : 
                          'default'
                        }>
                          {(log.riskLevel || 'low').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.createdAt && !isNaN(new Date(log.createdAt).getTime()) 
                          ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })
                          : 'Unknown'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AnimatedCard>
          </div>
        );

      case 'pricing':
        return <PricingExperiments />;

      case 'stripe':
        return <StripeWebhookMonitoring />;

      case 'billing':
        return (
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
                Billing Events ({billingData.length})
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                System-wide billing and subscription information
              </p>
            </motion.div>

            <AnimatedCard variant="glow" className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingData.map((event: any) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.organization_name}</TableCell>
                      <TableCell className="font-medium">{event.event_type}</TableCell>
                      <TableCell>${event.amount?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>{event.event_date ? format(new Date(event.event_date), 'MMM dd, yyyy') : 'Unknown'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AnimatedCard>
          </div>
        );

      case 'sessions':
        return (
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
                Active Sessions ({activeSessions.length})
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                Currently active user sessions
              </p>
            </motion.div>

            <AnimatedCard variant="glow" className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>User Agent</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((session: any) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{session.username}</div>
                          <div className="text-sm text-gray-500">{session.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{session.ip_address || 'Unknown'}</TableCell>
                      <TableCell className="truncate max-w-xs">{session.user_agent || 'Unknown'}</TableCell>
                      <TableCell>{session.created_at ? formatDistanceToNow(new Date(session.created_at), { addSuffix: true }) : 'Unknown'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AnimatedCard>
          </div>
        );



      case 'jobs':
        return (
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
                Background Jobs ({backgroundJobs.length})
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                System background jobs and their status
              </p>
            </motion.div>

            <AnimatedCard variant="glow" className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backgroundJobs.map((job: any) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.job_type}</TableCell>
                      <TableCell>
                        <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{job.progress || 0}%</TableCell>
                      <TableCell>{job.created_at ? formatDistanceToNow(new Date(job.created_at), { addSuffix: true }) : 'Unknown'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AnimatedCard>
          </div>
        );

      case 'flags':
        return <FeatureFlagsWithAB />;

      case 'revenue':
        return <RevenueDashboard />;

      case 'monitoring':
        return <MonitoringDashboard />;

      case 'audit':
        return <AuditTrail />;

      case 'analytics':
        return <AnalyticsDashboard />;

      case 'support':
        return <CustomerSupport />;

      case 'devops':
        return <DevOpsDashboard />;

      case 'whitelabel':
        return <WhiteLabelManagement />;

      case 'communications':
        return <CommunicationHub />;

      case 'settings':
        return <SystemSettings />;

      default:
        return (
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
                Coming Soon
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                This section is under development
              </p>
            </motion.div>

            <AnimatedCard variant="glow" className="p-6">
              <div className="text-center py-8 text-gray-500">
                Feature coming soon
              </div>
            </AnimatedCard>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-soft-100 dark:bg-navy-900">
      <SuperadminNavigation />

      {/* Main Content - Fixed responsive layout */}
      <div className="lg:ml-64 w-full px-6 py-8 space-y-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
}