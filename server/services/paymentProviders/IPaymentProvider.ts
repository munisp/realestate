/**
 * Payment Provider Interface
 * 
 * Defines the contract that all payment providers must implement
 * to support escrow operations in a provider-agnostic way.
 */

export interface CreateEscrowParams {
  escrowId: number;
  amount: number; // in cents
  currency: string;
  buyerId: number;
  sellerId: number;
  metadata?: any;
}

export interface CreateEscrowResponse {
  success: boolean;
  providerEscrowId: string;
  status: string;
  metadata?: any;
  error?: string;
}

export interface ReleaseEscrowResponse {
  success: boolean;
  transactionId: string;
  amount: number;
  metadata?: any;
  error?: string;
}

export interface RefundEscrowResponse {
  success: boolean;
  transactionId: string;
  amount: number;
  metadata?: any;
  error?: string;
}

export interface EscrowStatusResponse {
  escrowId: string;
  status: string;
  heldAmount: number;
  releasedAmount: number;
  refundedAmount: number;
  metadata?: any;
}

export interface WebhookEvent {
  provider: string;
  eventType: string;
  eventId: string;
  timestamp: Date;
  data: any;
}

/**
 * Base interface that all payment providers must implement
 */
export interface IPaymentProvider {
  /**
   * Provider name (e.g., 'stripe', 'mojaloop', 'tigerbeetle')
   */
  readonly name: string;

  /**
   * Provider display name (e.g., 'Stripe', 'Mojaloop', 'TigerBeetle')
   */
  readonly displayName: string;

  /**
   * Supported currencies
   */
  readonly supportedCurrencies: string[];

  /**
   * Provider capabilities
   */
  readonly capabilities: string[];

  /**
   * Initialize the provider with configuration
   */
  initialize(config: any): Promise<void>;

  /**
   * Create an escrow account and hold funds
   */
  createEscrow(params: CreateEscrowParams): Promise<CreateEscrowResponse>;

  /**
   * Release funds from escrow to seller
   */
  releaseEscrow(providerEscrowId: string, amount?: number): Promise<ReleaseEscrowResponse>;

  /**
   * Refund funds from escrow to buyer
   */
  refundEscrow(providerEscrowId: string, amount?: number): Promise<RefundEscrowResponse>;

  /**
   * Get current status of an escrow
   */
  getEscrowStatus(providerEscrowId: string): Promise<EscrowStatusResponse>;

  /**
   * Handle webhook events from provider
   */
  handleWebhook(event: WebhookEvent): Promise<void>;

  /**
   * Check provider health status
   */
  healthCheck(): Promise<boolean>;
}
