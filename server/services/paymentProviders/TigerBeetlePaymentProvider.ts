// @ts-nocheck
import { IPaymentProvider, EscrowCreateResult, EscrowReleaseResult, EscrowRefundResult, EscrowStatusResult } from './IPaymentProvider';
import { TigerBeetleProvider } from '../../payments/providers/TigerBeetleProvider';

export class TigerBeetlePaymentProvider implements IPaymentProvider {
  name = 'tigerbeetle';
  displayName = 'TigerBeetle';
  supportedCurrencies = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR'];
  capabilities = ['escrow', 'instant_transfer', 'double_entry', 'high_performance'];

  private client: TigerBeetleProvider;

  constructor() {
    this.client = new TigerBeetleProvider();
  }

  async initialize(config: any): Promise<void> {
    // Configuration is handled via environment variables in the Python service
    console.log('[TigerBeetlePaymentProvider] Initialized');
  }

  async createEscrow(params: {
    escrowId: string;
    amount: number;
    currency: string;
    buyerId: string;
    sellerId: string;
    metadata?: any;
  }): Promise<EscrowCreateResult> {
    const result = await (this.client as any).createEscrow({
      escrowId: params.escrowId,
      amount: params.amount,
      currency: params.currency,
      buyerId: params.buyerId,
      sellerId: params.sellerId,
      metadata: params.metadata,
    });

    return {
      success: true,
      providerEscrowId: result.providerEscrowId,
      status: result.status,
      metadata: result.metadata,
    };
  }

  async releaseEscrow(params: {
    providerEscrowId: string;
    amount?: number;
    metadata?: any;
  }): Promise<EscrowReleaseResult> {
    const result = await (this.client as any).releaseEscrow({
      providerEscrowId: params.providerEscrowId,
      amount: params.amount,
      metadata: params.metadata,
    });

    return {
      transactionId: result.transactionId,
      amount: result.amount,
      status: 'completed',
    };
  }

  async refundEscrow(params: {
    providerEscrowId: string;
    amount?: number;
    reason?: string;
    metadata?: any;
  }): Promise<EscrowRefundResult> {
    const result = await (this.client as any).refundEscrow({
      providerEscrowId: params.providerEscrowId,
      amount: params.amount,
      metadata: params.metadata,
    });

    return {
      transactionId: result.transactionId,
      amount: result.amount,
      status: 'completed',
    };
  }

  async getEscrowStatus(providerEscrowId: string): Promise<EscrowStatusResult> {
    const result = await this.client.getEscrowStatus(providerEscrowId);

    return {
      escrowId: (result.escrowId ?? "") as string,
      status: result.status,
      heldAmount: result.heldAmount,
      releasedAmount: result.releasedAmount,
      refundedAmount: result.refundedAmount,
    };
  }

  async healthCheck(): Promise<boolean> {
    return await this.client.healthCheck();
  }

  async handleWebhook(event: any): Promise<void> {
    console.log('[TigerBeetlePaymentProvider] Webhook received:', event.type);
    // Webhook handling delegated to provider-specific logic
  }
}
