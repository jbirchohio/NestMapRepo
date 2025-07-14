import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Home, Plane} from "lucide-react";

interface BookingConfirmationProps {
  bookingReference?: string;
}

export const BookingConfirmation = ({ bookingReference = "ABC123456" }: BookingConfirmationProps) => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-12 max-w-3xl">
      <Card className="mb-8">
        <CardHeader className="bg-primary/5 border-b">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Booking Confirmed</CardTitle>
              <p className="text-muted-foreground">Your booking has been successfully confirmed</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="font-medium">Booking Reference</div>
              <div className="font-mono bg-muted px-3 py-1 rounded-md">{bookingReference}</div>
            </div>

            <div className="border-b pb-4">
              <h3 className="font-medium mb-3">Next Steps</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">1</div>
                  <span>Check your email for a detailed booking confirmation</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">2</div>
                  <span>Download your e-tickets from your account dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">3</div>
                  <span>Review your itinerary details before your trip</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Button>
              <Button 
                className="flex-1 gap-2"
                onClick={() => navigate("/booking/new")}
              >
                <Plane className="h-4 w-4" />
                Book Another Trip
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
