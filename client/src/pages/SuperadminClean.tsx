import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { format, formatDistanceToNow } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { SuperadminNavigation } from '@/components/SuperadminNavigation';
import { AnimatedCard } from '@/components/ui/animated-card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Organization {
  id: number;
  name: string;
  type: string;
  memberCount: number;
  isActive: boolean;
  created_at: string;
}

interface User {
  id: number;
  email: string;
  role: string;
  organizationName?: string;
  isActive: boolean;
  created_at: string;
}

interface AuditLog {
  id: number;
  action: string;
  target_type: string;
  target_id: number;
  created_at: string;
}

export default function SuperadminClean() {
  const { section } = useParams();
  const activeSection = section || 'overview';

  // Individual API queries for each section (original working approach)
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['/api/superadmin/organizations'],
    retry: false
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/superadmin/users'],
    retry: false
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['/api/superadmin/sessions'],
    retry: false
  });

  const { data: backgroundJobs = [] } = useQuery({
    queryKey: ['/api/superadmin/jobs'],
    retry: false
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['/api/superadmin/activity'],
    retry: false
  });

  const { data: billingData = [] } = useQuery({
    queryKey: ['/api/superadmin/billing'],
    retry: false
  });

  const { data: featureFlags = [] } = useQuery({
    queryKey: ['/api/superadmin/flags'],
    retry: false
  });

  // Use dashboard query only for overview metrics
  const { data: dashboardData = {}, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['/api/superadmin/dashboard'],
    enabled: activeSection === 'overview',
    staleTime: 1000 * 60 * 5,
  });

  const renderDashboardOverview = () => (
    <div className="space-y-8">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-electric-500/10 via-electric-600/20 to-electric-700/30 p-8 border border-electric-200/30 backdrop-blur-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="relative">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
            System Overview
          </h1>
          <p className="text-navy-600 dark:text-navy-300 text-lg">
            Comprehensive platform administration and monitoring
          </p>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Organizations', value: organizations.length, color: 'from-blue-500 to-blue-600' },
          { label: 'Total Users', value: users.length, color: 'from-green-500 to-green-600' },
          { label: 'Active Sessions', value: '23', color: 'from-purple-500 to-purple-600' },
          { label: 'System Health', value: '99.9%', color: 'from-orange-500 to-orange-600' }
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <AnimatedCard variant="glow" className="p-6 text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${metric.color} text-white text-xl font-bold mb-3`}>
                {typeof metric.value === 'string' ? metric.value.charAt(0) : metric.value.toString().charAt(0)}
              </div>
              <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-1">{metric.value}</h3>
              <p className="text-navy-600 dark:text-navy-300">{metric.label}</p>
            </AnimatedCard>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-navy-900 dark:text-white mb-6">Recent Activity</h2>
        <AnimatedCard variant="glow" className="p-6">
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.slice(0, 5).map((log: AuditLog) => (
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
      </motion.div>
    </div>
  );

  const renderSectionContent = () => {
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
                Manage organization accounts and settings
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
                      <TableHead>Type</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org: Organization) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{org.type}</Badge>
                        </TableCell>
                        <TableCell>{org.memberCount || 0}</TableCell>
                        <TableCell>
                          <Badge variant={org.isActive ? 'default' : 'secondary'}>
                            {org.isActive ? 'Active' : 'Inactive'}
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
                System Activity ({auditLogs.length})
              </h1>
              <p className="text-navy-600 dark:text-navy-300">
                System audit log and recent activities
              </p>
            </motion.div>

            <AnimatedCard variant="glow" className="p-6">
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