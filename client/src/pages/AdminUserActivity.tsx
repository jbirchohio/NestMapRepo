import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  FilePlus,
  Edit,
  Trash2
} from 'lucide-react';

interface UserActivityLog {
  id: number;
  user_name: string;
  user_email: string;
  action: string;
  details: any;
  ip_address: string | null;
  created_at: string;
}

export default function AdminUserActivity() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [filterAction, setFilterAction] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const orgId = user?.organization_id;

  const { data: logs, isLoading, refetch } = useQuery<UserActivityLog[]>({ 
    queryKey: ['userActivityLogs', orgId, currentPage, filterAction, searchTerm],
    queryFn: async () => {
      if (!orgId) return [];

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

      const response = await apiRequest('GET', `/api/admin/organizations/${orgId}/activity-logs?${params.toString()}`);
      return response.json();
    },
    enabled: !!orgId,
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create_trip':
        return <FilePlus className="w-4 h-4 text-green-500" />;
      case 'update_trip':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'delete_trip':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Activity Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track all user actions within your organization.</p>
        </header>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-auto flex-grow sm:flex-grow-0">
                <Input 
                  placeholder="Search by user or action..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create_trip">Create Trip</SelectItem>
                    <SelectItem value="update_trip">Update Trip</SelectItem>
                    <SelectItem value="delete_trip">Delete Trip</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => refetch()} variant="outline" size="icon" disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
                ) : logs && logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="font-medium">{log.user_name}</div>
                        <div className="text-xs text-gray-500">{log.user_email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          {formatActionType(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell><pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded-md">{JSON.stringify(log.details, null, 2)}</pre></TableCell>
                      <TableCell>{log.ip_address}</TableCell>
                      <TableCell className="text-right">{new Date(log.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center">No activity logs found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
