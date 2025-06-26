import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Plane, Home, Users, CreditCard, CheckCircle, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { BookingFormData, Hotel, RoomType } from '../types';
import { Flight } from '../types/flight';
import { ToastAction } from '@/components/ui/toast';

interface FlightDetails {
  outbound: {
    airline: string;
    flightNumber: string;
    departureTime: string;
    price: {
      amount: number;
      currency: string;
    };
  };
  return?: {
    airline: string;
    flightNumber: string;
    departureTime: string;
    price: {
      amount: number;
      currency: string;
    };
  };
}

interface HotelBooking {
  name: string;
  checkInTime: string;
  address: {
    street: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  price: {
    amount: number;
    currency: string;
  };
}

export interface ExtendedBookingFormData extends Omit<BookingFormData, 'flights' | 'hotel'> {
  flights: FlightDetails;
  hotel: HotelBooking;
  returnFlight?: {
    airline: string;
    flightNumber: string;
  };
  selectedFlight?: {
    airline: string;
    flightNumber: string;
    price: number;
  };
  selectedRoomType?: RoomType;
}
interface ConfirmationStepProps {
    formData: ExtendedBookingFormData;
    onBack: () => void;
    onConfirm: () => void;
    onNext?: () => void;
    onChange?: (data: Partial<ExtendedBookingFormData>) => void;
}
export const ConfirmationStep = ({ formData, onBack, onConfirm }: ConfirmationStepProps) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const formatPrice = (amount: number | undefined) => {
        if (amount === undefined) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: formData.hotel?.price?.currency || 'USD',
        }).format(amount);
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        try {
            const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
            return format(date, 'PPP h:mm a');
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    };

    const getTotalPrice = () => {
        const flightPrice = formData.selectedFlight?.price || 0;
        const roomPrice = formData.selectedRoomType?.price || 0;
        return flightPrice + roomPrice;
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
                action: <ToastAction altText="Dismiss">Dismiss</ToastAction>,
            });
            // Navigate to booking confirmation page
            // window.location.href = '/booking/confirmation';
        }
        catch (error) {
            console.error('Error confirming booking:', error);
            toast({
                title: 'Error',
                description: 'Failed to confirm booking. Please try again.',
                variant: 'destructive',
                action: <ToastAction altText="Dismiss">Dismiss</ToastAction>,
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="space-y-6">
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
                  <Users className="h-4 w-4"/>
                  <span>{formData.primaryTraveler.firstName} {formData.primaryTraveler.lastName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4"/>
                  <span>Payment pending</span>
                </div>
              </div>
            </div>

            {/* Flight Information */}
            <div className="border-b pb-4">
              <h3 className="font-medium">Flight Details</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4"/>
                  <span>Outbound Flight:</span>
                  <span className="font-medium">
                    {formData.selectedFlight?.airline ?? 'N/A'} {formData.selectedFlight?.flightNumber ?? ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {formData.flights?.outbound?.departureTime ? formatDate(formData.flights.outbound.departureTime) : 'N/A'}
                  </span>
                </div>
                {formData.returnFlight && (
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    <span>Return Flight:</span>
                    <span className="font-medium">
                      {formData.returnFlight.airline ?? 'N/A'} {formData.returnFlight.flightNumber ?? ''}
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
                  <span>{formData.hotel?.name ?? 'No hotel selected'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    Check-in: {formData.hotel?.checkInTime ? formatDate(formData.hotel.checkInTime) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{formData.hotel?.address ? `${formData.hotel.address.street || ''}, ${formData.hotel.address.city || ''}` : 'No address available'}</span>
                </div>
              </div>
            </div>

            {/* Total Cost */}
            <div className="border-b pb-4">
              <h3 className="font-medium">Total Cost</h3>
              <div className="mt-2">
                <div className="flex justify-between">
                  <span>Flights</span>
                  <span>{formatPrice(
                    formData.flights?.outbound?.price?.amount && formData.flights.return?.price?.amount 
                      ? formData.flights.outbound.price.amount + formData.flights.return.price.amount 
                      : formData.flights?.outbound?.price?.amount
                  )}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hotel</span>
                  <span>{formatPrice(formData.hotel?.price?.amount)}</span>
                </div>
                <div className="flex justify-between font-medium mt-2">
                  <span>Total</span>
                  <span>{formatPrice(getTotalPrice())}</span>
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
        <Button onClick={handleConfirm} disabled={isLoading} className="gap-2">
          {isLoading ? (<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>) : (<CheckCircle className="h-4 w-4"/>)}
          Confirm Booking
        </Button>
      </div>
    </div>);
};
