import { useState, useEffect } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentCheckoutProps {
  bookingId: number;
  amount: number;
  currency?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface CheckoutFormProps {
  bookingId: number;
  amount: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Checkout form component that handles payment submission
 */
function CheckoutForm({ bookingId, amount, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/bookings/${bookingId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setPaymentSuccess(true);
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h3 className="text-xl font-semibold">Payment Successful!</h3>
        <p className="text-muted-foreground">Your booking has been confirmed.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b">
          <span className="font-medium">Total Amount:</span>
          <span className="text-xl font-bold">
            ₦{amount.toLocaleString()}
          </span>
        </div>

        <PaymentElement />

        {errorMessage && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </div>

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
            `Pay ₦${amount.toLocaleString()}`
          )}
        </Button>
      </div>
    </form>
  );
}

/**
 * Main payment checkout component
 */
export function PaymentCheckout({
  bookingId,
  amount,
  currency = 'ngn',
  onSuccess,
  onCancel,
}: PaymentCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createPaymentMutation = trpc.payment.createPaymentIntent.useMutation({
    onSuccess: (data) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      }
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  useEffect(() => {
    // Create payment intent when component mounts
    createPaymentMutation.mutate({ bookingId, currency });
  }, [bookingId, currency]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={onCancel} variant="outline" className="mt-4">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Secure Payment</CardTitle>
          <CardDescription>Processing your payment request...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0070f3',
        colorBackground: '#ffffff',
        colorText: '#000000',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Secure Payment</CardTitle>
        <CardDescription>
          Complete your booking payment securely with Stripe
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm
            bookingId={bookingId}
            amount={amount}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}

/**
 * Payment status display component
 */
interface PaymentStatusProps {
  bookingId: number;
}

export function PaymentStatus({ bookingId }: PaymentStatusProps) {
  const { data, isLoading } = trpc.payment.getPaymentStatus.useQuery({ bookingId });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading payment status...</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const statusColors = {
    pending: 'text-yellow-600 bg-yellow-50',
    paid: 'text-green-600 bg-green-50',
    refunded: 'text-gray-600 bg-gray-50',
  };

  const statusLabels = {
    pending: 'Payment Pending',
    paid: 'Paid',
    refunded: 'Refunded',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            statusColors[data.paymentStatus as keyof typeof statusColors]
          }`}
        >
          {statusLabels[data.paymentStatus as keyof typeof statusLabels]}
        </span>
      </div>
      <div className="text-sm text-muted-foreground">
        Amount: ₦{data.totalAmount.toLocaleString()}
      </div>
      {data.paymentDetails && (
        <div className="text-xs text-muted-foreground">
          Payment ID: {data.paymentId}
        </div>
      )}
    </div>
  );
}
