import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Edit, MapPin, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import TripPlanner from "./TripPlanner";

interface SharedTripData {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  city: string;
  sharePermission: "read-only" | "edit";
  activities: any[];
  notes: any[];
  todos: any[];
}

export default function SharedTrip() {
  const { shareCode } = useParams<{ shareCode: string }>();
  
  // Extract permission from URL parameters and initialize state
  const urlParams = new URLSearchParams(window.location.search);
  const urlPermission = urlParams.get('permission');
  
  const [permission] = useState<"read-only" | "edit">(() => {
    console.log('URL permission detected:', urlPermission);
    return (urlPermission === 'edit' || urlPermission === 'read-only') ? urlPermission : "read-only";
  });

  const { data: sharedTrip, isLoading, error } = useQuery({
    queryKey: [`/api/share/${shareCode}`],
    enabled: !!shareCode,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading shared trip...</p>
        </div>
      </div>
    );
  }

  if (error || !sharedTrip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Trip Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              This shared trip link is invalid or has been disabled.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show edit option button instead of automatic redirect to prevent React errors
  const handleEditRedirect = () => {
    if (sharedTrip && (sharedTrip as any).id) {
      window.location.href = `/trip/${(sharedTrip as any).id}`;
    }
  };

  // Read-only view
  const trip = sharedTrip as SharedTripData;
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Shared Trip
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              {permission === 'edit' ? (
                <>
                  <Edit className="w-3 h-3" />
                  Can Edit
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  View Only
                </>
              )}
            </Badge>
            {permission === 'edit' && (
              <Button onClick={handleEditRedirect} className="ml-auto">
                <Edit className="w-4 h-4 mr-2" />
                Edit Trip
              </Button>
            )}
          </div>
          
          <h1 className="text-3xl font-bold mb-2">{trip.title}</h1>
          
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {trip.city}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
            </div>
          </div>
        </div>

        {/* Activities */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Itinerary ({trip.activities?.length || 0} activities)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trip.activities?.length > 0 ? (
              <div className="space-y-4">
                {trip.activities.map((activity: any, index: number) => (
                  <div key={activity.id} className="flex gap-4 p-4 rounded-lg border">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{activity.title}</h4>
                      <div className="text-sm text-muted-foreground mt-1">
                        {activity.time && (
                          <span className="mr-4">🕒 {activity.time}</span>
                        )}
                        {activity.locationName && (
                          <span>📍 {activity.locationName}</span>
                        )}
                      </div>
                      {activity.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{activity.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No activities planned yet</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {trip.notes?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trip.notes.map((note: any) => (
                  <div key={note.id} className="p-3 rounded-lg border">
                    <p>{note.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Todos */}
        {trip.todos?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>To-Do List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trip.todos.map((todo: any) => (
                  <div key={todo.id} className="flex items-center gap-3 p-2">
                    <div className={`w-4 h-4 rounded border ${todo.completed ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                    <span className={todo.completed ? 'line-through text-muted-foreground' : ''}>{todo.task}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call to action */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            Like this trip? Create your own with VoyageOps!
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Start Planning Your Trip
          </Button>
        </div>
      </div>
    </div>
  );
}