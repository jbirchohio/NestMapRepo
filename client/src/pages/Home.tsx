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
import { UserRound, LogOut, BarChart3, CheckCircle, Clock } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [tripToRename, setTripToRename] = useState<ClientTrip | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  
  const { user, userId, signOut } = useAuth();
  const queryClient = useQueryClient();
  
  // Get user ID from authentication or use guest mode
  const effectiveUserId = userId ?? -1; // Use database userId or -1 for guest mode
  const isGuestMode = effectiveUserId === -1;
  
  // Guest trips storage in localStorage
  const getGuestTrips = (): ClientTrip[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("nestmap_guest_trips");
    return stored ? JSON.parse(stored) : [];
  };

  const setGuestTrips = (trips: ClientTrip[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nestmap_guest_trips", JSON.stringify(trips));
    }
  };

  // Clear localStorage for testing
  const clearGuestData = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nestmap_guest_trips");
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.TRIPS] });
    }
  };

  // Auto-clear localStorage on page load for testing (temporary)
  React.useEffect(() => {
    clearGuestData();
  }, []);

  const { data: trips = [], isLoading } = useQuery<ClientTrip[]>({
    queryKey: [API_ENDPOINTS.TRIPS, { userId }],
    queryFn: async () => {
      if (isGuestMode) {
        return getGuestTrips();
      }
      const res = await fetch(`${API_ENDPOINTS.TRIPS}?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch trips");
      return res.json();
    },
    enabled: true, // Always enabled for both guest and authenticated users
  });
  
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
    <div className="min-h-screen bg-[hsl(var(--background))]">
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

      <header className="bg-white dark:bg-[hsl(var(--card))] shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-[hsl(var(--secondary))] rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[hsl(var(--foreground))]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">NestMap</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Professional Travel Management</p>
              </div>
            </div>
            
            {/* Authentication UI */}
            <div className="flex items-center space-x-2">
              {user ? (
                <div className="flex items-center">
                  <div className="mr-3 text-right hidden sm:block">
                    <p className="font-medium">{user.user_metadata?.display_name || user.email}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Signed in</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full"
                      onClick={handleSignOut}
                      title="Sign Out"
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    onClick={handleSignInClick}
                  >
                    Sign In
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={handleSignUpClick}
                    className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]"
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <section className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">
                  {isGuestMode ? "Try NestMap Free" : "Welcome to NestMap"}
                </h2>
                {isGuestMode && (
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    Create up to 2 trips • Limited features • No account required
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <TripTemplates 
                  userId={effectiveUserId} 
                  onTripCreated={(tripId) => setLocation(`/trip/${tripId}`)}
                />
                <Button 
                  onClick={handleCreateNewTrip} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isGuestMode && trips.length >= 1 ? "Try One More" : "New Team Project"}
                </Button>
              </div>
            </div>
            
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">🗂️ Professional Travel Management</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Streamline corporate travel, client itineraries, and team events with enterprise-grade planning tools.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <div className="h-8 w-8 bg-blue-600 text-white rounded-md flex items-center justify-center mr-3 mt-0.5 font-semibold">📍</div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200">Plan for Teams or Clients</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Schedule events, meetings, and logistics for corporate or group travel</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="h-8 w-8 bg-blue-600 text-white rounded-md flex items-center justify-center mr-3 mt-0.5 font-semibold">📊</div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200">Smart Route & Time Optimization</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Let AI minimize travel time and automate transitions between events</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="h-8 w-8 bg-blue-600 text-white rounded-md flex items-center justify-center mr-3 mt-0.5 font-semibold">📈</div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200">Share & Track Engagement</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Send branded itineraries and track completion status and updates</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="h-8 w-8 bg-blue-600 text-white rounded-md flex items-center justify-center mr-3 mt-0.5 font-semibold">🤝</div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200">Collaborate Across Departments</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Allow internal and external stakeholders to access or edit trips</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
          
          {/* Guest Mode Upgrade Prompt */}
          {isGuestMode && trips.length >= 1 && (
            <section className="mb-8">
              <Card className="border-[hsl(var(--primary))] bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--primary))] to-[hsl(var(--primary))] text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Unlock Full Planning Power</h3>
                      <p className="text-sm opacity-90 mb-3">
                        You've used {trips.length} of 2 free trips. Sign up to create unlimited trips and unlock:
                      </p>
                      <ul className="text-sm space-y-1 opacity-90">
                        <li>• Unlimited trips and collaborators</li>
                        <li>• Advanced AI assistance with weather & budget tips</li>
                        <li>• Trip sharing and real-time collaboration</li>
                        <li>• Cloud sync across all your devices</li>
                      </ul>
                    </div>
                    <div className="ml-6">
                      <Button 
                        variant="secondary"
                        onClick={() => {
                          setAuthView("signup");
                          setIsAuthModalOpen(true);
                        }}
                        className="bg-white text-[hsl(var(--primary))] hover:bg-gray-100"
                      >
                        Sign Up Free
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          <section>
            <h2 className="text-xl font-semibold mb-4">
              Your Trips {isGuestMode && `(${trips.length}/2 Free)`}
            </h2>
            
            {trips.length > 0 && (
              <Tabs defaultValue="active" className="mb-4">
                <TabsList>
                  <TabsTrigger value="active" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Active ({trips.filter(trip => !trip.completed).length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Completed ({trips.filter(trip => trip.completed).length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="active">
                  {trips.filter(trip => !trip.completed).length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Clock className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
                        <h3 className="text-lg font-medium mb-2">No active trips</h3>
                        <p className="text-[hsl(var(--muted-foreground))]">All your trips are completed! Create a new one to start planning.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {trips.filter(trip => !trip.completed).map((trip) => (
                        <SwipeableTrip
                          key={trip.id}
                          trip={trip}
                          onNavigate={handleNavigateToTrip}
                          onRename={handleOpenRenameDialog}
                          isGuestMode={isGuestMode}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="completed">
                  {trips.filter(trip => trip.completed).length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <CheckCircle className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
                        <h3 className="text-lg font-medium mb-2">No completed trips yet</h3>
                        <p className="text-[hsl(var(--muted-foreground))]">Mark trips as complete when you finish them to see them here.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {trips.filter(trip => trip.completed).map((trip) => (
                        <SwipeableTrip
                          key={trip.id}
                          trip={trip}
                          onNavigate={handleNavigateToTrip}
                          onRename={handleOpenRenameDialog}
                          isGuestMode={isGuestMode}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
            
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Loading your trips...</p>
              </div>
            ) : trips.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <div className="mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No trips yet</h3>
                  <p className="text-[hsl(var(--muted-foreground))] mb-4">Create your first trip to get started.</p>
                  <Button onClick={handleCreateNewTrip}>Create New Trip</Button>
                </CardContent>
              </Card>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
