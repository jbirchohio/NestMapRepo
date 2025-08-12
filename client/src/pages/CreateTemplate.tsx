import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/JWTAuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Save,
  Eye,
  Rocket,
  Plus,
  X,
  Upload,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  Sparkles,
  Info,
  Image as ImageIcon
} from 'lucide-react';
import PricingSuggestion from '@/components/PricingSuggestion';
import { TEMPLATE_TAGS, getTagsByCategory, getTagLabel } from '@shared/templateTags';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TripOption {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  city: string;
  country: string;
  activityCount: number;
}

export default function CreateTemplate() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('29.99');
  const [currency] = useState('USD');
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);

  // Fetch user's trips to convert
  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ['user-trips'],
    queryFn: async () => {
      const response = await fetch('/api/trips', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch trips');
      const data = await response.json();
      return data as TripOption[];
    },
    enabled: !!user
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!selectedTripId) {
        throw new Error('Please select a trip to convert');
      }

      const response = await fetch(`/api/templates/from-trip/${selectedTripId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title,
          description,
          price,
          tags,
          coverImage: uploadedImageUrl || coverImageUrl || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create template');
      }

      const template = await response.json();

      // If publishing, call publish endpoint
      if (publish) {
        const publishResponse = await fetch(`/api/templates/${template.id}/publish`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!publishResponse.ok) {
          const error = await publishResponse.json();
          throw new Error(error.message || 'Failed to publish template');
        }

        return await publishResponse.json();
      }

      return template;
    },
    onSuccess: (data, publish) => {
      toast({
        title: publish ? 'Template Published!' : 'Template Saved!',
        description: publish
          ? 'Your template is now live in the marketplace'
          : 'Your template has been saved as a draft',
      });
      navigate('/creator/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const selectedTrip = trips?.find(t => t.id === selectedTripId);

  // Calculate duration if trip is selected
  const duration = selectedTrip
    ? Math.ceil((new Date(selectedTrip.endDate).getTime() - new Date(selectedTrip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/template-cover', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setUploadedImageUrl(data.coverUrl);
      setCoverImageUrl(data.coverUrl);
      toast({
        title: 'Image uploaded!',
        description: 'Your cover image has been uploaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 10MB',
          variant: 'destructive',
        });
        return;
      }

      setCoverImageFile(file);
      handleImageUpload(file);
    }
  };

  const handleAddTag = (tagValue: string) => {
    if (!tags.includes(tagValue) && tags.length < 5) {
      setTags([...tags, tagValue]);
      setShowTagSelector(false);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSaveDraft = () => {
    createTemplateMutation.mutate(false);
  };

  const handlePublish = () => {
    setIsPublishing(true);
    createTemplateMutation.mutate(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">You need to be signed in to create templates</p>
            <Button onClick={() => navigate('/?auth=login')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/creator/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={!title || !selectedTripId || createTemplateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={handlePublish}
              disabled={!title || !description || !selectedTripId || createTemplateMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isPublishing ? (
                <>Publishing...</>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Publish Template
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="md:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Template Information</CardTitle>
                <CardDescription>
                  Create a compelling title and description for your template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Template Title*</Label>
                  <Input
                    id="title"
                    placeholder="e.g., 7-Day Paris Adventure with Hidden Gems"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Make it descriptive and searchable
                  </p>
                </div>

                <div>
                  <Label htmlFor="description">Description*</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what makes your itinerary special..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Highlight unique experiences, local tips, and what's included
                  </p>
                </div>

                <div>
                  <Label htmlFor="cover">Cover Image</Label>
                  <div className="mt-1 space-y-2">
                    {uploadedImageUrl ? (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                        <img
                          src={uploadedImageUrl}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setUploadedImageUrl('');
                            setCoverImageUrl('');
                            setCoverImageFile(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          id="cover"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <label
                          htmlFor="cover"
                          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          {isUploading ? (
                            <>
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                              <p className="mt-2 text-sm text-gray-600">Uploading...</p>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-12 w-12 text-gray-400" />
                              <p className="mt-2 text-sm text-gray-600">Click to upload cover image</p>
                              <p className="text-xs text-gray-500">JPEG, PNG or WebP (max 10MB)</p>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      A good cover image helps your template stand out in the marketplace
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trip Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Trip to Convert*</CardTitle>
                <CardDescription>
                  Choose one of your existing trips to turn into a template
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tripsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading your trips...</p>
                  </div>
                ) : trips && trips.length > 0 ? (
                  <div className="space-y-2">
                    {trips.map((trip) => (
                      <div
                        key={trip.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedTripId === trip.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedTripId(trip.id);
                          // Auto-populate destinations
                          const dests = [];
                          if (trip.city) dests.push(trip.city);
                          if (trip.country && !dests.includes(trip.country)) dests.push(trip.country);
                          setDestinations(dests);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{trip.title}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {trip.city || trip.country || 'No location'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                              </span>
                              <span>{trip.activityCount} activities</span>
                            </div>
                          </div>
                          {selectedTripId === trip.id && (
                            <Badge className="bg-purple-600">Selected</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">You don't have any trips yet</p>
                    <Button onClick={() => navigate('/trip-planner')}>
                      Create Your First Trip
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                  Select up to 5 tags to help travelers find your template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="pl-3 pr-1 py-1">
                        {getTagLabel(tag)}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Tag Selector */}
                <Popover open={showTagSelector} onOpenChange={setShowTagSelector}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={tags.length >= 5}
                      className="w-full justify-start"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {tags.length >= 5 ? 'Maximum 5 tags' : 'Add tags'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="max-h-96 overflow-y-auto">
                      {/* Group tags by category */}
                      {['style', 'group', 'interest', 'duration', 'type', 'special'].map(category => (
                        <div key={category} className="p-2">
                          <div className="text-xs font-semibold text-gray-500 uppercase mb-1 px-2">
                            {category}
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {getTagsByCategory(category).map(tag => (
                              <button
                                key={tag.value}
                                type="button"
                                onClick={() => handleAddTag(tag.value)}
                                disabled={tags.includes(tag.value)}
                                className={`text-left px-2 py-1 text-sm rounded hover:bg-gray-100 transition-colors ${
                                  tags.includes(tag.value)
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'hover:text-purple-600'
                                }`}
                              >
                                {tag.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <p className="text-xs text-gray-500">
                  Choose tags that best describe your itinerary style and target audience
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>
                  Set a competitive price for your template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="price">Price (USD)*</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="4.99"
                      max="299.99"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* AI Pricing Suggestion */}
                {selectedTrip && (
                  <PricingSuggestion
                    duration={duration}
                    activityCount={selectedTrip.activityCount}
                    destinations={destinations}
                    tags={tags}
                    hasFlights={false}
                    hasHotels={false}
                    hasMeals={false}
                    onPriceSelect={(suggestedPrice) => setPrice(suggestedPrice.toFixed(2))}
                    currentPrice={parseFloat(price)}
                  />
                )}
              </CardContent>
            </Card>

            {/* Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">Complete Itinerary</p>
                    <p className="text-gray-600">Include at least 3 activities per day</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">Detailed Descriptions</p>
                    <p className="text-gray-600">Provide context and tips for each activity</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">Accurate Information</p>
                    <p className="text-gray-600">Verify locations, times, and prices</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">Local Insights</p>
                    <p className="text-gray-600">Share hidden gems and insider tips</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Earnings Preview */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="text-lg">Earnings Calculator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Template Price</span>
                  <span className="font-medium">${price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee (30%)</span>
                  <span className="text-red-600">-${(parseFloat(price) * 0.3).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>You Earn Per Sale</span>
                  <span className="text-green-600">${(parseFloat(price) * 0.7).toFixed(2)}</span>
                </div>

                <div className="mt-4 pt-4 border-t space-y-1">
                  <p className="text-xs text-gray-500">Potential Monthly Earnings:</p>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>10 sales/month</span>
                      <span>${(parseFloat(price) * 0.7 * 10).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>50 sales/month</span>
                      <span>${(parseFloat(price) * 0.7 * 50).toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}