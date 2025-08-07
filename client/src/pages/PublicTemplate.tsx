import React from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { 
  MapPin, Calendar, Clock, Star, Users, Globe,
  Check, TrendingUp, Shield, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientTemplate } from '@/lib/types';
import { motion } from 'framer-motion';

export default function PublicTemplate() {
  const { shareCode } = useParams();

  // Fetch template by share code
  const { data: template, isLoading } = useQuery({
    queryKey: ['public-template', shareCode],
    queryFn: async () => {
      const response = await fetch(`/api/templates/share/${shareCode}`);
      if (!response.ok) throw new Error('Template not found');
      return response.json() as Promise<ClientTemplate>;
    },
    enabled: !!shareCode,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Template not found</h2>
          <Button onClick={() => window.location.href = '/marketplace'}>
            Browse Templates
          </Button>
        </Card>
      </div>
    );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": template.title,
    "description": template.description,
    "image": template.coverImage,
    "offers": {
      "@type": "Offer",
      "price": template.price,
      "priceCurrency": template.currency,
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": template.rating ? {
      "@type": "AggregateRating",
      "ratingValue": template.rating,
      "reviewCount": template.reviewCount
    } : undefined,
    "brand": {
      "@type": "Organization",
      "name": "Remvana"
    }
  };

  return (
    <>
      <Helmet>
        <title>{template.title} - Travel Template | Remvana</title>
        <meta name="description" content={template.description || `${template.duration}-day trip template to ${template.destinations.join(', ')}`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`https://remvana.com/t/${shareCode}`} />
        <meta property="og:title" content={template.title} />
        <meta property="og:description" content={template.description} />
        <meta property="og:image" content={template.coverImage || 'https://remvana.com/og-default.jpg'} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://remvana.com/t/${shareCode}`} />
        <meta property="twitter:title" content={template.title} />
        <meta property="twitter:description" content={template.description} />
        <meta property="twitter:image" content={template.coverImage || 'https://remvana.com/og-default.jpg'} />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        {/* Hero Section */}
        <div className="relative h-[60vh] bg-gradient-to-br from-purple-600 to-pink-600">
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
              <MapPin className="h-32 w-32 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          
          {/* Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white"
              >
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.featured && (
                    <Badge className="bg-yellow-500 text-white">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Featured Template
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    <Calendar className="h-3 w-3 mr-1" />
                    {template.duration} Days
                  </Badge>
                  {template.destinations.map((dest) => (
                    <Badge key={dest} variant="secondary" className="bg-white/20 text-white">
                      <MapPin className="h-3 w-3 mr-1" />
                      {dest}
                    </Badge>
                  ))}
                </div>
                
                <h1 className="text-4xl md:text-6xl font-bold mb-4">
                  {template.title}
                </h1>
                
                <p className="text-xl text-white/90 max-w-3xl mb-6">
                  {template.description}
                </p>

                <div className="flex flex-wrap items-center gap-6 text-white/90">
                  {template.rating && (
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{template.rating}</span>
                      <span>({template.reviewCount} reviews)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span>{template.salesCount} happy travelers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    <span>{template.viewCount} views</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>What Makes This Trip Special</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Hand-Picked Locations</h3>
                        <p className="text-sm text-gray-600">
                          Every stop carefully selected for the best experience
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Perfect Timing</h3>
                        <p className="text-sm text-gray-600">
                          Optimized schedule to make the most of your {template.duration} days
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Trusted by Travelers</h3>
                        <p className="text-sm text-gray-600">
                          {template.salesCount}+ travelers have used this template
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Check className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Fully Customizable</h3>
                        <p className="text-sm text-gray-600">
                          Adapt the itinerary to your personal preferences
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sample Itinerary */}
              <Card>
                <CardHeader>
                  <CardTitle>Sample Day from the Itinerary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4 p-4 rounded-lg bg-purple-50">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <span className="font-bold text-purple-600">9AM</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">Morning Adventure</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Start your day with an unforgettable experience
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 p-4 rounded-lg bg-purple-50">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <span className="font-bold text-purple-600">1PM</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">Local Cuisine</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Discover authentic flavors at hidden gems
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 p-4 rounded-lg bg-purple-50">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <span className="font-bold text-purple-600">6PM</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">Sunset Views</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          End the day at the perfect viewpoint
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-center text-sm text-gray-600 mt-6">
                    + {((template.tripData?.activities?.length || 15) - 3)} more amazing activities
                  </p>
                </CardContent>
              </Card>

              {/* Reviews Preview */}
              {template.reviewCount > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>What Travelers Say</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className="h-4 w-4 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">Sarah M.</span>
                          <Badge variant="outline" className="text-xs">
                            Verified Purchase
                          </Badge>
                        </div>
                        <p className="text-gray-700">
                          "This template saved me hours of planning! Every recommendation was spot on."
                        </p>
                      </div>
                      
                      <p className="text-center">
                        <Button variant="link" className="text-purple-600">
                          Read all {template.reviewCount} reviews
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar CTA */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="pt-6">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-purple-600 mb-2">
                      ${template.price}
                    </div>
                    <p className="text-gray-600">One-time purchase</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>Complete {template.duration}-day itinerary</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>Interactive map with all locations</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>Customizable to your preferences</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>Lifetime access & updates</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>30-day money-back guarantee</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full mb-3" 
                    size="lg"
                    onClick={() => window.location.href = `/templates/${template.slug}`}
                  >
                    Get This Template
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.location.href = '/marketplace'}
                  >
                    Browse More Templates
                  </Button>

                  <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-900 text-center">
                      <strong>🔥 Limited Time</strong><br />
                      Join {template.salesCount}+ happy travelers
                    </p>
                  </div>

                  {/* Creator Info */}
                  {template.creator && (
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm text-gray-600 text-center">
                        Created by
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
                        <span className="font-medium">
                          {template.creator.displayName || template.creator.username}
                        </span>
                        {template.creator.verified && (
                          <Badge variant="outline" className="text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Your Adventure?
            </h2>
            <p className="text-xl text-purple-100 mb-8">
              Skip the planning, jump straight to exploring
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-white text-purple-600 hover:bg-gray-100"
              onClick={() => window.location.href = `/templates/${template.slug}`}
            >
              Get This Template Now
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}