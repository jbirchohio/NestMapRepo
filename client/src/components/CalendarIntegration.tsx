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
      const startDate = new Date(activity.date);
      const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // Default 2 hour duration
      
      return `BEGIN:VEVENT
UID:nestmap-${activity.id}-${Date.now()}@nestmap.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${activity.title}
DESCRIPTION:${activity.notes || ''}
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

  const downloadICalFile = () => {
    setIsExporting(true);
    try {
      const icalContent = generateICalContent();
      const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
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

  const openGoogleCalendar = () => {
    const startDate = new Date(trip.startDate).toISOString().replace(/[-:]/g, '').split('.')[0];
    const endDate = new Date(trip.endDate).toISOString().replace(/[-:]/g, '').split('.')[0];
    
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(trip.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(`Trip planned with NestMap\n\nActivities:\n${activities.map(a => `• ${a.title}`).join('\n')}`)}`;
    
    window.open(googleUrl, '_blank');
    toast({
      title: "Opening Google Calendar",
      description: "A new tab will open with your trip details.",
    });
  };

  const openOutlookCalendar = () => {
    const startDate = new Date(trip.startDate).toISOString();
    const endDate = new Date(trip.endDate).toISOString();
    
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(trip.title)}&startdt=${startDate}&enddt=${endDate}&body=${encodeURIComponent(`Trip planned with NestMap\n\nActivities:\n${activities.map(a => `• ${a.title}`).join('\n')}`)}`;
    
    window.open(outlookUrl, '_blank');
    toast({
      title: "Opening Outlook Calendar",
      description: "A new tab will open with your trip details.",
    });
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