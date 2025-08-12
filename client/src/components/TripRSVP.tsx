import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Users, Clock, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { formatDate } from '@/lib/constants';

interface TripRSVPProps {
  tripId: string | number;
  tripTitle: string;
  tripDates: { start: Date; end: Date };
  deadline?: Date;
  maxAttendees?: number;
  isOwner: boolean;
}

interface RSVPData {
  id: number;
  email: string;
  name: string;
  status: 'pending' | 'yes' | 'no' | 'maybe';
  attendingCount: number;
  dietaryRestrictions?: string;
  notes?: string;
  respondedAt?: Date;
}

export default function TripRSVP({
  tripId,
  tripTitle,
  tripDates,
  deadline,
  maxAttendees,
  isOwner
}: TripRSVPProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [existingRsvp, setExistingRsvp] = useState<RSVPData | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    status: 'pending' as 'pending' | 'yes' | 'no' | 'maybe',
    attendingCount: 1,
    dietaryRestrictions: '',
    notes: ''
  });

  // Fetch RSVPs
  const { data: rsvpData, isLoading } = useQuery({
    queryKey: ['rsvps', tripId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/rsvp/trip/${tripId}`);
      return response as { rsvps: RSVPData[]; stats: any };
    }
  });

  // Check for existing RSVP when email is entered
  useEffect(() => {
    if (formData.email && formData.email.includes('@')) {
      checkExistingRsvp(formData.email);
    }
  }, [formData.email]);

  const checkExistingRsvp = async (email: string) => {
    try {
      const response = await apiRequest('GET', `/api/rsvp/trip/${tripId}/email/${email}`);
      if (response) {
        setExistingRsvp(response);
        setFormData({
          ...formData,
          name: response.name,
          status: response.status,
          attendingCount: response.attendingCount || 1,
          dietaryRestrictions: response.dietaryRestrictions || '',
          notes: response.notes || ''
        });
      }
    } catch (error) {
      // No existing RSVP
      setExistingRsvp(null);
    }
  };

  // Submit RSVP mutation
  const submitRsvp = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/rsvp', {
        tripId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rsvps', tripId] });
      toast({
        title: existingRsvp ? 'RSVP Updated!' : 'RSVP Submitted!',
        description: 'Thank you for your response.'
      });
      setShowForm(false);
    }
  });

  // Delete RSVP mutation (for owner)
  const deleteRsvp = useMutation({
    mutationFn: async (rsvpId: number) => {
      return apiRequest('DELETE', `/api/rsvp/${rsvpId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rsvps', tripId] });
      toast({
        title: 'RSVP Removed',
        description: 'The RSVP has been deleted.'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitRsvp.mutate(formData);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'yes': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'no': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'maybe': return <HelpCircle className="w-5 h-5 text-yellow-600" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'yes': return 'bg-green-100 text-green-800';
      case 'no': return 'bg-red-100 text-red-800';
      case 'maybe': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading RSVPs...</div>;
  }

  const stats = rsvpData?.stats;
  const rsvps = rsvpData?.rsvps || [];
  const spotsRemaining = maxAttendees ? maxAttendees - (stats?.attending || 0) : null;
  const deadlinePassed = deadline && new Date(deadline) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">{tripTitle}</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(tripDates.start)} - {formatDate(tripDates.end)}</span>
          </div>
          {deadline && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>RSVP by {formatDate(deadline)}</span>
            </div>
          )}
          {maxAttendees && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{spotsRemaining} spots remaining</span>
            </div>
          )}
        </div>
      </div>

      {/* RSVP Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats?.attending || 0}</div>
          <div className="text-sm text-muted-foreground">Attending</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats?.maybe || 0}</div>
          <div className="text-sm text-muted-foreground">Maybe</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats?.declined || 0}</div>
          <div className="text-sm text-muted-foreground">Can't Make It</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{stats?.pending || 0}</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </Card>
      </div>

      {/* RSVP Form or Button */}
      {!isOwner && (
        <>
          {!showForm ? (
            <Button
              onClick={() => setShowForm(true)}
              disabled={deadlinePassed}
              size="lg"
              className="w-full"
            >
              {deadlinePassed ? 'RSVP Deadline Passed' : 'RSVP Now'}
            </Button>
          ) : (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {existingRsvp ? 'Update Your RSVP' : 'Submit Your RSVP'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Will you be attending? *</Label>
                  <RadioGroup
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="yes" />
                      <Label htmlFor="yes">Yes, I'll be there!</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="no" />
                      <Label htmlFor="no">Sorry, can't make it</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="maybe" id="maybe" />
                      <Label htmlFor="maybe">Maybe</Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.status === 'yes' && (
                  <>
                    <div>
                      <Label htmlFor="attendingCount">Number of people in your party</Label>
                      <Input
                        id="attendingCount"
                        type="number"
                        min="1"
                        max={spotsRemaining ? spotsRemaining : 10}
                        value={formData.attendingCount}
                        onChange={(e) => setFormData({ ...formData, attendingCount: parseInt(e.target.value) })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="dietary">Dietary restrictions</Label>
                      <Input
                        id="dietary"
                        value={formData.dietaryRestrictions}
                        onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                        placeholder="Vegetarian, vegan, allergies, etc."
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="notes">Additional notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any questions or comments?"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitRsvp.isPending}>
                    {existingRsvp ? 'Update RSVP' : 'Submit RSVP'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </>
      )}

      {/* RSVP List (visible to owner) */}
      {isOwner && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Guest List</h3>
          
          {rsvps.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No RSVPs yet. Share your trip to start collecting responses!
            </Card>
          ) : (
            <div className="space-y-2">
              {rsvps.map((rsvp: any) => (
                <Card key={rsvp.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(rsvp.status)}
                        <span className="font-medium">{rsvp.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(rsvp.status)}`}>
                          {rsvp.status === 'yes' ? 'Attending' : 
                           rsvp.status === 'no' ? 'Not Attending' :
                           rsvp.status === 'maybe' ? 'Maybe' : 'Pending'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {rsvp.email}
                        {rsvp.attending_count > 1 && ` • ${rsvp.attending_count} people`}
                      </div>
                      {rsvp.dietary_restrictions && (
                        <div className="text-sm mt-1">
                          🍽️ {rsvp.dietary_restrictions}
                        </div>
                      )}
                      {rsvp.notes && (
                        <div className="text-sm mt-1 italic">
                          "{rsvp.notes}"
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteRsvp.mutate(rsvp.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}