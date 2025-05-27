import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, ExternalLink, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ClientTrip, ClientActivity } from "@/lib/types";

interface CalendarIntegrationProps {
  trip: ClientTrip;
  activities: ClientActivity[];
}

export default function CalendarIntegration({ trip, activities }: CalendarIntegrationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const generateICalContent = () => {
    const events = activities.map(activity => {
      // Parse the activity date and time properly
      const activityDate = new Date(activity.date);
      const [hours, minutes] = activity.time.split(':').map(Number);
      
      const startDate = new Date(activityDate);
      startDate.setHours(hours, minutes, 0, 0);
      
      // Default 2 hour duration for each activity
      const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
      
      const formatDateForICal = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };
      
      return `BEGIN:VEVENT
UID:nestmap-${activity.id}-${Date.now()}@nestmap.com
DTSTAMP:${formatDateForICal(new Date())}
DTSTART:${formatDateForICal(startDate)}
DTEND:${formatDateForICal(endDate)}
SUMMARY:${activity.title}
DESCRIPTION:${activity.notes || 'Activity from NestMap trip: ' + trip.title}
LOCATION:${activity.locationName || ''}
END:VEVENT`;
    }).join('\n');

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NestMap//Trip Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${trip.title} - NestMap Trip
X-WR-CALDESC:Trip itinerary created with NestMap
${events}
END:VCALENDAR`;
  };

  const downloadICalFile = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/trips/${trip.id}/calendar/ical`);
      if (!response.ok) {
        throw new Error('Failed to generate calendar file');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${trip.title.replace(/[^a-z0-9]/gi, '_')}_trip.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Calendar exported",
        description: "Your trip has been exported as a calendar file.",
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error exporting calendar:", error);
      toast({
        title: "Export failed",
        description: "Could not export calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const openGoogleCalendar = async () => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/calendar/google`);
      if (!response.ok) {
        throw new Error('Failed to generate calendar URLs');
      }
      
      const { urls } = await response.json();
      
      // Open each URL with a small delay to prevent browser blocking
      urls.forEach((url: string, index: number) => {
        setTimeout(() => {
          window.open(url, '_blank');
        }, index * 500);
      });
      
      toast({
        title: "Opening Google Calendar",
        description: `${urls.length} tabs will open, one for each activity.`,
      });
    } catch (error) {
      console.error("Error opening Google Calendar:", error);
      toast({
        title: "Error",
        description: "Could not open Google Calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openOutlookCalendar = async () => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/calendar/outlook`);
      if (!response.ok) {
        throw new Error('Failed to generate calendar URLs');
      }
      
      const { urls } = await response.json();
      
      // Open each URL with a small delay to prevent browser blocking
      urls.forEach((url: string, index: number) => {
        setTimeout(() => {
          window.open(url, '_blank');
        }, index * 500);
      });
      
      toast({
        title: "Opening Outlook Calendar",
        description: `${urls.length} tabs will open, one for each activity.`,
      });
    } catch (error) {
      console.error("Error opening Outlook Calendar:", error);
      toast({
        title: "Error",
        description: "Could not open Outlook Calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Add to Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Trip to Calendar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Export your trip "{trip.title}" to your favorite calendar application.
          </div>
          
          <div className="grid gap-3">
            <Button 
              onClick={openGoogleCalendar}
              variant="outline" 
              className="justify-start"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Google Calendar
            </Button>
            
            <Button 
              onClick={openOutlookCalendar}
              variant="outline" 
              className="justify-start"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Outlook Calendar
            </Button>
            
            <Button 
              onClick={downloadICalFile}
              disabled={isExporting}
              variant="outline" 
              className="justify-start"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Download .ics file"}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            The .ics file works with Apple Calendar, Google Calendar, Outlook, and most other calendar applications.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}