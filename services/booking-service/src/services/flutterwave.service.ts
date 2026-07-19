import axios from 'axios';
import logger from '../utils/logger';

export interface FlutterwavePaymentResponse {
  status: string;
  message: string;
  data: {
    link: string;
  };
}

export interface FlutterwaveVerifyResponse {
  status: string;
  message: string;
  data: {
    status: string;
    tx_ref: string;
    amount: number;
    charged_amount: number;
    customer: {
      email: string;
    };
  };
}

export class FlutterwaveService {
  private apiKey: string;
  private baseUrl: string = 'https://api.flutterwave.com/v3';

  constructor() {
    this.apiKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
    if (!this.apiKey) {
      logger.warn('Flutterwave API key not configured');
    }
  }

  async initializePayment(
    email: string,
    amount: number,
    txRef: string,
    metadata?: any
  ): Promise<FlutterwavePaymentResponse> {
    try {
      const response = await axios.post<FlutterwavePaymentResponse>(
        `${this.baseUrl}/payments`,
        {
          tx_ref: txRef,
          amount,
          currency: 'NGN',
          redirect_url: `${process.env.APP_URL}/api/payments/flutterwave/callback`,
          payment_options: 'card,banktransfer,ussd,mobilemoney',
          customer: {
            email,
          },
          customizations: {
            title: 'Shortlet Booking Payment',
            description: 'Payment for property booking',
          },
          meta: metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Flutterwave payment initialized', { txRef });
      return response.data;
    } catch (error: any) {
      logger.error('Flutterwave initialization failed', { error: error.message });
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  }

  async verifyPayment(transactionId: string): Promise<FlutterwaveVerifyResponse> {
    try {
      const response = await axios.get<FlutterwaveVerifyResponse>(
        `${this.baseUrl}/transactions/${transactionId}/verify`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      logger.info('Flutterwave payment verified', { transactionId, status: response.data.data.status });
      return response.data;
    } catch (error: any) {
      logger.error('Flutterwave verification failed', { error: error.message });
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  async initiateTransfer(
    accountNumber: string,
    bankCode: string,
    amount: number,
    reference: string,
    narration: string
  ): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/transfers`,
        {
          account_bank: bankCode,
          account_number: accountNumber,
          amount,
          currency: 'NGN',
          reference,
          narration,
          callback_url: `${process.env.APP_URL}/api/payments/flutterwave/transfer-callback`,
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
