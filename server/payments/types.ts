export interface PaymentProvider {
  name: string;
  processPayment?(amount: number, currency: string, metadata?: Record<string, any>): Promise<PaymentResult>;
  verifyPayment?(transactionId: string): Promise<PaymentResult>;
  handleWebhook?(payload: any, signature?: string): Promise<void>;
  createEscrow?(params: EscrowCreateParams): Promise<any>;
  releaseEscrow?(params: EscrowReleaseParams): Promise<any>;
  refundEscrow?(params: EscrowRefundParams): Promise<any>;
  getEscrowStatus?(escrowId: string): Promise<EscrowStatusResponse>;
}

export interface EscrowCreateParams {
  transactionId: string;
  escrowId?: string;
  amount: number;
  currency: string;
  buyerId: string;
  sellerId: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface EscrowReleaseParams {
  escrowId: string;
  transactionId: string;
  providerEscrowId?: string;
  amount?: number;
  releaseToSeller?: boolean;
  metadata?: Record<string, any>;
}

export interface EscrowRefundParams {
  escrowId: string;
  transactionId: string;
  providerEscrowId?: string;
  amount?: number;
  refundAmount?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface EscrowStatusResponse {
  success?: boolean;
  escrowId?: string;
  status?: 'pending' | 'held' | 'released' | 'refunded' | 'disputed' | 'cancelled' | string;
  amount?: number;
  currency?: string;
  heldAmount?: number;
  releasedAmount?: number;
  refundedAmount?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  metadata?: Record<string, any>;
}
