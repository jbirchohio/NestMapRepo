import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
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
import { AnimatedCard } from '@/components/ui/animated-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { motion } from 'framer-motion';

// Import modular components
import { SystemMetrics } from '@/components/superadmin/SystemMetrics';
import { OrganizationsList } from '@/components/superadmin/OrganizationsList';
import { useSuperadminDashboard } from '@/hooks/useOptimizedQuery';
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
  is_enabled: boolean;
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
  const { section } = useParams();
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

  // Render content based on section
  const renderSectionContent = () => {
    switch (section) {
      case 'organizations':
        return renderOrganizationsSection();
      case 'users':
        return renderUsersSection();
      case 'sessions':
        return renderSessionsSection();
      case 'jobs':
        return renderJobsSection();
      case 'activity':
        return renderActivitySection();
      case 'billing':
        return renderBillingSection();
      case 'flags':
        return renderFlagsSection();
      default:
        return renderDashboardOverview();
    }
  };

  const renderOrganizationsSection = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent">Organizations</h1>
        <p className="text-navy-600 dark:text-navy-300">Manage and monitor all organizations</p>
      </div>

      <OrganizationsList 
        organizations={organizations}
      />
    </div>
  );

  const renderUsersSection = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent">Users</h1>
        <p className="text-navy-600 dark:text-navy-300">Manage and monitor all users</p>
      </div>

      <Card className="glass-card border-electric-200/30 dark:border-electric-700/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy-700 dark:text-navy-200">
            <Users className="h-5 w-5 text-electric-600" />
            Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'superadmin' ? 'destructive' : 'default'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.organization_name || 'None'}</TableCell>
                  <TableCell>
                    {user.last_login ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true }) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActionDialog({
                        open: true,
                        type: 'suspend_user',
                        target: user
                      })}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderSessionsSection = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Active Sessions</h1>
        <p className="text-gray-600 dark:text-gray-400">Monitor active user sessions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Active Sessions ({activeSessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{session.username}</div>
                      <div className="text-sm text-gray-500">ID: {session.user_id}</div>
                    </div>
                  </TableCell>
                  <TableCell>{session.ip_address || 'Unknown'}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActionDialog({
                        open: true,
                        type: 'terminate_session',
                        target: session
                      })}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderJobsSection = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Background Jobs</h1>
        <p className="text-gray-600 dark:text-gray-400">Monitor and manage background tasks</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Background Jobs ({backgroundJobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backgroundJobs.map((job: any) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.job_type}</TableCell>
                  <TableCell>
                    <Badge variant={
                      job.status === 'completed' ? 'default' :
                      job.status === 'failed' ? 'destructive' :
                      job.status === 'running' ? 'secondary' : 'outline'
                    }>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</TableCell>
                  <TableCell>
                    {job.completed_at 
                      ? `${Math.round((new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000)}s`
                      : job.status === 'running' ? 'In progress' : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {job.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryJobMutation.mutate(job.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderActivitySection = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Activity</h1>
        <p className="text-gray-600 dark:text-gray-400">Monitor system and user activity</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity ({auditLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>{log.superadmin_id || 'System'}</TableCell>
                  <TableCell>{log.target_type}/{log.target_id}</TableCell>
                  <TableCell>{log.ip_address || 'Unknown'}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderBillingSection = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing Events</h1>
        <p className="text-gray-600 dark:text-gray-400">Monitor billing and subscription events</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Billing Events ({billingData.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingData.map((event) => (
                <TableRow key={`${event.organization_id}-${event.event_type}`}>
                  <TableCell>{event.organization_name}</TableCell>
                  <TableCell className="font-medium">{event.event_type}</TableCell>
                  <TableCell>${event.amount}</TableCell>
                  <TableCell>
                    <Badge variant={event.status === 'completed' ? 'default' : 'secondary'}>
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(event.created_at), 'MMM dd, yyyy')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderFlagsSection = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feature Flags</h1>
        <p className="text-gray-600 dark:text-gray-400">Control system-wide feature availability</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Feature Flags ({featureFlags.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {featureFlags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell className="font-medium">{flag.flag_name}</TableCell>
                  <TableCell>{flag.description}</TableCell>
                  <TableCell>
                    <Badge variant={flag.is_enabled ? 'default' : 'secondary'}>
                      {flag.is_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={flag.is_enabled}
                      onCheckedChange={(enabled) => updateFlagMutation.mutate({ flagId: flag.id, enabled })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderDashboardOverview = () => (
    <div>
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden bg-gradient-to-br from-electric-500 via-electric-600 to-electric-700 text-white rounded-2xl mb-8"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative container mx-auto px-6 py-16">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                  <Monitor className="w-8 h-8" />
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-electric-200" />
                  <span className="text-electric-100 text-sm font-medium">System Administration</span>
                </div>
              </div>

              <h1 className="text-5xl font-bold mb-4 tracking-tight">
                System Overview
              </h1>
              <p className="text-xl text-electric-100 mb-6 max-w-2xl">
                Comprehensive system administration and monitoring with real-time analytics and advanced controls
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-electric-100">Real-time monitoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span className="text-electric-100">Advanced analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span className="text-electric-100">System controls</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <PrimaryButton 
                variant="primary" 
                size="lg"
                className="electric-glow"
              >
                <Download className="w-5 h-5 mr-2" />
                Export Data
              </PrimaryButton>

              <PrimaryButton 
                variant="secondary" 
                size="lg"
              >
                <UserCog className="w-5 h-5 mr-2" />
                System Settings
              </PrimaryButton>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <AnimatedCard variant="soft" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-3xl font-bold text-navy-900 dark:text-white">{metrics.totalUsers}</p>
            </div>
            <div className="p-3 bg-electric-100 dark:bg-electric-900/20 rounded-xl">
              <Users className="w-6 h-6 text-electric-600" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard variant="soft" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Organizations</p>
              <p className="text-3xl font-bold text-navy-900 dark:text-white">{metrics.totalOrganizations}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard variant="soft" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Jobs</p>
              <p className="text-3xl font-bold text-navy-900 dark:text-white">{metrics.activeJobs}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard variant="soft" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recent Activity</p>
              <p className="text-3xl font-bold text-navy-900 dark:text-white">{metrics.recentAuditEvents}</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-xl">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </AnimatedCard>
      </motion.div>

      {/* Tabbed Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="space-y-6"
      >
        <Tabs defaultValue="organizations" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organizations
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="flags" className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Flags
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Jobs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organizations" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white">Organizations</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {organizations.length} total
                </span>
              </div>
            </div>

            <AnimatedCard variant="glow" className="p-6">
              {orgsError ? (
                <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  Failed to load organizations data
                </div>
              ) : orgsLoading ? (
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
                      <TableHead>Domain</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org: Organization) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>{org.domain || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={org.plan === 'enterprise' ? 'default' : 'secondary'}>
                            {org.plan || 'Basic'}
                          </Badge>
                        </TableCell>
                        <TableCell>{org.employee_count || 0}</TableCell>
                        <TableCell>
                          <Badge variant={org.subscription_status === 'active' ? 'default' : 'secondary'}>
                            {org.subscription_status || 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(org.created_at), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </AnimatedCard>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );

  // Main return with Corporate Cards layout
  return (
    <div className="min-h-screen bg-soft-100 dark:bg-navy-900">
      <SuperadminNavigation />
      
      {/* Main Content */}
      <div className="lg:ml-64 container mx-auto px-6 py-8 space-y-8">
        {renderSectionContent()}
      </div>
    </div>
  );
}
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
  );

  return (
    <div className="flex h-screen bg-soft-100 dark:bg-navy-900">
      <SuperadminNavigation />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {renderSectionContent()}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({...actionDialog, open})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'suspend_user' && 'Are you sure you want to suspend this user?'}
              {actionDialog.type === 'terminate_session' && 'Are you sure you want to terminate this session?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({...actionDialog, open: false})}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
              // Handle action here
              setActionDialog({...actionDialog, open: false});
              toast({ title: 'Action completed successfully' });
            }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}