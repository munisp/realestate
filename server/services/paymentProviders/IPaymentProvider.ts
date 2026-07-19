/**
 * Payment Provider Interface
 *
 * Defines the contract that all payment providers must implement
 * to support escrow operations in a provider-agnostic way.
 */

export interface CreateEscrowParams {
  escrowId?: string | number;
  amount: number;
  currency: string;
  buyerId?: string | number;
  sellerId?: string | number;
  metadata?: any;
}

export interface CreateEscrowResponse {
  success?: boolean;
  providerEscrowId: string;
  status: string;
  metadata?: any;
  error?: string;
}

export interface ReleaseEscrowResponse {
  success?: boolean;
  transactionId: string;
  amount: number;
  status?: string;
  metadata?: any;
  error?: string;
}

export interface RefundEscrowResponse {
  success?: boolean;
  transactionId: string;
  amount: number;
  status?: string;
  metadata?: any;
  error?: string;
}

export interface EscrowStatusResponse {
  escrowId?: string;
  status: string;
  heldAmount?: number;
  releasedAmount?: number;
  refundedAmount?: number;
  metadata?: any;
}

export interface EscrowReleaseParams {
  providerEscrowId?: string;
  amount?: number;
  metadata?: any;
}

export interface EscrowRefundParams {
  providerEscrowId?: string;
  amount?: number;
  reason?: string;
  metadata?: any;
}

// Result type aliases used by provider implementations
export type EscrowCreateResult = CreateEscrowResponse;
export type EscrowReleaseResult = ReleaseEscrowResponse;
export type EscrowRefundResult = RefundEscrowResponse;
export type EscrowStatusResult = EscrowStatusResponse;

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
  readonly name: string;
  readonly displayName: string;
  readonly supportedCurrencies: string[];
  readonly capabilities: string[];

  initialize(config: any): Promise<void>;

  createEscrow(params: CreateEscrowParams): Promise<CreateEscrowResponse>;

  releaseEscrow(params: EscrowReleaseParams): Promise<ReleaseEscrowResponse>;

  refundEscrow(params: EscrowRefundParams): Promise<RefundEscrowResponse>;

  getEscrowStatus(providerEscrowId: string): Promise<EscrowStatusResponse>;

  handleWebhook(event: WebhookEvent | any): Promise<void>;

  healthCheck(): Promise<boolean>;
}
