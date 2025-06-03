import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { SuperadminNavigation } from '@/components/SuperadminNavigation';
import { 
  Users, 
  Building2, 
  Activity, 
  DollarSign, 
  Flag, 
  Download, 
  Trash2, 
  Ban, 
  UserCog, 
  Monitor, 
  AlertTriangle,
  TrendingUp,
  Clock,
  Database,
  CheckCircle,
  XCircle,
  Play,
  Pause
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Organization {
  id: number;
  name: string;
  domain?: string;
  plan?: string;
  subscription_status?: string;
  employee_count?: number;
  created_at: string;
  userCount?: number;
  tripCount?: number;
  lastActivity?: string;
}

interface User {
  id: number;
  email: string;
  username?: string;
  role: string;
  organizationId?: number;
  organizationName?: string;
  isActive: boolean;
  lastLogin?: string;
  created_at: string;
}

interface AuditLog {
  id: number;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  ip_address?: string;
  created_at: string;
  superadmin_id?: number;
}

interface FeatureFlag {
  id: number;
  flag_name: string;
  description?: string;
  default_value: boolean;
  created_at: string;
}

interface BackgroundJob {
  id: number;
  job_type: string;
  status: string;
  data?: any;
  result?: any;
  error_message?: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  completed_at?: string;
}

export default function Superadmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: string;
    target: any;
  }>({ open: false, type: '', target: null });

  // Query hooks for fetching data
  const { data: organizations = [], isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ['/api/superadmin/organizations'],
    queryFn: () => apiRequest('GET', '/api/superadmin/organizations').then(res => res.json()),
    retry: false
  });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/superadmin/users'],
    queryFn: () => apiRequest('GET', '/api/superadmin/users').then(res => res.json()),
    retry: false
  });

  const { data: auditLogs = [], isLoading: auditLoading, error: auditError } = useQuery({
    queryKey: ['/api/superadmin/activity'],
    queryFn: () => apiRequest('GET', '/api/superadmin/activity').then(res => res.json()),
    retry: false
  });

  const { data: billingData = [], isLoading: billingLoading, error: billingError } = useQuery({
    queryKey: ['/api/superadmin/billing'],
    queryFn: () => apiRequest('GET', '/api/superadmin/billing').then(res => res.json()),
    retry: false
  });

  const { data: featureFlags = [], isLoading: flagsLoading, error: flagsError } = useQuery({
    queryKey: ['/api/superadmin/flags'],
    queryFn: () => apiRequest('GET', '/api/superadmin/flags').then(res => res.json()),
    retry: false
  });

  const { data: activeSessions = [], isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: ['/api/superadmin/sessions'],
    queryFn: () => apiRequest('GET', '/api/superadmin/sessions').then(res => res.json()),
    retry: false
  });

  const { data: backgroundJobs = [], isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ['/api/superadmin/jobs'],
    queryFn: () => apiRequest('GET', '/api/superadmin/jobs').then(res => res.json()),
    retry: false
  });

  const updateFlagMutation = useMutation({
    mutationFn: ({ flagId, enabled }: { flagId: number; enabled: boolean }) =>
      apiRequest('PUT', `/api/superadmin/flags/${flagId}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/flags'] });
      toast({ title: 'Feature flag updated successfully' });
    },
    onError: () => toast({ title: 'Failed to update feature flag', variant: 'destructive' })
  });

  const retryJobMutation = useMutation({
    mutationFn: (jobId: number) => 
      apiRequest('POST', `/api/superadmin/jobs/${jobId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/jobs'] });
      toast({ title: 'Job restarted successfully' });
    },
    onError: () => toast({ title: 'Failed to restart job', variant: 'destructive' })
  });

  // Calculate metrics from available data
  const metrics = {
    totalUsers: users.length,
    totalOrganizations: organizations.length,
    activeJobs: backgroundJobs.filter(job => job.status === 'running' || job.status === 'pending').length,
    recentAuditEvents: auditLogs.filter(log => 
      new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SuperadminNavigation />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              System Overview
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Comprehensive system administration and monitoring
            </p>
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  System-wide user accounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalOrganizations}</div>
                <p className="text-xs text-muted-foreground">
                  Active organizations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.activeJobs}</div>
                <p className="text-xs text-muted-foreground">
                  Running background tasks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.recentAuditEvents}</div>
                <p className="text-xs text-muted-foreground">
                  Events in last 24h
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="organizations" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="flags">Flags</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
            </TabsList>

            <TabsContent value="organizations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Organizations
                  </CardTitle>
                  <CardDescription>
                    Manage organizational accounts and settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {orgsError ? (
                    <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                      Failed to load organizations data
                    </div>
                  ) : orgsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
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
                          <TableHead>Domain</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Users</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {organizations.map((org: Organization) => (
                          <TableRow key={org.id}>
                            <TableCell className="font-medium">{org.name}</TableCell>
                            <TableCell>{org.domain || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{org.plan || 'Free'}</Badge>
                            </TableCell>
                            <TableCell>{org.userCount || 0}</TableCell>
                            <TableCell>
                              {formatDistanceToNow(new Date(org.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Users
                  </CardTitle>
                  <CardDescription>
                    Manage user accounts and permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {usersError ? (
                    <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                      Failed to load users data
                    </div>
                  ) : usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No users found
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user: User) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'superadmin' ? 'destructive' : 'secondary'}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.organizationName || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.lastLogin ? 
                                formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true }) : 
                                'Never'
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  <UserCog className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Audit Activity
                  </CardTitle>
                  <CardDescription>
                    System activity and security audit logs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {auditError ? (
                    <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                      Failed to load audit logs
                    </div>
                  ) : auditLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No audit logs found
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.slice(0, 10).map((log: AuditLog) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.action}</TableCell>
                            <TableCell>{log.target_type}: {log.target_id}</TableCell>
                            <TableCell className="font-mono text-sm">{log.ip_address || 'N/A'}</TableCell>
                            <TableCell>
                              {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Billing Overview
                  </CardTitle>
                  <CardDescription>
                    Revenue and subscription analytics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {billingError ? (
                    <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                      Failed to load billing data
                    </div>
                  ) : billingLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                    </div>
                  ) : billingData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No billing data available
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            ${billingData.reduce((sum: number, item: any) => sum + (item.monthly_revenue || 0), 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">Monthly Revenue</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {billingData.filter((item: any) => item.subscription_status === 'active').length}
                          </div>
                          <div className="text-sm text-gray-500">Active Subscriptions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {billingData.filter((item: any) => item.subscription_status === 'trial').length}
                          </div>
                          <div className="text-sm text-gray-500">Trial Accounts</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Active Sessions
                  </CardTitle>
                  <CardDescription>
                    Monitor and manage user sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionsError ? (
                    <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                      Failed to load session data
                    </div>
                  ) : sessionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                    </div>
                  ) : activeSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No active sessions found
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Session monitoring feature coming soon
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="flags">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5" />
                    Feature Flags
                  </CardTitle>
                  <CardDescription>
                    Control system features and rollouts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {flagsError ? (
                    <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                      Failed to load feature flags
                    </div>
                  ) : flagsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
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
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {featureFlags.map((flag: FeatureFlag) => (
                          <TableRow key={flag.id}>
                            <TableCell className="font-medium">{flag.flag_name}</TableCell>
                            <TableCell>{flag.description || 'No description'}</TableCell>
                            <TableCell>
                              <Badge variant={flag.default_value ? 'default' : 'secondary'}>
                                {flag.default_value ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={flag.default_value}
                                onCheckedChange={(checked) => 
                                  updateFlagMutation.mutate({ flagId: flag.id, enabled: checked })
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="jobs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Background Jobs
                  </CardTitle>
                  <CardDescription>
                    Monitor system background tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {jobsError ? (
                    <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                      Failed to load background jobs
                    </div>
                  ) : jobsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                    </div>
                  ) : backgroundJobs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No background jobs found
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Attempts</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backgroundJobs.map((job: BackgroundJob) => (
                          <TableRow key={job.id}>
                            <TableCell className="font-medium">{job.job_type}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  job.status === 'completed' ? 'default' :
                                  job.status === 'failed' ? 'destructive' :
                                  job.status === 'running' ? 'secondary' : 'outline'
                                }
                              >
                                {job.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                {job.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                                {job.status === 'running' && <Clock className="w-3 h-3 mr-1" />}
                                {job.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{job.attempts}/{job.max_attempts}</TableCell>
                            <TableCell>
                              {format(new Date(job.created_at), 'MMM dd, HH:mm')}
                            </TableCell>
                            <TableCell>
                              {job.completed_at ? 
                                format(new Date(job.completed_at), 'MMM dd, HH:mm') : 
                                'N/A'
                              }
                            </TableCell>
                            <TableCell>
                              {job.status === 'failed' && job.attempts < job.max_attempts && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => retryJobMutation.mutate(job.id)}
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}