import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, MapPin, Calendar, UserPlus, Sparkles, MessageSquare, Plus } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/JWTAuthContext";
import AuthModalSimple from "@/components/auth/AuthModalSimple";

export default function SimpleShare() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<'edit' | 'suggest' | 'create'>('edit');

  // Get permission directly from URL
  const permission = new URLSearchParams(window.location.search).get('permission') || 'read-only';

  // Use public endpoint that doesn't require auth
  const { data: trip, isLoading, error } = useQuery({
    queryKey: [`/api/public/share/${shareCode}`],
    queryFn: async () => {
      const response = await fetch(`/api/public/share/${shareCode}`);
      if (!response.ok) {
        throw new Error('Trip not found');
      }
      return response.json();
    },
    enabled: !!shareCode,
  });

  const handleAction = (action: 'edit' | 'suggest' | 'create') => {
    if (user) {
      // User is logged in, proceed with action
      if (action === 'edit' || action === 'suggest') {
        setLocation(`/trip/${trip.id}`);
      } else {
        setLocation('/');
      }
    } else {
      // Show auth modal
      setAuthAction(action);
      setShowAuthModal(true);
      
      // Track conversion attempt
      fetch(`/api/public/share/${shareCode}/interested`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Trip not found</h2>
            <p className="text-muted-foreground mb-4">
              This trip may have been removed or the link is incorrect.
            </p>
            <Button onClick={() => setLocation('/')}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky CTA Banner for non-logged-in users */}
      {!user && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5" />
              <p className="font-medium">
                Love this trip? Create your own with Remvana!
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAction('create')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Trip
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-white/90"
                onClick={() => handleAction('suggest')}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Suggest
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{trip.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {trip.destination || trip.location}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
              </div>
              <Badge variant="secondary">
                {trip.duration} days
              </Badge>
            </div>
            {trip.description && (
              <p className="mt-3 text-muted-foreground">{trip.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={permission === 'edit' ? 'default' : 'secondary'}>
              {permission === 'edit' ? 'Editable' : 'View Only'}
            </Badge>

            {user && (
              <Button
                onClick={() => setLocation(`/trip/${trip.id}`)}
                size="sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Open in Planner
              </Button>
            )}
          </div>
        </div>

        {/* Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Activities
              <Badge variant="outline">{trip.activitiesCount} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trip.activities?.length > 0 ? (
              <div className="space-y-3">
                {trip.activities.map((activity: any) => (
                  <div key={activity.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-lg">{activity.title}</div>
                        {activity.locationName && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {activity.locationName}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground mt-1">
                          {format(new Date(activity.date), 'EEEE, MMM d')} 
                          {activity.time && ` at ${activity.time}`}
                          {activity.duration && ` • ${activity.duration} hours`}
                        </div>
                        {activity.notes && (
                          <p className="text-sm mt-2">{activity.notes}</p>
                        )}
                      </div>
                      {activity.category && (
                        <Badge variant="outline">{activity.category}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No activities yet</p>
            )}
          </CardContent>
        </Card>

        {/* Notes - only show if permission allows */}
        {permission === 'edit' && trip.notes?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trip.notes.map((note: any) => (
                  <div key={note.id} className="p-3 bg-muted rounded-lg">
                    <p>{note.content}</p>
                    {note.createdAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Todos - only show if permission allows */}
        {permission === 'edit' && trip.todos?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>To-Do List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trip.todos.map((todo: any) => (
                  <div key={todo.id} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      todo.completed ? 'bg-primary border-primary' : 'border-muted-foreground'
                    }`}>
                      {todo.completed && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={todo.completed ? 'line-through text-muted-foreground' : ''}>
                      {todo.task}
                    </span>
                    {todo.priority && (
                      <Badge variant={todo.priority === 'high' ? 'destructive' : 'secondary'} className="ml-auto">
                        {todo.priority}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sign Up CTA for non-logged-in users */}
        {!user && (
          <Alert className="border-purple-200 bg-purple-50">
            <UserPlus className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <p className="font-medium text-base mb-1">Want to create your own trip?</p>
                <p className="text-sm text-muted-foreground">
                  Sign up free to start planning your perfect vacation with AI assistance.
                </p>
              </div>
              <Button 
                onClick={() => handleAction('create')}
                className="ml-4"
              >
                Sign Up Free
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModalSimple
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialView="signup"
          redirectPath={authAction === 'create' ? '/' : `/trip/${trip.id}`}
        />
      )}
    </div>
  );
}