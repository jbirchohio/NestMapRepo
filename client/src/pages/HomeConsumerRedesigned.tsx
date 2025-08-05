import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientTrip } from "@/lib/types";
import { format } from "date-fns";
import NewTripModalConsumer from "@/components/NewTripModalConsumer";
import { useAuth } from "@/contexts/JWTAuthContext";
import AuthModal from "@/components/auth/AuthModal";
import { motion } from "framer-motion";
import { 
  Plus, MapPin, Calendar, TrendingUp, Sparkles, 
  MessageSquare, Compass, Clock, Users, Plane,
  Camera, Heart, Zap, Globe, Star, ArrowRight
} from "lucide-react";

// Quick action cards for new users
const quickActions = [
  {
    id: 'ai-plan',
    icon: Sparkles,
    title: 'AI Trip Planner',
    description: 'Tell me your dream destination and I\'ll plan everything',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    action: 'ai-chat'
  },
  {
    id: 'quick-escape',
    icon: Zap,
    title: 'Weekend Getaway',
    description: 'Find the perfect 2-3 day escape near you',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    action: 'quick-trip'
  },
  {
    id: 'inspire',
    icon: Compass,
    title: 'Get Inspired',
    description: 'Browse trending destinations and experiences',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
    action: 'explore'
  },
  {
    id: 'group',
    icon: Users,
    title: 'Plan with Friends',
    description: 'Create a shared trip and invite your crew',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
    action: 'group-trip'
  }
];

// Trip template cards
const tripTemplates = [
  {
    id: 'beach',
    emoji: '🏖️',
    title: 'Beach Paradise',
    duration: '5-7 days',
    highlights: ['Crystal waters', 'Sunset dinners', 'Water sports'],
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop'
  },
  {
    id: 'city',
    emoji: '🏙️',
    title: 'City Explorer',
    duration: '3-4 days',
    highlights: ['Local cuisine', 'Museums', 'Nightlife'],
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=300&fit=crop'
  },
  {
    id: 'adventure',
    emoji: '🏔️',
    title: 'Mountain Adventure',
    duration: '7-10 days',
    highlights: ['Hiking trails', 'Scenic views', 'Camping'],
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop'
  },
  {
    id: 'culture',
    emoji: '🏛️',
    title: 'Cultural Journey',
    duration: '5-6 days',
    highlights: ['Historic sites', 'Local markets', 'Art galleries'],
    image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=400&h=300&fit=crop'
  }
];

export default function HomeConsumerRedesigned() {
  const [location, setLocation] = useLocation();
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("signup");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  
  const { user, userId } = useAuth();
  
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
  
  // Get user trips
  const tripsQuery = useQuery<ClientTrip[]>({
    queryKey: [API_ENDPOINTS.TRIPS, userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await fetch(`${API_ENDPOINTS.TRIPS}?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trips');
      }
      return response.json();
    },
    enabled: !!userId,
  });
  
  const trips = tripsQuery.data || [];
  const upcomingTrips = trips.filter(trip => {
    const startDate = new Date(trip.startDate);
    return startDate >= new Date();
  });

  const handleAction = (action: string) => {
    if (!user) {
      setAuthView("signup");
      setIsAuthModalOpen(true);
      return;
    }
    
    setSelectedAction(action);
    
    switch(action) {
      case 'ai-chat':
        // Will implement AI chat modal
        setLocation('/trip/new?mode=ai');
        break;
      case 'quick-trip':
        setIsNewTripModalOpen(true);
        break;
      case 'explore':
        setLocation('/explore');
        break;
      case 'group-trip':
        setLocation('/trip/new?mode=group');
        break;
      default:
        setIsNewTripModalOpen(true);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    if (!user) {
      setAuthView("signup");
      setIsAuthModalOpen(true);
      return;
    }
    
    // Will implement template-based trip creation
    setLocation(`/trip/new?template=${templateId}`);
  };

  const handleTripCreated = (trip: any) => {
    setIsNewTripModalOpen(false);
    setLocation(`/trip/${trip.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Landing Page Hero - Only show for non-logged in users */}
      {!user && (
        <section className="relative overflow-hidden py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <h1 className="text-6xl font-bold text-gray-900 mb-6">
                Your next adventure<br />starts here
              </h1>
              <p className="text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
                AI-powered travel planning that makes organizing your perfect trip as easy as texting a friend
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => {
                    setAuthView('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white text-lg px-8 py-6"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Planning Free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    setAuthView('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="text-lg px-8 py-6"
                >
                  Sign In
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Logged-in User Dashboard Header */}
      {user && (
        <section className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-center"
            >
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {user.username}! 👋
                </h1>
                <p className="text-gray-600 mt-1">
                  {upcomingTrips.length > 0 
                    ? `You have ${upcomingTrips.length} upcoming ${upcomingTrips.length === 1 ? 'trip' : 'trips'}`
                    : 'Ready to plan your next adventure?'}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setIsNewTripModalOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
              >
                <Plus className="mr-2 h-5 w-5" />
                New Trip
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">

          {/* Quick Action Title */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {user ? 'What would you like to do?' : 'Start your journey'}
            </h2>
            <p className="text-gray-600">
              {user ? 'Choose how you want to plan your next trip' : 'Pick your preferred way to start planning'}
            </p>
          </motion.div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 overflow-hidden"
                  onClick={() => handleAction(action.action)}
                >
                  <div className={`h-2 bg-gradient-to-r ${action.color}`} />
                  <CardHeader className="pb-4">
                    <div className={`w-12 h-12 ${action.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                      <span className="text-sm font-medium">Get started</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Trip Templates Section */}
          <div className="mb-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center mb-8"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Popular trip ideas
              </h2>
              <p className="text-gray-600">
                Start with a template and customize it your way
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tripTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <Card 
                    className="group cursor-pointer overflow-hidden border-0 shadow-md hover:shadow-xl transition-all"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={template.image} 
                        alt={template.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute top-4 left-4 text-3xl">{template.emoji}</div>
                      <div className="absolute bottom-4 left-4 text-white">
                        <h3 className="font-bold text-lg">{template.title}</h3>
                        <p className="text-sm opacity-90">{template.duration}</p>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {template.highlights.map((highlight, i) => (
                          <span 
                            key={i}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Upcoming Trips (for logged-in users) */}
          {user && upcomingTrips.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your upcoming adventures</h2>
              <div className="grid gap-4">
                {upcomingTrips.slice(0, 3).map((trip) => (
                  <Card 
                    key={trip.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setLocation(`/trip/${trip.id}`)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{trip.title}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-4 w-4 mr-1" />
                          {trip.destination || 'Planning in progress'}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              
              {trips.length > 3 && (
                <div className="text-center mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation('/trips')}
                  >
                    View all trips ({trips.length})
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center py-12 border-t"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-3xl font-bold text-purple-600">1M+</div>
                <p className="text-gray-600 text-sm">Trips planned</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">4.9</div>
                <div className="flex justify-center mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm">User rating</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">50+</div>
                <p className="text-gray-600 text-sm">Countries</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">24/7</div>
                <p className="text-gray-600 text-sm">AI assistance</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Modals */}
      <NewTripModalConsumer
        isOpen={isNewTripModalOpen}
        onClose={() => setIsNewTripModalOpen(false)}
        onTripCreated={handleTripCreated}
      />

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