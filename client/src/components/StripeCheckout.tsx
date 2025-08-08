import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Lock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Initialize Stripe with public key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface StripeCheckoutProps {
  templateId: number;
  templateTitle: string;
  price: number;
  currency: string;
  onSuccess: (data: any) => void;
  onCancel: () => void;
}

function CheckoutForm({ templateId, templateTitle, price, currency, onSuccess, onCancel }: StripeCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('Creating payment intent for template:', templateId, 'type:', typeof templateId);
      console.log('Template title:', templateTitle);
      
      // Step 1: Create payment intent on backend
      const response = await fetch('/api/checkout/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ templateId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }

      const { clientSecret } = await response.json();

      // Step 2: Confirm the payment with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message || 'Payment failed');
      }

      // Step 3: Confirm purchase on backend
      const confirmResponse = await fetch('/api/checkout/confirm-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntent?.id,
          templateId,
        }),
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.message || 'Failed to confirm purchase');
      }

      const purchaseData = await confirmResponse.json();

      // Success!
      toast({
        title: 'Payment successful!',
        description: `You've purchased "${templateTitle}"`,
      });

      onSuccess(purchaseData);
    } catch (err: any) {
      setError(err.message || 'An error occurred during payment');
      toast({
        title: 'Payment failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        fontFamily: '"Inter", sans-serif',
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Your Purchase
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Purchase Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-gray-900">{templateTitle}</p>
                <p className="text-sm text-gray-600">Travel template</p>
              </div>
              <p className="text-xl font-bold text-purple-600">
                ${price} {currency}
              </p>
            </div>
          </div>

          {/* Card Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Details
            </label>
            <div className="border rounded-lg p-3 bg-white">
              <CardElement options={cardElementOptions} />
            </div>
            <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Your payment info is secure and encrypted
            </p>
          </div>

          {/* Test Card Info */}
          {import.meta.env.DEV && (
            <Alert>
              <AlertDescription className="text-xs">
                <strong>Test mode:</strong> Use card 4242 4242 4242 4242, any future date, any CVC
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Pay ${price}
                </>
              )}
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="text-center text-xs text-gray-500 pt-4 border-t">
            <p>Powered by Stripe • 256-bit SSL Encryption</p>
            <p className="mt-1">30-day money-back guarantee</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Main component with Stripe Elements provider
export default function StripeCheckout(props: StripeCheckoutProps) {
  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Payment processing is not configured. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
}