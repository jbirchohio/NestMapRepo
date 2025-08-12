import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Package, Upload, DollarSign, Tag, Image,
  AlertCircle, Check, X, Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { ClientTrip } from '@/lib/types';
import { useLocation } from 'wouter';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: ClientTrip;
}

const SUGGESTED_TAGS = [
  'romantic', 'budget', 'luxury', 'adventure', 'foodie',
  'family', 'solo', 'beach', 'city-break', 'road-trip',
  'culture', 'nature', 'photography', 'weekend', 'backpacking'
];

export default function CreateTemplateModal({
  isOpen,
  onClose,
  trip
}: CreateTemplateModalProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [title, setTitle] = useState(trip.title + ' - Travel Guide');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState([19]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Calculate trip duration
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/templates/from-trip/${trip.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title,
          description,
          price: price[0],
          tags: selectedTags,
          coverImage: coverImageUrl,
          status: isPublic ? 'published' : 'draft'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create template');
      }

      return response.json();
    },
    onSuccess: (template) => {
      toast({
        title: 'Template created!',
        description: isPublic
          ? 'Your template is now live in the marketplace.'
          : 'Your template has been saved as a draft.',
      });
      onClose();
      navigate(`/templates/${template.slug}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const estimatedEarnings = (price[0] * 0.7).toFixed(2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Create Template from Trip
          </DialogTitle>
          <DialogDescription>
            Turn your "{trip.title}" trip into a sellable template and earn from every purchase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Trip Info */}
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-purple-900">Trip Details</p>
                <p className="text-sm text-purple-700 mt-1">
                  {duration} days • {trip.city}, {trip.country}
                </p>
              </div>
            </div>
          </div>

          {/* Template Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Template Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Ultimate Paris Food Tour Guide"
              maxLength={100}
            />
            <p className="text-xs text-gray-500">{title.length}/100 characters</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what makes this trip special. What will travelers experience?"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">{description.length}/500 characters</p>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">
              Price: ${price[0]}
            </Label>
            <Slider
              id="price"
              value={price}
              onValueChange={setPrice}
              min={0}
              max={99}
              step={1}
              className="mb-2"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Free</span>
              <span>$99</span>
            </div>
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                You'll earn <strong>${estimatedEarnings}</strong> per sale (70% after platform fee)
              </AlertDescription>
            </Alert>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (Choose up to 5)</Label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {selectedTags.includes(tag) && (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  {tag}
                </Badge>
              ))}
            </div>
            {selectedTags.length > 5 && (
              <p className="text-sm text-red-600">Please select maximum 5 tags</p>
            )}
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label htmlFor="cover">Cover Image URL (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="cover"
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              <Button variant="outline" size="icon" disabled>
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Upload feature coming soon. Use an image URL for now.
            </p>
          </div>

          {/* Publishing Options */}
          <div className="space-y-3">
            <Label>Publishing Options</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="text-purple-600"
                />
                <div>
                  <p className="font-medium">Publish immediately</p>
                  <p className="text-sm text-gray-600">
                    Make your template available in the marketplace right away
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="text-purple-600"
                />
                <div>
                  <p className="font-medium">Save as draft</p>
                  <p className="text-sm text-gray-600">
                    Keep private and publish later
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Revenue Potential */}
          <Alert className="bg-green-50 border-green-200">
            <Sparkles className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Revenue Potential:</strong> 10 sales = ${(price[0] * 0.7 * 10).toFixed(0)},
              50 sales = ${(price[0] * 0.7 * 50).toFixed(0)},
              100 sales = ${(price[0] * 0.7 * 100).toFixed(0)}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => createTemplateMutation.mutate()}
            disabled={
              !title ||
              !description ||
              selectedTags.length === 0 ||
              selectedTags.length > 5 ||
              createTemplateMutation.isPending
            }
          >
            {createTemplateMutation.isPending ? (
              <>Creating...</>
            ) : isPublic ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Publish Template
              </>
            ) : (
              <>Save as Draft</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}