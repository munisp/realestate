import axios from 'axios';
import { PaymentProvider, EscrowCreateParams, EscrowReleaseParams, EscrowRefundParams, EscrowStatusResponse } from '../types';

const PAYSTACK_SERVICE_URL = process.env.PAYSTACK_SERVICE_URL || 'http://localhost:5013';

export class PaystackProvider implements PaymentProvider {
  name = 'paystack';
  displayName = 'Paystack';

  private client = axios.create({
    baseURL: PAYSTACK_SERVICE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  async createEscrow(params: EscrowCreateParams): Promise<{ providerEscrowId: string; status: string; metadata?: any }> {
    try {
      const response = await this.client.post('/escrow/create', {
        escrow_id: params.escrowId,
        amount: params.amount,
        currency: params.currency,
        buyer_id: params.buyerId,
        seller_id: params.sellerId,
        buyer_email: params.metadata?.buyerEmail,
        metadata: params.metadata,
      });

      return {
        providerEscrowId: response.data.provider_escrow_id,
        status: response.data.status,
        metadata: {
          ...response.data.metadata,
          authorizationUrl: response.data.authorization_url,
          accessCode: response.data.access_code,
        },
      };
    } catch (error: any) {
      throw new Error(`Paystack escrow creation failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async releaseEscrow(params: EscrowReleaseParams): Promise<{ transactionId: string; amount: number }> {
    try {
      const response = await this.client.post('/escrow/release', {
        provider_escrow_id: params.providerEscrowId,
        amount: params.amount,
        seller_bank_code: params.metadata?.sellerBankCode,
        seller_account_number: params.metadata?.sellerAccountNumber,
        seller_account_name: params.metadata?.sellerAccountName,
      });

      return {
        transactionId: response.data.transaction_id,
        amount: response.data.amount,
      };
    } catch (error: any) {
      throw new Error(`Paystack escrow release failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async refundEscrow(params: EscrowRefundParams): Promise<{ transactionId: string; amount: number }> {
    try {
      const response = await this.client.post('/escrow/refund', {
        provider_escrow_id: params.providerEscrowId,
        amount: params.amount,
      });

      return {
        transactionId: response.data.transaction_id,
        amount: response.data.amount,
      };
    } catch (error: any) {
      throw new Error(`Paystack escrow refund failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async getEscrowStatus(providerEscrowId: string): Promise<EscrowStatusResponse> {
    try {
      const response = await this.client.get(`/escrow/status/${providerEscrowId}`);

      return {
        escrowId: response.data.escrow_id,
        status: response.data.status,
        heldAmount: response.data.held_amount,
        releasedAmount: response.data.released_amount,
        refundedAmount: response.data.refunded_amount,
      };
    } catch (error: any) {
      throw new Error(`Paystack status check failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}
