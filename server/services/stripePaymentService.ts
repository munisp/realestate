import Stripe from 'stripe';

// Initialize Stripe with secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia',
});

export interface CreatePaymentIntentParams {
  bookingId: number;
  amount: number; // Amount in smallest currency unit (e.g., cents for USD, kobo for NGN)
  currency: string;
  customerEmail: string;
  metadata?: Record<string, string>;
}

export interface ProcessRefundParams {
  paymentIntentId: string;
  amount?: number; // Optional partial refund amount
  reason?: string;
}

/**
 * Create a Stripe Payment Intent for a booking
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      receipt_email: params.customerEmail,
      metadata: {
        bookingId: params.bookingId.toString(),
        ...params.metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error('[Stripe] Error creating payment intent:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create payment intent'
    );
  }
}

/**
 * Retrieve a Payment Intent by ID
 */
export async function getPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return {
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata,
        created: paymentIntent.created,
      },
    };
  } catch (error) {
    console.error('[Stripe] Error retrieving payment intent:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to retrieve payment intent'
    );
  }
}

/**
 * Process a refund for a payment
 */
export async function processRefund(params: ProcessRefundParams) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: params.paymentIntentId,
      amount: params.amount, // If undefined, full refund
      reason: params.reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
    });

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
    };
  } catch (error) {
    console.error('[Stripe] Error processing refund:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to process refund'
    );
  }
}

/**
 * Cancel a Payment Intent (before it's captured)
 */
export async function cancelPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    
    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error('[Stripe] Error cancelling payment intent:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to cancel payment intent'
    );
  }
}

/**
 * Verify webhook signature for Stripe events
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event | null {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return event;
  } catch (error) {
    console.error('[Stripe] Webhook signature verification failed:', error);
    return null;
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('[Stripe] Payment succeeded:', paymentIntent.id);
      return {
        type: 'payment_succeeded',
        paymentIntentId: paymentIntent.id,
        bookingId: paymentIntent.metadata.bookingId,
        amount: paymentIntent.amount,
      };

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      console.log('[Stripe] Payment failed:', failedPayment.id);
      return {
        type: 'payment_failed',
        paymentIntentId: failedPayment.id,
        bookingId: failedPayment.metadata.bookingId,
        error: failedPayment.last_payment_error?.message,
      };

    case 'charge.refunded':
      const refundedCharge = event.data.object as Stripe.Charge;
      console.log('[Stripe] Charge refunded:', refundedCharge.id);
      return {
        type: 'refund_processed',
        chargeId: refundedCharge.id,
        paymentIntentId: refundedCharge.payment_intent as string,
        amount: refundedCharge.amount_refunded,
      };

    default:
      console.log('[Stripe] Unhandled event type:', event.type);
      return null;
  }
}

/**
 * Calculate platform fee (e.g., 10% service fee)
 */
export function calculateServiceFee(amount: number, feePercentage: number = 0.1): number {
  return Math.round(amount * feePercentage);
}

/**
 * Calculate total booking amount including fees
 */
export function calculateTotalAmount(
  nightlyRate: number,
  nights: number,
  cleaningFee: number = 0
): { nightlyTotal: number; serviceFee: number; totalAmount: number } {
  const nightlyTotal = nightlyRate * nights;
  const serviceFee = calculateServiceFee(nightlyTotal);
  const totalAmount = nightlyTotal + cleaningFee + serviceFee;

  return {
    nightlyTotal,
    serviceFee,
    totalAmount,
  };
}
