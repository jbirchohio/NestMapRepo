import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientTrip } from "@/lib/types";
import { format } from "date-fns";
import NewTripModal from "@/components/NewTripModal";
import SwipeableTrip from "@/components/SwipeableTrip";
import RenameTripDialog from "@/components/RenameTripDialog";
import TripTemplates from "@/components/TripTemplates";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import RoleBasedRedirect from "@/components/RoleBasedRedirect";
import { PrimaryButton } from "@/components/ui/primary-button";
import { AnimatedCard } from "@/components/ui/animated-card";
import { motion } from "framer-motion";
import { UserRound, LogOut, BarChart3, CheckCircle, Clock, Plus, Users, Plane, Brain, Sparkles } from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [tripToRename, setTripToRename] = useState<ClientTrip | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  
  const { user, userId, roleType, authReady, signOut } = useAuth();
  const queryClient = useQueryClient();
  
  // Redirect authenticated users based on their role
  useEffect(() => {
    if (!authReady || !user) return;
    
    // Use RoleBasedRedirect component for routing logic
    // This component handles superadmin detection and proper routing
  }, [authReady, user]);
  
  // Get user ID from authentication or use guest mode
  const effectiveUserId = userId ?? -1; // Use database userId or -1 for guest mode
  const isGuestMode = effectiveUserId === -1;

  // Guest trip storage
  const getGuestTrips = () => {
    try {
      const stored = localStorage.getItem('guestTrips');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Fetch trips based on authentication status
  const tripsQuery = useQuery<ClientTrip[]>({
    queryKey: [API_ENDPOINTS.TRIPS, effectiveUserId],
    queryFn: async () => {
      if (isGuestMode) {
        // Return guest trips for unauthenticated users
        return getGuestTrips();
      }

      const response = await fetch(`${API_ENDPOINTS.TRIPS}?userId=${effectiveUserId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trips');
      }
      return response.json();
    },
    enabled: true, // Always enabled for both guest and authenticated users
  });
  
  const trips = tripsQuery.data;
  
  const handleCreateNewTrip = () => {
    // Guest mode limitations for monetization
    if (isGuestMode) {
      const guestTrips = getGuestTrips();
      if (guestTrips.length >= 2) {
        // Limit guests to 2 trips max
        setAuthView("signup");
        setIsAuthModalOpen(true);
        return;
      }
    }
    setIsNewTripModalOpen(true);
  };
  
  const handleTripCreated = (tripId: number) => {
    setIsNewTripModalOpen(false);
    setLocation(`/trip/${tripId}`);
  };
  
  const handleNavigateToTrip = (tripId: number) => {
    setLocation(`/trip/${tripId}`);
  };
  
  const handleOpenRenameDialog = (trip: ClientTrip) => {
    setTripToRename(trip);
    setIsRenameModalOpen(true);
  };
  
  const handleCloseRenameDialog = () => {
    setIsRenameModalOpen(false);
    setTripToRename(null);
  };
  
  const handleSignInClick = () => {
    setAuthView("login");
    setIsAuthModalOpen(true);
  };
  
  const handleSignUpClick = () => {
    setAuthView("signup");
    setIsAuthModalOpen(true);
  };
  
  const handleSignOut = async () => {
    await signOut();
    queryClient.invalidateQueries({
      queryKey: [API_ENDPOINTS.TRIPS],
    });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-electric-50/30 to-electric-100/50 dark:from-dark-900 dark:via-electric-900/10 dark:to-electric-800/20">
      <NewTripModal 
        isOpen={isNewTripModalOpen} 
        onClose={() => setIsNewTripModalOpen(false)} 
        onSuccess={handleTripCreated}
        userId={effectiveUserId}
        isGuestMode={isGuestMode}
      />
      
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultView={authView}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          queryClient.invalidateQueries({
            queryKey: [API_ENDPOINTS.TRIPS],
          });
        }}
      />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-electric-500/20 via-electric-600/10 to-electric-700/20 dark:from-electric-400/10 dark:via-electric-500/5 dark:to-electric-600/10"></div>
        <div className="relative">
          <div className="container mx-auto px-4 py-16 sm:py-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <div className="flex justify-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="h-20 w-20 bg-gradient-to-br from-electric-400 to-electric-600 rounded-2xl flex items-center justify-center shadow-lg shadow-electric-500/25"
                >
                  <Plane className="h-10 w-10 text-white" />
                </motion.div>
              </div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-electric-600 via-electric-500 to-electric-700 bg-clip-text text-transparent mb-6"
              >
                Travel Reimagined
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl sm:text-2xl text-electric-700 dark:text-electric-300 mb-4 max-w-3xl mx-auto"
              >
                The AI-powered corporate travel platform that transforms how teams plan, book, and manage business travel
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-lg text-electric-600/80 dark:text-electric-400/80 mb-12 max-w-2xl mx-auto"
              >
                Seamlessly integrate corporate cards, expense management, and intelligent booking workflows
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                {user ? (
                  <PrimaryButton
                    onClick={handleCreateNewTrip}
                    className="text-lg px-8 py-4"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Start New Trip
                  </PrimaryButton>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <PrimaryButton
                      onClick={handleSignUpClick}
                      className="text-lg px-8 py-4"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Get Started
                    </PrimaryButton>
                    <Button
                      onClick={handleSignInClick}
                      variant="outline"
                      className="text-lg px-8 py-4 border-electric-300 text-electric-700 hover:bg-electric-50 dark:border-electric-600 dark:text-electric-300 dark:hover:bg-electric-900/20"
                    >
                      Sign In
                    </Button>
                  </div>
                )}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
              >
                <AnimatedCard className="p-6 text-center bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-electric-200/50 dark:border-electric-700/50">
                  <Brain className="h-12 w-12 text-electric-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-electric-900 dark:text-electric-100 mb-2">AI-Powered Planning</h3>
                  <p className="text-electric-600 dark:text-electric-400">Intelligent recommendations and automated itinerary generation</p>
                </AnimatedCard>
                
                <AnimatedCard className="p-6 text-center bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-electric-200/50 dark:border-electric-700/50">
                  <Users className="h-12 w-12 text-electric-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-electric-900 dark:text-electric-100 mb-2">Team Collaboration</h3>
                  <p className="text-electric-600 dark:text-electric-400">Real-time collaboration tools for seamless trip coordination</p>
                </AnimatedCard>
                
                <AnimatedCard className="p-6 text-center bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-electric-200/50 dark:border-electric-700/50">
                  <BarChart3 className="h-12 w-12 text-electric-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-electric-900 dark:text-electric-100 mb-2">Enterprise Analytics</h3>
                  <p className="text-electric-600 dark:text-electric-400">Comprehensive reporting and travel spend optimization</p>
                </AnimatedCard>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-8">
        {user && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-electric-900 dark:text-electric-100">Your Trips</h2>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  className="text-electric-600 hover:text-electric-700 hover:bg-electric-50 dark:text-electric-400 dark:hover:text-electric-300 dark:hover:bg-electric-900/20"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLocation('/analytics')}
                  title="Analytics Dashboard"
                  className="text-electric-600 hover:text-electric-700 hover:bg-electric-50 dark:text-electric-400 dark:hover:text-electric-300 dark:hover:bg-electric-900/20"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLocation('/team')}
                  title="Team Management"
                  className="text-electric-600 hover:text-electric-700 hover:bg-electric-50 dark:text-electric-400 dark:hover:text-electric-300 dark:hover:bg-electric-900/20"
                >
                  <UserRound className="h-4 w-4 mr-2" />
                  Team
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLocation('/billing')}
                  title="Billing & Subscription"
                  className="text-electric-600 hover:text-electric-700 hover:bg-electric-50 dark:text-electric-400 dark:hover:text-electric-300 dark:hover:bg-electric-900/20"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Billing
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Trip Content Section */}
        {tripsQuery.isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-electric-500 border-t-transparent rounded-full" />
          </div>
        ) : trips && trips.length > 0 ? (
          <div className="space-y-8">
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-electric-50/50 dark:bg-electric-900/20">
                <TabsTrigger value="active" className="data-[state=active]:bg-electric-500 data-[state=active]:text-white">
                  Active ({trips.filter(trip => trip.status === "Active").length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-electric-500 data-[state=active]:text-white">
                  Completed ({trips.filter(trip => trip.status === "Completed").length})
                </TabsTrigger>
                <TabsTrigger value="all" className="data-[state=active]:bg-electric-500 data-[state=active]:text-white">
                  All ({trips.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="active" className="space-y-4">
                {trips
                  .filter(trip => trip.status === "Active")
                  .map((trip) => (
                    <SwipeableTrip
                      key={trip.id}
                      trip={trip}
                      onNavigate={handleNavigateToTrip}
                      onRename={handleOpenRenameDialog}
                    />
                  ))}
              </TabsContent>
              
              <TabsContent value="completed" className="space-y-4">
                {trips
                  .filter(trip => trip.status === "Completed")
                  .map((trip) => (
                    <SwipeableTrip
                      key={trip.id}
                      trip={trip}
                      onNavigate={handleNavigateToTrip}
                      onRename={handleOpenRenameDialog}
                    />
                  ))}
              </TabsContent>
              
              <TabsContent value="all" className="space-y-4">
                {trips.map((trip) => (
                  <SwipeableTrip
                    key={trip.id}
                    trip={trip}
                    onNavigate={handleNavigateToTrip}
                    onRename={handleOpenRenameDialog}
                  />
                ))}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="h-16 w-16 bg-electric-100 dark:bg-electric-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plane className="h-8 w-8 text-electric-500" />
              </div>
              <h3 className="text-xl font-semibold text-electric-900 dark:text-electric-100 mb-2">
                No trips yet
              </h3>
              <p className="text-electric-600 dark:text-electric-400 mb-6">
                Start planning your first trip to see it here
              </p>
              <PrimaryButton onClick={handleCreateNewTrip}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Trip
              </PrimaryButton>
            </div>
          </div>
        )}

        {!user && (
          <div className="mt-16 bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-electric-200/50 dark:border-electric-700/50 rounded-xl p-8">
            <TripTemplates onSelectTemplate={() => {
              setAuthView("signup");
              setIsAuthModalOpen(true);
            }} />
          </div>
        )}
      </div>

      {tripToRename && (
        <RenameTripDialog
          isOpen={isRenameModalOpen}
          onClose={handleCloseRenameDialog}
          trip={tripToRename}
          onRename={(tripId, newName) => {
            // Handle rename logic here
            handleCloseRenameDialog();
          }}
        />
      )}
    </div>
  );
}