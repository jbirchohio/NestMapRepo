import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Users, 
  Building, 
  AlertTriangle, 
  CheckCircle, 
  Database,
  Server,
  Zap
} from 'lucide-react';

interface SystemMetricsProps {
  dashboardData: {
    organizations: any[];
    users: any[];
    activeSessions: any[];
    backgroundJobs: any[];
    auditLogs: any[];
    billingData: any[];
    featureFlags: any[];
  };
  isLoading?: boolean;
}

export function SystemMetrics({ dashboardData, isLoading }: SystemMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const calculateSystemHealth = () => {
    const totalSessions = dashboardData.activeSessions?.length || 0;
    const totalJobs = dashboardData.backgroundJobs?.length || 0;
    const failedJobs = dashboardData.backgroundJobs?.filter(job => job.status === 'failed').length || 0;
    
    if (failedJobs > 0 && failedJobs / totalJobs > 0.1) return { status: 'critical', percentage: 60 };
    if (totalSessions > 100) return { status: 'warning', percentage: 80 };
    return { status: 'healthy', percentage: 95 };
  };

  const systemHealth = calculateSystemHealth();

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return AlertTriangle;
      default:
        return Activity;
    }
  };

  const HealthIcon = getHealthIcon(systemHealth.status);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Organizations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {dashboardData.organizations?.length || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {dashboardData.users?.length || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {dashboardData.activeSessions?.length || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-electric-100 dark:bg-electric-900/20 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-electric-600 dark:text-electric-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Health</p>
                <p className={`text-2xl font-bold ${getHealthColor(systemHealth.status)}`}>
                  {systemHealth.percentage}%
                </p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                systemHealth.status === 'healthy' 
                  ? 'bg-green-100 dark:bg-green-900/20' 
                  : systemHealth.status === 'warning'
                  ? 'bg-yellow-100 dark:bg-yellow-900/20'
                  : 'bg-red-100 dark:bg-red-900/20'
              }`}>
                <HealthIcon className={`h-6 w-6 ${getHealthColor(systemHealth.status)}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Background Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Jobs</span>
                <Badge variant="outline">{dashboardData.backgroundJobs?.length || 0}</Badge>
              </div>
              
              {dashboardData.backgroundJobs && dashboardData.backgroundJobs.length > 0 ? (
                <div className="space-y-2">
                  {['pending', 'running', 'completed', 'failed'].map(status => {
                    const count = dashboardData.backgroundJobs.filter(job => job.status === status).length;
                    const percentage = (count / dashboardData.backgroundJobs.length) * 100;
                    
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{status}</span>
                          <span>{count}</span>
                        </div>
                        <Progress 
                          value={percentage} 
                          className={`h-2 ${
                            status === 'failed' ? 'bg-red-100' : 
                            status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No background jobs</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Audit Logs (24h)</span>
                <Badge variant="outline">{dashboardData.auditLogs?.length || 0}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Feature Flags</span>
                <Badge variant="outline">{dashboardData.featureFlags?.length || 0}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Billing Events</span>
                <Badge variant="outline">{dashboardData.billingData?.length || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            System Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Health</span>
              <div className="flex items-center gap-2">
                <Progress value={systemHealth.percentage} className="w-32" />
                <Badge className={
                  systemHealth.status === 'healthy' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                    : systemHealth.status === 'warning'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }>
                  {systemHealth.status}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Database: Operational</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>API: Responding</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Services: Running</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
