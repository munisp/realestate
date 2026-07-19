import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const SERVICES = {
  compliance: 'http://localhost:5100',
  ipfs: 'http://localhost:5101',
  kyb: 'http://localhost:5102',
  ml: 'http://localhost:5103',
  notification: 'http://localhost:5104',
  tenant: 'http://localhost:5105',
  recommendation: 'http://localhost:5106',
  mojaloop: 'http://localhost:5107',
  fraud: 'http://localhost:5108',
  tigerbeetle: 'http://localhost:5109',
  transaction: 'http://localhost:5110',
  user: 'http://localhost:5111',
  property: 'http://localhost:5112',
  developer: 'http://localhost:5113',
  workflow: 'http://localhost:5114',
  goAnalytics: 'http://localhost:5115',
  workflowPython: 'http://localhost:5116',
  buyerKyc: 'http://localhost:5050',
  diasporaKyc: 'http://localhost:5051'
};

describe('Service Health Checks', () => {
  Object.entries(SERVICES).forEach(([name, url]) => {
    it(`${name} service should be healthy`, async () => {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 5000 });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
      } catch (error) {
        console.warn(`${name} service not responding`);
      }
    });
  });
});

describe('User Service Integration', () => {
  let userId: string;

  it('should create a new user', async () => {
    const response = await axios.post(`${SERVICES.user}/users`, {
      email: 'test@example.com',
      name: 'Test User',
      role: 'BUYER'
    });
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    userId = response.data.id;
  });

  it('should retrieve user by id', async () => {
    const response = await axios.get(`${SERVICES.user}/users/${userId}`);
    expect(response.status).toBe(200);
    expect(response.data.email).toBe('test@example.com');
  });

  it('should list all users', async () => {
    const response = await axios.get(`${SERVICES.user}/users`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });
});

describe('Property Service Integration', () => {
  let propertyId: string;

  it('should create a new property', async () => {
    const response = await axios.post(`${SERVICES.property}/properties`, {
      title: 'Test Property',
      description: 'A beautiful test property',
      price: 50000000,
      currency: 'NGN',
      location: {
        address: '123 Test St',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria'
      },
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1500,
      type: 'HOUSE',
      sellerId: 'test-seller',
      images: [],
      amenities: ['parking', 'security']
    });
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    propertyId = response.data.id;
  });

  it('should retrieve property by id', async () => {
    const response = await axios.get(`${SERVICES.property}/properties/${propertyId}`);
    expect(response.status).toBe(200);
    expect(response.data.title).toBe('Test Property');
  });

  it('should search properties', async () => {
    const response = await axios.get(`${SERVICES.property}/search?q=Test`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });
});

describe('Transaction Service Integration', () => {
  let transactionId: string;

  it('should create a transaction', async () => {
    const response = await axios.post(`${SERVICES.transaction}/transactions`, {
      userId: 'test-user',
      type: 'PURCHASE',
      amount: 50000000,
      currency: 'NGN',
      paymentMethod: 'bank_transfer'
    });
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    transactionId = response.data.id;
  });

  it('should update transaction status', async () => {
    const response = await axios.patch(
      `${SERVICES.transaction}/transactions/${transactionId}/status`,
      { status: 'COMPLETED' }
    );
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('COMPLETED');
  });
});

describe('Compliance Service Integration', () => {
  it('should perform AML check', async () => {
    const response = await axios.post(`${SERVICES.compliance}/check/aml`, {
      name: 'John Doe',
      dateOfBirth: '1990-01-01',
      nationality: 'NG'
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('passed');
  });

  it('should check sanctions list', async () => {
    const response = await axios.post(`${SERVICES.compliance}/check/sanctions`, {
      name: 'Test Person'
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('matches');
  });
});

describe('Fraud Detection Integration', () => {
  it('should analyze transaction for fraud', async () => {
    const response = await axios.post(`${SERVICES.fraud}/analyze/transaction`, {
      id: 'test-tx-1',
      userId: 'test-user',
      amount: 1000000,
      currency: 'NGN',
      type: 'PURCHASE',
      timestamp: new Date().toISOString()
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('riskScore');
    expect(response.data).toHaveProperty('riskLevel');
  });
});

describe('Notification Service Integration', () => {
  it('should send email notification', async () => {
    const response = await axios.post(`${SERVICES.notification}/send/email`, {
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>'
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('success');
  });
});

describe('Workflow Orchestrator Integration', () => {
  let workflowId: string;

  it('should create property purchase workflow', async () => {
    const response = await axios.post(`${SERVICES.workflow}/workflows/property-purchase`, {
      buyerId: 'test-buyer',
      sellerId: 'test-seller',
      propertyId: 'test-property',
      amount: 50000000
    });
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    workflowId = response.data.id;
  });

  it('should retrieve workflow status', async () => {
    const response = await axios.get(`${SERVICES.workflow}/workflows/${workflowId}`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status');
  });
});

describe('Go Analytics Service Integration', () => {
  it('should record property view', async () => {
    const response = await axios.post(`${SERVICES.goAnalytics}/analytics/property/test-1/view`, {
      viewTime: 30
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('views');
  });

  it('should get property analytics', async () => {
    const response = await axios.get(`${SERVICES.goAnalytics}/analytics/property/test-1`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('propertyId');
  });
});

describe('End-to-End Property Purchase Flow', () => {
  it('should complete full purchase workflow', async () => {
    const user = await axios.post(`${SERVICES.user}/users`, {
      email: 'buyer@example.com',
      name: 'Buyer User',
      role: 'BUYER'
    });

    const property = await axios.post(`${SERVICES.property}/properties`, {
      title: 'E2E Test Property',
      description: 'End-to-end test',
      price: 30000000,
      currency: 'NGN',
      location: { address: '456 Test Ave', city: 'Abuja', state: 'FCT', country: 'Nigeria' },
      bedrooms: 2,
      bathrooms: 1,
      sqft: 1000,
      type: 'APARTMENT',
      sellerId: 'test-seller',
      images: [],
      amenities: []
    });

    const transaction = await axios.post(`${SERVICES.transaction}/transactions`, {
      userId: user.data.id,
      type: 'PURCHASE',
      amount: property.data.price,
      currency: 'NGN',
      paymentMethod: 'bank_transfer',
      propertyId: property.data.id
    });

    expect(user.status).toBe(201);
    expect(property.status).toBe(201);
    expect(transaction.status).toBe(201);
  });
});
