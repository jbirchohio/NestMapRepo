import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  DollarSign, TrendingUp, Users, Eye, Package, 
  ArrowUpRight, ArrowDownRight, Download, CreditCard,
  Gift, Building, Wallet, AlertCircle, Check, X,
  BarChart3, PieChart, Calendar, Plus, Edit2, Trash2,
  Share2, Star, Settings, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ClientCreatorDashboard, ClientTemplate } from '@/lib/types';
import { useAuth } from '@/contexts/JWTAuthContext';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

export default function CreatorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState('paypal');
  const [payoutAmount, setPayoutAmount] = useState('');

  // Fetch dashboard data
  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['creator-dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/creators/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      return response.json() as Promise<ClientCreatorDashboard>;
    },
    enabled: !!user,
  });

  // Request payout mutation
  const payoutMutation = useMutation({
    mutationFn: async ({ method, amount }: { method: string; amount: string }) => {
      const response = await fetch('/api/creators/request-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ method, amount })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Payout request failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Payout requested!',
        description: `Your ${payoutMethod} payout of $${payoutAmount} will arrive by ${data.estimatedArrival}`,
      });
      setShowPayoutModal(false);
      setPayoutAmount('');
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: 'Payout failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access your creator dashboard</p>
          <Button onClick={() => navigate('/login')}>Log In</Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Error Loading Dashboard</h2>
          <Button onClick={() => refetch()}>Retry</Button>
        </Card>
      </div>
    );
  }

  const availableBalance = parseFloat(dashboard.balance.availableBalance);
  const pendingBalance = parseFloat(dashboard.balance.pendingBalance);
  const lifetimeEarnings = parseFloat(dashboard.balance.lifetimeEarnings);

  // Payout thresholds
  const payoutThresholds = {
    paypal: 10,
    amazon: 25,
    bank: 100,
    credits: 5,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Creator Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your template sales and earnings</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Available Balance"
            value={`$${availableBalance.toFixed(2)}`}
            icon={DollarSign}
            trend={pendingBalance > 0 ? 'up' : 'neutral'}
            trendValue={pendingBalance > 0 ? `+$${pendingBalance.toFixed(2)} pending` : undefined}
            color="green"
          />
          <MetricCard
            title="Total Sales"
            value={dashboard.metrics.totalSales}
            icon={Package}
            trend="up"
            trendValue={`${dashboard.metrics.conversionRate}% conversion`}
            color="purple"
          />
          <MetricCard
            title="Total Views"
            value={dashboard.metrics.totalViews}
            icon={Eye}
            color="blue"
          />
          <MetricCard
            title="Lifetime Earnings"
            value={`$${lifetimeEarnings.toFixed(2)}`}
            icon={TrendingUp}
            color="pink"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Monthly revenue over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={dashboard.monthlyRevenue}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#8b5cf6"
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Recent Sales */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>Your latest template purchases</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboard.recentSales.slice(0, 5).map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{sale.templateTitle}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(sale.purchasedAt), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            +${sale.sellerEarnings}
                          </p>
                          <p className="text-xs text-gray-500">
                            70% of net
                          </p>
                        </div>
                      </div>
                    ))}
                    {dashboard.recentSales.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        No sales yet. Share your templates to get started!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto flex-col py-4"
                    onClick={() => navigate('/templates/create')}
                  >
                    <Plus className="h-5 w-5 mb-2" />
                    Create Template
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col py-4"
                    onClick={() => setShowPayoutModal(true)}
                    disabled={availableBalance < 5}
                  >
                    <Wallet className="h-5 w-5 mb-2" />
                    Request Payout
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col py-4"
                    onClick={() => navigate('/creators/profile')}
                  >
                    <Settings className="h-5 w-5 mb-2" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col py-4"
                    onClick={() => navigate('/marketplace')}
                  >
                    <Eye className="h-5 w-5 mb-2" />
                    View Marketplace
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">My Templates</h2>
              <Button onClick={() => navigate('/templates/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Template
              </Button>
            </div>

            <div className="grid gap-4">
              {dashboard.templates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{template.title}</h3>
                          <Badge variant={template.status === 'published' ? 'default' : 'outline'}>
                            {template.status}
                          </Badge>
                          {template.featured && (
                            <Badge className="bg-yellow-500">Featured</Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-4">{template.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Price</p>
                            <p className="font-semibold">${template.price}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Sales</p>
                            <p className="font-semibold">{template.salesCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Views</p>
                            <p className="font-semibold">{template.viewCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Rating</p>
                            <p className="font-semibold flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {template.rating || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Your Earnings</p>
                            <p className="font-semibold text-green-600">
                              ${(() => {
                                const grossPrice = parseFloat(template.price);
                                const stripeFee = (grossPrice * 0.029) + 0.30;
                                const netRevenue = grossPrice - stripeFee;
                                const creatorEarnings = netRevenue * 0.70;
                                return (template.salesCount * creatorEarnings).toFixed(2);
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {dashboard.templates.length === 0 && (
                <Card className="p-12 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first template and start earning
                  </p>
                  <Button onClick={() => navigate('/templates/create')}>
                    Create Template
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            {/* Balance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Balance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Available for Payout</p>
                    <p className="text-3xl font-bold text-green-600">
                      ${availableBalance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending Clearance</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      ${pendingBalance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Lifetime Payouts</p>
                    <p className="text-3xl font-bold text-gray-600">
                      ${dashboard.balance.lifetimePayouts}
                    </p>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Payout Methods */}
                <div>
                  <h3 className="font-semibold mb-4">Payout Methods</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <PayoutMethodCard
                      method="paypal"
                      icon={CreditCard}
                      minAmount={payoutThresholds.paypal}
                      available={availableBalance >= payoutThresholds.paypal}
                      onRequest={() => {
                        setPayoutMethod('paypal');
                        setShowPayoutModal(true);
                      }}
                    />
                    <PayoutMethodCard
                      method="amazon"
                      icon={Gift}
                      minAmount={payoutThresholds.amazon}
                      available={availableBalance >= payoutThresholds.amazon}
                      onRequest={() => {
                        setPayoutMethod('amazon');
                        setShowPayoutModal(true);
                      }}
                    />
                  </div>
                </div>

                {/* Tax Information */}
                {availableBalance >= 600 && !dashboard.balance.w9OnFile && (
                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-900">
                          Tax Information Required
                        </p>
                        <p className="text-sm text-yellow-800 mt-1">
                          You'll need to submit tax information (W-9) for payouts over $600.
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Submit Tax Info
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sales Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your earnings from template sales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Template</th>
                        <th className="text-right py-2">Sale Price</th>
                        <th className="text-right py-2">Stripe Fee</th>
                        <th className="text-right py-2">Platform Fee</th>
                        <th className="text-right py-2">Your Earnings</th>
                        <th className="text-right py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recentSales.map((sale) => (
                        <tr key={sale.id} className="border-b">
                          <td className="py-2">
                            {format(new Date(sale.purchasedAt), 'MMM d, yyyy')}
                          </td>
                          <td className="py-2">{sale.templateTitle}</td>
                          <td className="text-right py-2">${sale.price}</td>
                          <td className="text-right py-2 text-gray-500">
                            -${sale.stripeFee || ((parseFloat(sale.price) * 0.029) + 0.30).toFixed(2)}
                          </td>
                          <td className="text-right py-2 text-red-600">
                            -${sale.platformFee}
                          </td>
                          <td className="text-right py-2 font-semibold text-green-600">
                            +${sale.sellerEarnings}
                          </td>
                          <td className="text-right py-2">
                            <Badge variant={sale.status === 'completed' ? 'default' : 'outline'}>
                              {sale.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dashboard.recentSales.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      No transactions yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell travelers about yourself..."
                    defaultValue={dashboard.profile.bio}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="specialties">Specialties</Label>
                  <Input
                    id="specialties"
                    placeholder="Europe, Budget Travel, Food Tours"
                    defaultValue={dashboard.profile.specialties.join(', ')}
                    className="mt-1"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="twitter">Twitter Username</Label>
                    <Input
                      id="twitter"
                      placeholder="@username"
                      defaultValue={dashboard.profile.socialTwitter}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instagram">Instagram Username</Label>
                    <Input
                      id="instagram"
                      placeholder="@username"
                      defaultValue={dashboard.profile.socialInstagram}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://yourwebsite.com"
                    defaultValue={dashboard.profile.websiteUrl}
                    className="mt-1"
                  />
                </div>

                <Button className="w-full">Save Profile</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payout Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="payout-method">Preferred Payout Method</Label>
                  <Select defaultValue={dashboard.balance.payoutMethod || 'paypal'}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="amazon">Amazon Gift Card</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="credits">Platform Credits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payout-email">PayPal Email</Label>
                  <Input
                    id="payout-email"
                    type="email"
                    placeholder="your@email.com"
                    defaultValue={dashboard.balance.payoutEmail}
                    className="mt-1"
                  />
                </div>

                <Button className="w-full">Save Payout Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payout Request Modal */}
      <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Available balance: ${availableBalance.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={payoutThresholds[payoutMethod as keyof typeof payoutThresholds]}
                max={availableBalance}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder={`Min: $${payoutThresholds[payoutMethod as keyof typeof payoutThresholds]}`}
              />
            </div>

            <div>
              <Label htmlFor="method">Method</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">PayPal (2-3 days)</SelectItem>
                  <SelectItem value="amazon">Amazon Gift Card (1-2 days)</SelectItem>
                  <SelectItem value="bank">Bank Transfer (5-7 days)</SelectItem>
                  <SelectItem value="credits">Platform Credits (Instant)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Minimum payout: ${payoutThresholds[payoutMethod as keyof typeof payoutThresholds]}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Processing time: {
                  payoutMethod === 'paypal' ? '2-3 business days' :
                  payoutMethod === 'amazon' ? '1-2 business days' :
                  payoutMethod === 'bank' ? '5-7 business days' :
                  'Instant'
                }
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => payoutMutation.mutate({ 
                method: payoutMethod, 
                amount: payoutAmount 
              })}
              disabled={
                !payoutAmount || 
                parseFloat(payoutAmount) < payoutThresholds[payoutMethod as keyof typeof payoutThresholds] ||
                parseFloat(payoutAmount) > availableBalance ||
                payoutMutation.isPending
              }
            >
              {payoutMutation.isPending ? 'Processing...' : 'Request Payout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'gray'
}: {
  title: string;
  value: string | number;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    blue: 'bg-blue-100 text-blue-600',
    pink: 'bg-pink-100 text-pink-600',
    gray: 'bg-gray-100 text-gray-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className={`flex items-center text-sm ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trend === 'up' && <ArrowUpRight className="h-4 w-4" />}
              {trend === 'down' && <ArrowDownRight className="h-4 w-4" />}
              {trendValue && <span className="ml-1">{trendValue}</span>}
            </div>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-600">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Payout Method Card Component
function PayoutMethodCard({
  method,
  icon: Icon,
  minAmount,
  available,
  onRequest
}: {
  method: string;
  icon: any;
  minAmount: number;
  available: boolean;
  onRequest: () => void;
}) {
  return (
    <div className={`p-4 rounded-lg border ${available ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-gray-600" />
          <h4 className="font-medium capitalize">{method}</h4>
        </div>
        {available ? (
          <Badge variant="outline" className="text-green-600">Available</Badge>
        ) : (
          <Badge variant="outline" className="text-gray-400">Min: ${minAmount}</Badge>
        )}
      </div>
      <Button
        variant="outline"
        className="w-full"
        disabled={!available}
        onClick={onRequest}
      >
        Request Payout
      </Button>
    </div>
  );
}