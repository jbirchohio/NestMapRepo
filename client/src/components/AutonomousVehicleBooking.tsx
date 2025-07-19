import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Car, 
  MapPin, 
  Clock, 
  Battery, 
  Wifi, 
  Shield,
  Navigation,
  Zap,
  Users,
  Calendar,
  Route,
  AlertCircle
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AutonomousVehicle {
  id: string;
  model: string;
  type: 'sedan' | 'suv' | 'van' | 'luxury';
  capacity: number;
  autonomyLevel: 3 | 4 | 5;
  features: string[];
  location: { lat: number; lng: number; address: string };
  batteryLevel: number;
  status: 'available' | 'booked' | 'maintenance' | 'charging';
  pricePerKm: number;
  estimatedArrival: number;
  rating: number;
  provider: string;
}

interface BookingRequest {
  pickup: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  passengers: number;
  scheduledTime?: string;
  preferences: {
    vehicleType: string;
    autonomyLevel: number;
    features: string[];
  };
}

export default function AutonomousVehicleBooking() {
  const { toast } = useToast();
  const [bookingRequest, setBookingRequest] = useState<BookingRequest>({
    pickup: { lat: 0, lng: 0, address: '' },
    destination: { lat: 0, lng: 0, address: '' },
    passengers: 1,
    preferences: {
      vehicleType: 'any',
      autonomyLevel: 4,
      features: []
    }
  });
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<'request' | 'vehicles' | 'confirmation'>('request');

  const { data: availableVehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['/api/autonomous-vehicles/available', bookingRequest],
    queryFn: async () => {
      if (!bookingRequest.pickup.address || !bookingRequest.destination.address) return [];
      const response = await apiRequest('POST', '/api/autonomous-vehicles/search', bookingRequest);
      return response.data;
    },
    enabled: bookingStep === 'vehicles'
  });

  const { data: bookingHistory } = useQuery({
    queryKey: ['/api/autonomous-vehicles/bookings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/autonomous-vehicles/bookings');
      return response.data;
    }
  });

  const bookVehicleMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const response = await apiRequest('POST', '/api/autonomous-vehicles/book', {
        vehicleId,
        ...bookingRequest
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/autonomous-vehicles/bookings'] });
      setBookingStep('confirmation');
      toast({
        title: "Vehicle Booked",
        description: "Your autonomous vehicle has been successfully booked."
      });
    },
    onError: () => {
      toast({
        title: "Booking Failed",
        description: "Failed to book the vehicle. Please try again.",
        variant: "destructive"
      });
    }
  });

  const searchVehicles = () => {
    if (!bookingRequest.pickup.address || !bookingRequest.destination.address) {
      toast({
        title: "Missing Information",
        description: "Please provide both pickup and destination addresses.",
        variant: "destructive"
      });
      return;
    }
    setBookingStep('vehicles');
  };

  const getAutonomyLevelDescription = (level: number) => {
    switch (level) {
      case 3: return 'Conditional Automation';
      case 4: return 'High Automation';
      case 5: return 'Full Automation';
      default: return 'Unknown';
    }
  };

  const getVehicleTypeIcon = (type: string) => {
    switch (type) {
      case 'luxury': return '🚗';
      case 'suv': return '🚙';
      case 'van': return '🚐';
      default: return '🚗';
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Autonomous Vehicle Booking</h2>
          <p className="text-muted-foreground">
            Book self-driving vehicles for your travel needs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBookingStep('request')}>
            New Booking
          </Button>
        </div>
      </div>

      <Tabs defaultValue="booking">
        <TabsList>
          <TabsTrigger value="booking">Book Vehicle</TabsTrigger>
          <TabsTrigger value="history">Booking History</TabsTrigger>
          <TabsTrigger value="fleet">Available Fleet</TabsTrigger>
        </TabsList>

        <TabsContent value="booking" className="space-y-6">
          {bookingStep === 'request' && (
            <Card>
              <CardHeader>
                <CardTitle>Trip Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup">Pickup Location</Label>
                    <Input
                      id="pickup"
                      value={bookingRequest.pickup.address}
                      onChange={(e) => setBookingRequest(prev => ({
                        ...prev,
                        pickup: { ...prev.pickup, address: e.target.value }
                      }))}
                      placeholder="Enter pickup address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <Input
                      id="destination"
                      value={bookingRequest.destination.address}
                      onChange={(e) => setBookingRequest(prev => ({
                        ...prev,
                        destination: { ...prev.destination, address: e.target.value }
                      }))}
                      placeholder="Enter destination address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="passengers">Passengers</Label>
                    <Select
                      value={bookingRequest.passengers.toString()}
                      onValueChange={(value) => setBookingRequest(prev => ({
                        ...prev,
                        passengers: parseInt(value)
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} passenger{num > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-type">Vehicle Type</Label>
                    <Select
                      value={bookingRequest.preferences.vehicleType}
                      onValueChange={(value) => setBookingRequest(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, vehicleType: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Type</SelectItem>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="luxury">Luxury</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="autonomy-level">Autonomy Level</Label>
                    <Select
                      value={bookingRequest.preferences.autonomyLevel.toString()}
                      onValueChange={(value) => setBookingRequest(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, autonomyLevel: parseInt(value) as 3 | 4 | 5 }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">Level 3 - Conditional</SelectItem>
                        <SelectItem value="4">Level 4 - High</SelectItem>
                        <SelectItem value="5">Level 5 - Full</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled-time">Scheduled Time (Optional)</Label>
                  <Input
                    id="scheduled-time"
                    type="datetime-local"
                    value={bookingRequest.scheduledTime || ''}
                    onChange={(e) => setBookingRequest(prev => ({
                      ...prev,
                      scheduledTime: e.target.value
                    }))}
                  />
                </div>

                <Button onClick={searchVehicles} className="w-full">
                  <Car className="h-4 w-4 mr-2" />
                  Search Available Vehicles
                </Button>
              </CardContent>
            </Card>
          )}

          {bookingStep === 'vehicles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Available Vehicles</h3>
                <Button variant="outline" onClick={() => setBookingStep('request')}>
                  Modify Search
                </Button>
              </div>

              {vehiclesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {availableVehicles?.map((vehicle: AutonomousVehicle) => (
                    <Card key={vehicle.id} className={`cursor-pointer transition-colors ${
                      selectedVehicle === vehicle.id ? 'ring-2 ring-primary' : ''
                    }`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{getVehicleTypeIcon(vehicle.type)}</div>
                            <div>
                              <CardTitle className="text-lg">{vehicle.model}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                by {vehicle.provider}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">
                              ${vehicle.pricePerKm}/km
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ETA: {vehicle.estimatedArrival} min
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{vehicle.capacity} seats</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Level {vehicle.autonomyLevel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Battery className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{vehicle.batteryLevel}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{vehicle.location.address}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {vehicle.features.map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              vehicle.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
                            }`}></div>
                            <span className="text-sm capitalize">{vehicle.status}</span>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedVehicle(vehicle.id);
                              bookVehicleMutation.mutate(vehicle.id);
                            }}
                            disabled={vehicle.status !== 'available' || bookVehicleMutation.isPending}
                          >
                            {bookVehicleMutation.isPending && selectedVehicle === vehicle.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Booking...
                              </>
                            ) : (
                              'Book Now'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {availableVehicles?.length === 0 && !vehiclesLoading && (
                <div className="text-center py-12">
                  <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No vehicles available</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or check back later
                  </p>
                </div>
              )}
            </div>
          )}

          {bookingStep === 'confirmation' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Booking Confirmed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800">
                      Your autonomous vehicle has been booked successfully! 
                      You'll receive real-time updates about your vehicle's location and arrival time.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Trip Details</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>From: {bookingRequest.pickup.address}</p>
                        <p>To: {bookingRequest.destination.address}</p>
                        <p>Passengers: {bookingRequest.passengers}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Vehicle Info</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Type: {bookingRequest.preferences.vehicleType}</p>
                        <p>Autonomy: Level {bookingRequest.preferences.autonomyLevel}</p>
                        <p>Status: En route</p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={() => setBookingStep('request')} className="w-full">
                    Book Another Vehicle
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h3 className="text-lg font-semibold">Booking History</h3>
          <div className="space-y-4">
            {bookingHistory?.map((booking: any) => (
              <Card key={booking.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{booking.vehicle.model}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.pickup.address} → {booking.destination.address}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        ${booking.totalCost}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-4">
          <h3 className="text-lg font-semibold">Available Fleet Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fleet Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Vehicles</span>
                    <span className="font-medium">247</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available Now</span>
                    <span className="font-medium text-green-600">189</span>
                  </div>
                  <div className="flex justify-between">
                    <span>In Service</span>
                    <span className="font-medium text-blue-600">45</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maintenance</span>
                    <span className="font-medium text-yellow-600">13</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Autonomy Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Level 3</span>
                    <span className="font-medium">67 vehicles</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Level 4</span>
                    <span className="font-medium">142 vehicles</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Level 5</span>
                    <span className="font-medium">38 vehicles</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vehicle Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sedan</span>
                    <span className="font-medium">98 vehicles</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SUV</span>
                    <span className="font-medium">89 vehicles</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Van</span>
                    <span className="font-medium">34 vehicles</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Luxury</span>
                    <span className="font-medium">26 vehicles</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
