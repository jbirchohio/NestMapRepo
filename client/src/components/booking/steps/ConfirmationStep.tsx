import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { CalendarIcon, Plane, Home, Users, CreditCard, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Flight, Hotel } from '../types';

interface ConfirmationStepProps {
  formData: {
    clientInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
    };
    flights: {
      outbound: Flight;
      return?: Flight;
    };
    hotel: Hotel;
    totalCost: number;
  };
  onBack: () => void;
  onConfirm: () => void;
}

export const ConfirmationStep = ({ formData, onBack }: ConfirmationStepProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleConfirm = async () => {
    setIsLoading(true);

    try {
      // Here you would typically make an API call to confirm the booking
      // For now, we'll just show a success message
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast({
        title: 'Booking Confirmed!',
        description: 'Your trip has been successfully booked. You will receive a confirmation email shortly.',
      });

      // Navigate to booking confirmation page
      // window.location.href = '/booking/confirmation';
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Traveler Information */}
            <div className="border-b pb-4">
              <h3 className="font-medium">Traveler Information</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{formData.clientInfo.firstName} {formData.clientInfo.lastName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Payment pending</span>
                </div>
              </div>
            </div>

            {/* Flight Information */}
            <div className="border-b pb-4">
              <h3 className="font-medium">Flight Details</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  <span>Outbound Flight:</span>
                  <span className="font-medium">
                    {formData.flights.outbound.airline} {formData.flights.outbound.flightNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {format(new Date(formData.flights.outbound.departureTime), 'PPP')} at {format(new Date(formData.flights.outbound.departureTime), 'h:mm a')}
                  </span>
                </div>
                {formData.flights.return && (
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 rotate-180" />
                    <span>Return Flight:</span>
                    <span className="font-medium">
                      {formData.flights.return.airline} {formData.flights.return.flightNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Hotel Information */}
            <div className="border-b pb-4">
              <h3 className="font-medium">Hotel Details</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span>{formData.hotel.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    Check-in: {format(new Date(formData.hotel.checkInTime), 'PPP')} at {format(new Date(formData.hotel.checkInTime), 'h:mm a')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{formData.hotel.address.street}, {formData.hotel.address.city}</span>
                </div>
              </div>
            </div>

            {/* Total Cost */}
            <div className="border-b pb-4">
              <h3 className="font-medium">Total Cost</h3>
              <div className="mt-2">
                <div className="flex justify-between">
                  <span>Flights</span>
                  <span>{formatPrice(formData.flights.return ? formData.flights.outbound.price.amount + formData.flights.return.price.amount : formData.flights.outbound.price.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hotel</span>
                  <span>{formatPrice(formData.hotel.price.amount)}</span>
                </div>
                <div className="flex justify-between font-medium mt-2">
                  <span>Total</span>
                  <span>{formatPrice(formData.totalCost)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Confirm Booking
        </Button>
      </div>
    </div>
  );
};
