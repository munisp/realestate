import request from 'supertest';
import { AppDataSource } from '../../src/config/database';
import express from 'express';
import { crmController } from '../../src/controllers/crmController';

const app = express();
app.use(express.json());

// Setup routes
app.post('/api/leads', crmController.createLead.bind(crmController));
app.get('/api/leads', crmController.getLeads.bind(crmController));
app.post('/api/leads/:id/convert', crmController.convertLead.bind(crmController));
app.post('/api/contacts', crmController.createContact.bind(crmController));
app.post('/api/deals', crmController.createDeal.bind(crmController));
app.post('/api/deals/:id/move', crmController.moveDealStage.bind(crmController));

describe('CRM Service Integration Tests', () => {
  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe('Lead Management', () => {
    let leadId: string;

    it('should create a new lead', async () => {
      const response = await request(app)
        .post('/api/leads')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          source: 'website',
          status: 'new',
          temperature: 'warm',
          propertyInterest: 'residential',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.firstName).toBe('John');
      expect(response.body.email).toBe('john.doe@example.com');
      leadId = response.body.id;
    });

    it('should get leads with filters', async () => {
      const response = await request(app)
        .get('/api/leads')
        .query({ status: 'new', temperature: 'warm' })
        .expect(200);

      expect(response.body).toHaveProperty('leads');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.leads)).toBe(true);
    });

    it('should convert lead to contact', async () => {
      const response = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('john.doe@example.com');
    });
  });

  describe('Contact Management', () => {
    let contactId: string;

    it('should create a new contact', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+1987654321',
          company: 'Acme Corp',
          tags: ['vip', 'investor'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.firstName).toBe('Jane');
      contactId = response.body.id;
    });
  });

  describe('Deal Management', () => {
    let dealId: string;

    it('should create a new deal', async () => {
      const response = await request(app)
        .post('/api/deals')
        .send({
          title: 'Luxury Apartment Sale',
          value: 500000,
          currency: 'USD',
          stage: 'qualification',
          probability: 30,
          expectedCloseDate: new Date('2025-12-31'),
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Luxury Apartment Sale');
      expect(response.body.value).toBe(500000);
      dealId = response.body.id;
    });

    it('should move deal to next stage', async () => {
      const response = await request(app)
        .post(`/api/deals/${dealId}/move`)
        .send({ stage: 'proposal' })
        .expect(200);

      expect(response.body.stage).toBe('proposal');
      expect(response.body.probability).toBeGreaterThan(30);
    });
  });

  describe('Activity Tracking', () => {
    it('should create an activity', async () => {
      const response = await request(app)
        .post('/api/activities')
        .send({
          type: 'call',
          subject: 'Follow-up call',
          description: 'Discussed property requirements',
          status: 'completed',
          scheduledAt: new Date(),
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('call');
    });
  });

  describe('Task Management', () => {
    it('should create a task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Send property brochure',
          description: 'Email brochure to client',
          priority: 'high',
          status: 'pending',
          dueDate: new Date('2025-12-01'),
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Send property brochure');
      expect(response.body.priority).toBe('high');
    });
  });
});
