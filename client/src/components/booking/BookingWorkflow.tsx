import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { useAuth } from '@/contexts/auth/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { ClientInfoStep } from './steps/ClientInfoStep';
import { FlightSelectionStep } from './steps/FlightSelectionStep';
import { HotelSelectionStep } from './steps/HotelSelectionStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { BookingStep, BookingFormData, TravelerInfo, Flight, Hotel } from './types';

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
    // State for the current step
    const [currentStep, setCurrentStep] = useState<BookingStep>('client-info');
    const [progress, setProgress] = useState(25);
    // Form data state with all required fields
    const [formData, setFormData] = useState<Omit<BookingFormData, 'selectedFlight' | 'selectedHotel' | 'selectedRoomType' | 'returnFlight'>>(() => ({
        tripType: 'round-trip',
        origin: '',
        destination: '',
        departureDate: format(new Date(), 'yyyy-MM-dd'),
        returnDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        passengers: 1,
        primaryTraveler: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phone: '',
            dateOfBirth: '',
        },
        additionalTravelers: [],
        cabin: 'economy',
        location: '',
        checkIn: format(new Date(), 'yyyy-MM-dd'),
        checkOut: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
        guests: 1,
        rooms: 1,
        budget: undefined,
        department: '',
        projectCode: '',
        costCenter: '',
        // Initialize optional fields
        selectedFlight: undefined,
        selectedHotel: undefined,
        selectedRoomType: undefined,
        returnFlight: undefined
    }));
    // Update progress based on current step
    useEffect(() => {
        const progressMap: Record<BookingStep, number> = {
            'client-info': 25,
            'flights': 50,
            'hotels': 75,
            'confirmation': 100,
        };
        setProgress(progressMap[currentStep]);
    }, [currentStep]);
    // Handle step navigation
    const goToNextStep = useCallback(() => {
        const steps: BookingStep[] = ['client-info', 'flights', 'hotels', 'confirmation'];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex < steps.length - 1) {
            setCurrentStep(steps[currentIndex + 1]);
        }
    }, [currentStep]);
    const goToPreviousStep = useCallback(() => {
        const steps: BookingStep[] = ['client-info', 'flights', 'hotels', 'confirmation'];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(steps[currentIndex - 1]);
        }
    }, [currentStep]);
    // Handle form submission
    const handleSubmit = useCallback((data: Partial<BookingFormData>) => {
        setFormData(prev => ({
            ...prev,
            ...data,
            primaryTraveler: {
                ...prev.primaryTraveler,
                ...(data.primaryTraveler || {})
            },
            // Ensure these fields are always defined
            selectedFlight: (data as any).selectedFlight || null,
            selectedHotel: (data as any).selectedHotel || null,
            selectedRoomType: (data as any).selectedRoomType || null,
            returnFlight: (data as any).returnFlight || null
        } as BookingFormData));
        goToNextStep();
    }, [goToPreviousStep]);
    // Handle booking completion
    const handleCompleteBooking = useCallback(async () => {
        try {
            // Here you would typically send the booking data to your API
            console.log('Booking data:', {
                ...formData,
                userId: user?.id,
                status: 'pending',
            });
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast({
                title: 'Booking Confirmed!',
                description: 'Your trip has been successfully booked.',
            });
            // Navigate to booking confirmation page
            navigate('/bookings/confirmation');
        }
        catch (error) {
            console.error('Booking failed:', error);
            toast({
                title: 'Booking Failed',
                description: 'There was an error processing your booking. Please try again.',
                variant: 'destructive',
            });
        }
    }, [formData, navigate, toast, user?.id]);
    // Render the current step
    const renderStep = () => {
        switch (currentStep) {
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
                        formData={formData as BookingFormData} 
                        onBack={goToPreviousStep} 
                        onConfirm={handleCompleteBooking}
                        onNext={() => {}}
                    />
                );
            default:
                return null;
        }
    };
    // Step titles
    const stepTitles = {
        'client-info': 'Trip Details',
        'flights': 'Select Flights',
        'hotels': 'Choose Accommodation',
        'confirmation': 'Confirm Booking',
    };
    return (<div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{stepTitles[currentStep]}</h1>
        <div className="flex items-center gap-2 mb-2">
          <Progress value={progress} className="h-2 flex-1"/>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          {Object.entries(stepTitles).map(([key, title]) => (<div key={key} className={`text-center ${currentStep === key ? 'font-medium text-primary' : ''}`} style={{ width: `${100 / Object.keys(stepTitles).length}%` }}>
              {title}
            </div>))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {renderStep()}
        </CardContent>
      </Card>
    </div>);
};
