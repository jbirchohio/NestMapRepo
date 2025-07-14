
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { AnimatedCard } from '@/components/ui/animated-card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Key, Users, Building, CreditCard, DollarSign, RefreshCw, Ban, CheckCircle, Settings } from 'lucide-react';
import { SuperadminNavigation } from '@/components/SuperadminNavigation';

export default function SuperadminOrganizationDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Billing management state
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [isDowngradeDialogOpen, setIsDowngradeDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Fetch organization details
  const { data: organization, isLoading, error } = useQuery({
    queryKey: ['superadmin', 'organizations', id],
    queryFn: async () => {
      console.log('Fetching organization with ID:', id);
      const data = await apiRequest('GET', `/api/superadmin/organizations/${id}`);
      console.log('Organization data received:', data);
      return data;
    },
  });

  // Debug logging
  console.log('Organization query state:', { organization, isLoading, error });

  // Update organization mutation
  const updateOrganization = useMutation({
    mutationFn: async (updates: any) => {
      const res = await apiRequest('PUT', `/api/superadmin/organizations/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations'] });
      toast({ title: 'Organization updated successfully' });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Failed to update organization', variant: 'destructive' });
    },
  });

  // Delete organization mutation
  const deleteOrganization = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/superadmin/organizations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Organization deleted successfully' });
      window.location.href = '/superadmin/organizations';
    },
    onError: () => {
      toast({ title: 'Failed to delete organization', variant: 'destructive' });
    },
  });

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: async ({ userId, updates }: { userId: number; updates: any }) => {
      return await apiRequest('PUT', `/api/superadmin/users/${userId}`, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', id] });
      toast({ 
        title: 'User role updated successfully',
        description: `Role changed to ${data.role}` 
      });
    },
    onError: (error: any) => {
      console.error('User update error:', error);
      toast({ 
        title: 'Failed to update user', 
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive' 
      });
    },
  });

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('DELETE', `/api/superadmin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', id] });
      toast({ title: 'User deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete user', variant: 'destructive' });
    },
  });

  // Create user mutation
  const createUser = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest('POST', '/api/superadmin/users', {
        ...userData,
        organization_id: parseInt(id as string)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', id] });
      toast({ title: 'User created successfully' });
      setIsCreateUserDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Failed to create user', variant: 'destructive' });
    },
  });

  // Reset password mutation
  const resetPassword = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword: string }) => {
      const res = await apiRequest('POST', `/api/superadmin/users/${userId}/reset-password`, { newPassword });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Password reset successfully' });
      setIsResetPasswordDialogOpen(false);
      setNewPassword('');
      setSelectedUserId(null);
    },
    onError: () => {
      toast({ title: 'Failed to reset password', variant: 'destructive' });
    },
  });

  // Billing mutations
  const upgradePlan = useMutation({
    mutationFn: async ({ newPlan }: { newPlan: string }) => {
      const res = await apiRequest('POST', `/api/superadmin/billing/${id}/upgrade`, { 
        newPlan, 
        previousPlan: organization.plan 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', id] });
      toast({ title: 'Plan upgraded successfully' });
      setIsUpgradeDialogOpen(false);
      setSelectedPlan('');
    },
    onError: () => {
      toast({ title: 'Failed to upgrade plan', variant: 'destructive' });
    },
  });

  const downgradePlan = useMutation({
    mutationFn: async ({ newPlan }: { newPlan: string }) => {
      const res = await apiRequest('POST', `/api/superadmin/billing/${id}/downgrade`, { 
        newPlan, 
        previousPlan: organization.plan 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', id] });
      toast({ title: 'Plan downgraded successfully' });
      setIsDowngradeDialogOpen(false);
      setSelectedPlan('');
    },
    onError: () => {
      toast({ title: 'Failed to downgrade plan', variant: 'destructive' });
    },
  });

  const processRefund = useMutation({
    mutationFn: async ({ amount, reason, refundType }: { amount: string; reason: string; refundType: string }) => {
      const res = await apiRequest('POST', `/api/superadmin/billing/${id}/refund`, { 
        amount, 
        reason, 
        refundType 
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Refund processed successfully' });
      setIsRefundDialogOpen(false);
      setRefundAmount('');
      setRefundReason('');
    },
    onError: () => {
      toast({ title: 'Failed to process refund', variant: 'destructive' });
    },
  });

  const suspendBilling = useMutation({
    mutationFn: async ({ reason }: { reason: string }) => {
      const res = await apiRequest('POST', `/api/superadmin/billing/${id}/suspend`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', id] });
      toast({ title: 'Billing suspended successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to suspend billing', variant: 'destructive' });
    },
  });

  const reactivateBilling = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/superadmin/billing/${id}/reactivate`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', id] });
      toast({ title: 'Billing reactivated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to reactivate billing', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-soft-100 dark:bg-navy-900">
        <SuperadminNavigation />
        <div className="lg:ml-64 container mx-auto px-6 py-8 space-y-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-electric-600 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-soft-100 dark:bg-navy-900">
        <SuperadminNavigation />
        <div className="lg:ml-64 container mx-auto px-6 py-8 space-y-8">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4 text-navy-900 dark:text-white">Organization not found</h2>
            <Link href="/superadmin/organizations">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Organizations
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleRoleChange = (userId: number, newRole: string) => {
    updateUser.mutate({ userId, updates: { role: newRole } });
  };

  const handleDeleteUser = (userId: number, username: string) => {
    if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      deleteUser.mutate(userId);
    }
  };

  const handleResetPassword = (userId: number) => {
    if (newPassword.trim().length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    resetPassword.mutate({ userId, newPassword });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const userData = {
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
      display_name: formData.get('display_name'),
    };
    createUser.mutate(userData);
  };

  return (
    <div className="min-h-screen bg-soft-100 dark:bg-navy-900">
      <SuperadminNavigation />
      
      {/* Main Content */}
      <div className="lg:ml-64 container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-electric-500/10 via-electric-600/20 to-electric-700/30 p-8 border border-electric-200/30 backdrop-blur-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/superadmin">
                <Button variant="outline" size="sm" className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
                  {organization.name}
                </h1>
                <p className="text-navy-600 dark:text-navy-300 text-lg">
                  Organization Management
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger>
                  <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Edit Organization</h3>
                      <p className="text-sm text-muted-foreground">
                        Update organization details
                      </p>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      const updates = Object.fromEntries(formData.entries());
                      updateOrganization.mutate(updates);
                    }}>
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input id="name" name="name" defaultValue={organization.name} />
                        </div>
                        <div>
                          <Label htmlFor="domain">Domain</Label>
                          <Input id="domain" name="domain" defaultValue={organization.domain} />
                        </div>
                        <div>
                          <Label htmlFor="plan">Plan</Label>
                          <Select name="plan" defaultValue={organization.plan}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="team">Team</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="employee_count">Employee Count</Label>
                          <Input 
                            id="employee_count" 
                            name="employee_count" 
                            type="number" 
                            defaultValue={organization.employee_count || 0} 
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-6">
                        <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateOrganization.isPending}>
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                variant="destructive" 
                onClick={() => {
                  if (confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
                    deleteOrganization.mutate();
                  }
                }}
                disabled={deleteOrganization.isPending}
                className="bg-red-500/20 border-red-400/30 hover:bg-red-500/30 text-red-100"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Organization Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            { 
              label: 'Plan', 
              value: organization.plan, 
              color: 'from-electric-500 to-electric-600',
              icon: CreditCard,
              badge: organization.subscription_status || 'inactive'
            },
            { 
              label: 'Monthly Cost', 
              value: `$${organization.plan === 'enterprise' ? '99.99' : organization.plan === 'team' ? '29.99' : '0.00'}`, 
              color: 'from-green-500 to-green-600',
              icon: DollarSign,
              subtitle: 'Per month'
            },
            { 
              label: 'Users', 
              value: organization.members?.length || 0, 
              color: 'from-blue-500 to-blue-600',
              icon: Users,
              subtitle: 'Active members'
            },
            { 
              label: 'Employee Count', 
              value: organization.employee_count || 0, 
              color: 'from-orange-500 to-orange-600',
              icon: Building,
              subtitle: 'Total employees'
            },
            { 
              label: 'Status', 
              value: 'Active', 
              color: 'from-emerald-500 to-emerald-600',
              icon: Settings,
              subtitle: 'Organization status'
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <AnimatedCard variant="glow" className="p-6 text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${metric.color} text-white mb-3`}>
                  <metric.icon className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-1">
                  {metric.value}
                </h3>
                <p className="text-navy-600 dark:text-navy-300 text-sm">{metric.label}</p>
                {metric.badge && (
                  <div className="mt-2">
                    <Badge variant={metric.badge === 'active' ? 'default' : 'secondary'}>
                      {metric.badge}
                    </Badge>
                  </div>
                )}
                {metric.subtitle && (
                  <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">{metric.subtitle}</p>
                )}
              </AnimatedCard>
            </motion.div>
          ))}
        </div>

        {/* Organization Roles & Permissions Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <AnimatedCard variant="glow" className="p-6 mb-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white mb-2 flex items-center gap-2">
                <Users className="h-6 w-6 text-electric-600" />
                Organization Roles & Permissions
              </h2>
              <p className="text-navy-600 dark:text-navy-300">Manage role-based access control for this organization's members</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: 'Admin',
                  description: 'Full organization control and management',
                  permissions: ['Manage all trips', 'Team management', 'Billing access', 'White label settings', 'API access']
                },
                {
                  title: 'Manager',
                  description: 'Team oversight and trip management',
                  permissions: ['View all trips', 'Edit team trips', 'Analytics access', 'Invite members', 'Bulk operations']
                },
                {
                  title: 'Editor',
                  description: 'Create and edit trips with collaboration',
                  permissions: ['Create trips', 'Edit own trips', 'Trip collaboration', 'Flight/hotel booking', 'Trip optimizer']
                },
                {
                  title: 'Member',
                  description: 'Create and manage own trips',
                  permissions: ['Create own trips', 'Basic booking', 'View assigned trips', 'Export own data']
                }
              ].map((role) => (
                <div key={role.title} className="p-4 bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/10">
                  <h3 className="font-semibold text-navy-900 dark:text-white mb-2">{role.title}</h3>
                  <p className="text-xs text-navy-600 dark:text-navy-300 mb-3">{role.description}</p>
                  <div className="space-y-1 text-xs">
                    {role.permissions.map((permission) => (
                      <div key={permission} className="text-navy-700 dark:text-navy-400">• {permission}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Billing Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <AnimatedCard variant="glow" className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white mb-2 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-electric-600" />
                Billing Management
              </h2>
              <p className="text-navy-600 dark:text-navy-300">Manage subscription, billing, and payments for this organization</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Plan Management */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-navy-600 dark:text-navy-400">Plan Management</div>
                <div className="space-y-2">
                  <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
                    <DialogTrigger>
                      <Button variant="outline" size="sm" className="w-full" disabled={organization.plan === 'enterprise'}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Upgrade Plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <AlertDialogTitle>Upgrade Plan</AlertDialogTitle>
                        <AlertDialogDescription>Upgrade organization to a higher plan</AlertDialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="upgrade-plan">Select Plan</Label>
                        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose new plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {organization.plan === 'free' && (
                              <>
                                <SelectItem value="basic">Basic ($29/month)</SelectItem>
                                <SelectItem value="team">Team ($199/month)</SelectItem>
                                <SelectItem value="enterprise">Enterprise ($499/month)</SelectItem>
                              </>
                            )}
                            {organization.plan === 'basic' && (
                              <>
                                <SelectItem value="team">Team ($199/month)</SelectItem>
                                <SelectItem value="enterprise">Enterprise ($499/month)</SelectItem>
                              </>
                            )}
                            {organization.plan === 'team' && (
                              <SelectItem value="enterprise">Enterprise ($499/month)</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => selectedPlan && upgradePlan.mutate({ newPlan: selectedPlan })} disabled={!selectedPlan || upgradePlan.isPending}>
                          Upgrade Plan
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isDowngradeDialogOpen} onOpenChange={setIsDowngradeDialogOpen}>
                    <DialogTrigger>
                      <Button variant="outline" size="sm" className="w-full" disabled={organization.plan === 'free'}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Downgrade Plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <AlertDialogTitle>Downgrade Plan</AlertDialogTitle>
                        <AlertDialogDescription>Downgrade organization to a lower plan</AlertDialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="downgrade-plan">Select Plan</Label>
                        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose new plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {organization.plan === 'enterprise' && (
                              <>
                                <SelectItem value="team">Team ($199/month)</SelectItem>
                                <SelectItem value="basic">Basic ($29/month)</SelectItem>
                                <SelectItem value="free">Free ($0/month)</SelectItem>
                              </>
                            )}
                            {organization.plan === 'team' && (
                              <>
                                <SelectItem value="basic">Basic ($29/month)</SelectItem>
                                <SelectItem value="free">Free ($0/month)</SelectItem>
                              </>
                            )}
                            {organization.plan === 'basic' && (
                              <SelectItem value="free">Free ($0/month)</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDowngradeDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => selectedPlan && downgradePlan.mutate({ newPlan: selectedPlan })} disabled={!selectedPlan || downgradePlan.isPending}>
                          Downgrade Plan
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Refund Processing */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-navy-600 dark:text-navy-400">Refund Processing</div>
                <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
                  <DialogTrigger>
                    <Button variant="outline" size="sm" className="w-full">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Process Refund
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <AlertDialogTitle>Process Refund</AlertDialogTitle>
                      <AlertDialogDescription>Issue a refund for this organization</AlertDialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="refund-amount">Refund Amount</Label>
                        <Input
                          id="refund-amount"
                          type="number"
                          step="0.01"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="refund-reason">Reason</Label>
                        <Textarea
                          id="refund-reason"
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          placeholder="Reason for refund..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>Cancel</Button>
                      <Button 
                        onClick={() => processRefund.mutate({ 
                          amount: refundAmount, 
                          reason: refundReason, 
                          refundType: 'full' 
                        })} 
                        disabled={!refundAmount || !refundReason || processRefund.isPending}
                      >
                        Process Refund
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Billing Controls */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-navy-600 dark:text-navy-400">Billing Controls</div>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => suspendBilling.mutate({ reason: 'Administrative suspension' })}
                    disabled={organization.subscription_status === 'suspended' || suspendBilling.isPending}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Suspend Billing
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => reactivateBilling.mutate()}
                    disabled={organization.subscription_status === 'active' || reactivateBilling.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Reactivate Billing
                  </Button>
                </div>
              </div>

              {/* Billing Information */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-navy-600 dark:text-navy-400">Billing Information</div>
                <div className="space-y-1 text-sm">
                  <div>Current Plan: <span className="font-medium capitalize">{organization.plan}</span></div>
                  <div>Status: <Badge variant={organization.subscription_status === 'active' ? 'default' : 'secondary'}>{organization.subscription_status || 'inactive'}</Badge></div>
                  <div>Monthly Cost: <span className="font-medium">${organization.plan === 'enterprise' ? '99.99' : organization.plan === 'team' ? '29.99' : '0.00'}</span></div>
                  {organization.stripe_customer_id && (
                    <div className="text-xs text-navy-500 dark:text-navy-400">
                      Stripe ID: {organization.stripe_customer_id.substring(0, 15)}...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Members Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-navy-900 dark:text-white mb-2">Organization Members</h2>
                <p className="text-navy-600 dark:text-navy-300">Manage users in this organization</p>
              </div>
              <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
                <DialogTrigger>
                  <Button className="bg-gradient-to-r from-electric-600 to-electric-700 hover:from-electric-700 hover:to-electric-800">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <AlertDialogTitle>Create New User</AlertDialogTitle>
                    <AlertDialogDescription>Add a new user to this organization</AlertDialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser}>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" name="username" required />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" required />
                      </div>
                      <div>
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input id="display_name" name="display_name" />
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" required />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select name="role" defaultValue="member">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin - Full organization control</SelectItem>
                            <SelectItem value="manager">Manager - Team leadership with trip oversight</SelectItem>
                            <SelectItem value="editor">Editor - Content creation and trip editing</SelectItem>
                            <SelectItem value="member">Member - Basic trip creation and personal management</SelectItem>
                            <SelectItem value="viewer">Viewer - Read-only access to assigned content</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateUserDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createUser.isPending}>
                        Create User
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {organization.members && organization.members.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organization.members.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-navy-900 dark:text-white">{member.display_name || member.username}</div>
                          <div className="text-sm text-navy-600 dark:text-navy-400">{member.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleRoleChange(member.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin - Full organization control</SelectItem>
                            <SelectItem value="manager">Manager - Team leadership with trip oversight</SelectItem>
                            <SelectItem value="editor">Editor - Content creation and trip editing</SelectItem>
                            <SelectItem value="member">Member - Basic trip creation and personal management</SelectItem>
                            <SelectItem value="viewer">Viewer - Read-only access to assigned content</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(member.id);
                              setIsResetPasswordDialogOpen(true);
                            }}
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(member.id, member.username)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-navy-600 dark:text-navy-400">No members found</p>
              </div>
            )}
          </AnimatedCard>
        </motion.div>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <AlertDialogTitle>Reset User Password</AlertDialogTitle>
              <AlertDialogDescription>Enter a new password for this user</AlertDialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsResetPasswordDialogOpen(false);
                  setNewPassword('');
                  setSelectedUserId(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => selectedUserId && handleResetPassword(selectedUserId)}
                disabled={resetPassword.isPending || !newPassword.trim()}
              >
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
