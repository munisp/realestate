import express from 'express';
import Stripe from 'stripe';
import { ENV } from './_core/env';
import * as db from './db';

const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: '2025-10-29.clover',
});

export const stripeWebhookRouter = express.Router();

// CRITICAL: Must use raw body for signature verification
stripeWebhookRouter.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('[Stripe Webhook] Missing signature');
    return res.status(400).send('Missing signature');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      ENV.stripeWebhookSecret
    );
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // CRITICAL: Handle test events
  if (event.id.startsWith('evt_test_')) {
    console.log('[Stripe Webhook] Test event detected, returning verification response');
    return res.json({ verified: true });
  }

  console.log('[Stripe Webhook] Event received:', event.type, event.id);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Extract metadata
        const userId = session.metadata?.user_id;
        const propertyId = session.metadata?.property_id;
        const transactionId = session.metadata?.transaction_id;

        if (userId && propertyId && transactionId) {
          // Update payment status
          await db.updatePayment(parseInt(transactionId), {
            status: 'completed',
            gatewayTransactionId: session.id,
            paymentGateway: 'stripe',
          });

          // Update transaction status
          await db.updateTransaction(parseInt(transactionId), {
            status: 'in_progress',
          });

          console.log('[Stripe Webhook] Payment completed for transaction:', transactionId);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('[Stripe Webhook] PaymentIntent succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        const metadata = paymentIntent.metadata;
        if (metadata?.transaction_id) {
          await db.updatePayment(parseInt(metadata.transaction_id), {
            status: 'failed',
          });
        }

        console.log('[Stripe Webhook] PaymentIntent failed:', paymentIntent.id);
        break;
      }

      case 'customer.created': {
        const customer = event.data.object as Stripe.Customer;
        console.log('[Stripe Webhook] Customer created:', customer.id);
        break;
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
