import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, SlidersHorizontal, TrendingUp, Clock, DollarSign, MapPin, Star, Users, Grid, List, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ClientTemplate } from '@/lib/types';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

const POPULAR_DESTINATIONS = [
  'Paris', 'Tokyo', 'New York', 'London', 'Rome',
  'Barcelona', 'Bali', 'Dubai', 'Amsterdam', 'Sydney'
];

const POPULAR_TAGS = [
  'romantic', 'budget', 'luxury', 'adventure', 'foodie',
  'family', 'solo', 'beach', 'city-break', 'road-trip'
];

export default function TemplateMarketplace() {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [duration, setDuration] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', search, selectedTag, selectedDestination, priceRange, duration, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedTag) params.append('tag', selectedTag);
      if (selectedDestination) params.append('destination', selectedDestination);
      params.append('minPrice', priceRange[0].toString());
      params.append('maxPrice', priceRange[1].toString());
      if (duration) params.append('duration', duration.toString());
      params.append('sort', sortBy);

      const response = await fetch(`/api/templates?${params}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      return data.templates as ClientTemplate[];
    },
  });

  const clearFilters = () => {
    setSearch('');
    setSelectedTag(null);
    setSelectedDestination(null);
    setPriceRange([0, 100]);
    setDuration(null);
    setSortBy('popular');
  };

  const hasFilters = search || selectedTag || selectedDestination ||
    priceRange[0] > 0 || priceRange[1] < 100 || duration;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {templates?.length ? 'Discover Perfect Trip Templates' : 'Be the First Creator'}
            </h1>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              {templates?.length
                ? 'Skip the planning, jump straight to exploring. Hand-crafted itineraries by fellow travelers.'
                : 'Join our new creator marketplace. Share your travel experiences and earn from your adventures.'}
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8 max-w-2xl mx-auto"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search destinations, themes, or activities..."
                className="pl-12 pr-4 py-6 text-lg bg-white text-gray-900 rounded-xl shadow-lg"
              />
            </div>
          </motion.div>

          {/* Quick Stats - Real Numbers */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 grid grid-cols-3 gap-4 max-w-xl mx-auto"
          >
            <div className="text-center">
              <div className="text-2xl font-bold">{templates?.length || 0}</div>
              <div className="text-sm text-purple-100">Templates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">New</div>
              <div className="text-sm text-purple-100">Platform</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">Join</div>
              <div className="text-sm text-purple-100">Early</div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            {/* Mobile Filter Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                  {hasFilters && (
                    <Badge className="ml-2" variant="secondary">
                      {[search, selectedTag, selectedDestination, duration].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <FilterContent
                  selectedTag={selectedTag}
                  setSelectedTag={setSelectedTag}
                  selectedDestination={selectedDestination}
                  setSelectedDestination={setSelectedDestination}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  duration={duration}
                  setDuration={setDuration}
                />
              </SheetContent>
            </Sheet>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-200 bg-white">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters}>
              Clear all filters
            </Button>
          )}
        </div>

        {/* Active Filters */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {search && (
              <Badge variant="secondary" className="px-3 py-1">
                Search: {search}
                <button
                  onClick={() => setSearch('')}
                  className="ml-2 hover:text-red-600"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedTag && (
              <Badge variant="secondary" className="px-3 py-1">
                Tag: {selectedTag}
                <button
                  onClick={() => setSelectedTag(null)}
                  className="ml-2 hover:text-red-600"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedDestination && (
              <Badge variant="secondary" className="px-3 py-1">
                Destination: {selectedDestination}
                <button
                  onClick={() => setSelectedDestination(null)}
                  className="ml-2 hover:text-red-600"
                >
                  ×
                </button>
              </Badge>
            )}
            {duration && (
              <Badge variant="secondary" className="px-3 py-1">
                Duration: {duration} days
                <button
                  onClick={() => setDuration(null)}
                  className="ml-2 hover:text-red-600"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <FilterContent
                  selectedTag={selectedTag}
                  setSelectedTag={setSelectedTag}
                  selectedDestination={selectedDestination}
                  setSelectedDestination={setSelectedDestination}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  duration={duration}
                  setDuration={setDuration}
                />
              </CardContent>
            </Card>
          </aside>

          {/* Templates Grid/List */}
          <div className="flex-1">
            {isLoading ? (
              <div className={viewMode === 'grid' ?
                'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' :
                'space-y-4'
              }>
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="pt-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : templates && templates.length > 0 ? (
              <div className={viewMode === 'grid' ?
                'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' :
                'space-y-4'
              }>
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                {hasFilters ? (
                  <>
                    <p className="text-gray-500 mb-4">No templates found matching your criteria</p>
                    <Button onClick={clearFilters}>Clear filters</Button>
                  </>
                ) : (
                  <div className="max-w-md mx-auto">
                    <div className="mb-6">
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <TrendingUp className="h-12 w-12 text-purple-600" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Be Among the First</h3>
                      <p className="text-gray-600 mb-6">
                        We're a brand new marketplace. Create the first travel templates and become a founding creator with early-mover advantages.
                      </p>
                    </div>
                    <div className="space-y-4 text-left mb-6">
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-semibold">70% Revenue Share</p>
                          <p className="text-sm text-gray-600">Keep most of what you earn</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-semibold">Featured Creator Status</p>
                          <p className="text-sm text-gray-600">Early creators get special recognition</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-semibold">Shape the Platform</p>
                          <p className="text-sm text-gray-600">Your feedback drives our features</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 justify-center">
                      <Button
                        size="lg"
                        onClick={() => window.location.href = '/trips'}
                      >
                        Create Your First Template
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => window.location.href = '/auth/register'}
                      >
                        Sign Up
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Template Card Component
function TemplateCard({
  template,
  viewMode
}: {
  template: ClientTemplate;
  viewMode: 'grid' | 'list';
}) {
  const isGrid = viewMode === 'grid';

  return (
    <Link href={`/templates/${template.slug}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card className={`overflow-hidden hover:shadow-xl transition-shadow cursor-pointer ${
          !isGrid ? 'flex' : ''
        }`}>
          {/* Cover Image */}
          <div className={`relative ${isGrid ? 'h-48' : 'w-48 h-full'} bg-gradient-to-br from-purple-400 to-pink-400`}>
            {template.coverImage ? (
              <img
                src={template.coverImage}
                alt={template.title}
                className="w-full h-full object-cover"
                loading="eager"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  // Retry loading the image once after a short delay
                  if (!img.dataset.retried) {
                    img.dataset.retried = 'true';
                    setTimeout(() => {
                      img.src = img.src + '?t=' + Date.now();
                    }, 100);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <MapPin className="h-12 w-12" />
              </div>
            )}
            {template.featured && (
              <Badge className="absolute top-2 right-2 bg-yellow-500">
                Featured
              </Badge>
            )}
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary" className="bg-white/90">
                {template.duration} days
              </Badge>
            </div>
          </div>

          {/* Content */}
          <CardContent className={`${isGrid ? 'pt-4' : 'flex-1 p-4'}`}>
            <h3 className="font-semibold text-lg mb-1 line-clamp-1">
              {template.title}
            </h3>

            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {template.description}
            </p>

            {/* Destinations */}
            <div className="flex flex-wrap gap-1 mb-3">
              {template.destinations.slice(0, 3).map((dest) => (
                <Badge key={dest} variant="outline" className="text-xs">
                  {dest}
                </Badge>
              ))}
              {template.destinations.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.destinations.length - 3}
                </Badge>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                {template.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {template.rating}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {template.salesCount}
                </span>
              </div>
              <div className="font-bold text-lg text-purple-600">
                ${template.price}
              </div>
            </div>

            {/* Creator */}
            {template.creator && (
              <div className="mt-3 pt-3 border-t flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
                <span className="text-sm text-gray-600">
                  by {template.creator.displayName || template.creator.username}
                </span>
                {template.creator.verified && (
                  <Badge variant="outline" className="text-xs">
                    Verified
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

// Filter Content Component
function FilterContent({
  selectedTag,
  setSelectedTag,
  selectedDestination,
  setSelectedDestination,
  priceRange,
  setPriceRange,
  duration,
  setDuration,
}: {
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  selectedDestination: string | null;
  setSelectedDestination: (dest: string | null) => void;
  priceRange: number[];
  setPriceRange: (range: number[]) => void;
  duration: number | null;
  setDuration: (duration: number | null) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Popular Destinations */}
      <div>
        <h3 className="font-medium mb-3">Popular Destinations</h3>
        <div className="flex flex-wrap gap-2">
          {POPULAR_DESTINATIONS.map((dest) => (
            <Badge
              key={dest}
              variant={selectedDestination === dest ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedDestination(
                selectedDestination === dest ? null : dest
              )}
            >
              {dest}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <h3 className="font-medium mb-3">Travel Style</h3>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTag(
                selectedTag === tag ? null : tag
              )}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-medium mb-3">
          Price Range: ${priceRange[0]} - ${priceRange[1]}
        </h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          min={0}
          max={100}
          step={5}
          className="mb-2"
        />
      </div>

      {/* Duration */}
      <div>
        <h3 className="font-medium mb-3">Trip Duration</h3>
        <div className="grid grid-cols-2 gap-2">
          {[3, 5, 7, 10, 14, 21].map((days) => (
            <Button
              key={days}
              variant={duration === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDuration(duration === days ? null : days)}
            >
              {days} days
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}