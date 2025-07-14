import { useParams, useLocation as useWouterLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, Plane, MapPin, Clock, User, Download, Calendar, Phone, Mail } from 'lucide-react';

export default function BookingConfirmation() {
  const { bookingId } = useParams();
  const [, setLocation] = useWouterLocation();

  // Get booking details
  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => apiRequest('GET', `/api/flights/bookings/${bookingId}`),
    enabled: !!bookingId
  });

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration: string) => {
    if (duration.includes('minutes')) {
      const minutes = parseInt(duration);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = match[2] ? parseInt(match[2]) : 0;
      return `${hours}h ${minutes}m`;
    }
    return duration;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!booking?.data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <Plane className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Booking Not Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We couldn't find the booking you're looking for.
              </p>
              <Button onClick={() => setLocation('/bookings')}>
                View All Bookings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bookingData = booking.data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your flight has been successfully booked. Confirmation details below.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Booking Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Booking Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="w-5 h-5" />
                    Booking Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Confirmation Number</span>
                      <Badge variant="outline" className="text-lg font-mono">
                        {bookingData.reference || bookingData.id}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Booking Status</span>
                      <Badge variant="default">
                        {bookingData.status || 'Confirmed'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Amount</span>
                      <span className="text-xl font-bold">
                        {bookingData.total_currency || 'USD'} {bookingData.total_amount || bookingData.price?.amount}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Flight Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Flight Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {bookingData.slices?.map((slice: any, sliceIndex: number) => (
                    <div key={sliceIndex} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-lg font-semibold">
                            <MapPin className="w-4 h-4" />
                            {slice.origin.iata_code} → {slice.destination.iata_code}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {slice.origin.city_name} to {slice.destination.city_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            {formatDuration(slice.duration)}
                          </div>
                        </div>
                      </div>

                      {slice.segments?.map((segment: any, segmentIndex: number) => (
                        <div key={segmentIndex} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <img 
                                src={segment.airline?.logo_url} 
                                alt={segment.airline?.name}
                                className="w-8 h-8"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <div>
                                <div className="font-semibold">
                                  {segment.airline?.name} {segment.flight_number}
                                </div>
                                {segment.aircraft && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {segment.aircraft.name}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {segment.airline?.iata_code}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-lg">
                                {new Date(segment.departure_datetime).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {formatDateTime(segment.departure_datetime)}
                              </div>
                              <div className="font-medium">{segment.origin?.name}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-lg">
                                {new Date(segment.arrival_datetime).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {formatDateTime(segment.arrival_datetime)}
                              </div>
                              <div className="font-medium">{segment.destination?.name}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Passenger Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Passenger Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bookingData.passengers?.map((passenger: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 mb-4 last:mb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {passenger.title} {passenger.given_name} {passenger.family_name}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400">
                            {passenger.type === 'adult' ? 'Adult' : 'Child'} Passenger
                          </p>
                        </div>
                        <Badge variant="outline">
                          Seat {passenger.seat || 'TBA'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Email:</span>
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {passenger.email}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span>
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {passenger.phone_number}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Action Panel */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Boarding Pass
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Calendar className="w-4 h-4 mr-2" />
                    Add to Calendar
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Confirmation
                  </Button>
                  <Separator />
                  <Button 
                    className="w-full" 
                    variant="secondary"
                    onClick={() => setLocation('/flights')}
                  >
                    Book Another Flight
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => setLocation('/bookings')}
                  >
                    View All Bookings
                  </Button>
                </CardContent>
              </Card>

              {/* Important Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Important Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <h5 className="font-medium mb-1">Check-in</h5>
                    <p className="text-gray-600 dark:text-gray-400">
                      Online check-in opens 24 hours before departure
                    </p>
                  </div>
                  <div>
                    <h5 className="font-medium mb-1">Baggage</h5>
                    <p className="text-gray-600 dark:text-gray-400">
                      Check airline baggage policies for size and weight limits
                    </p>
                  </div>
                  <div>
                    <h5 className="font-medium mb-1">Changes & Cancellations</h5>
                    <p className="text-gray-600 dark:text-gray-400">
                      Contact customer service for modifications to your booking
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Next Steps */}
              <Card>
                <CardHeader>
                  <CardTitle>Next Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p>Save your confirmation number: <strong>{bookingData.reference || bookingData.id}</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p>Arrive at the airport at least 2 hours before domestic flights</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p>Bring valid government-issued photo ID</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p>Check-in online or at the airport kiosk</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
