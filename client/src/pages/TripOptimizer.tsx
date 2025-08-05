import React, { useState } from 'react';
import { useAuth } from "@/contexts/JWTAuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, MapPin, Calendar, Clock, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/constants";
import { ClientTrip } from "@/lib/types";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function TripOptimizer() {
  const { user, userId } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  
  // Get user trips
  const { data: trips = [], isLoading } = useQuery<ClientTrip[]>({
    queryKey: [API_ENDPOINTS.TRIPS, userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`${API_ENDPOINTS.TRIPS}?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch trips');
      return response.json();
    },
    enabled: !!userId,
  });

  const upcomingTrips = trips.filter(trip => {
    const startDate = new Date(trip.startDate);
    return startDate >= new Date();
  });

  const handleOptimizeTrip = async (tripId: number) => {
    setSelectedTripId(tripId);
    setOptimizing(true);
    
    // Simulate optimization process
    setTimeout(() => {
      setOptimizing(false);
      setLocation(`/trip/${tripId}?optimized=true`);
    }, 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign in Required</CardTitle>
            <CardDescription>
              Please sign in to optimize your trips
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation('/login')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Trip Optimizer
          </h1>
          <p className="text-gray-600">
            Let AI help you save time and money on your trips
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading your trips...</p>
          </div>
        ) : upcomingTrips.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No upcoming trips</h3>
              <p className="text-gray-600 mb-4">
                Create a trip first, then come back to optimize it!
              </p>
              <Button 
                onClick={() => setLocation('/')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
              >
                Create a Trip
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Our AI optimizer can help you:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Find the best routes between activities</li>
                  <li>Suggest optimal timing for each stop</li>
                  <li>Estimate costs and travel times</li>
                  <li>Recommend nearby attractions you might have missed</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              {upcomingTrips.map((trip) => (
                <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{trip.title}</CardTitle>
                        <CardDescription>
                          {trip.destination || 'Destination to be determined'}
                        </CardDescription>
                      </div>
                      <div className="text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d')}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))} days</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{trip.activities?.length || 0} activities</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleOptimizeTrip(trip.id)}
                        disabled={optimizing && selectedTripId === trip.id}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
                      >
                        {optimizing && selectedTripId === trip.id ? (
                          <>
                            <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                            Optimizing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Optimize Trip
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pro Tip
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  Optimize your trips at least 2 weeks before traveling to get the best deals on activities and accommodations. 
                  Our AI considers seasonal pricing and availability!
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}