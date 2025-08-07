import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from '@/contexts/JWTAuthContext';
import { useLocation } from 'wouter';
import { DollarSign, Users, FileText, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
      console.error('Admin check failed:', error);
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
      console.error('Error loading admin data:', error);
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
      console.error('Error approving template:', error);
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
      console.error('Error rejecting template:', error);
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
          <TabsList className={`grid ${isSuperAdmin ? 'grid-cols-4' : 'grid-cols-3'} w-full max-w-2xl`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
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
                      {stats.templates.avgQuality?.toFixed(1) || '0'}
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
                          <span>{formatDistanceToNow(new Date(template.created_at))} ago</span>
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
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage creators and user accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>User management features coming soon</p>
                </div>
              </CardContent>
            </Card>
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
                          ${financials?.revenue?.totalRevenue?.toFixed(2) || '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ${financials?.revenue?.last30DaysRevenue?.toFixed(2) || '0.00'} last 30 days
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
                          ${financials?.revenue?.totalPlatformFees?.toFixed(2) || '0.00'}
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
                          ${financials?.pendingPayouts?.totalPending?.toFixed(2) || '0.00'}
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
                              <p className="font-semibold">${template.totalRevenue?.toFixed(2)}</p>
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