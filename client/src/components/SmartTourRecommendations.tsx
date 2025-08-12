import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  MapPin, Calendar, Clock, Star, Users,
  DollarSign, Sparkles, Heart, Plus,
  ExternalLink, Check, TrendingUp, Sun,
  Mountain, Utensils, Music, Camera,
  Palette, Building, TreePine, Waves
} from 'lucide-react';

interface SmartTourRecommendationsProps {
  tripId: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  latitude?: number;
  longitude?: number;
  onTourAdded?: (tour: any) => void;
}

interface ViatorTour {
  productCode: string;
  productName: string;
  primaryImageURL: string;
  duration: string;
  fromPrice: number;
  currency: string;
  rating: number;
  reviewCount: number;
  cancellationPolicy: string;
  category?: string;
  bookingUrl?: string;
}

const tourCategories = [
  { id: 'popular', name: 'Most Popular', icon: TrendingUp, color: 'purple' },
  { id: 'sightseeing', name: 'Sightseeing', icon: Camera, color: 'blue' },
  { id: 'outdoor', name: 'Outdoor', icon: Mountain, color: 'green' },
  { id: 'food', name: 'Food & Wine', icon: Utensils, color: 'orange' },
  { id: 'culture', name: 'Culture', icon: Building, color: 'pink' },
  { id: 'water', name: 'Water Activities', icon: Waves, color: 'cyan' },
];

export default function SmartTourRecommendations({
  tripId,
  destination,
  startDate,
  endDate,
  latitude,
  longitude,
  onTourAdded
}: SmartTourRecommendationsProps) {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState('popular');
  const [tours, setTours] = useState<ViatorTour[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedTours, setSavedTours] = useState<Set<string>>(new Set());
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);

  useEffect(() => {
    fetchTours(activeCategory);
    fetchAIRecommendations();
  }, [destination, activeCategory]);

  const fetchAIRecommendations = async () => {
    try {
      const response = await fetch('/api/ai/recommend-tours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          destination,
          startDate,
          endDate,
          interests: [] // Could be passed from user preferences
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiRecommendations(data.recommendations || []);
      }
    } catch (error) {
      }
  };

  const fetchTours = async (category: string) => {
    setIsLoading(true);

    try {
      // Map category to search query
      const categoryQueries: Record<string, string> = {
        popular: 'top attractions must see',
        sightseeing: 'city tour sightseeing',
        outdoor: 'outdoor adventure hiking',
        food: 'food tour wine tasting restaurant',
        culture: 'museum art culture history',
        water: 'beach water sports cruise'
      };

      const response = await fetch('/api/viator/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          latitude: latitude || 0,
          longitude: longitude || 0,
          activityName: categoryQueries[category] || category,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Add category and booking URL to tours
        const enrichedTours = (data.activities || []).map((tour: ViatorTour) => ({
          ...tour,
          category,
          bookingUrl: `https://www.viator.com/tours/${tour.productCode}`
        }));

        setTours(enrichedTours);
      } else {
        // Fallback to mock data if API fails
        setTours(getMockTours(category));
      }
    } catch (error) {
      // Use mock data as fallback
      setTours(getMockTours(category));
    } finally {
      setIsLoading(false);
    }
  };

  const getMockTours = (category: string): ViatorTour[] => {
    const baseTours = [
      {
        productCode: `mock-${category}-1`,
        productName: `${destination} ${category === 'popular' ? 'Highlights Tour' : category === 'food' ? 'Food Walking Tour' : 'Adventure Tour'}`,
        primaryImageURL: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400',
        duration: '3 hours',
        fromPrice: 75,
        currency: 'USD',
        rating: 4.8,
        reviewCount: 523,
        cancellationPolicy: 'Free cancellation',
        category,
        bookingUrl: '#'
      },
      {
        productCode: `mock-${category}-2`,
        productName: `${category === 'sightseeing' ? 'City Sightseeing Bus' : category === 'outdoor' ? 'Nature Hike' : 'Cultural Experience'}`,
        primaryImageURL: 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=400',
        duration: '4 hours',
        fromPrice: 95,
        currency: 'USD',
        rating: 4.6,
        reviewCount: 342,
        cancellationPolicy: 'Free cancellation up to 24 hours',
        category,
        bookingUrl: '#'
      },
      {
        productCode: `mock-${category}-3`,
        productName: `${destination} ${category === 'water' ? 'Sunset Cruise' : category === 'culture' ? 'Museum Pass' : 'Small Group Tour'}`,
        primaryImageURL: 'https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?w=400',
        duration: '2.5 hours',
        fromPrice: 55,
        currency: 'USD',
        rating: 4.9,
        reviewCount: 892,
        cancellationPolicy: 'Free cancellation',
        category,
        bookingUrl: '#'
      }
    ];

    return baseTours;
  };

  const handleAddTour = async (tour: ViatorTour) => {
    try {
      // Add tour as an activity to the trip
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tripId,
          title: tour.productName,
          description: `Viator Tour - ${tour.duration}`,
          date: startDate,
          time: '10:00',
          duration: tour.duration,
          price: tour.fromPrice,
          bookingUrl: tour.bookingUrl,
          type: 'tour',
          bookingReference: tour.productCode
        })
      });

      if (response.ok) {
        setSavedTours(prev => new Set(prev).add(tour.productCode));
        toast({
          title: "Tour Added!",
          description: `${tour.productName} has been added to your itinerary`,
        });

        if (onTourAdded) {
          onTourAdded(tour);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add tour to trip",
        variant: "destructive"
      });
    }
  };

  const handleBookTour = (tour: ViatorTour) => {
    // Generate affiliate link
    fetch('/api/viator/affiliate-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ productCode: tour.productCode })
    })
    .then(res => res.json())
    .then(data => {
      window.open(data.affiliateLink, '_blank');
    })
    .catch(error => {
      window.open(tour.bookingUrl, '_blank');
    });

    toast({
      title: "Opening Viator",
      description: "Complete your booking on Viator's secure site",
    });
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = tourCategories.find(c => c.id === categoryId);
    return category ? category.icon : MapPin;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span>Smart Tour Recommendations</span>
            </div>
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
              Powered by Viator
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aiRecommendations.length > 0 && (
            <div className="p-4 bg-white/80 rounded-lg">
              <p className="text-sm font-medium text-purple-700 mb-2">AI Suggests:</p>
              <ul className="space-y-1">
                {aiRecommendations.slice(0, 3).map((rec, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <Sparkles className="w-3 h-3 text-purple-500 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tourCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category.id)}
              className={`flex-shrink-0 ${
                activeCategory === category.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-0 text-white'
                  : ''
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {category.name}
            </Button>
          );
        })}
      </div>

      {/* Tours Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200" />
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {tours.map((tour, index) => {
              const CategoryIcon = getCategoryIcon(tour.category || activeCategory);
              return (
                <motion.div
                  key={tour.productCode}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all">
                    <div className="relative h-48">
                      <img
                        src={tour.primaryImageURL || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400'}
                        alt={tour.productName}
                        className="w-full h-full object-cover"
                      />
                      {tour.rating > 4.5 && (
                        <Badge className="absolute top-2 left-2 bg-orange-500 text-white">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Top Rated
                        </Badge>
                      )}
                      <Badge className="absolute top-2 right-2 bg-black/50 text-white">
                        <CategoryIcon className="w-3 h-3 mr-1" />
                        {activeCategory}
                      </Badge>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold line-clamp-2">{tour.productName}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {tour.duration}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            {tour.rating} ({tour.reviewCount})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-purple-600">
                            ${tour.fromPrice}
                          </p>
                          <p className="text-xs text-gray-500">per person</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {tour.cancellationPolicy}
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleBookTour(tour)}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                          size="sm"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Book Now
                        </Button>
                        <Button
                          onClick={() => handleAddTour(tour)}
                          variant="outline"
                          size="sm"
                          disabled={savedTours.has(tour.productCode)}
                        >
                          {savedTours.has(tour.productCode) ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* No tours message */}
      {!isLoading && tours.length === 0 && (
        <Card className="p-8 text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tours found</h3>
          <p className="text-gray-600">
            Try selecting a different category or adjusting your search criteria
          </p>
        </Card>
      )}
    </div>
  );
}