import Stripe from 'stripe';
import { Request, Response } from 'express';
import { getDb } from '../db';
import { shortLetBookings, builderProjects, payments, escrowAccounts } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = await getDb();
  if (!db) {
    console.error('[Stripe Webhook] Database not available');
    return res.status(500).send('Database error');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(db, session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(db, paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(db, paymentIntent);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(db, charge);
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        await handleTransferCreated(db, transfer);
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        await handlePayoutPaid(db, payout);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error);
    res.status(500).send('Webhook processing error');
  }
}

async function handleCheckoutCompleted(db: any, session: Stripe.Checkout.Session) {
  console.log('[Stripe Webhook] Checkout completed:', session.id);

  const metadata = session.metadata;
  if (!metadata) return;

  const { type, bookingId, projectId, userId } = metadata;

  // Update payment record
  await db.insert(payments).values({
    userId: Number(userId),
    amount: (session.amount_total || 0) / 100, // Convert from cents
    currency: session.currency || 'usd',
    status: 'completed',
    paymentMethod: 'stripe',
    stripePaymentId: session.payment_intent as string,
    metadata: JSON.stringify(metadata),
  });

  // Handle shortlet booking
  if (type === 'shortlet' && bookingId) {
    await db.update(shortLetBookings)
      .set({
        status: 'confirmed',
        paymentStatus: 'paid',
        stripePaymentId: session.payment_intent as string,
      })
      .where(eq(shortLetBookings.id, Number(bookingId)));

    console.log(`[Stripe Webhook] Shortlet booking ${bookingId} confirmed`);
  }

  // Handle builder project payment
  if (type === 'builder_project' && projectId) {
    const milestoneId = metadata.milestoneId;
    
    // Create escrow account for the payment
    await db.insert(escrowAccounts).values({
      projectId: Number(projectId),
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || 'usd',
      status: 'funded',
      milestoneId: milestoneId ? Number(milestoneId) : null,
      stripePaymentId: session.payment_intent as string,
    });

    console.log(`[Stripe Webhook] Escrow funded for project ${projectId}, milestone ${milestoneId}`);
  }
}

async function handlePaymentSucceeded(db: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('[Stripe Webhook] Payment succeeded:', paymentIntent.id);

  const metadata = paymentIntent.metadata;
  if (!metadata) return;

  // Update payment status
  await db.update(payments)
    .set({ status: 'completed' })
    .where(eq(payments.stripePaymentId, paymentIntent.id));
}

async function handlePaymentFailed(db: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('[Stripe Webhook] Payment failed:', paymentIntent.id);

  const metadata = paymentIntent.metadata;
  if (!metadata) return;

  // Update payment status
  await db.update(payments)
    .set({ status: 'failed' })
    .where(eq(payments.stripePaymentId, paymentIntent.id));

  // Update booking status if applicable
  if (metadata.bookingId) {
    await db.update(shortLetBookings)
      .set({
        status: 'cancelled',
        paymentStatus: 'failed',
      })
      .where(eq(shortLetBookings.id, Number(metadata.bookingId)));
  }
}

async function handleRefund(db: any, charge: Stripe.Charge) {
  console.log('[Stripe Webhook] Refund processed:', charge.id);

  // Update payment status
  await db.update(payments)
    .set({ status: 'refunded' })
    .where(eq(payments.stripePaymentId, charge.payment_intent as string));
}

async function handleTransferCreated(db: any, transfer: Stripe.Transfer) {
  console.log('[Stripe Webhook] Transfer created:', transfer.id);

  const metadata = transfer.metadata;
  if (!metadata) return;

  // Update escrow account when funds are transferred to builder
  if (metadata.escrowId) {
    await db.update(escrowAccounts)
      .set({
        status: 'released',
        releasedAt: new Date(),
        stripeTransferId: transfer.id,
      })
      .where(eq(escrowAccounts.id, Number(metadata.escrowId)));

    console.log(`[Stripe Webhook] Escrow ${metadata.escrowId} released to builder`);
  }
}

async function handlePayoutPaid(db: any, payout: Stripe.Payout) {
  console.log('[Stripe Webhook] Payout paid:', payout.id);
  
  // Log successful payout for accounting
  // This could trigger notifications to the builder/host
}

// Helper function to release escrow funds
export async function releaseEscrowFunds(escrowId: number, builderId: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get escrow details
  const escrowRecords = await db.select()
    .from(escrowAccounts)
    .where(eq(escrowAccounts.id, escrowId))
    .limit(1);

  if (!escrowRecords.length) {
    throw new Error('Escrow account not found');
  }

  const escrow = escrowRecords[0];

  if (escrow.status !== 'funded') {
    throw new Error('Escrow is not in funded status');
  }

  // Create transfer to builder's connected account
  const transfer = await stripe.transfers.create({
    amount: Math.round(Number(escrow.amount) * 100), // Convert to cents
    currency: escrow.currency,
    destination: builderId, // Stripe connected account ID
    metadata: {
      escrowId: escrowId.toString(),
      projectId: escrow.projectId?.toString() || '',
    },
  });

  console.log(`[Escrow] Released ${escrow.amount} ${escrow.currency} to builder ${builderId}`);

  return transfer;
}

// Helper function to create Stripe checkout session
export async function createCheckoutSession(params: {
  amount: number;
  currency: string;
  type: 'shortlet' | 'builder_project';
  userId: number;
  bookingId?: number;
  projectId?: number;
  milestoneId?: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: params.currency,
          product_data: {
            name: params.type === 'shortlet' ? 'Shortlet Booking' : 'Builder Project Payment',
            description: params.type === 'shortlet' 
              ? `Booking ID: ${params.bookingId}`
              : `Project ID: ${params.projectId}, Milestone: ${params.milestoneId}`,
          },
          unit_amount: Math.round(params.amount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      type: params.type,
      userId: params.userId.toString(),
      bookingId: params.bookingId?.toString() || '',
      projectId: params.projectId?.toString() || '',
      milestoneId: params.milestoneId?.toString() || '',
    },
  });

  return session;
}
