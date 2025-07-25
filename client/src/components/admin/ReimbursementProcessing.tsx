import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { toast } from '../ui/use-toast';
import { Separator } from '../ui/separator';
import {
  Receipt,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Search,
  MoreHorizontal,
  Eye,
  Check,
  X,
  Banknote,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface Reimbursement {
  id: string;
  batchId?: string;
  totalAmount: number;
  currency?: string;
  paymentStatus: 'pending' | 'approved' | 'rejected' | 'paid';
  userId: string;
  submitterName: string;
  submitterEmail: string;
  processedBy?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: string;
  expenseIds?: string[];
  createdAt: string;
  updatedAt: string;
}

interface ReimbursementStats {
  total: number;
  byStatus: Array<{ status: string; count: number; totalAmount: number }>;
  totalValue: number;
}

interface ReimbursementResponse {
  reimbursements: Reimbursement[];
  stats: ReimbursementStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface EligibleExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  receiptUrl?: string;
  createdAt: string;
}

const ReimbursementProcessing: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReimbursements, setSelectedReimbursements] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingReimbursement, setViewingReimbursement] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  // Form states
  const [newReimbursement, setNewReimbursement] = useState({
    expenseIds: [] as string[],
    paymentMethod: '',
  });

  const [processingNotes, setProcessingNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // Fetch reimbursements
  const { data, isLoading, error } = useQuery<ReimbursementResponse>({
    queryKey: ['reimbursements', searchTerm, statusFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/reimbursements?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reimbursements');
      }

      return response.json();
    },
  });

  // Fetch eligible expenses for creating reimbursements
  const { data: eligibleExpenses } = useQuery<{ expenses: EligibleExpense[]; totalAmount: number; count: number }>({
    queryKey: ['eligible-expenses'],
    queryFn: async () => {
      const response = await fetch('/api/reimbursements/expenses/eligible', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch eligible expenses');
      }

      return response.json();
    },
  });

  // Fetch reimbursement details
  const { data: reimbursementDetails } = useQuery({
    queryKey: ['reimbursement', viewingReimbursement],
    queryFn: async () => {
      if (!viewingReimbursement) return null;
      
      const response = await fetch(`/api/reimbursements/${viewingReimbursement}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reimbursement details');
      }

      return response.json();
    },
    enabled: !!viewingReimbursement,
  });

  // Create reimbursement mutation
  const createReimbursementMutation = useMutation({
    mutationFn: async (reimbursementData: typeof newReimbursement) => {
      const response = await fetch('/api/reimbursements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(reimbursementData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create reimbursement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['eligible-expenses'] });
      setIsCreateDialogOpen(false);
      setNewReimbursement({
        expenseIds: [],
        paymentMethod: '',
      });
      toast({
        title: "Reimbursement Created",
        description: "Reimbursement request has been submitted for approval.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update reimbursement mutation
  const updateReimbursementMutation = useMutation({
    mutationFn: async ({ 
      reimbursementId, 
      updates 
    }: { 
      reimbursementId: string; 
      updates: any 
    }) => {
      const response = await fetch(`/api/reimbursements/${reimbursementId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update reimbursement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['reimbursement'] });
      toast({
        title: "Reimbursement Updated",
        description: "Reimbursement has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk process mutation
  const bulkProcessMutation = useMutation({
    mutationFn: async ({ 
      reimbursementIds, 
      action, 
      notes, 
      paymentMethod 
    }: { 
      reimbursementIds: string[]; 
      action: string; 
      notes?: string;
      paymentMethod?: string;
    }) => {
      const response = await fetch('/api/reimbursements/bulk/process', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ reimbursementIds, action, notes, paymentMethod }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bulk process reimbursements');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      setSelectedReimbursements([]);
      setProcessingNotes('');
      setPaymentMethod('');
      toast({
        title: "Reimbursements Processed",
        description: "Selected reimbursements have been successfully processed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateReimbursement = () => {
    if (newReimbursement.expenseIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one expense.",
        variant: "destructive",
      });
      return;
    }
    createReimbursementMutation.mutate(newReimbursement);
  };

  const handleApprove = (reimbursementId: string) => {
    updateReimbursementMutation.mutate({
      reimbursementId,
      updates: { 
        paymentStatus: 'approved',
        approverNotes: processingNotes || undefined 
      },
    });
  };

  const handleReject = (reimbursementId: string) => {
    updateReimbursementMutation.mutate({
      reimbursementId,
      updates: { 
        paymentStatus: 'rejected',
        approverNotes: processingNotes || undefined 
      },
    });
  };

  const handleMarkPaid = (reimbursementId: string) => {
    updateReimbursementMutation.mutate({
      reimbursementId,
      updates: { 
        paymentStatus: 'paid',
        paymentMethod: paymentMethod || undefined,
        approverNotes: processingNotes || undefined 
      },
    });
  };

  const handleBulkProcess = (action: string) => {
    if (selectedReimbursements.length === 0) return;
    
    bulkProcessMutation.mutate({
      reimbursementIds: selectedReimbursements,
      action,
      notes: processingNotes || undefined,
      paymentMethod: action === 'mark_paid' ? paymentMethod : undefined,
    });
  };

  const handleSelectReimbursement = (reimbursementId: string) => {
    setSelectedReimbursements(prev => 
      prev.includes(reimbursementId) 
        ? prev.filter(id => id !== reimbursementId)
        : [...prev, reimbursementId]
    );
  };

  const handleSelectAllReimbursements = () => {
    if (!data?.reimbursements) return;
    
    if (selectedReimbursements.length === data.reimbursements.length) {
      setSelectedReimbursements([]);
    } else {
      setSelectedReimbursements(data.reimbursements.map(r => r.id));
    }
  };

  const handleSelectExpense = (expenseId: string) => {
    setNewReimbursement(prev => ({
      ...prev,
      expenseIds: prev.expenseIds.includes(expenseId)
        ? prev.expenseIds.filter(id => id !== expenseId)
        : [...prev.expenseIds, expenseId]
    }));
  };

  const handleViewReimbursement = (reimbursementId: string) => {
    setViewingReimbursement(reimbursementId);
    setIsViewDialogOpen(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'paid': return <CreditCard className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const selectedExpensesTotal = eligibleExpenses?.expenses
    .filter(expense => newReimbursement.expenseIds.includes(expense.id))
    .reduce((sum, expense) => sum + expense.amount, 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading reimbursements...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error loading reimbursements</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reimbursement Processing</h1>
          <p className="text-muted-foreground">
            Manage expense reimbursements and process payments
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Reimbursement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Reimbursement Request</DialogTitle>
              <DialogDescription>
                Select approved expenses to include in your reimbursement request
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="paymentMethod">Payment Method (Optional)</Label>
                <Input
                  id="paymentMethod"
                  value={newReimbursement.paymentMethod}
                  onChange={(e) => setNewReimbursement(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  placeholder="e.g., Bank Transfer, Check"
                />
              </div>
              
              <div>
                <Label>Select Expenses</Label>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {eligibleExpenses?.expenses.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No approved expenses available for reimbursement
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eligibleExpenses?.expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>
                              <Checkbox
                                checked={newReimbursement.expenseIds.includes(expense.id)}
                                onCheckedChange={() => handleSelectExpense(expense.id)}
                              />
                            </TableCell>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell>{formatCurrency(expense.amount)}</TableCell>
                            <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{expense.category}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                
                {newReimbursement.expenseIds.length > 0 && (
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {newReimbursement.expenseIds.length} expense{newReimbursement.expenseIds.length !== 1 ? 's' : ''} selected
                      </span>
                      <span className="text-sm font-bold">
                        Total: {formatCurrency(selectedExpensesTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateReimbursement}
                disabled={createReimbursementMutation.isPending || newReimbursement.expenseIds.length === 0}
              >
                Create Reimbursement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reimbursements</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.stats.byStatus.find(s => s.status === 'pending')?.count || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.stats.totalValue || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.stats.byStatus.find(s => s.status === 'paid')?.totalAmount || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Reimbursements</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reimbursements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bulk Actions */}
          {selectedReimbursements.length > 0 && (
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedReimbursements.length} reimbursement{selectedReimbursements.length !== 1 ? 's' : ''} selected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedReimbursements([])}
                  >
                    Clear Selection
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bulk-notes">Processing Notes</Label>
                    <Textarea
                      id="bulk-notes"
                      value={processingNotes}
                      onChange={(e) => setProcessingNotes(e.target.value)}
                      placeholder="Add notes for processing..."
                      className="h-20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bulk-payment-method">Payment Method</Label>
                    <Input
                      id="bulk-payment-method"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      placeholder="e.g., Bank Transfer, Check"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleBulkProcess('approve')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkProcess('reject')}
                    variant="destructive"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkProcess('mark_paid')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Banknote className="h-4 w-4 mr-1" />
                    Mark Paid
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Reimbursements Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedReimbursements.length === data?.reimbursements.length}
                    onCheckedChange={handleSelectAllReimbursements}
                  />
                </TableHead>
                <TableHead>Batch ID</TableHead>
                <TableHead>Submitter</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.reimbursements.map((reimbursement) => (
                <TableRow key={reimbursement.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedReimbursements.includes(reimbursement.id)}
                      onCheckedChange={() => handleSelectReimbursement(reimbursement.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {reimbursement.batchId || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{reimbursement.submitterName}</div>
                      <div className="text-sm text-muted-foreground">{reimbursement.submitterEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold">
                      {formatCurrency(reimbursement.totalAmount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(reimbursement.paymentStatus)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(reimbursement.paymentStatus)}
                        {reimbursement.paymentStatus}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(reimbursement.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {reimbursement.paymentMethod && (
                      <div className="text-sm">
                        <div>{reimbursement.paymentMethod}</div>
                        {reimbursement.paymentDate && (
                          <div className="text-muted-foreground">
                            {new Date(reimbursement.paymentDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewReimbursement(reimbursement.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {reimbursement.paymentStatus === 'pending' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleApprove(reimbursement.id)}>
                              <Check className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleReject(reimbursement.id)}>
                              <X className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        {reimbursement.paymentStatus === 'approved' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleMarkPaid(reimbursement.id)}>
                              <Banknote className="mr-2 h-4 w-4" />
                              Mark Paid
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of{' '}
                {data.pagination.total} reimbursements
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(data.pagination.pages, page + 1))}
                  disabled={page === data.pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Reimbursement Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reimbursement Details</DialogTitle>
            <DialogDescription>
              View detailed information about this reimbursement request
            </DialogDescription>
          </DialogHeader>
          {reimbursementDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Batch ID</Label>
                  <div className="text-sm font-medium">{reimbursementDetails.batchId || 'N/A'}</div>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <div className="text-lg font-bold">{formatCurrency(reimbursementDetails.totalAmount)}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusBadgeColor(reimbursementDetails.paymentStatus)}>
                    {reimbursementDetails.paymentStatus}
                  </Badge>
                </div>
                <div>
                  <Label>Submitted By</Label>
                  <div className="text-sm">{reimbursementDetails.submitterName}</div>
                </div>
              </div>

              {reimbursementDetails.approverNotes && (
                <div>
                  <Label>Approver Notes</Label>
                  <div className="text-sm p-2 bg-muted rounded">{reimbursementDetails.approverNotes}</div>
                </div>
              )}

              {reimbursementDetails.paymentMethod && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Method</Label>
                    <div className="text-sm">{reimbursementDetails.paymentMethod}</div>
                  </div>
                  {reimbursementDetails.paymentDate && (
                    <div>
                      <Label>Paid Date</Label>
                      <div className="text-sm">{new Date(reimbursementDetails.paymentDate).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              <div>
                <Label>Associated Expenses</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reimbursementDetails.expenses?.map((expense: any) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{formatCurrency(expense.amount)}</TableCell>
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReimbursementProcessing;
