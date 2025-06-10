import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle, Calendar, MapPin, Users } from 'lucide-react';

interface BookingStep {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  description?: string;
  estimatedTime?: string;
}

interface BookingProgressProps {
  steps: BookingStep[];
  currentStep: string;
  tripDetails?: {
    destination: string;
    dates: string;
    travelers: number;
  };
  onStepClick?: (stepId: string) => void;
}

export function BookingProgress({ 
  steps, 
  currentStep, 
  tripDetails,
  onStepClick 
}: BookingProgressProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Trip Summary */}
      {tripDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trip Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{tripDetails.destination}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{tripDetails.dates}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{tripDetails.travelers} travelers</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Booking Progress</span>
            <Badge variant="outline">
              {completedSteps} of {steps.length} completed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progressPercentage} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {progressPercentage === 100 
                ? 'Booking complete!' 
                : `${Math.round(progressPercentage)}% complete`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Steps List */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`p-4 rounded-lg border transition-colors ${
                  getStepColor(step.status)
                } ${
                  onStepClick && step.status === 'completed' 
                    ? 'cursor-pointer hover:opacity-80' 
                    : ''
                }`}
                onClick={() => onStepClick && step.status === 'completed' && onStepClick(step.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStepIcon(step.status)}
                    <div>
                      <h3 className="font-medium">{step.title}</h3>
                      {step.description && (
                        <p className="text-sm opacity-80 mt-1">{step.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {step.estimatedTime && step.status === 'pending' && (
                      <Badge variant="outline" className="text-xs">
                        ~{step.estimatedTime}
                      </Badge>
                    )}
                    
                    {step.id === currentStep && (
                      <Badge className="text-xs">Current</Badge>
                    )}
                  </div>
                </div>

                {/* Connection line to next step */}
                {index < steps.length - 1 && (
                  <div className="ml-2.5 mt-2 h-4 w-px bg-gray-300"></div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
