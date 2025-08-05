import React from 'react';
import { useAuth } from "@/contexts/JWTAuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Hotel, Calendar, MapPin, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function Bookings() {
  const { user, userId } = useAuth();
  const [, setLocation] = useLocation();
  
  // Fetch real bookings from the API
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['/api/bookings', userId],
    queryFn: async () => {
      try {
        const response = await fetch('/api/bookings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            // API endpoint doesn't exist yet
            return [];
          }
          throw new Error('Failed to fetch bookings');
        }
        
        return await response.json();
      } catch (error) {
        console.log('Bookings API not implemented yet');
        return [];
      }
    },
    enabled: !!userId,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign in Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Please sign in to view your bookings
            </p>
            <Button 
              onClick={() => setLocation('/?auth=login')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="h-5 w-5" />;
      case 'hotel': return <Hotel className="h-5 w-5" />;
      case 'activity': return <MapPin className="h-5 w-5" />;
      default: return <Calendar className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Bookings
          </h1>
          <p className="text-gray-600">
            Manage all your travel bookings in one place
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading your bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
              <p className="text-gray-600 mb-4">
                Start planning a trip to see your bookings here
              </p>
              <Button 
                onClick={() => setLocation('/')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
              >
                Plan a Trip
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking: any) => (
              <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        {getIcon(booking.type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {booking.title}
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </CardTitle>
                        <div className="text-sm text-gray-600 mt-1">
                          <p>{format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}</p>
                          {booking.checkOut && (
                            <p>Check-out: {format(new Date(booking.checkOut), 'MMMM d, yyyy')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{booking.price}</p>
                      <p className="text-xs text-gray-500">Confirmation: {booking.confirmationNumber}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {booking.type === 'flight' && (
                      <>
                        <div>
                          <p className="text-gray-600">Flight</p>
                          <p className="font-medium">{booking.details.airline} {booking.details.flight}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Schedule</p>
                          <p className="font-medium">{booking.details.departure} → {booking.details.arrival}</p>
                        </div>
                      </>
                    )}
                    {booking.type === 'hotel' && (
                      <>
                        <div>
                          <p className="text-gray-600">Room Type</p>
                          <p className="font-medium">{booking.details.roomType}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Duration</p>
                          <p className="font-medium">{booking.details.nights} nights</p>
                        </div>
                      </>
                    )}
                    {booking.type === 'activity' && (
                      <>
                        <div>
                          <p className="text-gray-600">Time</p>
                          <p className="font-medium">{booking.details.time} ({booking.details.duration})</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Provider</p>
                          <p className="font-medium">{booking.details.provider}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {booking.status === 'pending' && (
                      <Button 
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
                      >
                        Complete Booking
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}