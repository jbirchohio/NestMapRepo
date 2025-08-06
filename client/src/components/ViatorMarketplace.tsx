import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { 
  MapPin,
  Clock,
  DollarSign,
  Star,
  Users,
  Calendar,
  ChevronRight,
  Filter,
  Search,
  Heart,
  Share2,
  TrendingUp,
  Award,
  Sparkles
} from 'lucide-react';

interface ViatorExperience {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  duration: string;
  imageUrl: string;
  category: string;
  highlights: string[];
  included: string[];
  meetingPoint: string;
  maxGroupSize: number;
  instantConfirmation: boolean;
  freeCancellation: boolean;
  mobileTicket: boolean;
  commission: number;
  bookingUrl: string;
}

interface ViatorMarketplaceProps {
  destination: string;
  dates: { start: Date; end: Date };
  onBookExperience?: (experience: ViatorExperience) => void;
}

const CATEGORIES = [
  { id: 'all', name: 'All Experiences', icon: Sparkles },
  { id: 'tours', name: 'Tours & Sightseeing', icon: MapPin },
  { id: 'activities', name: 'Activities & Adventures', icon: TrendingUp },
  { id: 'food', name: 'Food & Drink', icon: DollarSign },
  { id: 'culture', name: 'Culture & History', icon: Award },
  { id: 'nature', name: 'Nature & Wildlife', icon: MapPin },
];

export default function ViatorMarketplace({ destination, dates, onBookExperience }: ViatorMarketplaceProps) {
  const [experiences, setExperiences] = useState<ViatorExperience[]>([]);
  const [filteredExperiences, setFilteredExperiences] = useState<ViatorExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'popular' | 'price' | 'rating'>('popular');

  useEffect(() => {
    fetchExperiences();
  }, [destination]);

  useEffect(() => {
    filterAndSortExperiences();
  }, [experiences, selectedCategory, searchTerm, priceRange, sortBy]);

  const fetchExperiences = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/viator/search', {
        activityName: destination, // API expects activityName, not destination
        latitude: 0, // TODO: Get actual coordinates for destination
        longitude: 0,
        startDate: dates.start.toISOString(),
        endDate: dates.end.toISOString(),
      });
      
      // Transform and enrich the data
      const enrichedExperiences = response.activities.map((activity: any) => ({
        ...activity,
        commission: calculateCommission(activity.price),
        bookingUrl: generateAffiliateUrl(activity.id)
      }));
      
      setExperiences(enrichedExperiences);
    } catch (error) {
      console.error('Failed to fetch Viator experiences:', error);
      // Use mock data as fallback
      setExperiences(getMockExperiences());
    } finally {
      setLoading(false);
    }
  };

  const calculateCommission = (price: number): number => {
    // Viator typically offers 8-12% commission
    return price * 0.10;
  };

  const generateAffiliateUrl = (experienceId: string): string => {
    // This would be your actual Viator affiliate URL structure
    return `https://www.viator.com/tours/${experienceId}?partner=${process.env.REACT_APP_VIATOR_PARTNER_ID || 'remvana'}`;
  };

  const filterAndSortExperiences = () => {
    let filtered = [...experiences];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(exp => exp.category === selectedCategory);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(exp => 
        exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Price filter
    filtered = filtered.filter(exp => 
      exp.price >= priceRange[0] && exp.price <= priceRange[1]
    );

    // Sort
    switch (sortBy) {
      case 'price':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
      default:
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    setFilteredExperiences(filtered);
  };

  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  const handleBooking = async (experience: ViatorExperience) => {
    // Track the booking intent
    await apiRequest('POST', '/api/analytics/track', {
      event: 'viator_booking_clicked',
      data: {
        experienceId: experience.id,
        price: experience.price,
        expectedCommission: experience.commission
      }
    });

    // Open in new tab with affiliate link
    window.open(experience.bookingUrl, '_blank');

    // Callback to parent component
    if (onBookExperience) {
      onBookExperience(experience);
    }
  };

  const getMockExperiences = (): ViatorExperience[] => {
    return [
      {
        id: '1',
        title: 'Skip-the-Line: Guided Tour with Local Expert',
        description: 'Explore the best attractions with a knowledgeable local guide. Skip long queues and discover hidden gems.',
        price: 89,
        currency: 'USD',
        rating: 4.8,
        reviewCount: 2341,
        duration: '3 hours',
        imageUrl: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=400',
        category: 'tours',
        highlights: ['Skip-the-line access', 'Expert local guide', 'Small group tour'],
        included: ['Entry tickets', 'Professional guide', 'Hotel pickup'],
        meetingPoint: 'City center meeting point',
        maxGroupSize: 15,
        instantConfirmation: true,
        freeCancellation: true,
        mobileTicket: true,
        commission: 8.9,
        bookingUrl: '#'
      },
      {
        id: '2',
        title: 'Sunset Food & Wine Walking Tour',
        description: 'Taste your way through the city with stops at top-rated restaurants and wine bars.',
        price: 125,
        currency: 'USD',
        rating: 4.9,
        reviewCount: 1856,
        duration: '4 hours',
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
        category: 'food',
        highlights: ['6 food stops', 'Wine pairings', 'Local favorites'],
        included: ['All food and drinks', 'Expert foodie guide'],
        meetingPoint: 'Historic district',
        maxGroupSize: 12,
        instantConfirmation: true,
        freeCancellation: true,
        mobileTicket: true,
        commission: 12.5,
        bookingUrl: '#'
      }
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4">Discover Experiences in {destination}</h2>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search experiences..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="popular">Most Popular</option>
            <option value="price">Lowest Price</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          );
        })}
      </div>

      {/* Results count and commission notice */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredExperiences.length} experiences available
        </p>
        <div className="flex items-center gap-2 text-sm text-green-600">
          <TrendingUp className="h-4 w-4" />
          <span>Earn up to 12% commission on bookings</span>
        </div>
      </div>

      {/* Experience cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExperiences.map((experience) => (
          <motion.div
            key={experience.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            <div className="relative h-48">
              <img
                src={experience.imageUrl}
                alt={experience.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => toggleFavorite(experience.id)}
                className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
              >
                <Heart
                  className={`h-5 w-5 ${
                    favorites.has(experience.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'
                  }`}
                />
              </button>
              
              {experience.instantConfirmation && (
                <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  Instant Confirmation
                </div>
              )}
            </div>

            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{experience.title}</h3>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span>{experience.rating}</span>
                  <span>({experience.reviewCount})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{experience.duration}</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {experience.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                {experience.freeCancellation && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Free Cancellation
                  </span>
                )}
                {experience.mobileTicket && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Mobile Ticket
                  </span>
                )}
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  +${experience.commission.toFixed(2)} commission
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div>
                  <span className="text-2xl font-bold">${experience.price}</span>
                  <span className="text-sm text-gray-600 ml-1">per person</span>
                </div>
                
                <Button
                  onClick={() => handleBooking(experience)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                >
                  Book Now
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {filteredExperiences.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No experiences found</h3>
          <p className="text-gray-600">Try adjusting your filters or search term</p>
        </div>
      )}
    </div>
  );
}