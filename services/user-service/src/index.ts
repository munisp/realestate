import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'BUYER' | 'SELLER' | 'AGENT' | 'ADMIN';
  kycStatus: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
  lastLogin?: string;
}

class UserService {
  private users = new Map<string, User>();

  create(data: Omit<User, 'id' | 'createdAt' | 'kycStatus'>) {
    const user: User = {
      ...data,
      id: uuidv4(),
      kycStatus: 'NONE',
      createdAt: new Date().toISOString()
    };
    this.users.set(user.id, user);
    return user;
  }

  get(id: string) {
    return this.users.get(id);
  }

  getByEmail(email: string) {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  list(filters?: { role?: string; kycStatus?: string }) {
    let results = Array.from(this.users.values());
    if (filters?.role) results = results.filter(u => u.role === filters.role);
    if (filters?.kycStatus) results = results.filter(u => u.kycStatus === filters.kycStatus);
    return results;
  }

  update(id: string, updates: Partial<User>) {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    Object.assign(user, updates);
    this.users.set(id, user);
    return user;
  }

  updateKYCStatus(id: string, status: User['kycStatus']) {
    return this.update(id, { kycStatus: status });
  }

  recordLogin(id: string) {
    return this.update(id, { lastLogin: new Date().toISOString() });
  }
}

const service = new UserService();

app.post('/users', (req, res) => {
  try {
    const user = service.create(req.body);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/users/:id', (req, res) => {
  const user = service.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

app.get('/users', (req, res) => {
  const users = service.list(req.query as any);
  res.json(users);
});

app.put('/users/:id', (req, res) => {
  try {
    const user = service.update(req.params.id, req.body);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/users/:id/kyc', (req, res) => {
  try {
    const user = service.updateKYCStatus(req.params.id, req.body.status);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/users/:id/login', (req, res) => {
  try {
    const user = service.recordLogin(req.params.id);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'user' }));

app.listen(process.env.PORT || 5111, () => console.log('User service running'));
