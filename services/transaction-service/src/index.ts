import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

interface Transaction {
  id: string;
  userId: string;
  type: 'PURCHASE' | 'DEPOSIT' | 'WITHDRAWAL' | 'REFUND' | 'ESCROW' | 'RENT';
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paymentMethod: string;
  propertyId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

class TransactionService {
  private transactions = new Map<string, Transaction>();

  create(data: Omit<Transaction, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
    const transaction: Transaction = {
      ...data,
      id: uuidv4(),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  get(id: string) {
    return this.transactions.get(id);
  }

  list(filters?: { userId?: string; status?: string; type?: string }) {
    let results = Array.from(this.transactions.values());
    if (filters?.userId) results = results.filter(t => t.userId === filters.userId);
    if (filters?.status) results = results.filter(t => t.status === filters.status);
    if (filters?.type) results = results.filter(t => t.type === filters.type);
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateStatus(id: string, status: Transaction['status']) {
    const tx = this.transactions.get(id);
    if (!tx) throw new Error('Transaction not found');
    tx.status = status;
    tx.updatedAt = new Date().toISOString();
    this.transactions.set(id, tx);
    return tx;
  }
}

const service = new TransactionService();

app.post('/transactions', (req, res) => {
  try {
    const tx = service.create(req.body);
    res.status(201).json(tx);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/transactions/:id', (req, res) => {
  const tx = service.get(req.params.id);
  if (!tx) return res.status(404).json({ error: 'Not found' });
  res.json(tx);
});

app.get('/transactions', (req, res) => {
  const txs = service.list(req.query as any);
  res.json(txs);
});

app.patch('/transactions/:id/status', (req, res) => {
  try {
    const tx = service.updateStatus(req.params.id, req.body.status);
    res.json(tx);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'transaction' }));

app.listen(process.env.PORT || 5110, () => console.log('Transaction service running'));
