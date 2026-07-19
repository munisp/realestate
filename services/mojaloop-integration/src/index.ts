import express, { Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

interface Transfer {
  transferId: string;
  payerFspId: string;
  payeeFspId: string;
  amount: {
    currency: string;
    amount: string;
  };
  ilpPacket: string;
  condition: string;
  expiration: string;
}

interface Quote {
  quoteId: string;
  transactionId: string;
  payee: Party;
  payer: Party;
  amountType: 'SEND' | 'RECEIVE';
  amount: Money;
  fees?: Money;
  transactionType: {
    scenario: string;
    initiator: string;
    initiatorType: string;
  };
}

interface Party {
  partyIdInfo: {
    partyIdType: string;
    partyIdentifier: string;
    fspId?: string;
  };
  name?: string;
  personalInfo?: {
    complexName?: {
      firstName: string;
      lastName: string;
    };
  };
}

interface Money {
  currency: string;
  amount: string;
}

class MojaLoopService {
  private baseUrl = process.env.MOJALOOP_API_URL || 'http://localhost:4000';
  private fspId = process.env.FSP_ID || 'realestate-fsp';

  async lookupParty(partyIdType: string, partyIdentifier: string): Promise<Party | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/parties/${partyIdType}/${partyIdentifier}`,
        {
          headers: {
            'FSPIOP-Source': this.fspId,
            'Content-Type': 'application/vnd.interoperability.parties+json;version=1.0'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Party lookup error:', error.message);
      return null;
    }
  }

  async requestQuote(quoteRequest: {
    transactionId: string;
    payerMsisdn: string;
    payeeMsisdn: string;
    amount: string;
    currency: string;
    scenario: string;
  }): Promise<Quote> {
    const quoteId = uuidv4();

    const quote: Quote = {
      quoteId,
      transactionId: quoteRequest.transactionId,
      payee: {
        partyIdInfo: {
          partyIdType: 'MSISDN',
          partyIdentifier: quoteRequest.payeeMsisdn,
          fspId: this.fspId
        }
      },
      payer: {
        partyIdInfo: {
          partyIdType: 'MSISDN',
          partyIdentifier: quoteRequest.payerMsisdn,
          fspId: this.fspId
        }
      },
      amountType: 'SEND',
      amount: {
        currency: quoteRequest.currency,
        amount: quoteRequest.amount
      },
      transactionType: {
        scenario: quoteRequest.scenario,
        initiator: 'PAYER',
        initiatorType: 'CONSUMER'
      }
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/quotes`,
        quote,
        {
          headers: {
            'FSPIOP-Source': this.fspId,
            'Content-Type': 'application/vnd.interoperability.quotes+json;version=1.0'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Quote request error:', error.message);
      
      quote.fees = {
        currency: quoteRequest.currency,
        amount: (parseFloat(quoteRequest.amount) * 0.01).toFixed(2)
      };

      return quote;
    }
  }

  async initiateTransfer(transferRequest: {
    payerMsisdn: string;
    payeeMsisdn: string;
    amount: string;
    currency: string;
    note?: string;
  }): Promise<{
    transferId: string;
    status: string;
    quote: Quote;
  }> {
    const transactionId = uuidv4();
    const transferId = uuidv4();

    const quote = await this.requestQuote({
      transactionId,
      payerMsisdn: transferRequest.payerMsisdn,
      payeeMsisdn: transferRequest.payeeMsisdn,
      amount: transferRequest.amount,
      currency: transferRequest.currency,
      scenario: 'TRANSFER'
    });

    const transfer: Transfer = {
      transferId,
      payerFspId: this.fspId,
      payeeFspId: this.fspId,
      amount: {
        currency: transferRequest.currency,
        amount: transferRequest.amount
      },
      ilpPacket: Buffer.from(JSON.stringify({
        transactionId,
        quoteId: quote.quoteId,
        payee: quote.payee,
        payer: quote.payer,
        amount: quote.amount
      })).toString('base64'),
      condition: this.generateCondition(),
      expiration: new Date(Date.now() + 30000).toISOString()
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/transfers`,
        transfer,
        {
          headers: {
            'FSPIOP-Source': this.fspId,
            'Content-Type': 'application/vnd.interoperability.transfers+json;version=1.0'
          }
        }
      );

      return {
        transferId,
        status: 'COMMITTED',
        quote
      };
    } catch (error: any) {
      console.error('Transfer error:', error.message);
      
      return {
        transferId,
        status: 'PENDING',
        quote
      };
    }
  }

  async getTransferStatus(transferId: string): Promise<{
    transferId: string;
    status: 'PENDING' | 'COMMITTED' | 'ABORTED' | 'RESERVED';
    completedTimestamp?: string;
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transfers/${transferId}`,
        {
          headers: {
            'FSPIOP-Source': this.fspId
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Transfer status error:', error.message);
      
      return {
        transferId,
        status: 'PENDING'
      };
    }
  }

  async bulkTransfer(transfers: Array<{
    payerMsisdn: string;
    payeeMsisdn: string;
    amount: string;
    currency: string;
  }>): Promise<{
    bulkTransferId: string;
    individualTransfers: Array<{
      transferId: string;
      status: string;
    }>;
  }> {
    const bulkTransferId = uuidv4();
    
    const results = await Promise.allSettled(
      transfers.map(t => this.initiateTransfer(t))
    );

    const individualTransfers = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          transferId: result.value.transferId,
          status: result.value.status
        };
      } else {
        return {
          transferId: `failed-${index}`,
          status: 'ABORTED'
        };
      }
    });

    return {
      bulkTransferId,
      individualTransfers
    };
  }

  async processPropertyPayment(payment: {
    buyerMsisdn: string;
    sellerMsisdn: string;
    amount: string;
    propertyId: string;
    escrowEnabled: boolean;
  }): Promise<{
    paymentId: string;
    transferId: string;
    status: string;
    escrowAccount?: string;
  }> {
    const paymentId = uuidv4();

    if (payment.escrowEnabled) {
      const escrowAccount = `escrow-${paymentId}`;
      
      const transferToEscrow = await this.initiateTransfer({
        payerMsisdn: payment.buyerMsisdn,
        payeeMsisdn: escrowAccount,
        amount: payment.amount,
        currency: 'NGN',
        note: `Property payment for ${payment.propertyId}`
      });

      return {
        paymentId,
        transferId: transferToEscrow.transferId,
        status: transferToEscrow.status,
        escrowAccount
      };
    } else {
      const directTransfer = await this.initiateTransfer({
        payerMsisdn: payment.buyerMsisdn,
        payeeMsisdn: payment.sellerMsisdn,
        amount: payment.amount,
        currency: 'NGN',
        note: `Property payment for ${payment.propertyId}`
      });

      return {
        paymentId,
        transferId: directTransfer.transferId,
        status: directTransfer.status
      };
    }
  }

  async releaseEscrow(escrowAccount: string, beneficiaryMsisdn: string, amount: string): Promise<{
    transferId: string;
    status: string;
  }> {
    const transfer = await this.initiateTransfer({
      payerMsisdn: escrowAccount,
      payeeMsisdn: beneficiaryMsisdn,
      amount,
      currency: 'NGN',
      note: 'Escrow release'
    });

    return {
      transferId: transfer.transferId,
      status: transfer.status
    };
  }

  private generateCondition(): string {
    return Buffer.from(uuidv4()).toString('base64').substring(0, 48);
  }
}

const service = new MojaLoopService();

app.get('/parties/:partyIdType/:partyIdentifier', async (req: Request, res: Response) => {
  try {
    const party = await service.lookupParty(
      req.params.partyIdType,
      req.params.partyIdentifier
    );
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    res.json(party);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/quotes', async (req: Request, res: Response) => {
  try {
    const quote = await service.requestQuote(req.body);
    res.json(quote);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/transfers', async (req: Request, res: Response) => {
  try {
    const transfer = await service.initiateTransfer(req.body);
    res.json(transfer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/transfers/:transferId', async (req: Request, res: Response) => {
  try {
    const status = await service.getTransferStatus(req.params.transferId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/bulk-transfers', async (req: Request, res: Response) => {
  try {
    const result = await service.bulkTransfer(req.body.transfers);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/property-payment', async (req: Request, res: Response) => {
  try {
    const payment = await service.processPropertyPayment(req.body);
    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/escrow/release', async (req: Request, res: Response) => {
  try {
    const { escrowAccount, beneficiaryMsisdn, amount } = req.body;
    const result = await service.releaseEscrow(escrowAccount, beneficiaryMsisdn, amount);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'mojaloop-integration' });
});

const PORT = process.env.PORT || 5107;
app.listen(PORT, () => {
  console.log(`MojaLoop integration service running on port ${PORT}`);
});
