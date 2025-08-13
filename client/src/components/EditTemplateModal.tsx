import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: number;
  title: string;
  description: string;
  price: string;
  duration: number;
  status: string;
  salesCount: number;
  tags: string[];
  destinations: string[];
}

interface EditTemplateModalProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditTemplateModal({ template, open, onOpenChange }: EditTemplateModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    tags: [] as string[],
  });

  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title,
        description: template.description || '',
        price: template.price,
        tags: template.tags || [],
      });
    }
  }, [template]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Template>) => {
      const response = await fetch(`/api/templates/${template?.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-templates'] });
      queryClient.invalidateQueries({ queryKey: ['user-templates'] });
      toast.success('Template updated successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = () => {
    if (!template) return;

    // Validate minimum price
    if (parseFloat(formData.price) < 10) {
      toast.error('Minimum price is $10');
      return;
    }

    updateMutation.mutate({
      title: formData.title,
      description: formData.description,
      price: formData.price,
      tags: formData.tags,
    });
  };

  const hasSales = template && template.salesCount > 0;
  const isPublished = template?.status === 'published';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Update your template details. Some fields may be restricted if the template has sales.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {hasSales && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This template has {template.salesCount} sales. You can only make minor edits to preserve buyer trust.
                Major changes should be made in a new version of the template.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter template title"
            />
            <p className="text-xs text-gray-500">
              Make your title descriptive and searchable
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what makes your template special..."
              rows={4}
            />
            <p className="text-xs text-gray-500">
              Highlight unique experiences and what's included
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="price">Price (USD)</Label>
            <Input
              id="price"
              type="number"
              min="10"
              step="0.01"
              value={formData.price}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (val < 10 && e.target.value !== '') {
                  toast.error('Minimum price is $10');
                  setFormData({ ...formData, price: '10' });
                } else {
                  setFormData({ ...formData, price: e.target.value });
                }
              }}
              placeholder="29.99"
            />
            <p className="text-xs text-gray-500">
              Minimum price: $10. Consider your template's value and duration.
            </p>
          </div>

          {hasSales && (
            <div className="grid gap-2">
              <Label>Restricted Fields</Label>
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Cannot modify:</p>
                    <ul className="list-disc list-inside text-gray-600 mt-1">
                      <li>Duration (currently {template.duration} days)</li>
                      <li>Core itinerary structure</li>
                      <li>Included activities</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isPublished && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                This template is currently published. Changes will be visible to potential buyers immediately.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={updateMutation.isPending || !formData.title || !formData.price}
          >
            {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}