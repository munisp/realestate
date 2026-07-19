import axios from 'axios';
import logger from '../utils/logger';

export interface PaystackPaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    paid_at: string;
    customer: {
      email: string;
    };
  };
}

export class PaystackService {
  private apiKey: string;
  private baseUrl: string = 'https://api.paystack.co';

  constructor() {
    this.apiKey = process.env.PAYSTACK_SECRET_KEY || '';
    if (!this.apiKey) {
      logger.warn('Paystack API key not configured');
    }
  }

  async initializePayment(
    email: string,
    amount: number,
    reference: string,
    metadata?: any
  ): Promise<PaystackPaymentResponse> {
    try {
      const response = await axios.post<PaystackPaymentResponse>(
        `${this.baseUrl}/transaction/initialize`,
        {
          email,
          amount: Math.round(amount * 100), // Convert to kobo
          reference,
          metadata,
          callback_url: `${process.env.APP_URL}/api/payments/paystack/callback`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Paystack payment initialized', { reference });
      return response.data;
    } catch (error: any) {
      logger.error('Paystack initialization failed', { error: error.message });
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  }

  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    try {
      const response = await axios.get<PaystackVerifyResponse>(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      logger.info('Paystack payment verified', { reference, status: response.data.data.status });
      return response.data;
    } catch (error: any) {
      logger.error('Paystack verification failed', { error: error.message });
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  async createTransferRecipient(
    accountNumber: string,
    bankCode: string,
    name: string
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transferrecipient`,
        {
          type: 'nuban',
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data.recipient_code;
    } catch (error: any) {
      logger.error('Failed to create transfer recipient', { error: error.message });
      throw new Error(`Recipient creation failed: ${error.message}`);
    }
  }

  async initiateTransfer(
    recipientCode: string,
    amount: number,
    reference: string,
    reason: string
  ): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/transfer`,
        {
          source: 'balance',
          reason,
          amount: Math.round(amount * 100),
          recipient: recipientCode,
          reference,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Transfer initiated', { reference, amount });
    } catch (error: any) {
      logger.error('Transfer failed', { error: error.message });
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }
}
