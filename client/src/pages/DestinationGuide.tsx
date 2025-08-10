import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import MetaTags from '@/components/seo/MetaTags';
import { generateMetadata, generateFAQSchema, generateBreadcrumbSchema } from '@/lib/seo/metadata';
import ExpediaAffiliate from '@/components/ExpediaAffiliate';
import { 
  MapPin, Calendar, Utensils, Car, Hotel, Plane, 
  Info, Star, TrendingUp, Heart, Camera, Sun,
  Activity, ExternalLink, Plus, Check, Clock
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/JWTAuthContext';
import { toast } from 'sonner';

interface DestinationData {
  title: string;
  metaDescription: string;
  heroDescription: string;
  overview: string;
  bestTimeToVisit: string;
  topAttractions: string[];
  localTips: string[];
  gettingAround: string;
  whereToStay: string;
  foodAndDrink: string;
  faqs: Array<{question: string; answer: string}>;
  image?: string;
  seasonalWeather?: {
    description: string;
    avgHighTemp: number;
    avgLowTemp: number;
    rainyMonths?: string;
  };
  imageAttribution?: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
    photoUrl: string;
  };
}

export default function DestinationGuide() {
  const { destination } = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'hotels' | 'packages' | 'activities'>('overview');
  const [loadActivities, setLoadActivities] = useState(false);
  const [savedActivities, setSavedActivities] = useState<Set<string>>(new Set());
  
  // Fetch destination content with smart caching
  const { data: destinationData, isLoading, error, refetch } = useQuery<DestinationData>({
    queryKey: ['destination', destination],
    queryFn: async () => {
      const response = await fetch(`/api/destinations/${destination}/content`);
      if (!response.ok) throw new Error('Failed to load destination');
      
      const data = await response.json();
      
      // Check if content looks generic (fallback content)
      const isGeneric = data.overview?.includes('remarkable destination that attracts millions');
      
      // If generic, throw error to trigger refetch
      if (isGeneric) {
        throw new Error('Loading destination details...');
      }
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // Only cache for 5 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    retry: 3, // Retry up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    refetchOnWindowFocus: false, // Don't refetch on tab focus
  });
  
  // Fetch Viator activities - only when activities tab is clicked
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['viator-activities', destination],
    queryFn: async () => {
      const response = await fetch(`/api/viator/search/city/${destination}`);
      if (!response.ok) throw new Error('Failed to load activities');
      return response.json();
    },
    enabled: loadActivities && !!destination,
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  const viatorActivities = activitiesData?.activities || [];

  // Mutation to save activity to trip
  const saveActivityMutation = useMutation({
    mutationFn: async (activity: any) => {
      const response = await fetch('/api/viator/save-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          productCode: activity.productCode,
          productName: activity.productName,
          price: activity.fromPrice,
          duration: activity.duration,
          affiliateLink: activity.affiliateLink,
          city: destination
        })
      });
      
      if (!response.ok) throw new Error('Failed to save activity');
      return response.json();
    },
    onSuccess: (data, variables) => {
      setSavedActivities(prev => new Set(prev).add(variables.productCode));
      toast.success('Activity saved to your trip ideas!');
    },
    onError: () => {
      toast.error('Failed to save activity. Please try again.');
    }
  });

  // Track click and open affiliate link
  const handleBookClick = async (activity: any) => {
    // Track the click
    try {
      await fetch('/api/viator/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          productCode: activity.productCode,
          productName: activity.productName,
          city: destination
        })
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }
    
    // Open affiliate link in new tab
    window.open(activity.affiliateLink, '_blank', 'noopener,noreferrer');
  };

  // Load activities when tab is clicked
  useEffect(() => {
    if (activeTab === 'activities' && !loadActivities) {
      setLoadActivities(true);
    }
  }, [activeTab, loadActivities]);

  // Auto-refresh if we detect generic content
  useEffect(() => {
    if (destinationData?.overview?.includes('remarkable destination that attracts millions')) {
      const timer = setTimeout(() => {
        refetch();
      }, 2000); // Refetch after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [destinationData, refetch]);
  
  // Generate SEO metadata
  const seoMetadata = generateMetadata('destination', { 
    destination: destination?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
  });
  
  // Generate structured data
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Destinations', url: '/destinations' },
    { name: destination?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '', url: `/destinations/${destination}` }
  ]);
  
  const faqSchema = destinationData?.faqs ? generateFAQSchema(destinationData.faqs) : null;
  
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      seoMetadata.structuredData,
      breadcrumbs,
      faqSchema
    ].filter(Boolean)
  };
  
  if (isLoading || (error && error.message === 'Loading destination details...')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        {/* Skeleton Hero */}
        <div className="h-[60vh] bg-gradient-to-br from-purple-200 to-pink-200 animate-pulse relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <MapPin className="w-12 h-12 mx-auto mb-4 animate-bounce" />
              <p className="text-xl font-semibold">Generating unique content for {destination?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              <p className="text-sm mt-2 opacity-90">This may take a few moments on first visit...</p>
            </div>
          </div>
        </div>
        
        {/* Skeleton Content */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-48" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="h-40 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const destinationName = destination?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
  
  return (
    <>
      <MetaTags 
        {...seoMetadata}
        structuredData={structuredData}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        {/* Hero Image */}
        <section className="relative h-[50vh] overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: destinationData?.image ? `url(${destinationData.image})` : 'linear-gradient(to bottom right, #9333ea, #ec4899)',
            }}
          />
        </section>
        
        {/* Hero Content - Below Image */}
        <section className="bg-white py-8 shadow-sm">
          <div className="max-w-7xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-4 bg-purple-600 text-white">
                <TrendingUp className="w-3 h-3 mr-1" />
                Trending Destination
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold mb-4 text-gray-900">
                {destinationData?.title || `${destinationName} Travel Guide`}
              </h1>
              <p className="text-xl md:text-2xl max-w-3xl text-gray-600">
                {destinationData?.heroDescription || `Discover the best of ${destinationName} with our comprehensive guide`}
              </p>
              
              {destinationData?.seasonalWeather && (
                <div className="flex items-center gap-4 mt-6 text-gray-700">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-yellow-500" />
                    <span className="text-lg">
                      {destinationData.seasonalWeather.avgLowTemp}°-{destinationData.seasonalWeather.avgHighTemp}°F
                    </span>
                  </div>
                  <span className="text-lg">
                    {destinationData.seasonalWeather.description}
                  </span>
                </div>
              )}
              
              {destinationData?.imageAttribution && (
                <div className="mt-4 text-sm text-gray-500">
                  Photo by{' '}
                  <a 
                    href={destinationData.imageAttribution.photographerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-700"
                  >
                    {destinationData.imageAttribution.photographerName}
                  </a>
                  {' '}on{' '}
                  <a 
                    href={destinationData.imageAttribution.photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-700"
                  >
                    Unsplash
                  </a>
                </div>
              )}
            </motion.div>
          </div>
        </section>
        
        {/* Navigation Tabs */}
        <section className="sticky top-0 bg-white shadow-sm z-40">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-8 overflow-x-auto py-4">
              {[
                { id: 'overview', label: 'Overview', icon: Info },
                { id: 'activities', label: 'Activities', icon: Camera }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>
        
        {/* Content */}
        <section className="max-w-7xl mx-auto px-4 py-12">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-purple-600" />
                      About {destinationName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-gray max-w-none">
                    <p>{destinationData?.overview || `Welcome to ${destinationName}, a destination that offers something for every traveler.`}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-purple-600" />
                      Top Attractions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {(destinationData?.topAttractions || []).map((attraction, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Badge className="mt-0.5">{index + 1}</Badge>
                          <span>{attraction}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Utensils className="w-5 h-5 text-purple-600" />
                      Food & Drink
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-gray max-w-none">
                    <p>{destinationData?.foodAndDrink || `${destinationName} offers a diverse culinary scene worth exploring.`}</p>
                  </CardContent>
                </Card>
                
                {/* FAQs */}
                {destinationData?.faqs && destinationData.faqs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Frequently Asked Questions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {destinationData.faqs.map((faq, index) => (
                        <div key={index}>
                          <h4 className="font-semibold mb-1">{faq.question}</h4>
                          <p className="text-gray-600">{faq.answer}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      Best Time to Visit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      {destinationData?.bestTimeToVisit || 'Spring and fall offer the best weather and fewer crowds.'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="w-5 h-5 text-purple-600" />
                      Getting Around
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      {destinationData?.gettingAround || 'Public transportation and ride-sharing services are readily available.'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-purple-600" />
                      Local Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(destinationData?.localTips || []).map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-purple-600">•</span>
                          <span className="text-gray-600">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                {/* Expedia Booking Widget */}
                <ExpediaAffiliate 
                  destination={destinationName}
                  variant="cta"
                />
                
                {/* Plan Trip CTA */}
                <Card className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                  <CardContent className="text-center py-8">
                    <h3 className="text-2xl font-bold mb-4">
                      Plan Your {destinationName} Trip
                    </h3>
                    <p className="mb-6">
                      Use our AI-powered planner to create your perfect itinerary
                    </p>
                    <Link href="/signup">
                      <Button 
                        size="lg"
                        variant="secondary"
                      >
                        Start Planning Free
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          {activeTab === 'activities' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Things to Do in {destinationName}</h2>
              <p className="text-gray-600 mb-4">Book activities and experiences through our partner Viator</p>
              
              {activitiesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="h-48 w-full" />
                      <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-8 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : viatorActivities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {viatorActivities.map((activity: any) => (
                    <Card key={activity.productCode} className="overflow-hidden hover:shadow-lg transition-shadow">
                      {activity.primaryImageURL && (
                        <div className="h-48 bg-gray-200">
                          <img 
                            src={activity.primaryImageURL} 
                            alt={activity.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-4 space-y-3">
                        <h3 className="font-semibold text-base line-clamp-2">
                          {activity.productName}
                        </h3>
                        
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          {activity.duration && (
                            <>
                              <Clock className="h-4 w-4" />
                              <span>{activity.duration}</span>
                            </>
                          )}
                          {activity.rating && (
                            <>
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span>{activity.rating.toFixed(1)}</span>
                              {activity.reviewCount && (
                                <span>({activity.reviewCount} reviews)</span>
                              )}
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-2">
                          <div>
                            <span className="text-xs text-gray-500">From</span>
                            <p className="font-bold text-xl text-purple-600">
                              ${activity.fromPrice}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {user && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => saveActivityMutation.mutate(activity)}
                                disabled={savedActivities.has(activity.productCode)}
                              >
                                {savedActivities.has(activity.productCode) ? (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Saved
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Save
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleBookClick(activity)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Book
                              <ExternalLink className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg mb-2">
                    {activitiesData?.message || 'No activities available for this destination yet'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Check back soon or try searching for a nearby major city
                  </p>
                </Card>
              )}
              
              {viatorActivities.length > 0 && (
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    <strong>Note:</strong> Prices and availability are subject to change. 
                    Booking through our affiliate links helps support Remvana at no extra cost to you.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}