import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, Clock, MapPin, User, Mail, Phone, Plane, Building } from 'lucide-react';

interface BookingSummary {
  tripId: string;
  tripDestination: string;
  departureDate: string;
  returnDate?: string;
  travelers: Array<{
    name: string;
    email: string;
    phone: string;
  }>;
  selectedFlight?: {
    id: string;
    airline: string;
    flightNumber: string;
    price: number;
    currency: string;
    departure: {
      airport: string;
      time: string;
      date: string;
    };
    arrival: {
      airport: string;
      time: string;
      date: string;
    };
  };
  selectedHotel?: {
    name: string;
    address: string;
    price: number;
    currency: string;
  };
  totalCost: number;
  currency: string;
}

interface PaymentConfirmationProps {
  bookingSummary: BookingSummary;
  confirmationNumber?: string;
  onConfirmBooking: () => void;
  onEditBooking: () => void;
  isLoading?: boolean;
  isComplete?: boolean;
}

export function PaymentConfirmation({ 
  bookingSummary, 
  confirmationNumber, 
  onConfirmBooking, 
  onEditBooking, 
  isLoading,
  isComplete 
}: PaymentConfirmationProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isComplete && confirmationNumber) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-green-800 dark:text-green-200">
            Booking Confirmed!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Confirmation Number: {confirmationNumber}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Your booking has been successfully confirmed. Confirmation details have been sent to all travelers.
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Booking Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Trip ID:</span>
                <span className="font-medium">{bookingSummary.tripId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Destination:</span>
                <span className="font-medium">{bookingSummary.tripDestination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Travelers:</span>
                <span className="font-medium">{bookingSummary.travelers.length} person(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>
                <span className="font-bold text-lg">{formatCurrency(bookingSummary.totalCost, bookingSummary.currency)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Booking Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trip Details */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Trip Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Destination</p>
                <p className="font-medium">{bookingSummary.tripDestination}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Travel Dates</p>
                <p className="font-medium">
                  {formatDate(bookingSummary.departureDate)}
                  {bookingSummary.returnDate && ` - ${formatDate(bookingSummary.returnDate)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Travelers */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Travelers ({bookingSummary.travelers.length})
            </h3>
            <div className="space-y-3">
              {bookingSummary.travelers.map((traveler, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">{traveler.name}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {traveler.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {traveler.phone}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline">Traveler {index + 1}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Flight Details */}
          {bookingSummary.selectedFlight && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Flight Details
              </h3>
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium">{bookingSummary.selectedFlight.airline}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Flight {bookingSummary.selectedFlight.flightNumber}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {formatCurrency(bookingSummary.selectedFlight.price, bookingSummary.selectedFlight.currency)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Departure</p>
                    <p className="font-medium">{bookingSummary.selectedFlight.departure.airport}</p>
                    <p className="text-sm">{formatTime(bookingSummary.selectedFlight.departure.time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Arrival</p>
                    <p className="font-medium">{bookingSummary.selectedFlight.arrival.airport}</p>
                    <p className="text-sm">{formatTime(bookingSummary.selectedFlight.arrival.time)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hotel Details */}
          {bookingSummary.selectedHotel && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Hotel Details
              </h3>
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{bookingSummary.selectedHotel.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {bookingSummary.selectedHotel.address}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {formatCurrency(bookingSummary.selectedHotel.price, bookingSummary.selectedHotel.currency)}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Total Cost */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Cost:</span>
              <span className="text-green-600 dark:text-green-400">
                {formatCurrency(bookingSummary.totalCost, bookingSummary.currency)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onEditBooking} disabled={isLoading}>
          Edit Booking
        </Button>
        <Button onClick={onConfirmBooking} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
          {isLoading ? 'Processing...' : 'Confirm & Pay'}
        </Button>
      </div>
    </div>
  );
}