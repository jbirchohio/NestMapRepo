import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/JWTAuthContext';
import { useLocation } from 'wouter';
import { ShoppingCart, Loader2, Check } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Initialize Stripe - check for the key and handle gracefully
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

interface TemplatePurchaseButtonProps {
  templateId: number;
  price: string;
  title: string;
  hasPurchased?: boolean;
  onPurchaseComplete?: (tripId: number) => void;
}

function CheckoutForm({
  templateId,
  clientSecret,
  onSuccess
}: {
  templateId: number;
  clientSecret: string;
  onSuccess: (tripId: number) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Confirm the payment
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message || 'Payment failed');
      setIsProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Payment failed');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Confirm purchase with backend
      try {
        const response = await fetch('/api/checkout/confirm-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            templateId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          toast({
            title: 'Purchase successful!',
            description: 'The template has been added to your trips.',
          });
          onSuccess(data.tripId);
        } else {
          throw new Error('Failed to confirm purchase');
        }
      } catch (error) {
        setErrorMessage('Payment succeeded but failed to process. Please contact support.');
      }
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && (
        <div className="text-sm text-red-600">{errorMessage}</div>
      )}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Complete Purchase'
        )}
      </Button>
    </form>
  );
}

export default function TemplatePurchaseButton({
  templateId,
  price,
  title,
  hasPurchased = false,
  onPurchaseComplete,
}: TemplatePurchaseButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchaseClick = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to purchase templates',
        variant: 'destructive',
      });
      setLocation('/?auth=login');
      return;
    }

    if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
      // For now, just show a message if Stripe isn't configured
      toast({
        title: 'Coming soon!',
        description: 'Template purchases will be available soon.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create payment intent
      const response = await fetch('/api/checkout/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ templateId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start checkout');
      }

      const { clientSecret: secret } = await response.json();
      setClientSecret(secret);
      setShowCheckout(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseComplete = (tripId: number) => {
    setShowCheckout(false);
    if (onPurchaseComplete) {
      onPurchaseComplete(tripId);
    } else {
      // Navigate to the new trip
      setLocation(`/trip/${tripId}`);
    }
  };

  if (hasPurchased) {
    return (
      <Button disabled className="w-full" variant="outline">
        <Check className="mr-2 h-4 w-4" />
        Already Purchased
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={handlePurchaseClick}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Buy for ${price}
          </>
        )}
      </Button>

      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Purchase</DialogTitle>
            <DialogDescription>
              Purchase "{title}" for ${price}
            </DialogDescription>
          </DialogHeader>
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                templateId={templateId}
                clientSecret={clientSecret}
                onSuccess={handlePurchaseComplete}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}