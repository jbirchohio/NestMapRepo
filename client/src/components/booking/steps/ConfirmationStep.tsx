import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { CabinType } from '../types';
import { CalendarIcon, Plane, Home, Users, CreditCard, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConfirmationStepProps {
  formData: {
    tripType: 'one-way' | 'round-trip';
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    primaryTraveler: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
    };
    additionalTravelers?: Array<{
      firstName: string;
      lastName: string;
      dateOfBirth: string;
    }>;
    cabin: CabinType; // 'economy' | 'premium-economy' | 'business' | 'first'
    budget?: number;
    department?: string;
    projectCode?: string;
    costCenter?: string;
  };
  onBack: () => void;
  onConfirm: () => void;
}

export const ConfirmationStep = ({ formData, onBack, onConfirm }: ConfirmationStepProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);


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

      // Call the onConfirm callback
      onConfirm();
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
                  <span>{formData.primaryTraveler.firstName} {formData.primaryTraveler.lastName}</span>
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
                  <span>Trip Type:</span>
                  <span className="font-medium capitalize">
                    {formData.tripType}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  <span>Route:</span>
                  <span className="font-medium">
                    {formData.origin} to {formData.destination}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    Departure: {format(new Date(formData.departureDate), 'PPP')}
                  </span>
                </div>
                {formData.returnDate && formData.tripType === 'round-trip' && (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      Return: {format(new Date(formData.returnDate), 'PPP')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Traveler Details */}
            <div className="border-b pb-4">
              <h3 className="font-medium">Traveler Details</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Passengers: {formData.passengers}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span>Cabin Class: {formData.cabin}</span>
                </div>
                {formData.budget && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Budget: ${formData.budget}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div className="border-b pb-4">
              <h3 className="font-medium">Additional Information</h3>
              <div className="mt-2">
                {formData.department && (
                  <div className="flex justify-between">
                    <span>Department</span>
                    <span>{formData.department}</span>
                  </div>
                )}
                {formData.projectCode && (
                  <div className="flex justify-between">
                    <span>Project Code</span>
                    <span>{formData.projectCode}</span>
                  </div>
                )}
                {formData.costCenter && (
                  <div className="flex justify-between">
                    <span>Cost Center</span>
                    <span>{formData.costCenter}</span>
                  </div>
                )}
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
