import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, CreditCard, Lock, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface BookingItem {
  type: 'hotel' | 'tour' | 'flight';
  id: string;
  name: string;
  price: number;
  date: string;
  image?: string;
  provider: string;
}

interface InAppBookingFlowProps {
  item: BookingItem;
  onComplete: (bookingId: string) => void;
  onCancel: () => void;
}

export default function InAppBookingFlow({ item, onComplete, onCancel }: InAppBookingFlowProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'confirm'>('details');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Form data
  const [guestInfo, setGuestInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    zip: ''
  });

  const handleBooking = async () => {
    setLoading(true);
    try {
      // This would integrate with your payment processor (Stripe) and booking APIs
      const response = await apiRequest('POST', '/api/bookings/create', {
        item: {
          type: item.type,
          providerId: item.id,
          provider: item.provider,
          price: item.price,
          date: item.date
        },
        guest: guestInfo,
        payment: {
          // In production, tokenize card with Stripe
          token: 'simulated_payment_token',
          last4: paymentInfo.cardNumber.slice(-4)
        }
      });

      // Show success state
      setStep('confirm');
      
      // Simulate booking confirmation
      setTimeout(() => {
        toast({
          title: "Booking confirmed! 🎉",
          description: `Your ${item.type} is booked. Check your email for details.`,
        });
        onComplete(response.bookingId);
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Booking failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold">Complete Booking</h2>
            <div className="w-9" /> {/* Spacer */}
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center mb-8">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'details' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
            }`}>
              {step === 'confirm' ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className={`h-1 w-24 mx-2 ${
              step !== 'details' ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'payment' ? 'bg-blue-600 text-white' : 
              step === 'confirm' ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>
              {step === 'confirm' ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <div className={`h-1 w-24 mx-2 ${
              step === 'confirm' ? 'bg-green-600' : 'bg-gray-200'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'confirm' ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>
              {step === 'confirm' ? <Check className="w-4 h-4" /> : '3'}
            </div>
          </div>

          {/* Booking Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex gap-4">
              {item.image && (
                <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.date}</p>
                <p className="text-lg font-bold text-blue-600 mt-1">${item.price}</p>
              </div>
            </div>
          </div>

          {/* Step Content */}
          {step === 'details' && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-4">Guest Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="First name"
                  value={guestInfo.firstName}
                  onChange={(e) => setGuestInfo({...guestInfo, firstName: e.target.value})}
                />
                <Input
                  placeholder="Last name"
                  value={guestInfo.lastName}
                  onChange={(e) => setGuestInfo({...guestInfo, lastName: e.target.value})}
                />
              </div>
              <Input
                type="email"
                placeholder="Email"
                value={guestInfo.email}
                onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
              />
              <Input
                type="tel"
                placeholder="Phone"
                value={guestInfo.phone}
                onChange={(e) => setGuestInfo({...guestInfo, phone: e.target.value})}
              />
              
              <Button 
                className="w-full mt-6" 
                onClick={() => setStep('payment')}
                disabled={!guestInfo.firstName || !guestInfo.lastName || !guestInfo.email}
              >
                Continue to Payment
              </Button>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-4">Payment Information</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Lock className="w-4 h-4" />
                  <span>Your payment info is encrypted and secure</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Card number"
                    value={paymentInfo.cardNumber}
                    onChange={(e) => setPaymentInfo({...paymentInfo, cardNumber: e.target.value})}
                    maxLength={16}
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="MM/YY"
                    value={paymentInfo.expiry}
                    onChange={(e) => setPaymentInfo({...paymentInfo, expiry: e.target.value})}
                    maxLength={5}
                  />
                  <Input
                    placeholder="CVV"
                    value={paymentInfo.cvv}
                    onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value})}
                    maxLength={3}
                  />
                </div>
                
                <Input
                  placeholder="ZIP code"
                  value={paymentInfo.zip}
                  onChange={(e) => setPaymentInfo({...paymentInfo, zip: e.target.value})}
                  maxLength={5}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep('details')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleBooking}
                  disabled={loading || !paymentInfo.cardNumber || !paymentInfo.expiry || !paymentInfo.cvv}
                  className="flex-1"
                >
                  {loading ? 'Processing...' : `Pay $${item.price}`}
                </Button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Booking Confirmed!</h3>
              <p className="text-gray-600 mb-6">
                Check your email for confirmation and details.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <p className="text-sm text-gray-600 mb-1">Confirmation number</p>
                <p className="font-mono font-semibold">REM-{Date.now().toString(36).toUpperCase()}</p>
              </div>
            </div>
          )}

          {/* Trust Badges */}
          <div className="mt-6 pt-6 border-t flex items-center justify-center gap-6 text-xs text-gray-500">
            <span>🔒 Secure</span>
            <span>✓ Best Price Guarantee</span>
            <span>📞 24/7 Support</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}