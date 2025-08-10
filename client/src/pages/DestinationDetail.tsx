import React, { useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  MapPin, Calendar, Cloud, DollarSign, Users, 
  Utensils, Hotel, Camera, Info, ChevronRight,
  Sparkles, Globe, Clock, Star, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function DestinationDetail() {
  const { destination } = useParams<{ destination: string }>();

  // Fetch destination content
  const { data: content, isLoading, error } = useQuery({
    queryKey: ['destination', destination],
    queryFn: async () => {
      const response = await fetch(`/api/destinations/${destination}/content`);
      if (!response.ok) throw new Error('Failed to load destination');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Fetch related templates
  const { data: templatesData } = useQuery({
    queryKey: ['templates', 'destination', destination],
    queryFn: async () => {
      const destinationName = destination?.split('-').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
      
      const response = await fetch(`/api/templates?destination=${encodeURIComponent(destinationName || '')}&limit=6`);
      if (!response.ok) return { templates: [] };
      const data = await response.json();
      return data;
    },
    enabled: !!destination,
  });

  const templates = templatesData?.templates || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-full mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Destination Not Found</h1>
          <p className="text-gray-600 mb-8">We couldn't find information about this destination.</p>
          <Link href="/destinations">
            <Button>Browse All Destinations</Button>
          </Link>
        </div>
      </div>
    );
  }

  const destinationName = destination?.split('-').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{content.title || `${destinationName} Travel Guide`} | Remvana</title>
        <meta name="description" content={content.metaDescription || `Plan your perfect trip to ${destinationName}. Discover top attractions, best times to visit, local tips, and more.`} />
        <meta property="og:title" content={content.title || `${destinationName} Travel Guide`} />
        <meta property="og:description" content={content.metaDescription} />
        <meta property="og:image" content={content.image || 'https://remvana.com/og-image.jpg'} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://remvana.com/destinations/${destination}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TravelDestination",
            "name": destinationName,
            "description": content.metaDescription,
            "image": content.image,
            "url": `https://remvana.com/destinations/${destination}`
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        {/* Hero Section */}
        <section className="relative h-[500px] overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${content.image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&h=800&fit=crop'})` 
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
          </div>
          
          <div className="relative h-full flex items-end">
            <div className="max-w-7xl mx-auto px-4 pb-12 w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Badge className="mb-4 bg-white/20 backdrop-blur text-white border-white/30">
                  <MapPin className="w-3 h-3 mr-1" />
                  AI-Enhanced Destination
                </Badge>
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                  {destinationName}
                </h1>
                <p className="text-xl text-white/90 max-w-3xl">
                  {content.heroDescription || content.metaDescription}
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-8">
              {/* Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-purple-600" />
                      Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {content.overview}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Top Attractions */}
              {content.topAttractions && content.topAttractions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5 text-purple-600" />
                        Top Attractions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {content.topAttractions.map((attraction: string, index: number) => (
                          <div key={index} className="flex items-start gap-3">
                            <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <p className="text-gray-700">{attraction}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Detailed Information Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Tabs defaultValue="stay" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="stay">Where to Stay</TabsTrigger>
                    <TabsTrigger value="food">Food & Drink</TabsTrigger>
                    <TabsTrigger value="transport">Getting Around</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="stay">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Hotel className="h-5 w-5 text-purple-600" />
                          Where to Stay
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {content.whereToStay || 'Information coming soon...'}
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="food">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Utensils className="h-5 w-5 text-purple-600" />
                          Food & Drink
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {content.foodAndDrink || 'Information coming soon...'}
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="transport">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-purple-600" />
                          Getting Around
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {content.gettingAround || 'Information coming soon...'}
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </motion.div>

              {/* FAQs */}
              {content.faqs && content.faqs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-purple-600" />
                        Frequently Asked Questions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {content.faqs.map((faq: any, index: number) => (
                          <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                            <AccordionContent>
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      Quick Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                        <Calendar className="h-4 w-4" />
                        Best Time to Visit
                      </div>
                      <p className="text-gray-900">
                        {content.bestTimeToVisit || 'Year-round'}
                      </p>
                    </div>
                    
                    {content.seasonalWeather && (
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                          <Cloud className="h-4 w-4" />
                          Weather
                        </div>
                        <p className="text-gray-900 text-sm">
                          {content.seasonalWeather}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Local Tips */}
              {content.localTips && content.localTips.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-purple-600" />
                        Local Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {content.localTips.slice(0, 5).map((tip: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Related Templates */}
              {templates.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        Trip Templates
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {templates.slice(0, 3).map((template: any) => (
                          <Link key={template.id} href={`/templates/${template.id}`}>
                            <div className="p-3 rounded-lg border hover:bg-purple-50 transition-colors cursor-pointer">
                              <p className="font-medium text-sm text-gray-900 mb-1">
                                {template.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Clock className="h-3 w-3" />
                                {template.duration} days
                                <DollarSign className="h-3 w-3 ml-2" />
                                ${template.price}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                      {templates.length > 3 && (
                        <Link href={`/marketplace?destination=${encodeURIComponent(destinationName || '')}`}>
                          <Button variant="outline" className="w-full mt-3">
                            View All Templates
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-bold mb-2">Ready to Plan Your Trip?</h3>
                    <p className="text-sm text-white/90 mb-4">
                      Start planning your perfect {destinationName} adventure today
                    </p>
                    <Link href="/signup">
                      <Button className="w-full bg-white text-purple-600 hover:bg-gray-100">
                        Start Planning Free
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}