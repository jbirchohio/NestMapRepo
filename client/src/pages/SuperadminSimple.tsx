import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SuperadminNavigation } from '@/components/SuperadminNavigation';
import { 
  Users, 
  Building2, 
  Activity, 
  DollarSign, 
  Flag, 
  Monitor, 
  Database,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

export default function Superadmin() {
  const { section } = useParams();

  // Data queries
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['/api/superadmin/organizations'],
    queryFn: () => apiRequest('GET', '/api/superadmin/organizations').then(res => res.json()),
    retry: false
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/superadmin/users'],
    queryFn: () => apiRequest('GET', '/api/superadmin/users').then(res => res.json()),
    retry: false
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['/api/superadmin/sessions'],
    queryFn: () => apiRequest('GET', '/api/superadmin/sessions').then(res => res.json()),
    retry: false
  });

  const { data: backgroundJobs = [] } = useQuery({
    queryKey: ['/api/superadmin/jobs'],
    queryFn: () => apiRequest('GET', '/api/superadmin/jobs').then(res => res.json()),
    retry: false
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['/api/superadmin/activity'],
    queryFn: () => apiRequest('GET', '/api/superadmin/activity').then(res => res.json()),
    retry: false
  });

  const { data: billingData = [] } = useQuery({
    queryKey: ['/api/superadmin/billing'],
    queryFn: () => apiRequest('GET', '/api/superadmin/billing').then(res => res.json()),
    retry: false
  });

  const { data: featureFlags = [] } = useQuery({
    queryKey: ['/api/superadmin/flags'],
    queryFn: () => apiRequest('GET', '/api/superadmin/flags').then(res => res.json()),
    retry: false
  });

  // Render content based on section
  const renderContent = () => {
    switch (section) {
      case 'organizations':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organizations ({organizations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Trips</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org: any) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{org.name}</div>
                          {org.domain && <div className="text-sm text-gray-500">{org.domain}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={org.plan === 'enterprise' ? 'default' : 'secondary'}>
                          {org.plan || 'free'}
                        </Badge>
                      </TableCell>
                      <TableCell>{org.userCount || 0}</TableCell>
                      <TableCell>{org.tripCount || 0}</TableCell>
                      <TableCell>
                        <Badge variant={org.subscription_status === 'active' ? 'default' : 'secondary'}>
                          {org.subscription_status || 'inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(org.created_at), 'MMM dd, yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case 'users':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case 'sessions':
        return (
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
                      <TableCell>{formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case 'jobs':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Background Jobs ({backgroundJobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                      <TableCell>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case 'activity':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Activity ({auditLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                      <TableCell>{log.username || 'System'}</TableCell>
                      <TableCell>
                        <Badge variant={log.risk_level === 'critical' ? 'destructive' : log.risk_level === 'high' ? 'secondary' : 'default'}>
                          {log.risk_level}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case 'billing':
        return (
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
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingData.map((event: any) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.organization_name}</TableCell>
                      <TableCell className="font-medium">{event.event_type}</TableCell>
                      <TableCell>${event.amount?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>{format(new Date(event.event_date), 'MMM dd, yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case 'flags':
        return (
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
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureFlags.map((flag: any) => (
                    <TableRow key={flag.id}>
                      <TableCell className="font-medium">{flag.flag_name}</TableCell>
                      <TableCell>
                        <Badge variant={flag.is_enabled ? 'default' : 'secondary'}>
                          {flag.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>{flag.description || 'No description'}</TableCell>
                      <TableCell>{formatDistanceToNow(new Date(flag.updated_at), { addSuffix: true })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      default:
        // Default dashboard overview
        return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">System-wide user accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizations.length}</div>
              <p className="text-xs text-muted-foreground">Active organizations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{backgroundJobs.filter((job: any) => job.status === 'running').length}</div>
              <p className="text-xs text-muted-foreground">Running background tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditLogs.length}</div>
              <p className="text-xs text-muted-foreground">Audit events</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {organizations.slice(0, 5).map((org: any) => (
                  <div key={org.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-gray-500">{org.userCount || 0} users</div>
                    </div>
                    <Badge variant="outline">{org.plan || 'free'}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{log.action}</div>
                      <div className="text-sm text-gray-500">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SuperadminNavigation />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {section ? section.charAt(0).toUpperCase() + section.slice(1) : 'System Overview'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {section === 'organizations' && 'Manage and monitor all organizations'}
              {section === 'users' && 'Manage and monitor all users'}
              {section === 'sessions' && 'Monitor active user sessions'}
              {section === 'jobs' && 'Monitor and manage background tasks'}
              {section === 'activity' && 'Monitor system and user activity'}
              {section === 'billing' && 'Monitor billing and subscription events'}
              {section === 'flags' && 'Control system-wide feature availability'}
              {!section && 'Comprehensive system administration and monitoring'}
            </p>
          </div>
          
          {renderContent()}
        </div>
      </div>
    </div>
  );
}