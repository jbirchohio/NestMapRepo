import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, Globe, Users, Calendar, TrendingUp,
  Plane, Hotel, Camera, Utensils, Mountain, Building2, Sparkles
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import DestinationSearch from '@/components/DestinationSearch';

interface Destination {
  slug: string;
  name: string;
  country: string;
  image: string;
  description: string;
  activities: number;
  templateCount?: number;
  featured?: boolean;
}

export default function Destinations() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Fetch popular destinations
  const { data: popularData, isLoading } = useQuery({
    queryKey: ['destinations', 'popular'],
    queryFn: async () => {
      const response = await fetch('/api/destinations/popular');
      if (!response.ok) throw new Error('Failed to load destinations');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const destinations = popularData?.destinations || [];

  // Filter destinations based on region only (search is handled by component)
  const filteredDestinations = destinations.filter((dest: Destination) => {
    const matchesRegion = !selectedRegion || getRegion(dest.country) === selectedRegion;
    return matchesRegion;
  });

  const regions = [
    { id: 'north-america', name: 'North America', icon: Globe },
    { id: 'europe', name: 'Europe', icon: Building2 },
    { id: 'asia', name: 'Asia', icon: Mountain },
    { id: 'other', name: 'Other', icon: Plane }
  ];

  function getRegion(country: string): string {
    const northAmerica = ['USA', 'Canada', 'Mexico'];
    const europe = ['France', 'UK', 'Spain', 'Italy', 'Germany'];
    const asia = ['Japan', 'Thailand', 'Singapore', 'China', 'India'];
    
    if (northAmerica.includes(country)) return 'north-america';
    if (europe.includes(country)) return 'europe';
    if (asia.includes(country)) return 'asia';
    return 'other';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-20">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <TrendingUp className="w-3 h-3 mr-1" />
              Explore the World
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
              Popular Destinations
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Discover amazing places around the world. From bustling cities to serene beaches, 
              find your perfect destination and start planning your next adventure.
            </p>

            {/* Enhanced Search Bar */}
            <div className="max-w-2xl mx-auto">
              <DestinationSearch 
                placeholder="Search any city or destination worldwide..."
                showTrending={true}
                onSelect={(destination) => {
                  setLocation(`/destinations/${destination.slug}`);
                }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Region Filters */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              variant={selectedRegion === null ? 'default' : 'outline'}
              onClick={() => setSelectedRegion(null)}
              className="rounded-full"
            >
              All Regions
            </Button>
            {regions.map(region => (
              <Button
                key={region.id}
                variant={selectedRegion === region.id ? 'default' : 'outline'}
                onClick={() => setSelectedRegion(region.id)}
                className="rounded-full"
              >
                <region.icon className="w-4 h-4 mr-2" />
                {region.name}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-48 bg-gray-200 animate-pulse" />
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDestinations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDestinations.map((destination: Destination) => (
                <motion.div
                  key={destination.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link href={`/destinations/${destination.slug}`}>
                    <Card className="overflow-hidden cursor-pointer hover:shadow-xl transition-shadow h-full">
                      <div className="relative h-48">
                        <img
                          src={destination.image}
                          alt={destination.name}
                          className="w-full h-full object-cover"
                        />
                        {destination.featured && (
                          <Badge className="absolute top-4 right-4 bg-yellow-500 text-white">
                            Featured
                          </Badge>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-4 left-4 text-white">
                          <h3 className="text-2xl font-bold">{destination.name}</h3>
                          <p className="text-sm opacity-90">{destination.country}</p>
                        </div>
                      </div>
                      <CardContent className="p-6">
                        <p className="text-gray-600 mb-4">{destination.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-gray-500">
                            <Camera className="w-4 h-4" />
                            <span>{destination.activities} activities</span>
                          </div>
                          {destination.templateCount && destination.templateCount > 0 && (
                            <Badge variant="secondary">
                              {destination.templateCount} templates
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No destinations found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Can't find your destination?
          </h2>
          <p className="text-xl opacity-90 mb-8">
            We're constantly adding new destinations. Start planning your trip with our AI Trip Generator!
          </p>
          <Link href="/ai-trip-generator">
            <Button size="lg" variant="secondary" className="rounded-full">
              <Plane className="w-5 h-5 mr-2" />
              Generate Custom Trip
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}