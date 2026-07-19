import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const app = express();
app.use(express.json());

interface WorkflowStep {
  id: string;
  name: string;
  service: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  payload?: any;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
}

interface Workflow {
  id: string;
  name: string;
  type: 'PROPERTY_PURCHASE' | 'KYC_VERIFICATION' | 'RENT_PAYMENT' | 'ESCROW_RELEASE';
  steps: WorkflowStep[];
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  completedAt?: string;
}

class WorkflowOrchestrator {
  private workflows = new Map<string, Workflow>();

  async createPropertyPurchaseWorkflow(data: {
    buyerId: string;
    sellerId: string;
    propertyId: string;
    amount: number;
  }) {
    const workflow: Workflow = {
      id: uuidv4(),
      name: 'Property Purchase',
      type: 'PROPERTY_PURCHASE',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      steps: [
        {
          id: uuidv4(),
          name: 'Verify Buyer KYC',
          service: 'kyc-service',
          endpoint: '/verify/buyer',
          method: 'POST',
          payload: { userId: data.buyerId },
          status: 'PENDING'
        },
        {
          id: uuidv4(),
          name: 'Create Escrow',
          service: 'tigerbeetle-service',
          endpoint: '/escrow/create',
          method: 'POST',
          payload: {
            buyerId: data.buyerId,
            sellerId: data.sellerId,
            amount: data.amount
          },
          status: 'PENDING'
        },
        {
          id: uuidv4(),
          name: 'Update Property Status',
          service: 'property-service',
          endpoint: `/properties/${data.propertyId}/status`,
          method: 'PATCH',
          payload: { status: 'PENDING' },
          status: 'PENDING'
        },
        {
          id: uuidv4(),
          name: 'Send Notification',
          service: 'notification-service',
          endpoint: '/send/email',
          method: 'POST',
          payload: {
            to: 'buyer@example.com',
            subject: 'Purchase Initiated',
            html: 'Your property purchase has been initiated'
          },
          status: 'PENDING'
        }
      ]
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async executeWorkflow(workflowId: string) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    workflow.status = 'RUNNING';
    this.workflows.set(workflowId, workflow);

    for (const step of workflow.steps) {
      try {
        step.status = 'RUNNING';
        
        const serviceUrl = `http://localhost:${this.getServicePort(step.service)}`;
        const response = await axios({
          method: step.method,
          url: `${serviceUrl}${step.endpoint}`,
          data: step.payload
        });

        step.result = response.data;
        step.status = 'COMPLETED';
      } catch (error: any) {
        step.status = 'FAILED';
        step.error = error.message;
        workflow.status = 'FAILED';
        this.workflows.set(workflowId, workflow);
        throw error;
      }
    }

    workflow.status = 'COMPLETED';
    workflow.completedAt = new Date().toISOString();
    this.workflows.set(workflowId, workflow);

    return workflow;
  }

  getWorkflow(id: string) {
    return this.workflows.get(id);
  }

  listWorkflows() {
    return Array.from(this.workflows.values());
  }

  private getServicePort(service: string): number {
    const ports: Record<string, number> = {
      'kyc-service': 5050,
      'tigerbeetle-service': 5109,
      'property-service': 5112,
      'notification-service': 5104,
      'transaction-service': 5110
    };
    return ports[service] || 5000;
  }
}

const service = new WorkflowOrchestrator();

app.post('/workflows/property-purchase', async (req, res) => {
  try {
    const workflow = await service.createPropertyPurchaseWorkflow(req.body);
    res.status(201).json(workflow);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/workflows/:id/execute', async (req, res) => {
  try {
    const workflow = await service.executeWorkflow(req.params.id);
    res.json(workflow);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/workflows/:id', (req, res) => {
  const workflow = service.getWorkflow(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Not found' });
  res.json(workflow);
});

app.get('/workflows', (req, res) => {
  res.json(service.listWorkflows());
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'workflow-orchestrator' }));

app.listen(process.env.PORT || 5114, () => console.log('Workflow orchestrator running'));
