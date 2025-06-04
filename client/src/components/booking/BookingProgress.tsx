import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, User, Plane, Hotel, CreditCard } from 'lucide-react';

interface BookingProgressProps {
  currentStep: 'flights' | 'payment' | 'complete';
  currentTravelerIndex: number;
  totalTravelers: number;
  tripDestination: string;
  departureDate: string;
  returnDate?: string;
}

export function BookingProgress({ 
  currentStep, 
  currentTravelerIndex, 
  totalTravelers, 
  tripDestination, 
  departureDate, 
  returnDate 
}: BookingProgressProps) {
  const getStepProgress = () => {
    switch (currentStep) {
      case 'flights':
        return (currentTravelerIndex / totalTravelers) * 60;
      case 'payment':
        return 80;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'flights':
        return Plane;
      case 'payment':
        return CreditCard;
      case 'complete':
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const steps = [
    { id: 'flights', label: 'Flight Selection', description: 'Choose flights for travelers' },
    { id: 'payment', label: 'Payment', description: 'Process booking payment' },
    { id: 'complete', label: 'Complete', description: 'Booking confirmed' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Booking Progress
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tripDestination} • {new Date(departureDate).toLocaleDateString()}
            {returnDate && ` - ${new Date(returnDate).toLocaleDateString()}`}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {currentTravelerIndex + 1} of {totalTravelers}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Progress</span>
          <span>{Math.round(getStepProgress())}%</span>
        </div>
        <Progress value={getStepProgress()} className="h-2" />
        
        <div className="flex justify-between items-center">
          {steps.map((step, index) => {
            const StepIcon = getStepIcon(step.id);
            const isCompleted = currentStep === 'complete' || 
              (currentStep === 'payment' && step.id === 'flights') ||
              (currentStep === 'flights' && step.id === 'flights' && currentTravelerIndex === totalTravelers);
            const isCurrent = currentStep === step.id;
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div className={`
                  w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2
                  ${isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : isCurrent 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-gray-100 border-gray-300 text-gray-400 dark:bg-gray-700 dark:border-gray-600'
                  }
                `}>
                  <StepIcon className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <div className={`text-sm font-medium ${
                    isCompleted || isCurrent 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {step.description}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    h-px bg-gray-300 dark:bg-gray-600 w-full mt-5 absolute
                    ${isCompleted ? 'bg-green-500' : ''}
                  `} style={{ top: '20px', left: '50%', zIndex: -1 }} />
                )}
              </div>
            );
          })}
        </div>

        {currentStep === 'flights' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                Booking flights for traveler {currentTravelerIndex + 1} of {totalTravelers}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}