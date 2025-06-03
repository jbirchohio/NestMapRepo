import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { SuperadminNavigation } from '@/components/SuperadminNavigation';
import { 
  Users, 
  Building2, 
  Activity, 
  DollarSign, 
  Flag, 
  Settings, 
  Download, 
  Trash2, 
  Ban, 
  UserCog, 
  Monitor, 
  Zap,
  AlertTriangle,
  TrendingUp,
  Clock,
  Database,
  Webhook
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Organization {
  id: number;
  name: string;
  domain: string;
  plan: string;
  subscription_status: string;
  employee_count: number;
  created_at: string;
  userCount: number;
  tripCount: number;
  lastActivity: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  organization_id: number;
  created_at: string;
  organization_name: string;
  tripCount: number;
  lastLogin: string;
}

interface AuditLog {
  id: number;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  created_at: string;
  superadmin_username: string;
  ip_address: string;
}

interface ActiveSession {
  id: string;
  user_id: number;
  username: string;
  organization_name: string;
  ip_address: string;
  last_activity: string;
  expires_at: string;
  created_at: string;
}

interface BillingData {
  organization_id: number;
  organization_name: string;
  plan: string;
  subscription_status: string;
  current_period_end: string;
  monthly_revenue: number;
  total_spending: number;
}

interface FeatureFlag {
  id: number;
  flag_name: string;
  description: string;
  default_value: boolean;
  created_at: string;
}

interface BackgroundJob {
  id: number;
  job_type: string;
  status: string;
  data: any;
  result: any;
  error_message: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  completed_at: string;
}

export default function Superadmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: string;
    target: any;
  }>({ open: false, type: '', target: null });

  // Data queries
  const { data: organizations, isLoading: organizationsLoading } = useQuery<Organization[]>({
    queryKey: ['/api/superadmin/organizations'],
    queryFn: () => apiRequest('GET', '/api/superadmin/organizations').then(res => res.json())
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/superadmin/users'],
    queryFn: () => apiRequest('GET', '/api/superadmin/users').then(res => res.json())
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/superadmin/activity'],
    queryFn: () => apiRequest('GET', '/api/superadmin/activity').then(res => res.json())
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<ActiveSession[]>({
    queryKey: ['/api/superadmin/sessions'],
    queryFn: () => apiRequest('GET', '/api/superadmin/sessions').then(res => res.json())
  });

  const { data: billing, isLoading: billingLoading } = useQuery<BillingData[]>({
    queryKey: ['/api/superadmin/billing'],
    queryFn: () => apiRequest('GET', '/api/superadmin/billing').then(res => res.json())
  });

  const { data: featureFlags, isLoading: flagsLoading } = useQuery<FeatureFlag[]>({
    queryKey: ['/api/superadmin/flags'],
    queryFn: () => apiRequest('GET', '/api/superadmin/flags').then(res => res.json())
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<BackgroundJob[]>({
    queryKey: ['/api/superadmin/jobs'],
    queryFn: () => apiRequest('GET', '/api/superadmin/jobs').then(res => res.json())
  });

  // Mutations
  const deactivateUserMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest('POST', `/api/superadmin/users/${userId}/deactivate`, { reason: 'Administrative action' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/activity'] });
      toast({ title: 'User deactivated successfully' });
      setActionDialog({ open: false, type: '', target: null });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to deactivate user', description: error.message, variant: 'destructive' });
    }
  });

  const disableOrgMutation = useMutation({
    mutationFn: (orgId: number) => 
      apiRequest('POST', `/api/superadmin/orgs/${orgId}/disable`, { reason: 'Administrative action' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/activity'] });
      toast({ title: 'Organization disabled successfully' });
      setActionDialog({ open: false, type: '', target: null });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to disable organization', description: error.message, variant: 'destructive' });
    }
  });

  const terminateSessionMutation = useMutation({
    mutationFn: (sessionId: string) => 
      apiRequest('POST', `/api/superadmin/logout/${sessionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/activity'] });
      toast({ title: 'Session terminated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to terminate session', description: error.message, variant: 'destructive' });
    }
  });

  const retryJobMutation = useMutation({
    mutationFn: (jobId: number) => 
      apiRequest('POST', `/api/superadmin/jobs/${jobId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/jobs'] });
      toast({ title: 'Job retry initiated' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to retry job', description: error.message, variant: 'destructive' });
    }
  });

  const exportOrgMutation = useMutation({
    mutationFn: (orgId: number) => 
      apiRequest('POST', `/api/superadmin/export/org/${orgId}`),
    onSuccess: (data: any) => {
      toast({ title: 'Export job created', description: `Job ID: ${data.jobId}` });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/jobs'] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create export job', description: error.message, variant: 'destructive' });
    }
  });

  // Calculate overview metrics
  const totalOrgs = organizations?.length || 0;
  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter(u => u.role !== 'deactivated').length || 0;
  const totalMRR = billing?.reduce((sum, b) => sum + (b.monthly_revenue / 100), 0) || 0;
  const activeSessions = sessions?.length || 0;
  const pendingJobs = jobs?.filter(j => j.status === 'pending').length || 0;

  const handleAction = (type: string, target: any) => {
    setActionDialog({ open: true, type, target });
  };

  const executeAction = () => {
    const { type, target } = actionDialog;
    
    switch (type) {
      case 'deactivate_user':
        deactivateUserMutation.mutate(target.id);
        break;
      case 'disable_org':
        disableOrgMutation.mutate(target.id);
        break;
      case 'export_org':
        exportOrgMutation.mutate(target.id);
        break;
      default:
        setActionDialog({ open: false, type: '', target: null });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Superadmin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            System administration and monitoring for NestMap
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrgs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                {totalUsers} total users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalMRR.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSessions}</div>
              <p className="text-xs text-muted-foreground">
                {pendingJobs} pending jobs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="flags">Features</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {auditLogs?.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-start space-x-3">
                        <Activity className="h-4 w-4 mt-1 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {log.superadmin_username} performed {log.action} on {log.target_type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(log.created_at))} ago
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database Status</span>
                      <Badge variant="default">Healthy</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Sessions</span>
                      <Badge variant="secondary">{activeSessions}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Background Jobs</span>
                      <Badge variant={pendingJobs > 10 ? "destructive" : "default"}>
                        {pendingJobs} pending
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="organizations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organizations</CardTitle>
                <CardDescription>
                  Manage and monitor all organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Trips</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations?.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-gray-500">{org.domain}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.plan === 'enterprise' ? 'default' : 'secondary'}>
                            {org.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.subscription_status === 'active' ? 'default' : 'destructive'}>
                            {org.subscription_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{org.userCount}</TableCell>
                        <TableCell>{org.tripCount}</TableCell>
                        <TableCell>
                          {format(new Date(org.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction('export_org', org)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction('disable_org', org)}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  Manage and monitor all users across organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Trips</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{user.organization_name}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'deactivated' ? 'destructive' : 'default'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.tripCount}</TableCell>
                        <TableCell>
                          {user.lastLogin ? formatDistanceToNow(new Date(user.lastLogin)) + ' ago' : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={user.role === 'deactivated'}
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction('deactivate_user', user)}
                              disabled={user.role === 'deactivated'}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>
                  All superadmin actions and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.action}</p>
                            <p className="text-sm text-gray-500">{log.target_type}</p>
                          </div>
                        </TableCell>
                        <TableCell>{log.superadmin_username}</TableCell>
                        <TableCell>{log.target_id}</TableCell>
                        <TableCell>{log.ip_address}</TableCell>
                        <TableCell>
                          {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>
                  Monitor and manage active user sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions?.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{session.username}</TableCell>
                        <TableCell>{session.organization_name}</TableCell>
                        <TableCell>{session.ip_address}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(session.last_activity))} ago
                        </TableCell>
                        <TableCell>
                          {format(new Date(session.expires_at), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => terminateSessionMutation.mutate(session.id)}
                          >
                            Terminate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Billing Overview</CardTitle>
                <CardDescription>
                  Revenue and subscription management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Monthly Revenue</TableHead>
                      <TableHead>Total Spending</TableHead>
                      <TableHead>Next Billing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing?.map((org) => (
                      <TableRow key={org.organization_id}>
                        <TableCell>{org.organization_name}</TableCell>
                        <TableCell>
                          <Badge variant={org.plan === 'enterprise' ? 'default' : 'secondary'}>
                            {org.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.subscription_status === 'active' ? 'default' : 'destructive'}>
                            {org.subscription_status}
                          </Badge>
                        </TableCell>
                        <TableCell>${(org.monthly_revenue / 100).toLocaleString()}</TableCell>
                        <TableCell>${(org.total_spending / 100).toLocaleString()}</TableCell>
                        <TableCell>
                          {org.current_period_end ? 
                            format(new Date(org.current_period_end), 'MMM dd, yyyy') : 
                            'N/A'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flags" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
                <CardDescription>
                  Global and organization-specific feature toggles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flag Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Default Value</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {featureFlags?.map((flag) => (
                      <TableRow key={flag.id}>
                        <TableCell>
                          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {flag.flag_name}
                          </code>
                        </TableCell>
                        <TableCell>{flag.description}</TableCell>
                        <TableCell>
                          <Badge variant={flag.default_value ? 'default' : 'secondary'}>
                            {flag.default_value ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(flag.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Background Jobs</CardTitle>
                <CardDescription>
                  Monitor and manage system background tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                    {jobs?.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.job_type}</TableCell>
                        <TableCell>
                          <Badge variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'failed' ? 'destructive' :
                            job.status === 'running' ? 'secondary' : 'outline'
                          }>
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
                              Retry
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Dialog */}
        <Dialog open={actionDialog.open} onOpenChange={(open) => 
          setActionDialog({ ...actionDialog, open })
        }>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog.type === 'deactivate_user' && 'Deactivate User'}
                {actionDialog.type === 'disable_org' && 'Disable Organization'}
                {actionDialog.type === 'export_org' && 'Export Organization Data'}
              </DialogTitle>
              <DialogDescription>
                {actionDialog.type === 'deactivate_user' && 
                  `Are you sure you want to deactivate ${actionDialog.target?.username}? This action will immediately revoke all access.`
                }
                {actionDialog.type === 'disable_org' && 
                  `Are you sure you want to disable ${actionDialog.target?.name}? This will affect all users in the organization.`
                }
                {actionDialog.type === 'export_org' && 
                  `This will create a background job to export all data for ${actionDialog.target?.name}.`
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setActionDialog({ open: false, type: '', target: null })}
              >
                Cancel
              </Button>
              <Button 
                variant={actionDialog.type === 'export_org' ? 'default' : 'destructive'}
                onClick={executeAction}
              >
                {actionDialog.type === 'deactivate_user' && 'Deactivate'}
                {actionDialog.type === 'disable_org' && 'Disable'}
                {actionDialog.type === 'export_org' && 'Create Export Job'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}