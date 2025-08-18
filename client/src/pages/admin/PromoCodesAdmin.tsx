import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Edit, 
  MoreVertical, 
  TrendingUp,
  Users,
  DollarSign,
  Percent,
  Calendar,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface PromoCode {
  id: number;
  code: string;
  stripeCouponId?: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountAmount: string;
  minimumPurchase?: string;
  maxUses?: number;
  maxUsesPerUser: number;
  usedCount: number;
  validFrom: string;
  validUntil?: string;
  templateId?: number;
  creatorId?: number;
  isActive: boolean;
  createdAt: string;
  timesUsed?: number;
  isExpired?: boolean;
  isMaxedOut?: boolean;
}

interface PromoStats {
  total_codes: number;
  active_codes: number;
  total_uses: number;
  total_discount_given: number;
  top_performing_codes: Array<{
    code: string;
    description?: string;
    uses: number;
    total_discount: string;
  }>;
}

export default function PromoCodesAdmin() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_amount: '',
    minimum_purchase: '',
    max_uses: '',
    max_uses_per_user: '1',
    valid_until: '',
    template_id: '',
    creator_id: '',
  });

  // When editing code changes, populate form
  useEffect(() => {
    if (editingCode) {
      setFormData({
        code: editingCode.code,
        description: editingCode.description || '',
        discount_type: editingCode.discountType,
        discount_amount: editingCode.discountAmount.toString(),
        minimum_purchase: editingCode.minimumPurchase?.toString() || '',
        max_uses: editingCode.maxUses?.toString() || '',
        max_uses_per_user: editingCode.maxUsesPerUser.toString(),
        valid_until: editingCode.validUntil ? new Date(editingCode.validUntil).toISOString().slice(0, 16) : '',
        template_id: editingCode.templateId?.toString() || '',
        creator_id: editingCode.creatorId?.toString() || '',
      });
    }
  }, [editingCode]);

  const queryClient = useQueryClient();

  // Fetch promo codes
  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ['admin', 'promo-codes'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/promo-codes');
      return response as PromoCode[];
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin', 'promo-codes', 'stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/promo-codes/stats');
      return response as PromoStats;
    },
  });

  // Create promo code mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        discount_amount: parseFloat(data.discount_amount),
        minimum_purchase: data.minimum_purchase ? parseFloat(data.minimum_purchase) : undefined,
        max_uses: data.max_uses ? parseInt(data.max_uses) : undefined,
        max_uses_per_user: parseInt(data.max_uses_per_user) || 1,
        template_id: data.template_id ? parseInt(data.template_id) : undefined,
        creator_id: data.creator_id ? parseInt(data.creator_id) : undefined,
      };
      return apiRequest('POST', '/api/promo-codes', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'promo-codes', 'stats'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
  });

  // Update promo code mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<PromoCode> }) => {
      // Send only the updates, not wrapped in an object
      return apiRequest('PUT', `/api/promo-codes/${id}`, updates);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin', 'promo-codes'] });
      
      // Snapshot the previous value
      const previousCodes = queryClient.getQueryData(['admin', 'promo-codes']);
      
      // Optimistically update
      queryClient.setQueryData(['admin', 'promo-codes'], (old: PromoCode[] | undefined) => {
        if (!old) return old;
        return old.map(code => 
          code.id === id ? { ...code, ...updates } : code
        );
      });
      
      return { previousCodes };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousCodes) {
        queryClient.setQueryData(['admin', 'promo-codes'], context.previousCodes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
      setEditingCode(null);
    },
  });

  // Delete promo code mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/promo-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'promo-codes', 'stats'] });
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_amount: '',
      minimum_purchase: '',
      max_uses: '',
      max_uses_per_user: '1',
      valid_until: '',
      template_id: '',
      creator_id: '',
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingCode) return;
    
    const updates: any = {
      description: formData.description || null,
      minimum_purchase: formData.minimum_purchase ? formData.minimum_purchase : null,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      max_uses_per_user: parseInt(formData.max_uses_per_user) || 1,
      valid_until: formData.valid_until || null,
      template_id: formData.template_id ? parseInt(formData.template_id) : null,
      creator_id: formData.creator_id ? parseInt(formData.creator_id) : null,
    };

    updateMutation.mutate({ 
      id: editingCode.id, 
      updates 
    }, {
      onSuccess: () => {
        setEditingCode(null);
        resetForm();
      }
    });
  };

  const toggleActive = (code: PromoCode) => {
    updateMutation.mutate({
      id: code.id,
      updates: { isActive: !code.isActive }
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const generateRandomCode = () => {
    const prefix = 'REMVANA';
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData({ ...formData, code: `${prefix}${suffix}` });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Promo Codes</h1>
          <p className="text-muted-foreground">Manage discount codes and promotions</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Promo Code
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_codes}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active_codes} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Uses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_uses}</div>
              <p className="text-xs text-muted-foreground">
                Across all codes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Discounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(stats.total_discount_given || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Given to customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Discount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.total_uses > 0 
                  ? ((stats.total_discount_given || 0) / stats.total_uses).toFixed(2)
                  : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Per use
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Promo Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Promo Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Code</th>
                  <th className="text-left py-3 px-4">Discount</th>
                  <th className="text-left py-3 px-4">Usage</th>
                  <th className="text-left py-3 px-4">Valid Until</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes?.map((code) => (
                  <tr key={code.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold">{code.code}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCode(code.code)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      {code.description && (
                        <p className="text-sm text-muted-foreground">{code.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {code.discountType === 'percentage' ? (
                          <>
                            <Percent className="w-4 h-4" />
                            {code.discountAmount}%
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4" />
                            {code.discountAmount}
                          </>
                        )}
                      </div>
                      {code.minimumPurchase && (
                        <p className="text-xs text-muted-foreground">
                          Min: ${code.minimumPurchase}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        {code.timesUsed || 0} / {code.maxUses || '∞'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Max {code.maxUsesPerUser}/user
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      {code.validUntil ? (
                        <div className="text-sm">
                          {new Date(code.validUntil).toLocaleDateString()}
                          {code.isExpired && (
                            <Badge variant="destructive" className="ml-2">
                              Expired
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No expiry</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={code.isActive}
                          onCheckedChange={() => toggleActive(code)}
                          disabled={code.isExpired || code.isMaxedOut}
                        />
                        {code.isExpired && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                        {code.isMaxedOut && (
                          <Badge variant="secondary">Maxed</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingCode(code)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(code.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Codes */}
      {stats?.top_performing_codes && stats.top_performing_codes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Performing Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_performing_codes.map((code, index) => (
                <div key={code.code} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-muted-foreground">
                      #{index + 1}
                    </div>
                    <div>
                      <code className="font-mono font-bold">{code.code}</code>
                      {code.description && (
                        <p className="text-sm text-muted-foreground">{code.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{code.uses} uses</div>
                    <div className="text-sm text-muted-foreground">
                      ${parseFloat(code.total_discount || '0').toFixed(2)} given
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
            <DialogDescription>
              Create a new discount code for customers
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Promo Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="WELCOME20"
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={generateRandomCode}>
                    Generate
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="discount_type">Discount Type</Label>
                <Select 
                  value={formData.discount_type} 
                  onValueChange={(value: 'percentage' | 'fixed') => 
                    setFormData({ ...formData, discount_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount_amount">
                  Discount Amount {formData.discount_type === 'percentage' ? '(%)' : '($)'}
                </Label>
                <Input
                  id="discount_amount"
                  type="number"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                  placeholder={formData.discount_type === 'percentage' ? "20" : "5.00"}
                />
              </div>
              <div>
                <Label htmlFor="minimum_purchase">Minimum Purchase ($)</Label>
                <Input
                  id="minimum_purchase"
                  type="number"
                  value={formData.minimum_purchase}
                  onChange={(e) => setFormData({ ...formData, minimum_purchase: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Welcome discount for new users"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_uses">Max Total Uses</Label>
                <Input
                  id="max_uses"
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <Label htmlFor="max_uses_per_user">Max Uses Per User</Label>
                <Input
                  id="max_uses_per_user"
                  type="number"
                  value={formData.max_uses_per_user}
                  onChange={(e) => setFormData({ ...formData, max_uses_per_user: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="valid_until">Valid Until (Optional)</Label>
              <Input
                id="valid_until"
                type="datetime-local"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template_id">Specific Template ID (Optional)</Label>
                <Input
                  id="template_id"
                  type="number"
                  value={formData.template_id}
                  onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                  placeholder="Any template"
                />
              </div>
              <div>
                <Label htmlFor="creator_id">Specific Creator ID (Optional)</Label>
                <Input
                  id="creator_id"
                  type="number"
                  value={formData.creator_id}
                  onChange={(e) => setFormData({ ...formData, creator_id: e.target.value })}
                  placeholder="Any creator"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              Create Promo Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingCode} onOpenChange={(open) => !open && setEditingCode(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Promo Code</DialogTitle>
            <DialogDescription>
              Update settings for {editingCode?.code}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Promo Code</Label>
                <Input
                  value={editingCode?.code || ''}
                  disabled
                  className="font-mono bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">Code cannot be changed</p>
              </div>
              <div>
                <Label>Discount</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={editingCode?.discountAmount || ''}
                    disabled
                    className="bg-muted"
                  />
                  <span className="text-muted-foreground">
                    {editingCode?.discountType === 'percentage' ? '%' : '$'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Discount cannot be changed</p>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description of the promo code"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-minimum_purchase">Minimum Purchase ($)</Label>
                <Input
                  id="edit-minimum_purchase"
                  type="number"
                  value={formData.minimum_purchase}
                  onChange={(e) => setFormData({ ...formData, minimum_purchase: e.target.value })}
                  placeholder="No minimum"
                />
              </div>
              <div>
                <Label htmlFor="edit-valid_until">Valid Until</Label>
                <Input
                  id="edit-valid_until"
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-max_uses">Max Total Uses</Label>
                <Input
                  id="edit-max_uses"
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <Label htmlFor="edit-max_uses_per_user">Max Uses Per User</Label>
                <Input
                  id="edit-max_uses_per_user"
                  type="number"
                  value={formData.max_uses_per_user}
                  onChange={(e) => setFormData({ ...formData, max_uses_per_user: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-template_id">Specific Template ID (Optional)</Label>
                <Input
                  id="edit-template_id"
                  type="number"
                  value={formData.template_id}
                  onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                  placeholder="Any template"
                />
              </div>
              <div>
                <Label htmlFor="edit-creator_id">Specific Creator ID (Optional)</Label>
                <Input
                  id="edit-creator_id"
                  type="number"
                  value={formData.creator_id}
                  onChange={(e) => setFormData({ ...formData, creator_id: e.target.value })}
                  placeholder="Any creator"
                />
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Usage Statistics</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Times Used:</span>
                  <p className="font-medium">{editingCode?.timesUsed || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">
                    {editingCode?.createdAt ? new Date(editingCode.createdAt).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium">
                    {editingCode?.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingCode(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}