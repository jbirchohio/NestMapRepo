import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Shield,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface SpendPolicy {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  appliesTo: string;
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  annualLimit?: number;
  requiresApprovalOver?: number;
  autoApproveUnder?: number;
  businessPurposeRequired: boolean;
  receiptRequiredOver?: number;
  targetDepartments?: Record<string, any>;
  targetUsers?: Record<string, any>;
  targetRoles?: Record<string, any>;
  categoryLimits?: Record<string, any>;
  merchantRestrictions?: Record<string, any>;
  approvalChain?: Record<string, any>;
  allowedDays?: Record<string, any>;
  allowedHours?: Record<string, any>;
  allowedCountries?: Record<string, any>;
  blockedCountries?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
}

interface SpendPolicyFormData {
  name: string;
  description: string;
  isActive: boolean;
  appliesTo: string;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  annualLimit: number | null;
  requiresApprovalOver: number | null;
  autoApproveUnder: number | null;
  businessPurposeRequired: boolean;
  receiptRequiredOver: number | null;
}

export default function SpendPolicyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SpendPolicy | null>(null);
  const [formData, setFormData] = useState<SpendPolicyFormData>({
    name: '',
    description: '',
    isActive: true,
    appliesTo: 'all',
    dailyLimit: null,
    weeklyLimit: null,
    monthlyLimit: null,
    annualLimit: null,
    requiresApprovalOver: null,
    autoApproveUnder: null,
    businessPurposeRequired: false,
    receiptRequiredOver: null,
  });

  const { data: policies, isLoading } = useQuery<{ success: boolean; data: { policies: SpendPolicy[]; total: number } }>({
    queryKey: ['/api/policies/spend'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/policies/spend');
      return response as { success: boolean; data: { policies: SpendPolicy[]; total: number } };
    },
  });

  const createPolicyMutation = useMutation({
    mutationFn: async (policyData: SpendPolicyFormData) => {
      return await apiRequest('POST', '/api/policies/spend', policyData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/policies/spend'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Policy Created",
        description: "Spend policy has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create spend policy.",
        variant: "destructive",
      });
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SpendPolicyFormData> }) => {
      return await apiRequest('PUT', `/api/policies/spend/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/policies/spend'] });
      setIsEditDialogOpen(false);
      setEditingPolicy(null);
      resetForm();
      toast({
        title: "Policy Updated",
        description: "Spend policy has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update spend policy.",
        variant: "destructive",
      });
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/policies/spend/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/policies/spend'] });
      toast({
        title: "Policy Deleted",
        description: "Spend policy has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete spend policy.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isActive: true,
      appliesTo: 'all',
      dailyLimit: null,
      weeklyLimit: null,
      monthlyLimit: null,
      annualLimit: null,
      requiresApprovalOver: null,
      autoApproveUnder: null,
      businessPurposeRequired: false,
      receiptRequiredOver: null,
    });
  };

  const handleEdit = (policy: SpendPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description || '',
      isActive: policy.isActive,
      appliesTo: policy.appliesTo,
      dailyLimit: policy.dailyLimit || null,
      weeklyLimit: policy.weeklyLimit || null,
      monthlyLimit: policy.monthlyLimit || null,
      annualLimit: policy.annualLimit || null,
      requiresApprovalOver: policy.requiresApprovalOver || null,
      autoApproveUnder: policy.autoApproveUnder || null,
      businessPurposeRequired: policy.businessPurposeRequired,
      receiptRequiredOver: policy.receiptRequiredOver || null,
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingPolicy) {
      updatePolicyMutation.mutate({ id: editingPolicy.id, data: formData });
    } else {
      createPolicyMutation.mutate(formData);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'No limit';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const PolicyForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Policy Name*</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Travel Policy"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="appliesTo">Applies To</Label>
          <Select value={formData.appliesTo} onValueChange={(value) => setFormData({ ...formData, appliesTo: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="department">Specific Departments</SelectItem>
              <SelectItem value="role">Specific Roles</SelectItem>
              <SelectItem value="user">Specific Users</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe this policy..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dailyLimit">Daily Limit ($)</Label>
          <Input
            id="dailyLimit"
            type="number"
            value={formData.dailyLimit || ''}
            onChange={(e) => setFormData({ ...formData, dailyLimit: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g., 500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weeklyLimit">Weekly Limit ($)</Label>
          <Input
            id="weeklyLimit"
            type="number"
            value={formData.weeklyLimit || ''}
            onChange={(e) => setFormData({ ...formData, weeklyLimit: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g., 2000"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="monthlyLimit">Monthly Limit ($)</Label>
          <Input
            id="monthlyLimit"
            type="number"
            value={formData.monthlyLimit || ''}
            onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g., 8000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="annualLimit">Annual Limit ($)</Label>
          <Input
            id="annualLimit"
            type="number"
            value={formData.annualLimit || ''}
            onChange={(e) => setFormData({ ...formData, annualLimit: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g., 50000"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="requiresApprovalOver">Requires Approval Over ($)</Label>
          <Input
            id="requiresApprovalOver"
            type="number"
            value={formData.requiresApprovalOver || ''}
            onChange={(e) => setFormData({ ...formData, requiresApprovalOver: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g., 1000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="receiptRequiredOver">Receipt Required Over ($)</Label>
          <Input
            id="receiptRequiredOver"
            type="number"
            value={formData.receiptRequiredOver || ''}
            onChange={(e) => setFormData({ ...formData, receiptRequiredOver: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g., 25"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.businessPurposeRequired}
          onCheckedChange={(checked) => setFormData({ ...formData, businessPurposeRequired: checked })}
        />
        <Label htmlFor="businessPurposeRequired">Require business purpose</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label htmlFor="isActive">Policy is active</Label>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Spend Policies</h3>
          <p className="text-sm text-muted-foreground">
            Manage spending limits and approval requirements for your organization
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Spend Policy</DialogTitle>
            </DialogHeader>
            <PolicyForm />
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createPolicyMutation.isPending}>
                {createPolicyMutation.isPending ? 'Creating...' : 'Create Policy'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {policies?.data.policies.map((policy) => (
          <Card key={policy.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-electric-100 dark:bg-electric-900 rounded-lg">
                    <DollarSign className="w-4 h-4 text-electric-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{policy.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {policy.description || 'No description provided'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                    {policy.isActive ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(policy)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePolicyMutation.mutate(policy.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Daily Limit</p>
                  <p className="font-medium">{formatCurrency(policy.dailyLimit)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly Limit</p>
                  <p className="font-medium">{formatCurrency(policy.monthlyLimit)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Approval Required</p>
                  <p className="font-medium">{formatCurrency(policy.requiresApprovalOver)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Applies To</p>
                  <p className="font-medium capitalize">{policy.appliesTo}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {policies?.data.policies.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No spend policies yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first spend policy to start managing organizational spending limits.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Policy
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Spend Policy</DialogTitle>
          </DialogHeader>
          <PolicyForm />
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={updatePolicyMutation.isPending}>
              {updatePolicyMutation.isPending ? 'Updating...' : 'Update Policy'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
