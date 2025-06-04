import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
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
  const [location] = useLocation();
  
  // Determine current section from URL
  const getCurrentSection = () => {
    if (location === '/superadmin' || location === '/superadmin/') return 'overview';
    const pathParts = location.split('/');
    return pathParts[2] || 'overview';
  };

  const [activeSection, setActiveSection] = useState(getCurrentSection());

  // Update active section when location changes
  useEffect(() => {
    setActiveSection(getCurrentSection());
  }, [location]);

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

  const renderDashboardOverview = () => (
    <div>
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative mb-8 overflow-hidden rounded-xl glass-card bg-gradient-to-br from-electric-600/10 via-electric-500/5 to-electric-700/10 p-8 border border-electric-500/20"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-electric-600/5 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-electric-500 to-electric-600 rounded-xl flex items-center justify-center electric-glow">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent">
                System Overview
              </h1>
              <p className="text-navy-600 dark:text-navy-300 text-lg">
                Monitor and manage your enterprise infrastructure
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="glass-card bg-white/5 p-4 rounded-lg border border-electric-200/20">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-electric-600" />
                <span className="text-sm font-medium text-navy-600 dark:text-navy-300">Organizations</span>
              </div>
              <div className="text-2xl font-bold text-electric-600">{metrics.totalOrganizations}</div>
            </div>
            
            <div className="glass-card bg-white/5 p-4 rounded-lg border border-electric-200/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-electric-600" />
                <span className="text-sm font-medium text-navy-600 dark:text-navy-300">Total Users</span>
              </div>
              <div className="text-2xl font-bold text-electric-600">{metrics.totalUsers}</div>
            </div>
            
            <div className="glass-card bg-white/5 p-4 rounded-lg border border-electric-200/20">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-electric-600" />
                <span className="text-sm font-medium text-navy-600 dark:text-navy-300">Active Jobs</span>
              </div>
              <div className="text-2xl font-bold text-electric-600">{metrics.activeJobs}</div>
            </div>
            
            <div className="glass-card bg-white/5 p-4 rounded-lg border border-electric-200/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-electric-600" />
                <span className="text-sm font-medium text-navy-600 dark:text-navy-300">Recent Events</span>
              </div>
              <div className="text-2xl font-bold text-electric-600">{metrics.recentAuditEvents}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dashboard Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-electric-600" />
            <h3 className="text-lg font-semibold">System Status</h3>
          </div>
          {dashboardLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
            </div>
          ) : dashboardError ? (
            <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              Error loading system data
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium">Database</span>
                <Badge variant="default" className="bg-green-600 text-white">Online</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium">API Services</span>
                <Badge variant="default" className="bg-green-600 text-white">Healthy</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium">Authentication</span>
                <Badge variant="default" className="bg-green-600 text-white">Active</Badge>
              </div>
            </div>
          )}
        </AnimatedCard>

        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-electric-600" />
            <h3 className="text-lg font-semibold">Recent Activity</h3>
          </div>
          {dashboardLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-600"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.slice(0, 5).map((log: AuditLog) => (
                <div key={log.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-navy-800 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-electric-600 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{log.action}</p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
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
    console.log('Active section:', activeSection, 'Location:', location);
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
                Manage organizational accounts and settings
              </p>
            </motion.div>

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
          </div>
        );
      case 'users':
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
                Recent Activity
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                System audit log and recent activities
              </p>
            </motion.div>

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
          </div>
        );
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
                Billing Overview
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                System-wide billing and subscription information
              </p>
            </motion.div>

            <AnimatedCard variant="glow" className="p-6">
              <div className="text-center py-8 text-gray-500">
                Billing data will be available when connected to payment systems
              </div>
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
                Active Sessions
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                Currently active user sessions
              </p>
            </motion.div>

            <AnimatedCard variant="glow" className="p-6">
              <div className="text-center py-8 text-gray-500">
                Session monitoring coming soon
              </div>
            </AnimatedCard>
          </div>
        );
      case 'flags':
        return (
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
                Feature Flags
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                System feature flags and configuration
              </p>
            </motion.div>

            <AnimatedCard variant="glow" className="p-6">
              <div className="text-center py-8 text-gray-500">
                Feature flags management coming soon
              </div>
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
                Background Jobs
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                System background jobs and their status
              </p>
            </motion.div>

            <AnimatedCard variant="glow" className="p-6">
              <div className="text-center py-8 text-gray-500">
                Background job monitoring coming soon
              </div>
            </AnimatedCard>
          </div>
        );
      case 'settings':
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
                System settings coming soon
              </div>
            </AnimatedCard>
          </div>
        );
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
      
      {/* Main Content */}
      <div className="lg:ml-64 container mx-auto px-6 py-8 space-y-8">
        {renderSectionContent()}
      </div>
    </div>
  );
}