import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ClientTripComment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Reply, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TripCommentsProps {
  tripId: string | number;
  activityId?: number;
  suggestionId?: number;
  isAuthenticated: boolean;
}

export default function TripComments({
  tripId,
  activityId,
  suggestionId,
  isAuthenticated
}: TripCommentsProps) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    comment: '',
    commenterName: ''
  });

  // Build query params
  const queryParams = new URLSearchParams();
  if (activityId) queryParams.append('activityId', activityId.toString());
  if (suggestionId) queryParams.append('suggestionId', suggestionId.toString());

  // Fetch comments
  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', tripId, activityId, suggestionId],
    queryFn: async () => {
      const url = `/api/comments/trip/${tripId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiRequest('GET', url);
      return response as ClientTripComment[];
    }
  });

  // Create comment mutation
  const createComment = useMutation({
    mutationFn: async (data: typeof formData & { parentCommentId?: number }) => {
      return apiRequest('POST', '/api/comments', {
        tripId,
        activityId,
        suggestionId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', tripId, activityId, suggestionId] });
      toast({
        title: 'Comment Posted!',
        description: 'Your comment has been added to the discussion.'
      });
      setShowAddForm(false);
      setReplyingTo(null);
      setFormData({
        comment: '',
        commenterName: ''
      });
    }
  });

  const handleSubmit = (e: React.FormEvent, parentCommentId?: number) => {
    e.preventDefault();
    createComment.mutate({
      ...formData,
      parentCommentId
    });
  };

  const renderComment = (comment: ClientTripComment, depth = 0) => {
    const isReply = depth > 0;
    
    return (
      <div key={comment.id} className={`${isReply ? 'ml-8 mt-2' : 'mb-3'}`}>
        <Card className={`p-3 ${isReply ? 'bg-muted/30' : ''}`}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {comment.commenterName || comment.userName || 'Anonymous'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
              
              <p className="text-sm">{comment.comment}</p>
              
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="text-xs text-muted-foreground hover:text-primary mt-2 flex items-center gap-1"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
              
              {replyingTo === comment.id && (
                <form onSubmit={(e) => handleSubmit(e, comment.id)} className="mt-3 space-y-2">
                  {!isAuthenticated && (
                    <Input
                      placeholder="Your name (optional)"
                      value={formData.commenterName}
                      onChange={(e) => setFormData({ ...formData, commenterName: e.target.value })}
                      className="text-sm"
                    />
                  )}
                  
                  <Textarea
                    placeholder="Write your reply..."
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    rows={2}
                    required
                    className="text-sm"
                  />
                  
                  <div className="flex gap-2">
                    <Button size="sm" type="submit" disabled={createComment.isPending}>
                      Post Reply
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => setReplyingTo(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </Card>
        
        {comment.replies?.map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4">Loading comments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Discussion
        </h3>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
          variant="outline"
        >
          Add Comment
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4 mb-4">
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-3">
            {!isAuthenticated && (
              <Input
                placeholder="Your name (optional)"
                value={formData.commenterName}
                onChange={(e) => setFormData({ ...formData, commenterName: e.target.value })}
              />
            )}
            
            <Textarea
              placeholder="Share your thoughts..."
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={3}
              required
            />
            
            <div className="flex gap-2">
              <Button type="submit" disabled={createComment.isPending}>
                Post Comment
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
                Sign up to get notifications when someone replies to your comments!
              </p>
            )}
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {comments?.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No comments yet. Start the discussion!
          </Card>
        ) : (
          comments?.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
}