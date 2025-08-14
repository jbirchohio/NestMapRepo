import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface ActivityGeneratorProps {
  tripId: string;
  onActivitiesGenerated?: () => void;
}

export default function ActivityGenerator({ tripId, onActivitiesGenerated }: ActivityGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentDay, setCurrentDay] = useState(1);
  const [totalDays, setTotalDays] = useState(0);
  const [activitiesCreated, setActivitiesCreated] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if we need to generate activities
    const shouldGenerate = localStorage.getItem(`trip_${tripId}_generating`);
    const metadata = localStorage.getItem(`trip_${tripId}_metadata`);
    
    if (shouldGenerate === 'true' && metadata) {
      const tripMetadata = JSON.parse(metadata);
      startGeneration(tripMetadata);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [tripId]);

  const startGeneration = async (metadata: any) => {
    setIsGenerating(true);
    setError(null);
    
    // Calculate total days
    const startDate = new Date(metadata.startDate);
    const endDate = new Date(metadata.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setTotalDays(days);
    
    try {
      // First, create any initial activities that were provided
      if (metadata.initialActivities && metadata.initialActivities.length > 0) {
        await createInitialActivities(metadata.initialActivities, metadata);
      }
      
      // Then generate the full itinerary
      await generateFullItinerary(days);
      
      // Clean up localStorage
      localStorage.removeItem(`trip_${tripId}_generating`);
      localStorage.removeItem(`trip_${tripId}_metadata`);
      
      // Notify parent component
      if (onActivitiesGenerated) {
        onActivitiesGenerated();
      }
      
      toast({
        title: "✨ Itinerary Complete!",
        description: `Created ${activitiesCreated} activities for your ${days}-day trip`,
      });
      
      // Hide the generator after a short delay
      setTimeout(() => {
        setIsGenerating(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error generating activities:', error);
      setError('Failed to generate some activities. You can add them manually.');
      
      // Clean up localStorage even on error
      localStorage.removeItem(`trip_${tripId}_generating`);
      localStorage.removeItem(`trip_${tripId}_metadata`);
      
      toast({
        title: "Partial Generation",
        description: "Some activities were created. You can add more manually.",
        variant: "default",
      });
    }
  };

  const createInitialActivities = async (activities: any[], metadata: any) => {
    const startDate = new Date(metadata.startDate);
    const endDate = new Date(metadata.endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    let created = 0;
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      
      try {
        // Fix activity date to be within trip range
        let activityDate = activity.date;
        const actDate = new Date(activityDate);
        
        if (isNaN(actDate.getTime()) || actDate < startDate || actDate > endDate) {
          // Distribute activities evenly across trip days
          const dayIndex = Math.min(Math.floor(i / 3), daysDiff - 1);
          const newDate = new Date(startDate);
          newDate.setDate(startDate.getDate() + dayIndex);
          activityDate = newDate.toISOString().split('T')[0];
        }
        
        const activityData = {
          trip_id: parseInt(tripId),
          title: activity.title,
          date: activityDate,
          time: activity.time || '09:00',
          location_name: activity.locationName || activity.location_name || '',
          notes: activity.notes || '',
          latitude: activity.latitude,
          longitude: activity.longitude,
          tag: activity.tag || 'activity',
          order: i
        };
        
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(activityData)
        });

        if (response.ok) {
          created++;
          setActivitiesCreated(prev => prev + 1);
          setProgress((created / activities.length) * 30); // First 30% for initial activities
        }
      } catch (error) {
        console.error('Error creating activity:', error);
      }
    }
  };

  const generateFullItinerary = async (days: number) => {
    const BATCH_SIZE = 3; // Generate 3 days at a time
    const totalBatches = Math.ceil(days / BATCH_SIZE);
    
    // Start polling for activities
    let pollCount = 0;
    const maxPolls = 60; // Max 60 seconds
    
    // Start the generation
    const genResponse = await fetch('/api/ai/generate-full-itinerary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ trip_id: parseInt(tripId) })
    });
    
    if (!genResponse.ok) {
      throw new Error('Failed to start generation');
    }
    
    // Poll for new activities
    intervalRef.current = setInterval(async () => {
      pollCount++;
      
      try {
        const response = await fetch(`/api/trips/${tripId}/activities`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const activities = await response.json();
          const currentCount = activities.length;
          
          // Update progress
          const expectedActivities = days * 3;
          const progressPercent = Math.min(30 + (currentCount / expectedActivities) * 70, 100);
          setProgress(progressPercent);
          setActivitiesCreated(currentCount);
          
          // Update current day being processed
          const dayBeingProcessed = Math.min(Math.ceil(currentCount / 3), days);
          setCurrentDay(dayBeingProcessed);
          
          // Check if we have enough activities or timeout
          if (currentCount >= expectedActivities || pollCount >= maxPolls) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setProgress(100);
          }
        }
      } catch (error) {
        console.error('Error polling activities:', error);
      }
    }, 1000); // Poll every second
  };

  if (!isGenerating) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md"
      >
        <div className="bg-white rounded-lg shadow-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            {error ? (
              <AlertCircle className="w-6 h-6 text-yellow-500" />
            ) : progress === 100 ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold">
                {error ? 'Generation Incomplete' : progress === 100 ? 'Itinerary Complete!' : 'Generating Your Itinerary'}
              </h3>
              <p className="text-sm text-gray-600">
                {error ? error : progress === 100 
                  ? `Created ${activitiesCreated} activities`
                  : `Processing day ${currentDay} of ${totalDays}...`}
              </p>
            </div>
          </div>
          
          <Progress value={progress} className="mb-3" />
          
          {!error && progress < 100 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Sparkles className="w-4 h-4" />
              <span>AI is crafting personalized activities for your trip</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}