import SharedSampleType from '@shared/schema/types/SharedSampleType';
/**
 * Performance Dashboard - Phase 3 Optimization Complete
 * Real-time monitoring and optimization insights for administrators
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Activity, AlertTriangle, TrendingUp, Zap, Download, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
interface PerformanceMetrics {
    overview: {
        totalRequests: number;
        avgResponseTime: number;
        errorRate: number;
        topSlowEndpoints: Array<{
            endpoint: string;
            avgTime: number;
            requests: number;
        }>;
    };
    alerts: Array<{
        type: string;
        severity: string;
        message: string;
        timestamp: string;
    }>;
    memoryTrends: Array<{
        timestamp: string;
        usage: number;
    }>;
}
interface OptimizationRecommendation {
    type: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    action: string;
    impact: string;
}
export default function PerformanceDashboard() {
    const [refreshKey, setRefreshKey] = useState(0);
    const { data: performanceData, isLoading: performanceLoading } = useQuery({
        queryKey: ['/api/admin/performance', refreshKey],
        refetchInterval: 30000, // Refresh every 30 seconds
    });
    const { data: realtimeData, isLoading: realtimeLoading } = useQuery({
        queryKey: ['/api/admin/performance/realtime', refreshKey],
        refetchInterval: 5000, // Refresh every 5 seconds
    });
    const { data: recommendationsData, isLoading: recommendationsLoading } = useQuery({
        queryKey: ['/api/admin/performance/recommendations'],
    });
    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };
    const handleExport = async () => {
        try {
            const response = await apiRequest('GET', '/api/admin/performance/export');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `performance-metrics-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
        catch (error) {
            console.error('Export failed:', error);
        }
    };
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'CRITICAL': return 'destructive';
            case 'HIGH': return 'destructive';
            case 'MEDIUM': return 'default';
            case 'LOW': return 'secondary';
            default: return 'default';
        }
    };
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'destructive';
            case 'HIGH': return 'destructive';
            case 'MEDIUM': return 'default';
            case 'LOW': return 'secondary';
            default: return 'default';
        }
    };
    const formatResponseTime = (time: number) => {
        return `${Math.round(time)}ms`;
    };
    const formatPercentage = (rate: number) => {
        return `${(rate * 100).toFixed(2)}%`;
    };
    if (performanceLoading) {
        return (<div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"/>
      </div>);
    }
    const performance = (performanceData as any)?.data as PerformanceMetrics | undefined;
    const realtime = (realtimeData as any)?.data;
    const recommendations = (recommendationsData as any)?.data as OptimizationRecommendation[] | undefined;
    return (<div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Real-time monitoring and optimization insights</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2"/>
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2"/>
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground"/>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance?.overview.totalRequests || 0}</div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground"/>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatResponseTime(performance?.overview.avgResponseTime || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Across all endpoints</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground"/>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(performance?.overview.errorRate || 0)}
                </div>
                <p className="text-xs text-muted-foreground">4xx and 5xx responses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground"/>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performance?.overview.avgResponseTime ?
            Math.max(0, 100 - Math.round(performance.overview.avgResponseTime / 10)) : 0}
                </div>
                <p className="text-xs text-muted-foreground">Based on response times</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Slowest Endpoints</CardTitle>
              <CardDescription>Endpoints with highest average response times</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance?.overview.topSlowEndpoints.slice(0, 5).map((endpoint, index) => (<div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{endpoint.endpoint}</p>
                      <p className="text-sm text-muted-foreground">{endpoint.requests} requests</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatResponseTime(endpoint.avgTime)}</p>
                      <Progress value={Math.min(100, endpoint.avgTime / 20)} className="w-20 h-2 mt-1"/>
                    </div>
                  </div>))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          {realtimeLoading ? (<div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"/>
            </div>) : (<div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Current Load</CardTitle>
                  <CardDescription>Real-time performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Response Time</span>
                    <span className="font-medium">
                      {formatResponseTime(realtime?.currentLoad.avgResponseTime || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Error Rate</span>
                    <span className="font-medium">
                      {formatPercentage(realtime?.currentLoad.errorRate || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Requests (24h)</span>
                    <span className="font-medium">{realtime?.currentLoad.requestsLast24h || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Memory Trend</CardTitle>
                  <CardDescription>Recent memory usage samples</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {realtime?.memoryTrend?.slice(-5).map((sample: SharedSampleType, index: number) => (<div key={index} className="flex justify-between items-center">
                        <span className="text-sm">
                          {new Date(sample.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-medium">{Math.round(sample.usage)}MB</span>
                      </div>))}
                  </div>
                </CardContent>
              </Card>
            </div>)}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>Performance alerts and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance?.alerts && performance.alerts.length > 0 ? (performance.alerts.slice(0, 10).map((alert, index) => (<Alert key={index} variant={alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4"/>
                      <AlertTitle className="flex items-center gap-2">
                        {alert.type}
                        <Badge variant={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                      </AlertTitle>
                      <AlertDescription>
                        {alert.message}
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </AlertDescription>
                    </Alert>))) : (<p className="text-muted-foreground">No active alerts</p>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
              <CardDescription>AI-powered suggestions to improve performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recommendations && recommendations.length > 0 ? (recommendations.map((rec, index) => (<div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{rec.title}</h4>
                        <Badge variant={getPriorityColor(rec.priority)}>{rec.priority}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-1">Recommended Action:</p>
                        <p className="text-sm">{rec.action}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Expected Impact:</p>
                        <p className="text-sm">{rec.impact}</p>
                      </div>
                    </div>))) : (<p className="text-muted-foreground">No recommendations available</p>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>);
}
