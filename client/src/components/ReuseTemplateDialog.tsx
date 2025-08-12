import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReuseTemplateDialogProps {
  template: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export default function ReuseTemplateDialog({ template, isOpen, onClose, onSuccess }: ReuseTemplateDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Calculate end date based on start date and duration
  const calculateEndDate = (start: string) => {
    if (!start) return '';
    const date = new Date(start);
    date.setDate(date.getDate() + (template.duration || 7) - 1);
    return date.toISOString().split('T')[0];
  };

  const endDate = calculateEndDate(startDate);

  // Set default start date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(tomorrow.toISOString().split('T')[0]);
  }, []); // Run once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate) {
      setError('Please select a start date');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Call the reuse endpoint directly (no payment needed)
      const response = await fetch('/api/templates/reuse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          template_id: template.id,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create trip from template');
      }

      const data = await response.json();

      toast({
        title: 'Trip created!',
        description: `Your ${template.duration}-day ${template.title} trip has been created.`,
      });

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      toast({
        title: 'Failed to create trip',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Use Template Again</DialogTitle>
          <DialogDescription>
            You own this template! Select your travel dates to create a new trip.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Info */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{template.title}</h3>
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {template.destinations?.join(', ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{template.duration} days</p>
                <p className="text-xs text-green-600 font-medium mt-1">Owned</p>
              </div>
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              When are you traveling?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Your {template.duration}-day itinerary will be scheduled for these dates
            </p>
          </div>

          {/* Benefits Reminder */}
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-sm text-green-800">
              ✓ No additional payment required<br />
              ✓ Create unlimited trips from this template<br />
              ✓ Each trip can be customized independently
            </AlertDescription>
          </Alert>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Trip...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Create Trip
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}