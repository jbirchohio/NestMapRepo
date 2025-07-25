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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { 
  Plus, 
  Edit, 
  Trash2, 
  CreditCard, 
  Pause,
  Play,
  Eye,
  EyeOff,
  DollarSign,
  Calendar,
  User,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface CorporateCard {
  id: string;
  organizationId: string;
  cardName: string;
  cardNumber: string;
  lastFourDigits: string;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedUserEmail?: string;
  cardType: 'virtual' | 'physical';
  spendingLimit: number;
  currentBalance: number;
  monthlySpent: number;
  monthlyLimit?: number;
  dailyLimit?: number;
  allowedMerchants?: string[];
  blockedMerchants?: string[];
  isActive: boolean;
  suspensionReason?: string;
  lastUsed?: string;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
}

interface CardTransaction {
  id: string;
  amount: number;
  currency: string;
  merchantName: string;
  transactionDate: string;
  status: 'pending' | 'posted' | 'declined' | 'disputed' | 'settled' | 'cancelled';
  category: string;
  description?: string;
}

interface CardFormData {
  cardName: string;
  assignedUserId: string;
  cardType: 'virtual' | 'physical';
  spendingLimit: string;
  monthlyLimit: string;
  dailyLimit: string;
  allowedMerchants: string;
  blockedMerchants: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const defaultFormData: CardFormData = {
  cardName: '',
  assignedUserId: '',
  cardType: 'virtual',
  spendingLimit: '',
  monthlyLimit: '',
  dailyLimit: '',
  allowedMerchants: '',
  blockedMerchants: '',
};

export default function CorporateCardManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCard, setSelectedCard] = useState<CorporateCard | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CardFormData>(defaultFormData);
  const [showCardNumbers, setShowCardNumbers] = useState<Record<string, boolean>>({});

  // Fetch corporate cards
  const { data: cardsResponse, isLoading: cardsLoading } = useQuery({
    queryKey: ['/api/corporate-cards'],
    queryFn: async () => apiRequest('GET', '/api/corporate-cards'),
  });

  // Fetch users for assignment
  const { data: usersResponse } = useQuery({
    queryKey: ['/api/user/organization-users'],
    queryFn: async () => apiRequest('GET', '/api/user/organization-users'),
  });

  // Fetch card details when selected
  const { data: cardDetails } = useQuery({
    queryKey: ['/api/corporate-cards', selectedCard?.id],
    queryFn: async () => apiRequest('GET', `/api/corporate-cards/${selectedCard?.id}`),
    enabled: !!selectedCard?.id && isDetailsDialogOpen,
  });

  const cards = cardsResponse?.cards || [];
  const users = usersResponse?.users || [];

  // Create card mutation
  const createCardMutation = useMutation({
    mutationFn: async (data: Partial<CardFormData>) =>
      apiRequest('POST', '/api/corporate-cards', {
        ...data,
        allowedMerchants: data.allowedMerchants ? data.allowedMerchants.split(',').map(s => s.trim()) : [],
        blockedMerchants: data.blockedMerchants ? data.blockedMerchants.split(',').map(s => s.trim()) : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/corporate-cards'] });
      setIsCreateDialogOpen(false);
      setFormData(defaultFormData);
      toast({
        title: "Card Created",
        description: "Corporate card has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create corporate card.",
        variant: "destructive",
      });
    },
  });

  // Update card mutation
  const updateCardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CardFormData> }) =>
      apiRequest('PATCH', `/api/corporate-cards/${id}`, {
        ...data,
        allowedMerchants: data.allowedMerchants ? data.allowedMerchants.split(',').map(s => s.trim()) : [],
        blockedMerchants: data.blockedMerchants ? data.blockedMerchants.split(',').map(s => s.trim()) : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/corporate-cards'] });
      setIsEditDialogOpen(false);
      setSelectedCard(null);
      setFormData(defaultFormData);
      toast({
        title: "Card Updated",
        description: "Corporate card has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update corporate card.",
        variant: "destructive",
      });
    },
  });

  // Toggle card status mutation
  const toggleCardStatusMutation = useMutation({
    mutationFn: async ({ id, isActive, reason }: { id: string; isActive: boolean; reason?: string }) =>
      apiRequest('PATCH', `/api/corporate-cards/${id}/status`, { isActive, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/corporate-cards'] });
      toast({
        title: "Card Status Updated",
        description: "Corporate card status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Status Update Failed",
        description: error.message || "Failed to update card status.",
        variant: "destructive",
      });
    },
  });

  // Delete card mutation
  const deleteCardMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest('DELETE', `/api/corporate-cards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/corporate-cards'] });
      setIsDeleteDialogOpen(false);
      setSelectedCard(null);
      toast({
        title: "Card Deleted",
        description: "Corporate card has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete corporate card.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setFormData(defaultFormData);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (card: CorporateCard) => {
    setSelectedCard(card);
    setFormData({
      cardName: card.cardName,
      assignedUserId: card.assignedUserId || '',
      cardType: card.cardType,
      spendingLimit: (card.spendingLimit / 100).toString(),
      monthlyLimit: card.monthlyLimit ? (card.monthlyLimit / 100).toString() : '',
      dailyLimit: card.dailyLimit ? (card.dailyLimit / 100).toString() : '',
      allowedMerchants: card.allowedMerchants ? card.allowedMerchants.join(', ') : '',
      blockedMerchants: card.blockedMerchants ? card.blockedMerchants.join(', ') : '',
    });
    setIsEditDialogOpen(true);
  };

  const handleViewDetails = (card: CorporateCard) => {
    setSelectedCard(card);
    setIsDetailsDialogOpen(true);
  };

  const handleDelete = (card: CorporateCard) => {
    setSelectedCard(card);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleStatus = (card: CorporateCard) => {
    const reason = card.isActive ? 
      prompt("Please provide a reason for suspending this card:") : 
      undefined;
    
    if (card.isActive && !reason) return; // User cancelled suspension
    
    toggleCardStatusMutation.mutate({
      id: card.id,
      isActive: !card.isActive,
      reason
    });
  };

  const handleSubmit = (isEdit: boolean) => {
    const submitData = {
      ...formData,
      spendingLimit: parseFloat(formData.spendingLimit),
      monthlyLimit: formData.monthlyLimit ? parseFloat(formData.monthlyLimit) : undefined,
      dailyLimit: formData.dailyLimit ? parseFloat(formData.dailyLimit) : undefined,
    };

    if (isEdit && selectedCard) {
      updateCardMutation.mutate({ id: selectedCard.id, data: submitData });
    } else {
      createCardMutation.mutate(submitData);
    }
  };

  const toggleCardNumberVisibility = (cardId: string) => {
    setShowCardNumbers(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getCardStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-500' : 'bg-red-500';
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (cardsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading corporate cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Corporate Cards</h2>
          <p className="text-muted-foreground">
            Manage corporate cards and spending limits
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Issue Card
        </Button>
      </div>

      {/* Card Statistics */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cards.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {cards.filter(c => c.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Limit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  cards
                    .filter(c => c.isActive)
                    .reduce((sum, c) => sum + c.spendingLimit, 0)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Monthly Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  cards.reduce((sum, c) => sum + c.monthlySpent, 0)
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Card List */}
      <div className="grid grid-cols-1 gap-4">
        {cards.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No corporate cards found</h3>
              <p className="text-muted-foreground mb-4">
                Issue your first corporate card to start managing organizational spending
              </p>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Issue Card
              </Button>
            </CardContent>
          </Card>
        ) : (
          cards.map((card: CorporateCard) => {
            const utilization = card.spendingLimit > 0 ? 
              ((card.spendingLimit - card.currentBalance) / card.spendingLimit) * 100 : 0;
            
            return (
              <Card key={card.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-base">{card.cardName}</CardTitle>
                        <Badge variant="outline" className={`${getCardStatusColor(card.isActive)} text-white`}>
                          {card.isActive ? 'Active' : 'Suspended'}
                        </Badge>
                        <Badge variant="outline">
                          {card.cardType}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {card.assignedUserName ? 
                          `Assigned to ${card.assignedUserName} (${card.assignedUserEmail})` : 
                          'Unassigned'
                        }
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(card)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(card)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleToggleStatus(card)}
                        disabled={toggleCardStatusMutation.isPending}
                      >
                        {card.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(card)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4" />
                        <span className="font-mono">
                          {showCardNumbers[card.id] ? 
                            card.cardNumber : 
                            `****-****-****-${card.lastFourDigits || card.cardNumber.slice(-4)}`
                          }
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCardNumberVisibility(card.id)}
                          className="h-auto p-1"
                        >
                          {showCardNumbers[card.id] ? 
                            <EyeOff className="w-3 h-3" /> : 
                            <Eye className="w-3 h-3" />
                          }
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Expires {format(new Date(card.expiryDate), 'MM/yy')}</span>
                      </div>
                      {card.lastUsed && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>Last used {format(new Date(card.lastUsed), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                    </div>

                    {/* Spending Info */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Limit:</span>
                        <span className="font-medium">
                          {formatCurrency(card.spendingLimit)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Available:</span>
                        <span className="font-medium">
                          {formatCurrency(card.currentBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Monthly Spent:</span>
                        <span className="font-medium">
                          {formatCurrency(card.monthlySpent)}
                        </span>
                      </div>
                    </div>

                    {/* Utilization Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Utilization</span>
                        <span className={`text-sm font-medium ${getUtilizationColor(utilization)}`}>
                          {utilization.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(utilization, 100)} 
                        className="h-2"
                      />
                      {utilization >= 90 && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          High utilization
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        if (!open) {
          setFormData(defaultFormData);
          setSelectedCard(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? 'Edit Corporate Card' : 'Issue Corporate Card'}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen 
                ? 'Update the corporate card details below.' 
                : 'Issue a new corporate card for your organization.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cardName">Card Name</Label>
              <Input
                id="cardName"
                value={formData.cardName}
                onChange={(e) => setFormData(prev => ({ ...prev, cardName: e.target.value }))}
                placeholder="e.g., Marketing Team Card"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cardType">Card Type</Label>
              <Select value={formData.cardType} onValueChange={(value: any) => 
                setFormData(prev => ({ ...prev, cardType: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="spendingLimit">Spending Limit</Label>
              <Input
                id="spendingLimit"
                type="number"
                step="0.01"
                value={formData.spendingLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, spendingLimit: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assignedUserId">Assign to User</Label>
              <Select value={formData.assignedUserId} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, assignedUserId: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select user (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map((user: User) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">Monthly Limit (Optional)</Label>
              <Input
                id="monthlyLimit"
                type="number"
                step="0.01"
                value={formData.monthlyLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyLimit: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Daily Limit (Optional)</Label>
              <Input
                id="dailyLimit"
                type="number"
                step="0.01"
                value={formData.dailyLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, dailyLimit: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2 col-span-2">
              <Label htmlFor="allowedMerchants">Allowed Merchants (Optional)</Label>
              <Input
                id="allowedMerchants"
                value={formData.allowedMerchants}
                onChange={(e) => setFormData(prev => ({ ...prev, allowedMerchants: e.target.value }))}
                placeholder="e.g., Amazon, Uber, Salesforce (comma-separated)"
              />
            </div>
            
            <div className="space-y-2 col-span-2">
              <Label htmlFor="blockedMerchants">Blocked Merchants (Optional)</Label>
              <Input
                id="blockedMerchants"
                value={formData.blockedMerchants}
                onChange={(e) => setFormData(prev => ({ ...prev, blockedMerchants: e.target.value }))}
                placeholder="e.g., Casino, Gaming (comma-separated)"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setFormData(defaultFormData);
                setSelectedCard(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit(isEditDialogOpen)}
              disabled={createCardMutation.isPending || updateCardMutation.isPending}
            >
              {createCardMutation.isPending || updateCardMutation.isPending
                ? 'Saving...'
                : isEditDialogOpen
                ? 'Update Card'
                : 'Issue Card'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Card Details - {selectedCard?.cardName}</DialogTitle>
            <DialogDescription>
              Detailed information and transaction history
            </DialogDescription>
          </DialogHeader>
          
          {cardDetails && (
            <div className="space-y-6">
              {/* Card Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Card Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>Number: {cardDetails.cardNumber}</div>
                    <div>Type: {cardDetails.cardType}</div>
                    <div>Status: {cardDetails.isActive ? 'Active' : 'Suspended'}</div>
                    <div>Expires: {format(new Date(cardDetails.expiryDate), 'MM/yyyy')}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Spending</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>Limit: {formatCurrency(cardDetails.spendingLimit)}</div>
                    <div>Available: {formatCurrency(cardDetails.currentBalance)}</div>
                    <div>Monthly: {formatCurrency(cardDetails.monthlySpent)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Assignment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>User: {cardDetails.assignedUserName || 'Unassigned'}</div>
                    {cardDetails.assignedUserEmail && (
                      <div>Email: {cardDetails.assignedUserEmail}</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions */}
              {cardDetails.transactions && cardDetails.transactions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {cardDetails.transactions.map((transaction: CardTransaction) => (
                      <div key={transaction.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <div className="font-medium">{transaction.merchantName}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(transaction.transactionDate), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </div>
                          <Badge variant={transaction.status === 'posted' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Corporate Card</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCard?.cardName}"? This action cannot be undone and will only work if there are no transactions on this card.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedCard && deleteCardMutation.mutate(selectedCard.id)}
              disabled={deleteCardMutation.isPending}
            >
              {deleteCardMutation.isPending ? 'Deleting...' : 'Delete Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
