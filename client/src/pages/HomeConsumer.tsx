import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientTrip } from "@/lib/types";
import { format } from "date-fns";
import NewTripModalConsumer from "@/components/NewTripModalConsumer";
import { useAuth } from "@/contexts/JWTAuthContext";
import AuthModal from "@/components/auth/AuthModal";
import { motion } from "framer-motion";
import { Plus, MapPin, Calendar, TrendingUp, Sparkles } from "lucide-react";

export default function HomeConsumer() {
  const [, setLocation] = useLocation();
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("signup");
  
  const { user, userId } = useAuth();
  
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
  const pastTrips = trips.filter(trip => {
    const startDate = new Date(trip.startDate);
    return startDate < new Date();
  });

  const handleCreateNewTrip = () => {
    if (!user) {
      setAuthView("signup");
      setIsAuthModalOpen(true);
      return;
    }
    setIsNewTripModalOpen(true);
  };

  const handleTripCreated = (tripId: number) => {
    setIsNewTripModalOpen(false);
    setLocation(`/trip/${tripId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Hero Section */}
      {!user && (
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Plan trips like you text a friend
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Simple travel planning with smart suggestions and bookable experiences.
                Start your adventure in seconds.
              </p>
              <Button
                onClick={handleCreateNewTrip}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white text-lg px-8 py-6"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Start Planning Free
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* User Dashboard */}
      {user && (
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user.username || 'Traveler'}!
              </h1>
              <p className="text-gray-600 mt-1">Ready for your next adventure?</p>
            </div>
            <Button
              onClick={handleCreateNewTrip}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
            >
              <Plus className="mr-2 h-5 w-5" />
              Plan New Trip
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="rounded-full bg-purple-100 p-3 mr-4">
                  <MapPin className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Trips</p>
                  <p className="text-2xl font-bold">{trips.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="rounded-full bg-green-100 p-3 mr-4">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold">{upcomingTrips.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="rounded-full bg-purple-100 p-3 mr-4">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Places Visited</p>
                  <p className="text-2xl font-bold">{pastTrips.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trips List */}
          {trips.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No trips yet</h3>
                <p className="text-gray-600 mb-4">Start planning your first adventure!</p>
                <Button onClick={handleCreateNewTrip} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Trip
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {upcomingTrips.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Upcoming Adventures</h2>
                  <div className="grid gap-4">
                    {upcomingTrips.map((trip) => (
                      <motion.div
                        key={trip.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card 
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
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {pastTrips.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Past Trips</h2>
                  <div className="grid gap-4">
                    {pastTrips.map((trip) => (
                      <motion.div
                        key={trip.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card 
                          className="cursor-pointer hover:shadow-lg transition-shadow opacity-75"
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
                                {trip.destination || 'Adventure completed'}
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Features Section for non-logged in users */}
      {!user && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI-Powered Planning</h3>
                <p className="text-gray-600">Get personalized recommendations based on your preferences</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Book Everything</h3>
                <p className="text-gray-600">Hotels, flights, and activities all in one place</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Share Easily</h3>
                <p className="text-gray-600">Collaborate with friends and share your itinerary</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Modals */}
      {isNewTripModalOpen && (
        <NewTripModalConsumer
          onClose={() => setIsNewTripModalOpen(false)}
          onTripCreated={handleTripCreated}
        />
      )}

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