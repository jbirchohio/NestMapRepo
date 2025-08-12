import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ClientActivitySuggestion } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, ThumbsDown, Check, X, MessageCircle, Plus } from 'lucide-react';
import { formatDate } from '@/lib/constants';

interface CollaborativeSuggestionsProps {
  tripId: string | number;
  isOwner: boolean;
  isAuthenticated: boolean;
}

export default function CollaborativeSuggestions({
  tripId,
  isOwner,
  isAuthenticated
}: CollaborativeSuggestionsProps) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    locationName: '',
    date: '',
    time: '',
    estimatedCost: '',
    notes: '',
    suggestedByName: ''
  });

  // Fetch suggestions
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['suggestions', tripId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/suggestions/trip/${tripId}`);
      return response as ClientActivitySuggestion[];
    }
  });

  // Create suggestion mutation
  const createSuggestion = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/suggestions', {
        ...data,
        tripId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions', tripId] });
      toast({
        title: 'Suggestion Added!',
        description: 'Your suggestion has been submitted for review.'
      });
      setShowAddForm(false);
      setFormData({
        title: '',
        description: '',
        locationName: '',
        date: '',
        time: '',
        estimatedCost: '',
        notes: '',
        suggestedByName: ''
      });
    }
  });

  // Vote mutation
  const voteSuggestion = useMutation({
    mutationFn: async ({ suggestionId, vote }: { suggestionId: number; vote: 'up' | 'down' }) => {
      return apiRequest('POST', `/api/suggestions/${suggestionId}/vote`, { vote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions', tripId] });
    }
  });

  // Accept suggestion mutation
  const acceptSuggestion = useMutation({
    mutationFn: async (suggestionId: number) => {
      return apiRequest('POST', `/api/suggestions/${suggestionId}/accept`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'activities'] });
      toast({
        title: 'Suggestion Accepted!',
        description: 'The suggestion has been added to your itinerary.'
      });
    }
  });

  // Reject suggestion mutation
  const rejectSuggestion = useMutation({
    mutationFn: async (suggestionId: number) => {
      return apiRequest('POST', `/api/suggestions/${suggestionId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions', tripId] });
      toast({
        title: 'Suggestion Rejected',
        description: 'The suggestion has been marked as rejected.'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSuggestion.mutate(formData);
  };

  if (isLoading) {
    return <div className="p-4">Loading suggestions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Community Suggestions</h3>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Suggestion
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4 mb-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isAuthenticated && (
              <Input
                placeholder="Your name (optional)"
                value={formData.suggestedByName}
                onChange={(e) => setFormData({ ...formData, suggestedByName: e.target.value })}
              />
            )}
            
            <Input
              placeholder="Activity title *"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            
            <Textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
            
            <Input
              placeholder="Location"
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
            />
            
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
            
            <Input
              type="number"
              placeholder="Estimated cost ($)"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
            />
            
            <Textarea
              placeholder="Additional notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
            
            <div className="flex gap-2">
              <Button type="submit" disabled={createSuggestion.isPending}>
                Submit Suggestion
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
            
            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground">
                Sign up to track your suggestions and get notifications when they're accepted!
              </p>
            )}
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {suggestions?.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No suggestions yet. Be the first to suggest an activity!
          </Card>
        ) : (
          suggestions?.map((suggestion) => (
            <Card key={suggestion.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{suggestion.title}</h4>
                    {suggestion.status === 'accepted' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Accepted
                      </span>
                    )}
                    {suggestion.status === 'rejected' && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        Rejected
                      </span>
                    )}
                  </div>
                  
                  {suggestion.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {suggestion.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {suggestion.locationName && (
                      <span>📍 {suggestion.locationName}</span>
                    )}
                    {suggestion.date && (
                      <span>📅 {formatDate(new Date(suggestion.date))}</span>
                    )}
                    {suggestion.time && (
                      <span>⏰ {suggestion.time}</span>
                    )}
                    {suggestion.estimatedCost && (
                      <span>💰 ${suggestion.estimatedCost}</span>
                    )}
                  </div>
                  
                  {suggestion.notes && (
                    <p className="text-sm mt-2 italic">"{suggestion.notes}"</p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={() => voteSuggestion.mutate({ suggestionId: suggestion.id, vote: 'up' })}
                      className="flex items-center gap-1 text-sm hover:text-green-600"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{suggestion.votesUp}</span>
                    </button>
                    
                    <button
                      onClick={() => voteSuggestion.mutate({ suggestionId: suggestion.id, vote: 'down' })}
                      className="flex items-center gap-1 text-sm hover:text-red-600"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span>{suggestion.votesDown}</span>
                    </button>
                    
                    <span className="text-xs text-muted-foreground">
                      by {suggestion.suggestedByName || 'Anonymous'}
                    </span>
                  </div>
                </div>
                
                {isOwner && suggestion.status === 'pending' && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => acceptSuggestion.mutate(suggestion.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => rejectSuggestion.mutate(suggestion.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}