import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  Users, 
  DollarSign, 
  MessageSquare, 
  Sync, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Plus,
  Trash2,
  Edit,
  Activity,
  BarChart3,
  Calendar
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Integration {
  id: string;
  name: string;
  platform: string;
  type: 'hr' | 'finance' | 'communication';
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSync: string;
  config: Record<string, any>;
  metrics: {
    totalRecords: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastSyncDuration: number;
  };
}

interface SyncActivity {
  id: string;
  integrationId: string;
  integrationName: string;
  type: string;
  status: 'success' | 'failed' | 'in_progress';
  recordsProcessed: number;
  duration: number;
  timestamp: string;
  error?: string;
}

export default function EnterpriseIntegrationDashboard() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [newIntegration, setNewIntegration] = useState({
    name: '',
    platform: '',
    type: 'hr' as const,
    config: {}
  });

  // Fetch integrations
  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ['/api/enterprise-integration/integrations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/enterprise-integration/integrations');
      return response.data;
    }
  });

  // Fetch sync activities
  const { data: syncActivities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['/api/enterprise-integration/sync/activities'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/enterprise-integration/sync/activities');
      return response.data;
    }
  });

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/enterprise-integration/analytics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/enterprise-integration/analytics');
      return response.data;
    }
  });

  // Create integration mutation
  const createIntegrationMutation = useMutation({
    mutationFn: async (integration: typeof newIntegration) => {
      const response = await apiRequest('POST', '/api/enterprise-integration/integrations', integration);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise-integration/integrations'] });
      setNewIntegration({ name: '', platform: '', type: 'hr', config: {} });
      toast({
        title: "Integration Created",
        description: "Enterprise integration has been successfully created."
      });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: "Failed to create integration. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Sync integration mutation
  const syncIntegrationMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await apiRequest('POST', `/api/enterprise-integration/integrations/${integrationId}/sync`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise-integration/integrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise-integration/sync/activities'] });
      toast({
        title: "Sync Started",
        description: "Integration sync has been initiated."
      });
    }
  });

  // Delete integration mutation
  const deleteIntegrationMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await apiRequest('DELETE', `/api/enterprise-integration/integrations/${integrationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise-integration/integrations'] });
      toast({
        title: "Integration Deleted",
        description: "Integration has been successfully removed."
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'syncing': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hr': return <Users className="h-4 w-4" />;
      case 'finance': return <DollarSign className="h-4 w-4" />;
      case 'communication': return <MessageSquare className="h-4 w-4" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  if (integrationsLoading || activitiesLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Enterprise Integrations</h2>
          <p className="text-muted-foreground">
            Manage HR, Finance, and Communication platform integrations
          </p>
        </div>
        <Button onClick={() => setSelectedTab('create')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="create">Create</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{integrations?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {integrations?.filter((i: Integration) => i.status === 'active').length || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sync Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.successRate ? `${Math.round(analytics.successRate)}%` : '0%'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Records Synced</CardTitle>
                <Sync className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.totalRecords?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Sync Time</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.avgSyncTime ? `${analytics.avgSyncTime}s` : '0s'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per integration
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {integrations?.map((integration: Integration) => (
                    <div key={integration.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(integration.type)}
                        <div>
                          <p className="font-medium">{integration.name}</p>
                          <p className="text-sm text-muted-foreground">{integration.platform}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(integration.status)}`}></div>
                        <Badge variant="outline">{integration.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {syncActivities?.slice(0, 5).map((activity: SyncActivity) => (
                    <div key={activity.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{activity.integrationName}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.recordsProcessed} records • {activity.duration}s
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {activity.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : activity.status === 'failed' ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-4">
            {integrations?.map((integration: Integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(integration.type)}
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {integration.platform} • Last sync: {new Date(integration.lastSync).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={integration.status === 'active' ? 'default' : 'secondary'}>
                        {integration.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncIntegrationMutation.mutate(integration.id)}
                        disabled={syncIntegrationMutation.isPending || integration.status === 'syncing'}
                      >
                        <Sync className="h-4 w-4 mr-2" />
                        Sync
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteIntegrationMutation.mutate(integration.id)}
                        disabled={deleteIntegrationMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium">Total Records</p>
                      <p className="text-2xl font-bold">{integration.metrics.totalRecords.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Successful Syncs</p>
                      <p className="text-2xl font-bold text-green-600">{integration.metrics.successfulSyncs}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Failed Syncs</p>
                      <p className="text-2xl font-bold text-red-600">{integration.metrics.failedSyncs}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Avg Duration</p>
                      <p className="text-2xl font-bold">{integration.metrics.lastSyncDuration}s</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {syncActivities?.map((activity: SyncActivity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {activity.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : activity.status === 'failed' ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      )}
                      <div>
                        <p className="font-medium">{activity.integrationName}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.type} • {activity.recordsProcessed} records processed
                        </p>
                        {activity.error && (
                          <p className="text-sm text-red-600">{activity.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{activity.duration}s</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.performanceData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="avgDuration" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Records by Integration Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.recordsByType || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="records" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Integration Name</Label>
                  <Input
                    id="name"
                    value={newIntegration.name}
                    onChange={(e) => setNewIntegration(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Workday HR Integration"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Integration Type</Label>
                  <Select
                    value={newIntegration.type}
                    onValueChange={(value: 'hr' | 'finance' | 'communication') => 
                      setNewIntegration(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hr">HR System</SelectItem>
                      <SelectItem value="finance">Finance System</SelectItem>
                      <SelectItem value="communication">Communication Platform</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select
                    value={newIntegration.platform}
                    onValueChange={(value) => setNewIntegration(prev => ({ ...prev, platform: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {newIntegration.type === 'hr' && (
                        <>
                          <SelectItem value="workday">Workday</SelectItem>
                          <SelectItem value="bamboohr">BambooHR</SelectItem>
                          <SelectItem value="adp">ADP</SelectItem>
                          <SelectItem value="successfactors">SAP SuccessFactors</SelectItem>
                        </>
                      )}
                      {newIntegration.type === 'finance' && (
                        <>
                          <SelectItem value="sap">SAP</SelectItem>
                          <SelectItem value="oracle">Oracle</SelectItem>
                          <SelectItem value="netsuite">NetSuite</SelectItem>
                          <SelectItem value="quickbooks">QuickBooks</SelectItem>
                        </>
                      )}
                      {newIntegration.type === 'communication' && (
                        <>
                          <SelectItem value="slack">Slack</SelectItem>
                          <SelectItem value="teams">Microsoft Teams</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() => createIntegrationMutation.mutate(newIntegration)}
                disabled={!newIntegration.name || !newIntegration.platform || createIntegrationMutation.isPending}
                className="w-full"
              >
                {createIntegrationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Integration...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Integration
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
