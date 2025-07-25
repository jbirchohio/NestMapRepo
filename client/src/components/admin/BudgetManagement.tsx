import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  User,
  BarChart3
} from 'lucide-react';

interface Budget {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  category: 'project' | 'department' | 'trip_type' | 'general';
  status: 'active' | 'archived' | 'planned';
  startDate: string;
  endDate?: string;
  ownerId?: string;
  ownerName?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  spending?: {
    budgetAmount: number;
    totalSpent: number;
    remaining: number;
    percentageUsed: number;
    transactionCount: number;
    status: 'on_track' | 'warning' | 'over_budget';
  };
}

interface BudgetFormData {
  name: string;
  description: string;
  amount: string;
  currency: string;
  category: 'project' | 'department' | 'trip_type' | 'general';
  status: 'active' | 'archived' | 'planned';
  startDate: string;
  endDate: string;
  ownerId: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const defaultFormData: BudgetFormData = {
  name: '',
  description: '',
  amount: '',
  currency: 'USD',
  category: 'general',
  status: 'active',
  startDate: '',
  endDate: '',
  ownerId: '',
};

export default function BudgetManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<BudgetFormData>(defaultFormData);

  // Fetch budgets
  const { data: budgetsResponse, isLoading: budgetsLoading } = useQuery({
    queryKey: ['/api/budgets'],
    queryFn: async () => apiRequest('GET', '/api/budgets'),
  });

  // Fetch users for owner selection
  const { data: usersResponse } = useQuery({
    queryKey: ['/api/user/organization-users'],
    queryFn: async () => apiRequest('GET', '/api/user/organization-users'),
  });

  const budgets = budgetsResponse?.budgets || [];
  const users = usersResponse?.users || [];

  // Create budget mutation
  const createBudgetMutation = useMutation({
    mutationFn: async (data: Partial<BudgetFormData>) =>
      apiRequest('POST', '/api/budgets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      setIsCreateDialogOpen(false);
      setFormData(defaultFormData);
      toast({
        title: "Budget Created",
        description: "Budget has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create budget.",
        variant: "destructive",
      });
    },
  });

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BudgetFormData> }) =>
      apiRequest('PATCH', `/api/budgets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      setIsEditDialogOpen(false);
      setSelectedBudget(null);
      setFormData(defaultFormData);
      toast({
        title: "Budget Updated",
        description: "Budget has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update budget.",
        variant: "destructive",
      });
    },
  });

  // Delete budget mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest('DELETE', `/api/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      setIsDeleteDialogOpen(false);
      setSelectedBudget(null);
      toast({
        title: "Budget Deleted",
        description: "Budget has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete budget.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setFormData(defaultFormData);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (budget: Budget) => {
    setSelectedBudget(budget);
    setFormData({
      name: budget.name,
      description: budget.description || '',
      amount: (budget.amount / 100).toString(),
      currency: budget.currency,
      category: budget.category,
      status: budget.status,
      startDate: budget.startDate ? new Date(budget.startDate).toISOString().split('T')[0] : '',
      endDate: budget.endDate ? new Date(budget.endDate).toISOString().split('T')[0] : '',
      ownerId: budget.ownerId || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (budget: Budget) => {
    setSelectedBudget(budget);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (isEdit: boolean) => {
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      endDate: formData.endDate || undefined,
      ownerId: formData.ownerId || undefined,
    };

    if (isEdit && selectedBudget) {
      updateBudgetMutation.mutate({ id: selectedBudget.id, data: submitData });
    } else {
      createBudgetMutation.mutate(submitData);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'planned': return 'bg-blue-500';
      case 'archived': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getSpendingStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'over_budget': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSpendingIcon = (status: string) => {
    switch (status) {
      case 'on_track': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'over_budget': return <TrendingDown className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  if (budgetsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading budgets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Budget Management</h2>
          <p className="text-muted-foreground">
            Create and manage organizational budgets
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Budget
        </Button>
      </div>

      {/* Budget Statistics */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Budgets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{budgets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Budgets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {budgets.filter(b => b.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  budgets
                    .filter(b => b.status === 'active')
                    .reduce((sum, b) => sum + b.amount, 0),
                  'USD'
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {budgets.filter(b => b.spending?.status === 'over_budget' || b.spending?.status === 'warning').length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget List */}
      <div className="grid grid-cols-1 gap-4">
        {budgets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No budgets found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first budget to start tracking organizational spending
              </p>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Create Budget
              </Button>
            </CardContent>
          </Card>
        ) : (
          budgets.map((budget: Budget) => (
            <Card key={budget.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-base">{budget.name}</CardTitle>
                      <Badge variant="outline" className={`${getStatusColor(budget.status)} text-white`}>
                        {budget.status}
                      </Badge>
                      <Badge variant="outline">
                        {budget.category}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {budget.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(budget)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(budget)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Budget Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-medium">
                        {formatCurrency(budget.amount, budget.currency)}
                      </span>
                    </div>
                    {budget.ownerName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{budget.ownerName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(budget.startDate), 'MMM dd, yyyy')}
                        {budget.endDate && ` - ${format(new Date(budget.endDate), 'MMM dd, yyyy')}`}
                      </span>
                    </div>
                  </div>

                  {/* Spending Progress */}
                  {budget.spending && (
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className={`flex items-center gap-2 ${getSpendingStatusColor(budget.spending.status)}`}>
                          {getSpendingIcon(budget.spending.status)}
                          <span className="text-sm font-medium">
                            {budget.spending.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {budget.spending.transactionCount} transactions
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(budget.spending.percentageUsed, 100)} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-sm">
                        <span>
                          Spent: {formatCurrency(budget.spending.totalSpent, budget.currency)}
                        </span>
                        <span>
                          Remaining: {formatCurrency(budget.spending.remaining, budget.currency)}
                        </span>
                      </div>
                      <div className="text-center text-sm text-muted-foreground">
                        {budget.spending.percentageUsed.toFixed(1)}% used
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        if (!open) {
          setFormData(defaultFormData);
          setSelectedBudget(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? 'Edit Budget' : 'Create Budget'}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen 
                ? 'Update the budget details below.' 
                : 'Create a new budget to track organizational spending.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Budget Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Q1 Travel Budget"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Budget description..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, currency: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value: any) => 
                  setFormData(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="trip_type">Trip Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => 
                  setFormData(prev => ({ ...prev, status: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            
            {users.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="ownerId">Budget Owner</Label>
                <Select value={formData.ownerId} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, ownerId: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific owner</SelectItem>
                    {users.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setFormData(defaultFormData);
                setSelectedBudget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit(isEditDialogOpen)}
              disabled={createBudgetMutation.isPending || updateBudgetMutation.isPending}
            >
              {createBudgetMutation.isPending || updateBudgetMutation.isPending
                ? 'Saving...'
                : isEditDialogOpen
                ? 'Update Budget'
                : 'Create Budget'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedBudget?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedBudget && deleteBudgetMutation.mutate(selectedBudget.id)}
              disabled={deleteBudgetMutation.isPending}
            >
              {deleteBudgetMutation.isPending ? 'Deleting...' : 'Delete Budget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
