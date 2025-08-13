import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/JWTAuthContext';
import { useLocation } from 'wouter';
import { DollarSign, Users, FileText, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Shield, UserCheck, UserX, Search, Crown, MapPin, Sparkles } from 'lucide-react';
import DestinationManagement from '@/components/admin/DestinationManagement';
import TemplateGenerator from '@/components/admin/TemplateGenerator';
import TemplateManager from '@/components/admin/TemplateManager';
import BundleCreator from '@/components/BundleCreator';
import { formatDistanceToNow, format } from 'date-fns';

// Helper function to safely format dates
const safeFormatDate = (date: any): string | null => {
  if (!date) return null;
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return null;
  try {
    return formatDistanceToNow(dateObj);
  } catch {
    return null;
  }
};

interface PendingTemplate {
  id: number;
  title: string;
  description: string;
  price: string;
  quality_score: number;
  created_at: string;
  user: {
    id: number;
    username: string;
    email: string;
    creator_status: string;
  };
}

interface AdminStats {
  templates: {
    total: number;
    published: number;
    pending: number;
    avgQuality: number;
  };
  users: {
    total: number;
    creators: number;
    verified: number;
  };
  sales: {
    totalSales: number;
    totalRevenue: number;
    totalPlatformFees: number;
  };
}

interface FinancialOverview {
  revenue: {
    totalRevenue: number;
    totalPlatformFees: number;
    totalCreatorPayouts: number;
    totalSales: number;
    last30DaysRevenue: number;
    last30DaysSales: number;
  };
  pendingPayouts: {
    totalPending: number;
    countPending: number;
  };
  topTemplates: Array<{
    template_id: number;
    title: string;
    totalRevenue: number;
    totalSales: number;
    creatorUsername: string;
  }>;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingTemplates, setPendingTemplates] = useState<PendingTemplate[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [financials, setFinancials] = useState<FinancialOverview | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/check', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
        setIsSuperAdmin(data.isSuperAdmin);
        // Pass isSuperAdmin directly since state won't be updated yet
        loadAdminData(data.isSuperAdmin);
      } else {
        setLocation('/');
      }
    } catch (error) {
      setLocation('/');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async (superAdmin?: boolean) => {
    try {
      // Load stats
      const statsResponse = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (statsResponse.ok) {
        setStats(await statsResponse.json());
      }

      // Load pending templates
      const templatesResponse = await fetch('/api/admin/templates/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (templatesResponse.ok) {
        setPendingTemplates(await templatesResponse.json());
      }

      // Load financials if super admin (use parameter or state)
      const isSuper = superAdmin !== undefined ? superAdmin : isSuperAdmin;
      if (isSuper) {
        const financialResponse = await fetch('/api/admin/financials/overview', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (financialResponse.ok) {
          setFinancials(await financialResponse.json());
        }
      }
    } catch (error) {
      }
  };

  const handleApproveTemplate = async (templateId: number) => {
    try {
      const response = await fetch(`/api/admin/templates/${templateId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: 'Approved by admin' })
      });

      if (response.ok) {
        setPendingTemplates(prev => prev.filter(t => t.id !== templateId));
        loadAdminData(isSuperAdmin); // Refresh stats
      }
    } catch (error) {
      }
  };

  const handleRejectTemplate = async (templateId: number, reason: string) => {
    try {
      const response = await fetch(`/api/admin/templates/${templateId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason, notes: 'Rejected by admin' })
      });

      if (response.ok) {
        setPendingTemplates(prev => prev.filter(t => t.id !== templateId));
        loadAdminData(isSuperAdmin); // Refresh stats
      }
    } catch (error) {
      }
  };

  const getQualityBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-center text-gray-600">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Manage templates, users, and platform operations
            {isSuperAdmin && ' (Super Admin)'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className={`grid ${isSuperAdmin ? 'grid-cols-8' : 'grid-cols-7'} w-full max-w-5xl`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="destinations">Destinations</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="templates">Manage Templates</TabsTrigger>
            <TabsTrigger value="bundles">Bundles</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="financials">Financials</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.templates.total}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.templates.published} published, {stats.templates.pending} pending
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.users.total}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.users.creators} creators, {stats.users.verified} verified
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Number(stats.templates.avgQuality || 0).toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground">Average template quality</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="moderation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Templates ({pendingTemplates.length})</CardTitle>
                <CardDescription>Review and approve or reject templates</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {pendingTemplates.map((template) => (
                      <Card key={template.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{template.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          </div>
                          <Badge className={`${getQualityBadgeColor(template.quality_score)} text-white`}>
                            Quality: {template.quality_score}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <span>By {template.user?.username || 'Unknown'}</span>
                          <span>${template.price}</span>
                          {safeFormatDate(template.created_at) && (
                            <span>{safeFormatDate(template.created_at)} ago</span>
                          )}
                          {template.user?.creator_status === 'verified' && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Verified Creator
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveTemplate(template.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectTemplate(template.id, 'Does not meet quality standards')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLocation(`/template/${template.id}`)}
                          >
                            View Template
                          </Button>
                        </div>
                      </Card>
                    ))}

                    {pendingTemplates.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p>No templates pending review!</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagementTab isSuperAdmin={isSuperAdmin} />
          </TabsContent>

          <TabsContent value="destinations" className="space-y-4">
            <DestinationManagement />
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            <TemplateGenerator />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <TemplateManager />
          </TabsContent>

          <TabsContent value="bundles" className="space-y-4">
            <BundleCreator isAdmin={true} />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="financials" className="space-y-4">
              {financials && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${Number(financials?.revenue?.totalRevenue || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ${Number(financials?.revenue?.last30DaysRevenue || 0).toFixed(2)} last 30 days
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${Number(financials?.revenue?.totalPlatformFees || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">30% of sales</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${Number(financials?.pendingPayouts?.totalPending || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {financials?.pendingPayouts?.countPending || 0} transactions
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performing Templates</CardTitle>
                      <CardDescription>Highest revenue generating templates</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {financials?.topTemplates?.map((template, index) => (
                          <div key={template.template_id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-semibold text-gray-400">#{index + 1}</span>
                              <div>
                                <p className="font-medium">{template.title}</p>
                                <p className="text-sm text-gray-500">by {template.creatorUsername}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${Number(template.totalRevenue || 0).toFixed(2)}</p>
                              <p className="text-sm text-gray-500">{template.totalSales} sales</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

// User Management Tab Component
function UserManagementTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCreatorStatus, setFilterCreatorStatus] = useState('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (filterRole !== 'all') params.append('role', filterRole);
      if (filterCreatorStatus !== 'all') params.append('creator_status', filterCreatorStatus);

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      } finally {
      setLoading(false);
    }
  };

  const handleVerifyCreator = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      }
  };

  const handleSuspendUser = async (userId: number) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Admin suspension' })
      });

      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      }
  };

  const handleMakeAdmin = async (userId: number) => {
    if (!confirm('Grant admin privileges to this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/make-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      }
  };

  const handleRemoveAdmin = async (userId: number) => {
    if (!confirm('Remove admin privileges from this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/remove-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      }
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCreatorBadge = (status: string) => {
    switch(status) {
      case 'verified':
        return <Badge className="bg-green-500 text-white">Verified</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500 text-white">Creator</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500 text-white">Suspended</Badge>;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <Badge className="bg-purple-500 text-white"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage users, creators, and admin privileges</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterRole} onValueChange={(value) => { setFilterRole(value); loadUsers(); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCreatorStatus} onValueChange={(value) => { setFilterCreatorStatus(value); loadUsers(); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Creator status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="none">Not Creator</SelectItem>
              <SelectItem value="approved">Creator</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users List */}
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>No users found</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{user.username || 'No username'}</h3>
                        {getRoleBadge(user.role)}
                        {getCreatorBadge(user.creator_status)}
                        {user.creator_score > 0 && (
                          <Badge variant="outline">Score: {user.creator_score}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <div className="flex gap-4 text-xs text-gray-500 mt-2">
                        {safeFormatDate(user.created_at) && (
                          <span>Joined {safeFormatDate(user.created_at)} ago</span>
                        )}
                        {safeFormatDate(user.last_login) && (
                          <span>Last seen {safeFormatDate(user.last_login)} ago</span>
                        )}
                        {user.template_count > 0 && (
                          <span>{user.template_count} templates</span>
                        )}
                        {user.total_revenue > 0 && (
                          <span>${Number(user.total_revenue).toFixed(2)} earned</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {/* Creator Actions */}
                      {user.creator_status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerifyCreator(user.id)}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                      )}

                      {user.creator_status !== 'suspended' && user.creator_status !== 'none' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSuspendUser(user.id)}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                      )}

                      {/* Admin Actions (Super Admin Only) */}
                      {isSuperAdmin && (
                        <>
                          {user.role !== 'admin' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMakeAdmin(user.id)}
                              className="text-purple-600 border-purple-600 hover:bg-purple-50"
                            >
                              <Crown className="h-4 w-4 mr-1" />
                              Make Admin
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveAdmin(user.id)}
                              className="text-gray-600 border-gray-600 hover:bg-gray-50"
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Remove Admin
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}