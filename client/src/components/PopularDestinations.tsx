import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, TrendingUp, Plane } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Destination {
  slug: string;
  name: string;
  country: string;
  image: string;
  description: string;
  activities: number;
  avgPrice: string;
}

export default function PopularDestinations() {
  const { data: destinations, isLoading } = useQuery<{ destinations: Destination[] }>({
    queryKey: ['popular-destinations'],
    queryFn: async () => {
      const response = await fetch('/api/destinations/popular');
      if (!response.ok) throw new Error('Failed to load destinations');
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 h-48 rounded-lg mb-4" />
            <div className="bg-gray-200 h-4 w-3/4 rounded mb-2" />
            <div className="bg-gray-200 h-4 w-1/2 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            <TrendingUp className="w-3 h-3 mr-1" />
            Trending Now
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Popular Destinations
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover amazing places around the world. Book flights and hotels together to save 22% on average.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations?.destinations.map((destination, index) => (
            <motion.div
              key={destination.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/destinations/${destination.slug}`}>
                <Card className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={destination.image}
                      alt={`${destination.name} travel guide`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                          {destination.name}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {destination.country}
                        </p>
                      </div>
                      {destination.templateCount && destination.templateCount > 0 && (
                        <Badge variant="secondary">
                          {destination.templateCount} templates
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {destination.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {destination.activities}+ activities
                      </span>
                      <span className="text-sm font-medium text-purple-600 group-hover:text-purple-700 flex items-center gap-1">
                        Explore
                        <Plane className="w-3 h-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/destinations">
            <a className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium">
              View all destinations
              <span aria-hidden="true">→</span>
            </a>
          </Link>
        </div>
      </div>
    </section>
  );
}