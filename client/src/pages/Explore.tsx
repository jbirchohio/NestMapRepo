import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/JWTAuthContext';
import NewTripModalConsumer from '@/components/NewTripModalConsumer';
import ViatorMarketplace from '@/components/ViatorMarketplace';
import PopularDestinations from '@/components/PopularDestinations';
import AuthModal from '@/components/auth/AuthModal';
import { 
  Compass, Map, Calendar, Users, Brain, Sparkles,
  TrendingUp, Clock, Globe, Star, ChevronRight, Zap,
  Target, Route, Share2, DollarSign
} from 'lucide-react';

// Features that make Remvana special
const features = [
  {
    icon: Brain,
    title: 'AI Trip Planning',
    description: 'Get personalized suggestions and optimize your itinerary with one click',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: Map,
    title: 'Visual Map Planning',
    description: 'See all your activities on an interactive map with routes',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Clock,
    title: 'Smart Timeline',
    description: 'Drag and drop to reorganize your trip in seconds',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: Users,
    title: 'Group Collaboration',
    description: 'Plan together with friends in real-time',
    color: 'from-orange-500 to-red-500'
  }
];

// How it works steps
const steps = [
  {
    number: '1',
    title: 'Create Your Trip',
    description: 'Tell us where and when you\'re going',
    icon: Compass
  },
  {
    number: '2',
    title: 'Add Activities',
    description: 'Browse tours or get AI suggestions',
    icon: Target
  },
  {
    number: '3',
    title: 'Optimize & Book',
    description: 'Perfect your timeline and book experiences',
    icon: Route
  },
  {
    number: '4',
    title: 'Share & Go',
    description: 'Share with friends and enjoy your trip',
    icon: Share2
  }
];

export default function Explore() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('New York');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('signup');

  // Check for auth query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authParam = params.get('auth');
    
    if (authParam === 'login' || authParam === 'signup') {
      setAuthView(authParam as 'login' | 'signup');
      setIsAuthModalOpen(true);
      
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleGetStarted = () => {
    if (user) {
      setIsNewTripModalOpen(true);
    } else {
      setAuthView('signup');
      setIsAuthModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Plan Trips in Minutes, Not Hours
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              AI-powered trip planning that actually saves time. Visual maps, smart suggestions, and one-click booking.
            </p>
            
            <div className="flex gap-4 justify-center mb-12">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8"
              >
                Start Planning Free
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('experiences')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Browse Experiences
              </Button>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                <span>Plan trips faster</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <span>Any destination</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                <span>Share with friends</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Travelers Love Remvana</h2>
            <p className="text-gray-600">Everything you need to plan the perfect trip</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-600">Get from idea to itinerary in 4 simple steps</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="relative mb-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-purple-200 to-pink-200" />
                  )}
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Viator Marketplace Section */}
      <section id="experiences" className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Book Amazing Experiences</h2>
            <p className="text-gray-600 mb-6">Powered by Viator - Instant confirmation on thousands of tours</p>
            
            {/* City Search */}
            <div className="max-w-md mx-auto flex gap-2">
              <input
                type="text"
                placeholder="Search any city..."
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && selectedCity.trim()) {
                    // Force re-render of ViatorMarketplace with new city
                    setSelectedCity(selectedCity.trim());
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Button 
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  // Force re-render by trimming
                  if (selectedCity.trim()) {
                    setSelectedCity(selectedCity.trim());
                  }
                }}
              >
                Search
              </Button>
            </div>
          </div>
          <ViatorMarketplace 
            destination={selectedCity}
            dates={{ start: new Date(), end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }}
          />
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Popular Destinations</h2>
            <p className="text-gray-600">Get inspired for your next adventure</p>
          </div>
          <PopularDestinations />
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Plan Your Next Adventure?</h2>
          <p className="text-gray-600 mb-8">
            Join thousands of travelers who plan smarter, not harder
          </p>
          <Button
            size="lg"
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8"
          >
            Start Planning Free
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* New Trip Modal */}
      <NewTripModalConsumer
        isOpen={isNewTripModalOpen}
        onClose={() => setIsNewTripModalOpen(false)}
        onTripCreated={(trip) => {
          setLocation(`/trip/${trip.id}`);
        }}
      />

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialView={authView}
          redirectPath="/"
        />
      )}
    </div>
  );
}