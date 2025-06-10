import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function SimpleShare() {
  const { shareCode } = useParams<{ shareCode: string }>();
  
  // Get permission directly from URL
  const permission = new URLSearchParams(window.location.search).get('permission') || 'read-only';
  
  const { data: trip, isLoading, error } = useQuery({
    queryKey: [`/api/share/${shareCode}`],
    enabled: !!shareCode,
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (error || !trip) {
    return <div className="p-8 text-center">Trip not found</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{(trip as any).title}</h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {(trip as any).location}
              <Calendar className="w-4 h-4 ml-4" />
              {format(new Date((trip as any).startDate), 'MMM d')} - {format(new Date((trip as any).endDate), 'MMM d, yyyy')}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={permission === 'edit' ? 'default' : 'secondary'}>
              {permission === 'edit' ? 'Editable' : 'Read Only'}
            </Badge>
            
            {permission === 'edit' && (
              <Button
                onClick={() => window.location.href = `/trip/${(trip as any).id}`}
                size="sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Trip
              </Button>
            )}
          </div>
        </div>

        {/* Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {(trip as any).activities?.length > 0 ? (
              <div className="space-y-3">
                {(trip as any).activities.map((activity: any) => (
                  <div key={activity.id} className="p-3 border rounded">
                    <div className="font-medium">{activity.title}</div>
                    <div className="text-sm text-muted-foreground">{activity.locationName}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(activity.date), 'MMM d')} at {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No activities yet</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {(trip as any).notes?.length > 0 ? (
              <div className="space-y-2">
                {(trip as any).notes.map((note: any) => (
                  <div key={note.id} className="p-2 bg-muted rounded">
                    {note.content}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No notes yet</p>
            )}
          </CardContent>
        </Card>

        {/* Todos */}
        <Card>
          <CardHeader>
            <CardTitle>To-Do List</CardTitle>
          </CardHeader>
          <CardContent>
            {(trip as any).todos?.length > 0 ? (
              <div className="space-y-2">
                {(trip as any).todos.map((todo: any) => (
                  <div key={todo.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border-2 ${todo.completed ? 'bg-primary' : ''}`} />
                    <span className={todo.completed ? 'line-through text-muted-foreground' : ''}>
                      {todo.task}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No tasks yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
