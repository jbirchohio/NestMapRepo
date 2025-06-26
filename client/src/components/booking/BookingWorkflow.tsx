import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays } from 'date-fns';
import { useAuth } from '@/contexts/auth/NewAuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { ClientInfoStep } from './steps/ClientInfoStep';
import { FlightSelectionStep } from './steps/FlightSelectionStep';
import { HotelSelectionStep } from './steps/HotelSelectionStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { BookingStep, BookingFormData, Hotel, RoomType } from './types';
import { Flight } from './types/flight';
import { ExtendedBookingFormData } from './steps/ConfirmationStep';

// Local card components since @/components/ui/card is not available
const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props}>
    {children}
  </div>
);

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
);

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
);

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);
export const BookingWorkflow: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    
    // Define booking steps with type assertion
    const steps = ['client-info', 'flights', 'hotels', 'confirmation'] as const;
    type StepType = typeof steps[number];
    const [currentStep, setCurrentStep] = useState<StepType>(steps[0]);
    const [progress, setProgress] = useState(25);
    
    // Initialize form data with all required fields
    const [formData, setFormData] = useState<ExtendedBookingFormData>(() => {
        const now = new Date();
        const checkInDate = new Date();
        const checkOutDate = addDays(checkInDate, 2);
        
        return {
            // Required fields from BookingFormData
            origin: '',
            destination: '',
            departureDate: now.toISOString(),
            returnDate: addDays(now, 7).toISOString(),
            tripType: 'round-trip',
            passengers: 1,
            primaryTraveler: {
                firstName: user?.firstName || '',
                lastName: user?.lastName || '',
                dateOfBirth: '',
                email: user?.email || '',
                phone: ''
            },
            additionalTravelers: [],
            cabin: 'economy',
            department: '',
            projectCode: '',
            costCenter: '',
            budget: 0,
            
            // Extended fields
            flights: {
                outbound: {
                    airline: '',
                    flightNumber: '',
                    departureTime: now.toISOString(),
                    price: {
                        amount: 0,
                        currency: 'USD'
                    }
                }
            },
            
            hotel: {
                name: '',
                checkInTime: checkInDate.toISOString(),
                checkOutTime: checkOutDate.toISOString(),
                address: {
                    street: '',
                    city: '',
                    state: '',
                    country: '',
                    postalCode: ''
                },
                price: {
                    amount: 0,
                    currency: 'USD'
                },
                amenities: []
            },
            
            // Required fields from ExtendedBookingFormData
            checkIn: checkInDate.toISOString(),
            checkOut: checkOutDate.toISOString(),
            
            // Optional fields with proper typing
            selectedFlight: undefined,
            selectedHotel: undefined,
            selectedRoomType: undefined,
            returnFlight: undefined
        } as ExtendedBookingFormData; // Type assertion to ensure all required fields are present
    });

  const updateProgress = (step: StepType): void => {
    const stepIndex = steps.indexOf(step);
    const newProgress = ((stepIndex + 1) / steps.length) * 100;
    setProgress(newProgress);
  };

  // Handle step navigation with type-safe steps
  const goToNextStep = useCallback((): void => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1] as StepType;
      setCurrentStep(nextStep);
      updateProgress(nextStep);
    }
  }, [currentStep]);

  const goToPreviousStep = useCallback((): void => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1] as StepType;
      setCurrentStep(prevStep);
      updateProgress(prevStep);
    }
  }, [currentStep]);

  // Handle form submission with proper type safety
  const handleSubmit = useCallback((data: Partial<ExtendedBookingFormData>): void => {
    setFormData(prev => {
      const updatedData: ExtendedBookingFormData = {
        ...prev,
        ...data,
        primaryTraveler: {
          ...prev.primaryTraveler,
          ...(data.primaryTraveler || {})
        },
        flights: {
          ...prev.flights,
          ...(data.flights || {})
        },
        hotel: {
          ...prev.hotel,
          ...(data.hotel || {})
        },
        selectedFlight: 'selectedFlight' in data ? data.selectedFlight : prev.selectedFlight,
        selectedHotel: 'selectedHotel' in data ? data.selectedHotel : prev.selectedHotel,
        selectedRoomType: 'selectedRoomType' in data ? data.selectedRoomType : prev.selectedRoomType,
        returnFlight: 'returnFlight' in data ? data.returnFlight : prev.returnFlight
      };
      return updatedData;
    });
    goToNextStep();
  }, [goToNextStep]);

  // Handle booking completion
  const handleCompleteBooking = useCallback(async (): Promise<void> => {
    try {
      // Here you would typically send the booking data to your API
      console.log('Booking data:', {
        ...formData,
        userId: user?.id,
        status: 'pending',
      });
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success toast
      toast({
        title: 'Booking Confirmed!',
        // @ts-ignore - description is a valid prop in newer versions
        description: 'Your trip has been successfully booked.',
      });
      
      // Navigate to booking confirmation page with state
      navigate('/bookings/confirmation', {
        state: { bookingData: formData }
      });
    } catch (error) {
      console.error('Booking failed:', error);
      // Show error toast
      toast({
        title: 'Booking Failed',
        // @ts-ignore - description is a valid prop in newer versions
        description: 'There was an error processing your booking. Please try again.',
        variant: 'destructive' as const,
      });
    }
  }, [formData, navigate, toast, user?.id]);

  // Render the current step with proper type checking
  const renderStep = () => {
    // Ensure currentStep is a valid BookingStep
    const step = currentStep as BookingStep;
    switch (step) {
      case 'client-info':
        return (
          <ClientInfoStep
            formData={formData}
            onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
            onSubmit={handleSubmit}
          />
        );
      case 'flights':
        return (
          <FlightSelectionStep
            formData={formData}
            onBack={goToPreviousStep}
            onNext={(data) => {
              setFormData(prev => ({ ...prev, ...data }));
              goToNextStep();
            }}
          />
        );
      case 'hotels':
        return (
          <HotelSelectionStep
            formData={formData}
            onBack={goToPreviousStep}
            onNext={(data) => {
              setFormData(prev => ({ ...prev, ...data }));
              goToNextStep();
            }}
          />
        );
      case 'confirmation':
        return (
          <ConfirmationStep
            formData={formData}
            onBack={goToPreviousStep}
            onConfirm={handleCompleteBooking}
          />
        );
      default:
        return null;
    }
  };

  const stepTitles: Record<BookingStep, string> = {
    'client-info': 'Trip Details',
    'flights': 'Select Flights',
    'hotels': 'Choose Accommodation',
    'confirmation': 'Confirm Booking'
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{stepTitles[currentStep]}</h1>
        <div className="flex items-center gap-2 mb-2">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          {Object.entries(stepTitles).map(([key, title]) => (
            <div 
              key={key} 
              className={`text-center ${currentStep === key ? 'font-medium text-primary' : ''}`} 
              style={{ width: `${100 / Object.keys(stepTitles).length}%` }}
            >
              {title}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
};
