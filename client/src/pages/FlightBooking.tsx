import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plane, CreditCard, User, Luggage, Clock, MapPin } from 'lucide-react';

interface PassengerDetails {
  given_name: string;
  family_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  title: 'mr' | 'ms' | 'mrs' | 'dr';
}

interface PaymentDetails {
  type: 'card';
  card_number: string;
  exp_month: string;
  exp_year: string;
  cvc: string;
  name: string;
  address: {
    line1: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

export default function FlightBooking() {
  const { offerId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [passengers, setPassengers] = useState<PassengerDetails[]>([{
    given_name: '',
    family_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: 'male',
    title: 'mr'
  }]);
  
  const [payment, setPayment] = useState<PaymentDetails>({
    type: 'card',
    card_number: '',
    exp_month: '',
    exp_year: '',
    cvc: '',
    name: '',
    address: {
      line1: '',
      city: '',
      postal_code: '',
      country: ''
    }
  });

  const [selectedSeats] = useState<{[key: string]: string}>({});

  // Get offer details
  const { data: offer, isLoading: offerLoading } = useQuery({
    queryKey: ['flight-offer', offerId],
    queryFn: () => apiRequest('GET', `/api/flights/offers/${offerId}`),
    enabled: !!offerId
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (bookingData: any) => 
      apiRequest('POST', '/api/flights/bookings', bookingData),
    onSuccess: (data) => {
      toast({
        title: 'Booking Confirmed',
        description: `Your flight has been booked successfully. Booking ID: ${data.data.id}`,
      });
      navigate(`/bookings/${data.data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Booking Failed',
        description: error.message || 'Unable to complete booking. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const handleBookingSubmit = () => {
    if (!offer?.data) return;

    const bookingData = {
      offer_id: offerId,
      passengers: passengers.map((passenger, index) => ({
        ...passenger,
        type: 'adult',
        seat_preference: selectedSeats[index] || null
      })),
      payment,
      services: []
    };

    createBookingMutation.mutate(bookingData);
  };

  const updatePassenger = (index: number, field: keyof PassengerDetails, value: string) => {
    const updatedPassengers = [...passengers];
    updatedPassengers[index] = { ...updatedPassengers[index], [field]: value };
    setPassengers(updatedPassengers);
  };

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+)H(\d+)M/);
    if (match) {
      return `${match[1]}h ${match[2]}m`;
    }
    return duration;
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (offerLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!offer?.data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <Plane className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Flight Not Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The selected flight offer is no longer available.
              </p>
              <Button onClick={() => navigate('/flights')}>
                Search New Flights
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const flight = offer.data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Complete Your Booking
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Review your flight details and passenger information
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Flight Summary */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="w-5 h-5" />
                    Flight Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {flight.slices.map((slice: any, sliceIndex: number) => (
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

                      {slice.segments.map((segment: any, segmentIndex: number) => (
                        <div key={segmentIndex} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold">
                                {segment.airline.name} {segment.flight_number}
                              </div>
                              {segment.aircraft && (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {segment.aircraft.name}
                                </div>
                              )}
                            </div>
                            <Badge variant="secondary">
                              {segment.airline.iata_code}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <div>
                              <div className="font-medium">
                                {formatDateTime(segment.departure_datetime)}
                              </div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {segment.origin.name}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {formatDateTime(segment.arrival_datetime)}
                              </div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {segment.destination.name}
                              </div>
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
                  {passengers.map((passenger, index) => (
                    <div key={index} className="space-y-4 p-4 border rounded-lg">
                      <h4 className="font-semibold">Passenger {index + 1}</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`title-${index}`}>Title</Label>
                          <Select 
                            value={passenger.title} 
                            onValueChange={(value) => updatePassenger(index, 'title', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mr">Mr</SelectItem>
                              <SelectItem value="ms">Ms</SelectItem>
                              <SelectItem value="mrs">Mrs</SelectItem>
                              <SelectItem value="dr">Dr</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`gender-${index}`}>Gender</Label>
                          <Select 
                            value={passenger.gender} 
                            onValueChange={(value) => updatePassenger(index, 'gender', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`given-name-${index}`}>First Name</Label>
                          <Input
                            id={`given-name-${index}`}
                            value={passenger.given_name}
                            onChange={(e) => updatePassenger(index, 'given_name', e.target.value)}
                            placeholder="First name"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`family-name-${index}`}>Last Name</Label>
                          <Input
                            id={`family-name-${index}`}
                            value={passenger.family_name}
                            onChange={(e) => updatePassenger(index, 'family_name', e.target.value)}
                            placeholder="Last name"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`email-${index}`}>Email</Label>
                          <Input
                            id={`email-${index}`}
                            type="email"
                            value={passenger.email}
                            onChange={(e) => updatePassenger(index, 'email', e.target.value)}
                            placeholder="email@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`phone-${index}`}>Phone Number</Label>
                          <Input
                            id={`phone-${index}`}
                            value={passenger.phone_number}
                            onChange={(e) => updatePassenger(index, 'phone_number', e.target.value)}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`dob-${index}`}>Date of Birth</Label>
                        <Input
                          id={`dob-${index}`}
                          type="date"
                          value={passenger.date_of_birth}
                          onChange={(e) => updatePassenger(index, 'date_of_birth', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="card-name">Cardholder Name</Label>
                      <Input
                        id="card-name"
                        value={payment.name}
                        onChange={(e) => setPayment({...payment, name: e.target.value})}
                        placeholder="Name on card"
                      />
                    </div>

                    <div>
                      <Label htmlFor="card-number">Card Number</Label>
                      <Input
                        id="card-number"
                        value={payment.card_number}
                        onChange={(e) => setPayment({...payment, card_number: e.target.value})}
                        placeholder="1234 5678 9012 3456"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="exp-month">Month</Label>
                        <Select 
                          value={payment.exp_month} 
                          onValueChange={(value) => setPayment({...payment, exp_month: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                              <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                                {month.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="exp-year">Year</Label>
                        <Select 
                          value={payment.exp_year} 
                          onValueChange={(value) => setPayment({...payment, exp_year: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="YYYY" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 10}, (_, i) => new Date().getFullYear() + i).map(year => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="cvc">CVC</Label>
                        <Input
                          id="cvc"
                          value={payment.cvc}
                          onChange={(e) => setPayment({...payment, cvc: e.target.value})}
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold">Billing Address</h4>
                      <div>
                        <Label htmlFor="address-line1">Address</Label>
                        <Input
                          id="address-line1"
                          value={payment.address.line1}
                          onChange={(e) => setPayment({
                            ...payment, 
                            address: {...payment.address, line1: e.target.value}
                          })}
                          placeholder="123 Main Street"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="address-city">City</Label>
                          <Input
                            id="address-city"
                            value={payment.address.city}
                            onChange={(e) => setPayment({
                              ...payment, 
                              address: {...payment.address, city: e.target.value}
                            })}
                            placeholder="New York"
                          />
                        </div>
                        <div>
                          <Label htmlFor="address-postal">Postal Code</Label>
                          <Input
                            id="address-postal"
                            value={payment.address.postal_code}
                            onChange={(e) => setPayment({
                              ...payment, 
                              address: {...payment.address, postal_code: e.target.value}
                            })}
                            placeholder="10001"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="address-country">Country</Label>
                        <Select 
                          value={payment.address.country} 
                          onValueChange={(value) => setPayment({
                            ...payment, 
                            address: {...payment.address, country: value}
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="CA">Canada</SelectItem>
                            <SelectItem value="GB">United Kingdom</SelectItem>
                            <SelectItem value="DE">Germany</SelectItem>
                            <SelectItem value="FR">France</SelectItem>
                            <SelectItem value="AU">Australia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Price Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Base fare</span>
                      <span>{flight.price.currency} {flight.price.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes & fees</span>
                      <span>Included</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>{flight.price.currency} {flight.price.amount}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-6" 
                    size="lg"
                    onClick={handleBookingSubmit}
                    disabled={createBookingMutation.isPending}
                  >
                    {createBookingMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Processing...
                      </div>
                    ) : (
                      'Complete Booking'
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Booking Conditions */}
              {flight.conditions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Luggage className="w-5 h-5" />
                      Booking Conditions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {flight.conditions.change_before_departure && (
                      <div>
                        <span className="font-medium">Changes: </span>
                        {flight.conditions.change_before_departure.allowed ? (
                          <span className="text-green-600 dark:text-green-400">
                            Allowed (fee: {flight.conditions.change_before_departure.penalty_currency} {flight.conditions.change_before_departure.penalty_amount})
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">Not allowed</span>
                        )}
                      </div>
                    )}
                    {flight.conditions.cancel_before_departure && (
                      <div>
                        <span className="font-medium">Cancellation: </span>
                        {flight.conditions.cancel_before_departure.allowed ? (
                          <span className="text-green-600 dark:text-green-400">
                            Allowed (fee: {flight.conditions.cancel_before_departure.penalty_currency} {flight.conditions.cancel_before_departure.penalty_amount})
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">Not allowed</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
