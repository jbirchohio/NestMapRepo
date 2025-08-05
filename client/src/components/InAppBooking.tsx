import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ShoppingCart, 
  Calendar, 
  Users, 
  CreditCard, 
  Check,
  Clock,
  MapPin,
  Star,
  Info,
  Copy,
  Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BookingItem {
  id: string;
  type: 'activity' | 'flight' | 'hotel';
  title: string;
  description?: string;
  price: number;
  currency: string;
  date?: Date;
  time?: string;
  duration?: string;
  location?: string;
  image?: string;
  provider?: string;
  rating?: number;
  cancellationPolicy?: string;
  productCode?: string;
}

interface InAppBookingProps {
  items: BookingItem[];
  tripId: string;
  onClose: () => void;
  onSave: (bookingData: any) => void;
}

export default function InAppBooking({ items, tripId, onClose, onSave }: InAppBookingProps) {
  const { toast } = useToast();
  const [guestCount, setGuestCount] = useState(1);
  const [contactEmail, setContactEmail] = useState('');
  const [savedBooking, setSavedBooking] = useState(false);
  const [bookingReference, setBookingReference] = useState('');

  const totalPrice = items.reduce((sum, item) => sum + (item.price * guestCount), 0);

  const handleSaveBooking = async () => {
    // Generate a booking reference
    const reference = `RMV-${Date.now().toString(36).toUpperCase()}`;
    setBookingReference(reference);

    const bookingData = {
      reference,
      tripId,
      items: items.map(item => ({
        ...item,
        guestCount,
        totalPrice: item.price * guestCount
      })),
      contactEmail,
      totalPrice,
      currency: items[0]?.currency || 'USD',
      createdAt: new Date().toISOString(),
      status: 'saved'
    };

    // Save to database
    try {
      const response = await fetch('/api/consumer/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          trip_id: parseInt(tripId),
          type: items[0]?.type || 'activity',
          reference,
          items,
          contact_email: contactEmail,
          total_price: totalPrice,
          currency: items[0]?.currency || 'USD',
          status: 'saved',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save booking');
      }

      const data = await response.json();
      
      if (onSave) {
        await onSave(data.booking);
      }
      
      setSavedBooking(true);
      
      toast({
        title: "Booking saved!",
        description: "Your booking details have been saved to your trip.",
      });
    } catch (error) {
      console.error('Error saving booking:', error);
      toast({
        title: "Error",
        description: "Failed to save booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCopyReference = () => {
    navigator.clipboard.writeText(bookingReference);
    toast({
      title: "Copied!",
      description: "Booking reference copied to clipboard",
    });
  };

  const handleEmailBooking = () => {
    const subject = `Booking Request - ${bookingReference}`;
    const body = `
Booking Reference: ${bookingReference}

Items to Book:
${items.map(item => `
- ${item.title}
  Date: ${item.date ? format(item.date, 'MMM dd, yyyy') : 'N/A'}
  Time: ${item.time || 'N/A'}
  Price: ${item.currency} ${item.price} x ${guestCount} guests = ${item.currency} ${item.price * guestCount}
  ${item.productCode ? `Product Code: ${item.productCode}` : ''}
`).join('\n')}

Total: ${items[0]?.currency || 'USD'} ${totalPrice}
Number of Guests: ${guestCount}

Please confirm availability and process this booking.
    `;

    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (savedBooking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-center">Booking Saved!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Your booking reference:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-mono font-bold">{bookingReference}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyReference}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                We've saved all your booking details. You can:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                <li>• View this in your trip bookings</li>
                <li>• Share the reference with your travel agent</li>
                <li>• Email yourself the booking details</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleEmailBooking}
                variant="outline"
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Details
              </Button>
              <Button onClick={onClose} className="flex-1">
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Complete Your Booking
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {/* Booking Items */}
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex gap-4 p-4">
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">{item.type}</Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      {item.date && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(item.date, 'MMM dd, yyyy')}
                        </div>
                      )}
                      {item.time && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {item.time}
                        </div>
                      )}
                      {item.location && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </div>
                      )}
                      {item.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {item.rating}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="font-bold text-lg">
                        {item.currency} {item.price}
                        <span className="text-sm font-normal text-muted-foreground"> per person</span>
                      </div>
                      {item.cancellationPolicy && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Info className="w-3 h-3" />
                          {item.cancellationPolicy}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Guest Count */}
          <div className="space-y-2">
            <Label htmlFor="guests">Number of Guests</Label>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <Input
                id="guests"
                type="number"
                min="1"
                value={guestCount}
                onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                className="w-24"
              />
            </div>
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Contact Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We'll send booking confirmation and updates to this email
            </p>
          </div>

          {/* Price Summary */}
          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.title} × {guestCount}</span>
                    <span>{item.currency} {item.price * guestCount}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{items[0]?.currency || 'USD'} {totalPrice}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Save your booking details to your trip</li>
              <li>• Get a booking reference number</li>
              <li>• Share with your travel agent or book directly</li>
              <li>• All details are saved in your itinerary</li>
            </ul>
          </div>
        </CardContent>

        <div className="flex-shrink-0 p-4 border-t bg-slate-50">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveBooking}
              disabled={!contactEmail || items.length === 0}
              className="flex-1"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Save Booking
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}