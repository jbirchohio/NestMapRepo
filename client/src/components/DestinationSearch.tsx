import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, TrendingUp, Globe, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  slug: string;
  name: string;
  country: string;
  type: string;
  inDatabase: boolean;
  description?: string;
}

interface DestinationSearchProps {
  placeholder?: string;
  onSelect?: (destination: SearchResult) => void;
  showTrending?: boolean;
  className?: string;
}

export default function DestinationSearch({ 
  placeholder = "Search any city or destination...",
  onSelect,
  showTrending = true,
  className = ""
}: DestinationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // Trending destinations
  const trendingDestinations = [
    { name: 'Bali', slug: 'bali', country: 'Indonesia' },
    { name: 'Paris', slug: 'paris', country: 'France' },
    { name: 'Tokyo', slug: 'tokyo', country: 'Japan' },
    { name: 'New York', slug: 'new-york', country: 'USA' },
    { name: 'Dubai', slug: 'dubai', country: 'UAE' },
  ];

  // Search destinations
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const searchDestinations = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/destinations/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    searchDestinations();
  }, [debouncedQuery]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelect = (destination: SearchResult) => {
    setQuery('');
    setShowResults(false);
    setSelectedIndex(-1);
    
    if (onSelect) {
      onSelect(destination);
    } else {
      // Navigate to destination page
      setLocation(`/destinations/${destination.slug}`);
    }
  };

  const handleTrendingClick = (destination: typeof trendingDestinations[0]) => {
    handleSelect({
      slug: destination.slug,
      name: destination.name,
      country: destination.country,
      type: 'city',
      inDatabase: false
    });
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className="pl-12 pr-4 py-6 text-lg rounded-full shadow-lg border-2 focus:border-purple-500 transition-colors"
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {showResults && (results.length > 0 || query.length >= 2) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border overflow-hidden"
          >
            <div className="max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <button
                  key={result.slug}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-purple-50 transition-colors text-left ${
                    selectedIndex === index ? 'bg-purple-50' : ''
                  }`}
                >
                  <MapPin className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{result.name}</span>
                      <span className="text-sm text-gray-500">{result.country}</span>
                      {result.inDatabase && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Enhanced
                        </Badge>
                      )}
                    </div>
                    {result.description && (
                      <p className="text-sm text-gray-600 mt-0.5">{result.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {/* Create New Destination */}
            {query.length >= 2 && (
              <button
                onClick={() => handleSelect({
                  slug: query.toLowerCase().replace(/\s+/g, '-'),
                  name: query.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                  country: '',
                  type: 'city',
                  inDatabase: false,
                  description: `Explore ${query}`
                })}
                className="w-full border-t bg-gradient-to-r from-purple-50 to-pink-50 p-3 hover:from-purple-100 hover:to-pink-100 transition-colors"
              >
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900">
                    Explore "{query}" - We'll create a custom guide
                  </p>
                </div>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trending Destinations */}
      {showTrending && !query && !showResults && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Trending destinations</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingDestinations.map((destination) => (
              <Button
                key={destination.slug}
                variant="outline"
                size="sm"
                onClick={() => handleTrendingClick(destination)}
                className="rounded-full hover:bg-purple-50 hover:border-purple-300 transition-colors"
              >
                <Globe className="h-3 w-3 mr-1" />
                {destination.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}