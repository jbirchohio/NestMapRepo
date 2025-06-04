import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Monitor, 
  Database, 
  Users, 
  Building2, 
  Activity, 
  TrendingUp,
  Download,
  UserCog,
  DollarSign,
  Clock,
  Flag,
  AlertTriangle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { SuperadminNavigation } from '@/components/SuperadminNavigation';
import { AnimatedCard } from '@/components/ui/animated-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

export default function SuperadminClean() {
  const [activeSection, setActiveSection] = useState('overview');

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['/api/superadmin/dashboard'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const organizations = dashboardData?.organizations || [];
  const users = dashboardData?.users || [];
  const auditLogs = dashboardData?.auditLogs || [];
  const featureFlags = dashboardData?.featureFlags || [];
  const backgroundJobs = dashboardData?.backgroundJobs || [];
  const activeSessions = dashboardData?.activeSessions || [];
  const billingData = dashboardData?.billingData || [];

  const metrics = {
    totalUsers: users.length,
    totalOrganizations: organizations.length,
    activeJobs: backgroundJobs.filter((job: any) => job.status === 'running').length,
    recentAuditEvents: auditLogs.filter((log: any) => {
      const logDate = new Date(log.created_at);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return logDate > yesterday;
    }).length
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderDashboardOverview();
      default:
        return renderDashboardOverview();
    }
  };

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
              {dashboardError ? (
                <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  Failed to load organizations data
                </div>
              ) : dashboardLoading ? (
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

          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white">Users</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {users.length} total
                </span>
              </div>
            </div>

            <AnimatedCard variant="glow" className="p-6">
              {dashboardError ? (
                <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  Failed to load users data
                </div>
              ) : dashboardLoading ? (
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
                        <TableCell>{format(new Date(user.created_at), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </AnimatedCard>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white">Recent Activity</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {auditLogs.length} events
                </span>
              </div>
            </div>

            <AnimatedCard variant="glow" className="p-6">
              {dashboardError ? (
                <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  Failed to load activity data
                </div>
              ) : dashboardLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No activity found
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.slice(0, 10).map((log: AuditLog) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-navy-800 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 bg-electric-600 rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</p>
                        <p className="text-sm text-gray-500">{log.target_type} #{log.target_id}</p>
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AnimatedCard>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white">Billing Overview</h2>
            </div>

            <AnimatedCard variant="glow" className="p-6">
              <div className="text-center py-8 text-gray-500">
                Billing data will be available when connected to payment systems
              </div>
            </AnimatedCard>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white">Active Sessions</h2>
            </div>

            <AnimatedCard variant="glow" className="p-6">
              <div className="text-center py-8 text-gray-500">
                Session monitoring coming soon
              </div>
            </AnimatedCard>
          </TabsContent>

          <TabsContent value="flags" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white">Feature Flags</h2>
            </div>

            <AnimatedCard variant="glow" className="p-6">
              <div className="text-center py-8 text-gray-500">
                Feature flags management coming soon
              </div>
            </AnimatedCard>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white">Background Jobs</h2>
            </div>

            <AnimatedCard variant="glow" className="p-6">
              <div className="text-center py-8 text-gray-500">
                Background job monitoring coming soon
              </div>
            </AnimatedCard>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );

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