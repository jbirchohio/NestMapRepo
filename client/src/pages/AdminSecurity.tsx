import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Shield, AlertTriangle, Activity, TrendingUp, Clock, User, Globe, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { motion } from "framer-motion";

interface SecurityAlert {
  id: string;
  type: 'suspicious_login' | 'privilege_escalation' | 'unusual_activity' | 'failed_authentication' | 'data_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  userId?: number;
  organizationId?: number;
  metadata: Record<string, any>;
  resolved: boolean;
}

interface SecurityMetrics {
  securityScore: number;
  totalUsers: number;
  activeUsers24h: number;
  adminActions24h: number;
  suspiciousActivity7d: number;
  failedLogins30d: number;
  lastUpdated: Date;
  trends: {
    securityTrend: 'improving' | 'declining' | 'stable';
    riskLevel: 'low' | 'medium' | 'high';
  };
}

interface AuditSummary {
  actionSummary: {
    action: string;
    count: number;
    lastOccurrence: Date;
  }[];
  criticalActions: {
    id: number;
    action: string;
    adminUserId: number;
    details: any;
    createdAt: Date;
    ipAddress: string;
  }[];
  period: string;
  generatedAt: Date;
}

export default function AdminSecurity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);

  // Fetch security alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/security/alerts'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch security metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<SecurityMetrics>({
    queryKey: ['/api/security/metrics'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch audit summary
  const { data: auditSummary, isLoading: auditLoading } = useQuery<AuditSummary>({
    queryKey: ['/api/security/audit-summary'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Resolve alert mutation
  const resolveAlertMutation = useMutation({
    mutationFn: ({ alertId, resolution, notes }: { alertId: string; resolution: string; notes: string }) =>
      apiRequest('POST', `/api/security/alerts/${alertId}/resolve`, { resolution, notes }),
    onSuccess: () => {
      toast({
        title: "Alert Resolved",
        description: "Security alert has been successfully resolved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/security/alerts'] });
      setSelectedAlert(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve alert",
        variant: "destructive",
      });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleResolveAlert = (alert: SecurityAlert) => {
    setSelectedAlert(alert);
  };

  const confirmResolveAlert = () => {
    if (!selectedAlert) return;
    
    resolveAlertMutation.mutate({
      alertId: selectedAlert.id,
      resolution: 'reviewed_and_resolved',
      notes: 'Resolved by administrator'
    });
  };

  if (alertsLoading || metricsLoading || auditLoading) {
    return (
      <div className="space-y-6 p-6">
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
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 dark:text-white">Security Monitoring</h1>
          <p className="text-muted-foreground">Monitor security events and system health</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Live Monitoring
        </Badge>
      </div>

      {/* Security Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-electric-600" />
            <div>
              <p className="text-sm text-muted-foreground">Security Score</p>
              <p className={`text-2xl font-bold ${getSecurityScoreColor(metrics?.securityScore || 0)}`}>
                {metrics?.securityScore || 0}/100
              </p>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Active Users (24h)</p>
              <p className="text-2xl font-bold text-navy-900 dark:text-white">
                {metrics?.activeUsers24h || 0}
              </p>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-muted-foreground">Admin Actions (24h)</p>
              <p className="text-2xl font-bold text-navy-900 dark:text-white">
                {metrics?.adminActions24h || 0}
              </p>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Risk Level</p>
              <Badge className={`${
                metrics?.trends.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                metrics?.trends.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {metrics?.trends.riskLevel || 'Unknown'}
              </Badge>
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* Security Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
        </TabsList>

        {/* Security Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Security Alerts
              </CardTitle>
              <CardDescription>
                Review and resolve security alerts detected in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-medium text-navy-900 dark:text-white">All Clear!</p>
                  <p className="text-muted-foreground">No security alerts detected.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert: SecurityAlert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(alert.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="font-medium text-navy-900 dark:text-white">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveAlert(alert)}
                          disabled={alert.resolved}
                        >
                          {alert.resolved ? 'Resolved' : 'Resolve'}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Action Summary (7 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditSummary?.actionSummary.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium text-navy-900 dark:text-white">{item.action}</p>
                        <p className="text-sm text-muted-foreground">
                          Last: {new Date(item.lastOccurrence).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Critical Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditSummary?.criticalActions.map((action, index) => (
                    <div key={index} className="p-3 border rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-navy-900 dark:text-white">{action.action}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(action.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        User ID: {action.adminUserId}
                        <Globe className="h-4 w-4 ml-2" />
                        IP: {action.ipAddress}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Detailed Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Users</span>
                  <span className="font-medium">{metrics?.totalUsers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active (24h)</span>
                  <span className="font-medium">{metrics?.activeUsers24h || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Admin Actions (24h)</span>
                  <span className="font-medium">{metrics?.adminActions24h || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Suspicious Activity (7d)</span>
                  <span className="font-medium">{metrics?.suspiciousActivity7d || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failed Logins (30d)</span>
                  <span className="font-medium">{metrics?.failedLogins30d || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Security Trend</span>
                  <Badge variant="outline">{metrics?.trends.securityTrend || 'stable'}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Last Updated</span>
                  <span className="text-sm">
                    {metrics?.lastUpdated ? new Date(metrics.lastUpdated).toLocaleTimeString() : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Monitoring Status</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Alert Resolution</span>
                  <Badge className="bg-blue-100 text-blue-800">Real-time</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert Resolution Dialog */}
      {selectedAlert && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Resolve Security Alert</AlertTitle>
          <AlertDescription className="text-orange-700">
            Are you sure you want to mark "{selectedAlert.title}" as resolved?
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={confirmResolveAlert}
                disabled={resolveAlertMutation.isPending}
              >
                {resolveAlertMutation.isPending ? 'Resolving...' : 'Confirm'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedAlert(null)}
                disabled={resolveAlertMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}