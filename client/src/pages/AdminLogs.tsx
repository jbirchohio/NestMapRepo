import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Calendar,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface AdminLog {
  id: number;
  admin_user_id: number;
  action_type: string;
  action_data: any;
  ip_address: string | null;
  timestamp: Date;
}

interface LogsResponse {
  logs: AdminLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function AdminLogs() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterAction, setFilterAction] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('audit');

  const { data: logsData, isLoading, refetch } = useQuery<LogsResponse>({
    queryKey: ['/api/admin/logs', currentPage, filterAction, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50'
      });
      
      if (filterAction !== 'all') {
        params.append('action', filterAction);
      }
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await apiRequest('GET', `/api/admin/logs?${params.toString()}`);
      return response.json();
    },
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'system_settings_update':
        return <Settings className="w-4 h-4" />;
      case 'email_test':
        return <CheckCircle className="w-4 h-4" />;
      case 'user_created':
      case 'user_updated':
        return <User className="w-4 h-4" />;
      case 'security_alert':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'system_settings_update':
        return 'default';
      case 'email_test':
        return 'secondary';
      case 'security_alert':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        export: 'true',
        ...(filterAction !== 'all' && { action: filterAction }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await apiRequest('GET', `/api/admin/logs/export?${params.toString()}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-soft-100 dark:bg-navy-900">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-electric-600 via-electric-700 to-electric-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-electric-600/20 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-4 mb-6"
          >
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Admin Logs</h1>
              <p className="text-electric-100 text-lg">System audit trail and administrative actions</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Audit Trail
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              System Events
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Security Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Administrative Actions</CardTitle>
                    <CardDescription>
                      Complete audit trail of all administrative actions performed on the system
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => refetch()}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Refresh
                    </Button>
                    <Button
                      onClick={handleExport}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-48">
                    <Select value={filterAction} onValueChange={setFilterAction}>
                      <SelectTrigger>
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter by action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="SYSTEM_SETTINGS_UPDATE">Settings Update</SelectItem>
                        <SelectItem value="EMAIL_TEST">Email Test</SelectItem>
                        <SelectItem value="USER_CREATED">User Created</SelectItem>
                        <SelectItem value="SECURITY_ALERT">Security Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Logs List */}
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-electric-600" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logsData?.logs?.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-muted rounded-lg">
                            {getActionIcon(log.action_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getActionBadgeVariant(log.action_type)}>
                                {formatActionType(log.action_type)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                by Admin User #{log.admin_user_id}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {log.action_data ? JSON.stringify(log.action_data).substring(0, 100) + '...' : 'No additional data'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                          {log.ip_address && (
                            <p className="text-xs text-muted-foreground">
                              IP: {log.ip_address}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {logsData?.logs?.length === 0 && (
                      <div className="text-center py-8">
                        <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No logs found matching your criteria</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {logsData?.pagination && logsData.pagination.pages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {((logsData.pagination.page - 1) * logsData.pagination.limit) + 1} to{' '}
                      {Math.min(logsData.pagination.page * logsData.pagination.limit, logsData.pagination.total)} of{' '}
                      {logsData.pagination.total} results
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {logsData.pagination.page} of {logsData.pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(logsData.pagination.pages, currentPage + 1))}
                        disabled={currentPage === logsData.pagination.pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Events</CardTitle>
                <CardDescription>
                  System-level events and configuration changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">System events filtered view will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
                <CardDescription>
                  Security-related events and alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Security events filtered view will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
