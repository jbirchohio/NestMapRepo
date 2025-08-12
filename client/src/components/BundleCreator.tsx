import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Package, Plus, Trash2, DollarSign, Tag, Calendar, Save, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

interface Template {
  id: number;
  title: string;
  price: string;
  status: string;
  sales_count: number;
  cover_image?: string;
}

interface Bundle {
  id: number;
  title: string;
  slug: string;
  description?: string;
  template_ids: number[];
  bundle_price: string;
  original_price: string;
  discount_percentage: string;
  status: string;
  sales_count: number;
  view_count: number;
  valid_from?: Date;
  valid_until?: Date;
  max_sales?: number;
  is_remvana_bundle: boolean;
  type: string;
  templates?: Template[];
}

interface BundleCreatorProps {
  isAdmin?: boolean;
  onClose?: () => void;
}

export default function BundleCreator({ isAdmin = false, onClose }: BundleCreatorProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    template_ids: [] as number[],
    bundle_price: '',
    tags: [] as string[],
    type: isAdmin ? 'admin' : 'creator',
    valid_from: '',
    valid_until: '',
    max_sales: ''
  });
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Fetch available templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['my-templates', isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        // Admin can see all Remvana/seed templates
        const response = await apiRequest('GET', '/api/admin/remvana-templates');
        return response.templates || [];
      } else {
        // Creators see their own published templates
        const response = await apiRequest('GET', '/api/templates/my-templates');
        return response.filter((t: Template) => t.status === 'published');
      }
    }
  });

  // Fetch existing bundles
  const { data: bundlesData, isLoading: bundlesLoading } = useQuery({
    queryKey: ['my-bundles'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/bundles');
      return response.filter((b: Bundle) => 
        isAdmin ? b.is_remvana_bundle : !b.is_remvana_bundle
      );
    }
  });

  // Create bundle mutation
  const createBundleMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/bundles', {
        ...data,
        bundle_price: parseFloat(data.bundle_price)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bundles'] });
      toast({
        title: 'Bundle Created!',
        description: 'Your bundle has been created successfully.',
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create bundle',
        variant: 'destructive'
      });
    }
  });

  // Update bundle mutation
  const updateBundleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest('PUT', `/api/bundles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bundles'] });
      toast({
        title: 'Bundle Updated',
        description: 'Your bundle has been updated successfully.',
      });
    }
  });

  // Publish/unpublish bundle
  const publishBundleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('POST', `/api/bundles/${id}/publish`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bundles'] });
      toast({
        title: 'Status Updated',
        description: 'Bundle status has been updated.',
      });
    }
  });

  // Delete bundle
  const deleteBundleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/bundles/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bundles'] });
      toast({
        title: 'Bundle Deleted',
        description: 'Bundle has been deleted successfully.',
      });
    }
  });

  const handleTemplateToggle = (template: Template) => {
    const isSelected = formData.template_ids.includes(template.id);
    if (isSelected) {
      setFormData({
        ...formData,
        template_ids: formData.template_ids.filter(id => id !== template.id)
      });
      setSelectedTemplates(selectedTemplates.filter(t => t.id !== template.id));
    } else {
      setFormData({
        ...formData,
        template_ids: [...formData.template_ids, template.id]
      });
      setSelectedTemplates([...selectedTemplates, template]);
    }
  };

  const calculatePrices = () => {
    const originalPrice = selectedTemplates.reduce((sum, t) => sum + parseFloat(t.price), 0);
    const bundlePrice = parseFloat(formData.bundle_price) || 0;
    const savings = originalPrice - bundlePrice;
    const discountPercentage = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;
    
    return {
      originalPrice,
      savings,
      discountPercentage
    };
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSubmit = () => {
    if (!formData.title || formData.template_ids.length < 2 || !formData.bundle_price) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields and select at least 2 templates.',
        variant: 'destructive'
      });
      return;
    }

    createBundleMutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      template_ids: [],
      bundle_price: '',
      tags: [],
      type: isAdmin ? 'admin' : 'creator',
      valid_from: '',
      valid_until: '',
      max_sales: ''
    });
    setSelectedTemplates([]);
    setTagInput('');
  };

  const { originalPrice, savings, discountPercentage } = calculatePrices();

  if (templatesLoading || bundlesLoading) {
    return <div className="p-4">Loading...</div>;
  }

  const availableTemplates = templatesData || [];
  const existingBundles = bundlesData || [];

  return (
    <div className="space-y-6">
      {/* Create New Bundle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create Template Bundle
          </CardTitle>
          <CardDescription>
            {isAdmin 
              ? 'Create official Remvana bundles from seed templates'
              : 'Bundle your templates together for a discounted price'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bundle Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Bundle Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Europe Adventure Collection"
              />
            </div>
            <div>
              <Label htmlFor="price">Bundle Price *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  value={formData.bundle_price}
                  onChange={(e) => setFormData({ ...formData, bundle_price: e.target.value })}
                  placeholder="0.00"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what's included in this bundle..."
              rows={3}
            />
          </div>

          {/* Template Selection */}
          <div>
            <Label>Select Templates (minimum 2) *</Label>
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
              {availableTemplates.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {isAdmin 
                    ? 'No Remvana templates available'
                    : 'No published templates available. Create and publish templates first.'
                  }
                </p>
              ) : (
                availableTemplates.map((template: Template) => (
                  <div key={template.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.template_ids.includes(template.id)}
                      onCheckedChange={() => handleTemplateToggle(template)}
                    />
                    <label className="flex-1 cursor-pointer">
                      <span className="font-medium">{template.title}</span>
                      <span className="text-muted-foreground ml-2">${template.price}</span>
                      <Badge variant="secondary" className="ml-2">
                        {template.sales_count} sales
                      </Badge>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pricing Summary */}
          {selectedTemplates.length > 0 && (
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Original Price</p>
                    <p className="text-2xl font-bold">${originalPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bundle Price</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${formData.bundle_price || '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Saves</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {discountPercentage.toFixed(0)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type and press Enter to add tags"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="valid_from">Valid From (Optional)</Label>
              <Input
                id="valid_from"
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="valid_until">Valid Until (Optional)</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="max_sales">Max Sales (Optional)</Label>
              <Input
                id="max_sales"
                type="number"
                value={formData.max_sales}
                onChange={(e) => setFormData({ ...formData, max_sales: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>
              Reset
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createBundleMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Create Bundle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Bundles */}
      <Card>
        <CardHeader>
          <CardTitle>Your Bundles</CardTitle>
          <CardDescription>
            Manage your existing template bundles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {existingBundles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No bundles created yet. Create your first bundle above!
            </p>
          ) : (
            <div className="space-y-4">
              {existingBundles.map((bundle: Bundle) => (
                <Card key={bundle.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{bundle.title}</h3>
                        <p className="text-sm text-muted-foreground">{bundle.description}</p>
                        <div className="flex gap-4 mt-2">
                          <Badge variant={bundle.status === 'published' ? 'default' : 'secondary'}>
                            {bundle.status}
                          </Badge>
                          <span className="text-sm">
                            {bundle.templates?.length || 0} templates
                          </span>
                          <span className="text-sm">
                            ${bundle.bundle_price}
                          </span>
                          <span className="text-sm text-green-600">
                            {bundle.sales_count} sales
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {bundle.view_count} views
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {bundle.status === 'draft' ? (
                          <Button
                            size="sm"
                            onClick={() => publishBundleMutation.mutate({ 
                              id: bundle.id, 
                              status: 'published' 
                            })}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Publish
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => publishBundleMutation.mutate({ 
                              id: bundle.id, 
                              status: 'draft' 
                            })}
                          >
                            <EyeOff className="h-4 w-4 mr-1" />
                            Unpublish
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this bundle?')) {
                              deleteBundleMutation.mutate(bundle.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}