import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  propertyId: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  depositAmount: number;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'TERMINATED';
  paymentHistory: Payment[];
  maintenanceRequests: MaintenanceRequest[];
}

interface Payment {
  id: string;
  tenantId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  paymentMethod?: string;
  transactionId?: string;
}

interface MaintenanceRequest {
  id: string;
  tenantId: string;
  propertyId: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'HVAC' | 'APPLIANCE' | 'STRUCTURAL' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  resolvedAt?: string;
  assignedTo?: string;
  cost?: number;
}

class TenantService {
  private tenants: Map<string, Tenant> = new Map();
  private payments: Map<string, Payment> = new Map();
  private maintenanceRequests: Map<string, MaintenanceRequest> = new Map();

  createTenant(data: Omit<Tenant, 'id' | 'paymentHistory' | 'maintenanceRequests'>) {
    const tenant: Tenant = {
      ...data,
      id: uuidv4(),
      paymentHistory: [],
      maintenanceRequests: []
    };

    this.tenants.set(tenant.id, tenant);
    this.generateRentPayments(tenant);

    return tenant;
  }

  getTenant(tenantId: string) {
    return this.tenants.get(tenantId);
  }

  getAllTenants(filters?: {
    propertyId?: string;
    status?: string;
  }) {
    let tenants = Array.from(this.tenants.values());

    if (filters?.propertyId) {
      tenants = tenants.filter(t => t.propertyId === filters.propertyId);
    }

    if (filters?.status) {
      tenants = tenants.filter(t => t.status === filters.status);
    }

    return tenants;
  }

  updateTenant(tenantId: string, updates: Partial<Tenant>) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const updated = { ...tenant, ...updates };
    this.tenants.set(tenantId, updated);
    return updated;
  }

  terminateLease(tenantId: string, terminationDate: string) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    tenant.status = 'TERMINATED';
    tenant.leaseEnd = terminationDate;
    this.tenants.set(tenantId, tenant);

    return {
      success: true,
      tenant,
      finalPayments: this.calculateFinalPayments(tenant, terminationDate)
    };
  }

  private generateRentPayments(tenant: Tenant) {
    const startDate = new Date(tenant.leaseStart);
    const endDate = new Date(tenant.leaseEnd);
    const payments: Payment[] = [];

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const payment: Payment = {
        id: uuidv4(),
        tenantId: tenant.id,
        amount: tenant.monthlyRent,
        dueDate: currentDate.toISOString().split('T')[0],
        status: 'PENDING'
      };

      payments.push(payment);
      this.payments.set(payment.id, payment);

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    tenant.paymentHistory = payments;
    return payments;
  }

  recordPayment(paymentId: string, paymentData: {
    amount: number;
    paymentMethod: string;
    transactionId: string;
  }) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.paidDate = new Date().toISOString().split('T')[0];
    payment.paymentMethod = paymentData.paymentMethod;
    payment.transactionId = paymentData.transactionId;

    if (paymentData.amount >= payment.amount) {
      payment.status = 'PAID';
    } else {
      payment.status = 'PARTIAL';
    }

    this.payments.set(paymentId, payment);
    return payment;
  }

  getPaymentHistory(tenantId: string) {
    return Array.from(this.payments.values())
      .filter(p => p.tenantId === tenantId)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }

  getOverduePayments() {
    const today = new Date().toISOString().split('T')[0];
    return Array.from(this.payments.values())
      .filter(p => p.status === 'PENDING' && p.dueDate < today)
      .map(p => {
        p.status = 'OVERDUE';
        this.payments.set(p.id, p);
        return p;
      });
  }

  createMaintenanceRequest(data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'status'>) {
    const request: MaintenanceRequest = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      status: 'OPEN'
    };

    this.maintenanceRequests.set(request.id, request);

    const tenant = this.tenants.get(data.tenantId);
    if (tenant) {
      tenant.maintenanceRequests.push(request);
      this.tenants.set(tenant.id, tenant);
    }

    return request;
  }

  updateMaintenanceRequest(requestId: string, updates: Partial<MaintenanceRequest>) {
    const request = this.maintenanceRequests.get(requestId);
    if (!request) {
      throw new Error('Maintenance request not found');
    }

    const updated = { ...request, ...updates };

    if (updates.status === 'RESOLVED' || updates.status === 'CLOSED') {
      updated.resolvedAt = new Date().toISOString();
    }

    this.maintenanceRequests.set(requestId, updated);
    return updated;
  }

  getMaintenanceRequests(filters?: {
    tenantId?: string;
    propertyId?: string;
    status?: string;
    priority?: string;
  }) {
    let requests = Array.from(this.maintenanceRequests.values());

    if (filters?.tenantId) {
      requests = requests.filter(r => r.tenantId === filters.tenantId);
    }

    if (filters?.propertyId) {
      requests = requests.filter(r => r.propertyId === filters.propertyId);
    }

    if (filters?.status) {
      requests = requests.filter(r => r.status === filters.status);
    }

    if (filters?.priority) {
      requests = requests.filter(r => r.priority === filters.priority);
    }

    return requests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getTenantDashboard(tenantId: string) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const payments = this.getPaymentHistory(tenantId);
    const maintenanceRequests = this.getMaintenanceRequests({ tenantId });

    const paidPayments = payments.filter(p => p.status === 'PAID');
    const pendingPayments = payments.filter(p => p.status === 'PENDING');
    const overduePayments = payments.filter(p => p.status === 'OVERDUE');

    const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      tenant,
      payments: {
        total: payments.length,
        paid: paidPayments.length,
        pending: pendingPayments.length,
        overdue: overduePayments.length,
        totalPaid,
        totalPending,
        totalOverdue,
        nextPayment: pendingPayments[0]
      },
      maintenance: {
        total: maintenanceRequests.length,
        open: maintenanceRequests.filter(r => r.status === 'OPEN').length,
        inProgress: maintenanceRequests.filter(r => r.status === 'IN_PROGRESS').length,
        resolved: maintenanceRequests.filter(r => r.status === 'RESOLVED').length
      },
      leaseInfo: {
        daysRemaining: Math.ceil(
          (new Date(tenant.leaseEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ),
        isExpiringSoon: Math.ceil(
          (new Date(tenant.leaseEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ) < 60
      }
    };
  }

  private calculateFinalPayments(tenant: Tenant, terminationDate: string) {
    const termDate = new Date(terminationDate);
    const leaseEnd = new Date(tenant.leaseEnd);
    const monthsRemaining = Math.max(0, 
      (leaseEnd.getFullYear() - termDate.getFullYear()) * 12 +
      (leaseEnd.getMonth() - termDate.getMonth())
    );

    return {
      depositRefund: tenant.depositAmount,
      proRatedRent: 0,
      earlyTerminationFee: monthsRemaining > 0 ? tenant.monthlyRent * 2 : 0,
      totalDue: monthsRemaining > 0 ? tenant.monthlyRent * 2 - tenant.depositAmount : -tenant.depositAmount
    };
  }
}

const service = new TenantService();

app.post('/tenants', (req: Request, res: Response) => {
  try {
    const tenant = service.createTenant(req.body);
    res.status(201).json(tenant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/tenants', (req: Request, res: Response) => {
  try {
    const tenants = service.getAllTenants(req.query as any);
    res.json(tenants);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/tenants/:id', (req: Request, res: Response) => {
  try {
    const tenant = service.getTenant(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json(tenant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/tenants/:id', (req: Request, res: Response) => {
  try {
    const tenant = service.updateTenant(req.params.id, req.body);
    res.json(tenant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/tenants/:id/terminate', (req: Request, res: Response) => {
  try {
    const result = service.terminateLease(req.params.id, req.body.terminationDate);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/payments/:id/record', (req: Request, res: Response) => {
  try {
    const payment = service.recordPayment(req.params.id, req.body);
    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/payments/overdue', (req: Request, res: Response) => {
  try {
    const payments = service.getOverduePayments();
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/maintenance', (req: Request, res: Response) => {
  try {
    const request = service.createMaintenanceRequest(req.body);
    res.status(201).json(request);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/maintenance/:id', (req: Request, res: Response) => {
  try {
    const request = service.updateMaintenanceRequest(req.params.id, req.body);
    res.json(request);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/maintenance', (req: Request, res: Response) => {
  try {
    const requests = service.getMaintenanceRequests(req.query as any);
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/tenants/:id/dashboard', (req: Request, res: Response) => {
  try {
    const dashboard = service.getTenantDashboard(req.params.id);
    res.json(dashboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'tenant' });
});

const PORT = process.env.PORT || 5105;
app.listen(PORT, () => {
  console.log(`Tenant service running on port ${PORT}`);
});
