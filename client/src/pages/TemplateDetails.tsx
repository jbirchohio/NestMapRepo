import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  MapPin, Calendar, Clock, Star, Users, Share2, Heart, 
  ShoppingCart, Check, Info, Globe, Instagram, Twitter,
  ChevronRight, Tag, TrendingUp, Shield, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ClientTemplate, ClientTemplateReview } from '@/lib/types';
import { useAuth } from '@/contexts/JWTAuthContext';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import AuthModalSimple from '@/components/auth/AuthModalSimple';
import ShareModalSimple from '@/components/ShareModalSimple';
import StripeCheckout from '@/components/StripeCheckout';
import ReuseTemplateDialog from '@/components/ReuseTemplateDialog';

export default function TemplateDetails() {
  const { slug } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReuseDialog, setShowReuseDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);

  // Fetch template details
  const { data: template, isLoading, refetch } = useQuery({
    queryKey: ['template', slug],
    queryFn: async () => {
      const response = await fetch(`/api/templates/${slug}`, {
        headers: user ? {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch template');
      return response.json() as Promise<ClientTemplate>;
    },
    enabled: !!slug,
  });

  // Handle purchase button click
  const handlePurchaseClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    if (!template) return;
    
    // If user already owns this template, show reuse dialog
    // Otherwise show Stripe payment dialog
    if (template.hasPurchased) {
      // For owned templates, show the reuse dialog with date selection
      setShowReuseDialog(true);
    } else {
      // New purchase - show full payment dialog
      setShowPaymentDialog(true);
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = (data: any) => {
    console.log('Payment success data received:', data);
    console.log('Data type:', typeof data);
    console.log('Data.tripId:', data.tripId, 'type:', typeof data.tripId);
    
    setShowPaymentDialog(false);
    toast({
      title: 'Purchase successful!',
      description: 'The template has been added to your trips.',
    });
    refetch();
    
    // Navigate to the new trip
    // The backend returns tripId in the response
    const tripId = data.tripId || data.trip_id;
    console.log('Final tripId for navigation:', tripId);
    
    if (tripId) {
      navigate(`/trip/${tripId}`);
    } else {
      console.warn('No tripId found in response, navigating to trips list');
      navigate('/trips');
    }
  };

  // Track share
  const trackShare = async (platform: string) => {
    await fetch(`/api/templates/${template?.id}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ platform })
    });
  };

  if (isLoading) {
    return <TemplateDetailsSkeleton />;
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Template not found</h2>
          <Button onClick={() => navigate('/marketplace')}>
            Browse Templates
          </Button>
        </Card>
      </div>
    );
  }

  const tripData = template.tripData || {};
  const activities = tripData.activities || [];
  const dayGroups = groupActivitiesByDay(activities);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-20">
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-br from-purple-600 to-pink-600">
        {template.coverImage ? (
          <img
            src={template.coverImage}
            alt={template.title}
            className="w-full h-full object-cover opacity-80"
            loading="eager"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.retried) {
                img.dataset.retried = 'true';
                setTimeout(() => {
                  img.src = img.src + '?t=' + Date.now();
                }, 100);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="h-24 w-24 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-wrap gap-2 mb-4">
                {template.featured && (
                  <Badge className="bg-yellow-500 text-white">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
                {template.destinations.map((dest) => (
                  <Badge key={dest} variant="secondary" className="bg-white/20 text-white">
                    <MapPin className="h-3 w-3 mr-1" />
                    {dest}
                  </Badge>
                ))}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {template.title}
              </h1>
              
              <p className="text-xl text-white/90 max-w-3xl">
                {template.description}
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Stats */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-2xl font-bold">{template.duration}</div>
                    <div className="text-sm text-gray-600">Days</div>
                  </div>
                  <div>
                    <MapPin className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-2xl font-bold">{template.destinations.length}</div>
                    <div className="text-sm text-gray-600">Places</div>
                  </div>
                  <div>
                    <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                    <div className="text-2xl font-bold">{template.rating || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Rating</div>
                  </div>
                  <div>
                    <Users className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-2xl font-bold">{template.salesCount}</div>
                    <div className="text-sm text-gray-600">Travelers</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Itinerary Tabs */}
            <Card>
              <CardHeader>
                <CardTitle>Day-by-Day Itinerary</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={`day-${selectedDay}`} onValueChange={(v) => setSelectedDay(parseInt(v.split('-')[1]))}>
                  <TabsList className="flex flex-wrap gap-2 mb-6">
                    {dayGroups.map((_, index) => (
                      <TabsTrigger key={index} value={`day-${index}`}>
                        Day {index + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {dayGroups.map((dayActivities, index) => (
                    <TabsContent key={index} value={`day-${index}`} className="space-y-4">
                      {dayActivities.length > 0 ? (
                        dayActivities.map((activity, actIndex) => (
                          <motion.div
                            key={actIndex}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: actIndex * 0.1 }}
                          >
                            <div className="flex gap-4 p-4 rounded-lg border hover:bg-purple-50/50 transition-colors">
                              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-semibold">{activity.title}</h4>
                                    {activity.time && (
                                      <p className="text-sm text-gray-600 mt-1">
                                        {activity.time}
                                      </p>
                                    )}
                                    {activity.locationName && (
                                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                        <MapPin className="h-3 w-3" />
                                        {activity.locationName}
                                      </p>
                                    )}
                                    {activity.notes && (
                                      <p className="text-sm text-gray-700 mt-2">
                                        {activity.notes}
                                      </p>
                                    )}
                                  </div>
                                  {activity.tag && (
                                    <Badge variant="outline" className="ml-4">
                                      {activity.tag}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">
                          No activities planned for this day
                        </p>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Reviews ({template.reviewCount})</CardTitle>
              </CardHeader>
              <CardContent>
                {template.reviews && template.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {template.reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No reviews yet. Be the first to review!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Purchase Card */}
            <Card className="sticky top-24 z-10 bg-white">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-purple-600">
                    ${template.price}
                  </div>
                  <p className="text-sm text-gray-600">one-time purchase</p>
                </div>

                {template.hasPurchased ? (
                  <div className="space-y-3">
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handlePurchaseClick}
                      variant="default"
                    >
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Use Template Again
                    </Button>
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => navigate('/trips')}
                      variant="outline"
                    >
                      <Check className="h-5 w-5 mr-2" />
                      View My Trips
                    </Button>
                    <p className="text-sm text-center text-gray-600">
                      You own this template and can use it unlimited times
                    </p>
                  </div>
                ) : (
                  <Button 
                    className="w-full mb-4" 
                    size="lg"
                    onClick={handlePurchaseClick}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Purchase Template
                  </Button>
                )}

                <div className="flex gap-2 mb-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowShareModal(true)}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="icon">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>

                <Separator className="my-4" />

                {/* What's Included */}
                <div className="space-y-3">
                  <h3 className="font-semibold mb-2">What's Included</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Complete {template.duration}-day itinerary</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>All locations with map coordinates</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Customizable activities</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Lifetime access & updates</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>30-day money-back guarantee</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Creator Card */}
            {template.creator && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About the Creator</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={template.creator.avatarUrl} />
                      <AvatarFallback>
                        {template.creator.displayName?.[0] || template.creator.username?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">
                        {template.creator.displayName || template.creator.username}
                      </h3>
                      {template.creator.verified && (
                        <Badge variant="outline" className="mt-1">
                          <Check className="h-3 w-3 mr-1" />
                          Verified Creator
                        </Badge>
                      )}
                    </div>
                  </div>

                  {template.creator.bio && (
                    <p className="text-sm text-gray-600 mb-4">
                      {template.creator.bio}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-center mb-4">
                    <div>
                      <div className="text-xl font-bold">{template.creator.totalTemplates}</div>
                      <div className="text-xs text-gray-600">Templates</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{template.creator.totalSales}</div>
                      <div className="text-xs text-gray-600">Happy Travelers</div>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="flex gap-2">
                    {template.creator.socialTwitter && (
                      <Button variant="outline" size="sm">
                        <Twitter className="h-4 w-4" />
                      </Button>
                    )}
                    {template.creator.socialInstagram && (
                      <Button variant="outline" size="sm">
                        <Instagram className="h-4 w-4" />
                      </Button>
                    )}
                    {template.creator.websiteUrl && (
                      <Button variant="outline" size="sm">
                        <Globe className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => navigate(`/creators/${template.creator?.userId}`)}
                  >
                    View Profile
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {template.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="outline"
                        className="cursor-pointer hover:bg-purple-50"
                        onClick={() => navigate(`/marketplace?tag=${tag}`)}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAuthModal && (
        <AuthModalSimple
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialView="signup"
        />
      )}

      {showShareModal && template && (
        <ShareModalSimple
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          template={template}
        />
      )}

      {/* Stripe Payment Dialog */}
      {showPaymentDialog && template && (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-[500px] p-0">
            <StripeCheckout
              templateId={template.id}
              templateTitle={template.title}
              templateDuration={template.duration || 7}
              price={parseFloat(template.price || '0')}
              currency={template.currency || 'USD'}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setShowPaymentDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Reuse Template Dialog (for already purchased templates) */}
      {showReuseDialog && template && (
        <ReuseTemplateDialog
          template={template}
          isOpen={showReuseDialog}
          onClose={() => setShowReuseDialog(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

// Review Card Component
function ReviewCard({ review }: { review: ClientTemplateReview }) {
  return (
    <div className="border-b last:border-0 pb-4 last:pb-0">
      <div className="flex items-start gap-4">
        <Avatar>
          <AvatarImage src={review.userAvatar} />
          <AvatarFallback>{review.userName?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-semibold">{review.userName}</h4>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                {review.verifiedPurchase && (
                  <Badge variant="outline" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Verified Purchase
                  </Badge>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-500">
              {format(new Date(review.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
          
          {review.review && (
            <p className="text-gray-700">{review.review}</p>
          )}
          
          {review.creatorResponse && (
            <div className="mt-3 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-900 mb-1">
                Creator Response:
              </p>
              <p className="text-sm text-purple-800">{review.creatorResponse}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton Loader
function TemplateDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-20">
      <Skeleton className="h-96 w-full" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <Skeleton className="h-32 m-6" />
            </Card>
            <Card>
              <Skeleton className="h-96 m-6" />
            </Card>
          </div>
          <div>
            <Card>
              <Skeleton className="h-96 m-6" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to group activities by day
function groupActivitiesByDay(activities: any[]): any[][] {
  const days: any[][] = [];
  let currentDay: any[] = [];
  let currentDate: string | null = null;

  activities.forEach((activity) => {
    if (activity.date !== currentDate) {
      if (currentDay.length > 0) {
        days.push(currentDay);
      }
      currentDay = [activity];
      currentDate = activity.date;
    } else {
      currentDay.push(activity);
    }
  });

  if (currentDay.length > 0) {
    days.push(currentDay);
  }

  // Return the actual number of days in the template
  return days;
}