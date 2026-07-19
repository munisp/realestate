import Stripe from 'stripe';
import {
  IPaymentProvider,
  CreateEscrowParams,
  CreateEscrowResponse,
  ReleaseEscrowResponse,
  RefundEscrowResponse,
  EscrowStatusResponse,
  WebhookEvent,
} from './IPaymentProvider';

/**
 * Stripe Payment Provider
 * 
 * Implements escrow operations using Stripe's payment infrastructure:
 * - Payment Intents for holding funds
 * - Transfers for releasing to sellers
 * - Refunds for returning to buyers
 */
export class StripePaymentProvider implements IPaymentProvider {
  readonly name = 'stripe';
  readonly displayName = 'Stripe';
  readonly supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NGN'];
  readonly capabilities = ['escrow', 'instant_transfer', 'refunds', 'webhooks'];

  private stripe: Stripe | null = null;
  private config: any = null;

  async initialize(config: any): Promise<void> {
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2023-10-16',
    });
    console.log('[Stripe] Provider initialized');
  }

  async createEscrow(params: CreateEscrowParams): Promise<CreateEscrowResponse> {
    if (!this.stripe) {
      throw new Error('Stripe provider not initialized');
    }

    try {
      // Create a Payment Intent to hold funds
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        capture_method: 'manual', // Hold funds, don't capture yet
        metadata: {
          escrowId: params.escrowId.toString(),
          buyerId: params.buyerId.toString(),
          sellerId: params.sellerId.toString(),
          ...params.metadata,
        },
      });

      return {
        success: true,
        providerEscrowId: paymentIntent.id,
        status: paymentIntent.status,
        metadata: {
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      };
    } catch (error: any) {
      console.error('[Stripe] Create escrow error:', error);
      return {
        success: false,
        providerEscrowId: '',
        status: 'failed',
        error: error.message,
      };
    }
  }

  async releaseEscrow(
    providerEscrowId: string,
    amount?: number
  ): Promise<ReleaseEscrowResponse> {
    if (!this.stripe) {
      throw new Error('Stripe provider not initialized');
    }

    try {
      // Get the payment intent
      const paymentIntent = await this.stripe.paymentIntents.retrieve(providerEscrowId);

      if (paymentIntent.status !== 'requires_capture') {
        throw new Error(`Cannot release escrow in status: ${paymentIntent.status}`);
      }

      // Capture the payment (release funds)
      const capturedIntent = await this.stripe.paymentIntents.capture(
        providerEscrowId,
        amount ? { amount_to_capture: amount } : undefined
      );

      // Create transfer to seller (if connected account)
      const sellerId = paymentIntent.metadata.sellerId;
      let transfer = null;

      if (sellerId && this.config.enableConnectedAccounts) {
        transfer = await this.stripe.transfers.create({
          amount: amount || capturedIntent.amount,
          currency: capturedIntent.currency,
          destination: sellerId, // Stripe connected account ID
          transfer_group: `escrow_${paymentIntent.metadata.escrowId}`,
        });
      }

      return {
        success: true,
        transactionId: capturedIntent.id,
        amount: capturedIntent.amount,
        metadata: {
          status: capturedIntent.status,
          transfer: transfer ? transfer.id : null,
        },
      };
    } catch (error: any) {
      console.error('[Stripe] Release escrow error:', error);
      return {
        success: false,
        transactionId: '',
        amount: 0,
        error: error.message,
      };
    }
  }

  async refundEscrow(
    providerEscrowId: string,
    amount?: number
  ): Promise<RefundEscrowResponse> {
    if (!this.stripe) {
      throw new Error('Stripe provider not initialized');
    }

    try {
      // Get the payment intent
      const paymentIntent = await this.stripe.paymentIntents.retrieve(providerEscrowId);

      // Cancel if not captured yet
      if (paymentIntent.status === 'requires_capture') {
        const cancelled = await this.stripe.paymentIntents.cancel(providerEscrowId);
        return {
          success: true,
          transactionId: cancelled.id,
          amount: cancelled.amount,
          metadata: {
            status: cancelled.status,
            refundType: 'cancel',
          },
        };
      }

      // Create refund if already captured
      if (paymentIntent.status === 'succeeded') {
        const refund = await this.stripe.refunds.create({
          payment_intent: providerEscrowId,
          amount: amount,
        });

        return {
          success: true,
          transactionId: refund.id,
          amount: refund.amount,
          metadata: {
            status: refund.status,
            refundType: 'refund',
          },
        };
      }

      throw new Error(`Cannot refund escrow in status: ${paymentIntent.status}`);
    } catch (error: any) {
      console.error('[Stripe] Refund escrow error:', error);
      return {
        success: false,
        transactionId: '',
        amount: 0,
        error: error.message,
      };
    }
  }

  async getEscrowStatus(providerEscrowId: string): Promise<EscrowStatusResponse> {
    if (!this.stripe) {
      throw new Error('Stripe provider not initialized');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(providerEscrowId);

      let heldAmount = 0;
      let releasedAmount = 0;
      let refundedAmount = 0;

      if (paymentIntent.status === 'requires_capture') {
        heldAmount = paymentIntent.amount;
      } else if (paymentIntent.status === 'succeeded') {
        releasedAmount = paymentIntent.amount_received || paymentIntent.amount;
      } else if (paymentIntent.status === 'canceled') {
        refundedAmount = paymentIntent.amount;
      }

      // Check for partial refunds
      if (paymentIntent.charges.data.length > 0) {
        const charge = paymentIntent.charges.data[0];
        refundedAmount = charge.amount_refunded || 0;
        releasedAmount = (charge.amount || 0) - refundedAmount;
      }

      return {
        escrowId: providerEscrowId,
        status: paymentIntent.status,
        heldAmount,
        releasedAmount,
        refundedAmount,
        metadata: {
          currency: paymentIntent.currency,
          created: paymentIntent.created,
          escrowId: paymentIntent.metadata.escrowId,
        },
      };
    } catch (error: any) {
      console.error('[Stripe] Get escrow status error:', error);
      throw error;
    }
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    console.log(`[Stripe] Handling webhook event: ${event.eventType}`);

    // Handle different event types
    switch (event.eventType) {
      case 'payment_intent.succeeded':
        // Payment captured successfully
        console.log('[Stripe] Payment intent succeeded:', event.data.id);
        break;

      case 'payment_intent.payment_failed':
        // Payment failed
        console.log('[Stripe] Payment intent failed:', event.data.id);
        break;

      case 'payment_intent.canceled':
        // Payment canceled
        console.log('[Stripe] Payment intent canceled:', event.data.id);
        break;

      case 'charge.refunded':
        // Refund processed
        console.log('[Stripe] Charge refunded:', event.data.id);
        break;

      case 'transfer.created':
        // Transfer to seller created
        console.log('[Stripe] Transfer created:', event.data.id);
        break;

      default:
        console.log('[Stripe] Unhandled event type:', event.eventType);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.stripe) {
      return false;
    }

    try {
      // Try to retrieve account info as health check
      await this.stripe.balance.retrieve();
      return true;
    } catch (error) {
      console.error('[Stripe] Health check failed:', error);
      return false;
    }
  }
}
