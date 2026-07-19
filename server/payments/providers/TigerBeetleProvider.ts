import axios from 'axios';
import { PaymentProvider, EscrowCreateParams, EscrowReleaseParams, EscrowRefundParams, EscrowStatusResponse } from '../types';

const TIGERBEETLE_SERVICE_URL = process.env.TIGERBEETLE_SERVICE_URL || 'http://localhost:5011';

export class TigerBeetleProvider implements PaymentProvider {
  name = 'tigerbeetle';
  displayName = 'TigerBeetle';

  private client = axios.create({
    baseURL: TIGERBEETLE_SERVICE_URL,
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
        metadata: params.metadata,
      });

      return {
        providerEscrowId: response.data.provider_escrow_id,
        status: response.data.status,
        metadata: response.data.metadata,
      };
    } catch (error: any) {
      throw new Error(`TigerBeetle escrow creation failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async releaseEscrow(params: EscrowReleaseParams): Promise<{ transactionId: string; amount: number }> {
    try {
      const response = await this.client.post('/escrow/release', {
        provider_escrow_id: params.providerEscrowId,
        amount: params.amount,
      });

      return {
        transactionId: response.data.transaction_id,
        amount: response.data.amount,
      };
    } catch (error: any) {
      throw new Error(`TigerBeetle escrow release failed: ${error.response?.data?.error || error.message}`);
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
      throw new Error(`TigerBeetle escrow refund failed: ${error.response?.data?.error || error.message}`);
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
      throw new Error(`TigerBeetle status check failed: ${error.response?.data?.error || error.message}`);
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
