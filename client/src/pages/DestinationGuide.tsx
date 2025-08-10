import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MetaTags from '@/components/seo/MetaTags';
import { generateMetadata, generateFAQSchema, generateBreadcrumbSchema } from '@/lib/seo/metadata';
import ExpediaAffiliate from '@/components/ExpediaAffiliate';
import { 
  MapPin, Calendar, Utensils, Car, Hotel, Plane, 
  Info, Star, TrendingUp, Heart, Camera, Sun
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'hotels' | 'packages' | 'activities'>('overview');
  
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
              <p className="text-gray-600 mb-8">Activities and tours coming soon!</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}