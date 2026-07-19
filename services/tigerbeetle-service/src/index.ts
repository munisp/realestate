import express, { Request, Response } from 'express';
import { createClient, Account, Transfer, CreateAccountError, CreateTransferError } from 'tigerbeetle-node';

const app = express();
app.use(express.json());

const TIGERBEETLE_CLUSTER_ID = BigInt(process.env.TIGERBEETLE_CLUSTER_ID || 0);
const TIGERBEETLE_ADDRESSES = (process.env.TIGERBEETLE_ADDRESSES || '3000').split(',');

class TigerBeetleService {
  private client: any;
  private connected: boolean = false;

  async initialize() {
    try {
      this.client = createClient({
        cluster_id: TIGERBEETLE_CLUSTER_ID,
        replica_addresses: TIGERBEETLE_ADDRESSES
      });
      this.connected = true;
      console.log('TigerBeetle client initialized');
    } catch (error) {
      console.error('Failed to initialize TigerBeetle:', error);
      this.connected = false;
    }
  }

  async createAccount(params: {
    id: bigint;
    ledger: number;
    code: number;
    flags?: number;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'TigerBeetle not connected' };
    }

    const account: Account = {
      id: params.id,
      debits_pending: 0n,
      debits_posted: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      reserved: 0,
      ledger: params.ledger,
      code: params.code,
      flags: params.flags || 0,
      timestamp: 0n
    };

    try {
      const errors = await this.client.createAccounts([account]);
      
      if (errors.length > 0) {
        return {
          success: false,
          error: `Account creation failed: ${CreateAccountError[errors[0].result]}`
        };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createTransfer(params: {
    id: bigint;
    debitAccountId: bigint;
    creditAccountId: bigint;
    amount: bigint;
    ledger: number;
    code: number;
    flags?: number;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'TigerBeetle not connected' };
    }

    const transfer: Transfer = {
      id: params.id,
      debit_account_id: params.debitAccountId,
      credit_account_id: params.creditAccountId,
      amount: params.amount,
      pending_id: 0n,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      timeout: 0,
      ledger: params.ledger,
      code: params.code,
      flags: params.flags || 0,
      timestamp: 0n
    };

    try {
      const errors = await this.client.createTransfers([transfer]);
      
      if (errors.length > 0) {
        return {
          success: false,
          error: `Transfer failed: ${CreateTransferError[errors[0].result]}`
        };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async lookupAccount(id: bigint): Promise<Account | null> {
    if (!this.connected) {
      return null;
    }

    try {
      const accounts = await this.client.lookupAccounts([id]);
      return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Account lookup failed:', error);
      return null;
    }
  }

  async getAccountBalance(id: bigint): Promise<{
    debits: bigint;
    credits: bigint;
    balance: bigint;
  } | null> {
    const account = await this.lookupAccount(id);
    
    if (!account) {
      return null;
    }

    const debits = account.debits_posted;
    const credits = account.credits_posted;
    const balance = credits - debits;

    return { debits, credits, balance };
  }

  async createPropertyEscrow(params: {
    buyerId: bigint;
    sellerId: bigint;
    escrowId: bigint;
    amount: bigint;
    ledger: number;
  }): Promise<{ success: boolean; transferId?: bigint; error?: string }> {
    const transferId = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));

    const result = await this.createTransfer({
      id: transferId,
      debitAccountId: params.buyerId,
      creditAccountId: params.escrowId,
      amount: params.amount,
      ledger: params.ledger,
      code: 1001, // Property escrow code
      flags: 0
    });

    if (result.success) {
      return { success: true, transferId };
    } else {
      return { success: false, error: result.error };
    }
  }

  async releaseEscrow(params: {
    escrowId: bigint;
    beneficiaryId: bigint;
    amount: bigint;
    ledger: number;
  }): Promise<{ success: boolean; transferId?: bigint; error?: string }> {
    const transferId = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));

    const result = await this.createTransfer({
      id: transferId,
      debitAccountId: params.escrowId,
      creditAccountId: params.beneficiaryId,
      amount: params.amount,
      ledger: params.ledger,
      code: 1002, // Escrow release code
      flags: 0
    });

    if (result.success) {
      return { success: true, transferId };
    } else {
      return { success: false, error: result.error };
    }
  }

  async processRentPayment(params: {
    tenantId: bigint;
    landlordId: bigint;
    amount: bigint;
    ledger: number;
  }): Promise<{ success: boolean; transferId?: bigint; error?: string }> {
    const transferId = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));

    const result = await this.createTransfer({
      id: transferId,
      debitAccountId: params.tenantId,
      creditAccountId: params.landlordId,
      amount: params.amount,
      ledger: params.ledger,
      code: 2001, // Rent payment code
      flags: 0
    });

    if (result.success) {
      return { success: true, transferId };
    } else {
      return { success: false, error: result.error };
    }
  }
}

const service = new TigerBeetleService();

service.initialize().catch(console.error);

app.post('/accounts', async (req: Request, res: Response) => {
  try {
    const { id, ledger, code, flags } = req.body;
    const result = await service.createAccount({
      id: BigInt(id),
      ledger,
      code,
      flags
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const account = await service.lookupAccount(BigInt(req.params.id));
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      id: account.id.toString(),
      debits_posted: account.debits_posted.toString(),
      credits_posted: account.credits_posted.toString(),
      balance: (account.credits_posted - account.debits_posted).toString(),
      ledger: account.ledger,
      code: account.code
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/accounts/:id/balance', async (req: Request, res: Response) => {
  try {
    const balance = await service.getAccountBalance(BigInt(req.params.id));
    
    if (!balance) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      debits: balance.debits.toString(),
      credits: balance.credits.toString(),
      balance: balance.balance.toString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/transfers', async (req: Request, res: Response) => {
  try {
    const { id, debitAccountId, creditAccountId, amount, ledger, code, flags } = req.body;
    const result = await service.createTransfer({
      id: BigInt(id),
      debitAccountId: BigInt(debitAccountId),
      creditAccountId: BigInt(creditAccountId),
      amount: BigInt(amount),
      ledger,
      code,
      flags
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/escrow/create', async (req: Request, res: Response) => {
  try {
    const { buyerId, sellerId, escrowId, amount, ledger } = req.body;
    const result = await service.createPropertyEscrow({
      buyerId: BigInt(buyerId),
      sellerId: BigInt(sellerId),
      escrowId: BigInt(escrowId),
      amount: BigInt(amount),
      ledger
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/escrow/release', async (req: Request, res: Response) => {
  try {
    const { escrowId, beneficiaryId, amount, ledger } = req.body;
    const result = await service.releaseEscrow({
      escrowId: BigInt(escrowId),
      beneficiaryId: BigInt(beneficiaryId),
      amount: BigInt(amount),
      ledger
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/rent/payment', async (req: Request, res: Response) => {
  try {
    const { tenantId, landlordId, amount, ledger } = req.body;
    const result = await service.processRentPayment({
      tenantId: BigInt(tenantId),
      landlordId: BigInt(landlordId),
      amount: BigInt(amount),
      ledger
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: service['connected'] ? 'healthy' : 'degraded',
    service: 'tigerbeetle',
    connected: service['connected']
  });
});

const PORT = process.env.PORT || 5109;
app.listen(PORT, () => {
  console.log(`TigerBeetle service running on port ${PORT}`);
});
