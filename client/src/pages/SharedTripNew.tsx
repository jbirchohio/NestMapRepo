import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Edit, MapPin, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

interface SharedTripData {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  activities: any[];
  notes: any[];
  todos: any[];
}

export default function SharedTripNew() {
  const { shareCode } = useParams<{ shareCode: string }>();
  
  // Get permission from URL parameters directly
  const urlParams = new URLSearchParams(window.location.search);
  const permission = urlParams.get('permission') === 'edit' ? 'edit' : 'read-only';
  
  console.log('URL permission detected:', permission);

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

  const handleEditRedirect = () => {
    if (sharedTrip && (sharedTrip as any).id) {
      window.location.href = `/trip/${(sharedTrip as any).id}`;
    }
  };

  const trip = sharedTrip as SharedTripData;
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{trip.title}</h1>
                <Badge variant={permission === 'edit' ? 'default' : 'secondary'}>
                  {permission === 'edit' ? <Edit className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                  {permission === 'edit' ? 'Editable' : 'Read Only'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {trip.location}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
            
            {permission === 'edit' && (
              <Button onClick={handleEditRedirect} className="ml-4">
                <Edit className="w-4 h-4 mr-2" />
                Edit Trip
              </Button>
            )}
          </div>

          {/* Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Activities ({trip.activities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trip.activities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No activities planned yet.</p>
              ) : (
                <div className="space-y-4">
                  {trip.activities.map((activity: any) => (
                    <div key={activity.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h3 className="font-medium">{activity.title}</h3>
                        <p className="text-sm text-muted-foreground">{activity.locationName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(activity.date), 'MMM d')}</span>
                          <span>•</span>
                          <span>{activity.time}</span>
                        </div>
                      </div>
                      {activity.completed && (
                        <Badge variant="outline" className="text-green-600">
                          Completed
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes ({trip.notes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {trip.notes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No notes added yet.</p>
              ) : (
                <div className="space-y-3">
                  {trip.notes.map((note: any) => (
                    <div key={note.id} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Todos */}
          <Card>
            <CardHeader>
              <CardTitle>To-Do List ({trip.todos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {trip.todos.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No tasks added yet.</p>
              ) : (
                <div className="space-y-2">
                  {trip.todos.map((todo: any) => (
                    <div key={todo.id} className="flex items-center gap-3 p-2">
                      <div className={`w-4 h-4 rounded border-2 ${todo.completed ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                      <span className={todo.completed ? 'line-through text-muted-foreground' : ''}>{todo.task}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}