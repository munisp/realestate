/**
 * CRM Integration Service
 * Supports Salesforce and HubSpot integrations for lead sync, contact management, and deal tracking
 */

import { ENV } from './_core/env';

// CRM Types
export type CRMProvider = 'salesforce' | 'hubspot';

export interface CRMContact {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  source?: string;
  customFields?: Record<string, any>;
}

export interface CRMLead {
  id?: string;
  contactId?: string;
  propertyId?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  source: string;
  notes?: string;
  assignedTo?: string;
  customFields?: Record<string, any>;
}

export interface CRMDeal {
  id?: string;
  name: string;
  amount: number;
  stage: string;
  closeDate?: Date;
  contactId?: string;
  propertyId?: string;
  probability?: number;
  customFields?: Record<string, any>;
}

export interface CRMActivity {
  id?: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  subject: string;
  description?: string;
  contactId?: string;
  leadId?: string;
  dealId?: string;
  dueDate?: Date;
  completed?: boolean;
}

/**
 * Salesforce Integration
 */
class SalesforceIntegration {
  private accessToken: string | null = null;
  private instanceUrl: string | null = null;

  async authenticate() {
    // In production, implement OAuth 2.0 flow
    // For now, use environment variables
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const username = process.env.SALESFORCE_USERNAME;
    const password = process.env.SALESFORCE_PASSWORD;
    const securityToken = process.env.SALESFORCE_SECURITY_TOKEN;

    if (!clientId || !clientSecret || !username || !password) {
      throw new Error('Salesforce credentials not configured');
    }

    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      client_secret: clientSecret,
      username: username,
      password: password + (securityToken || ''),
    });

    const response = await fetch('https://login.salesforce.com/services/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!response.ok) {
      throw new Error('Salesforce authentication failed');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.instanceUrl = data.instance_url;
  }

  async createContact(contact: CRMContact): Promise<string> {
    if (!this.accessToken) await this.authenticate();

    const response = await fetch(`${this.instanceUrl}/services/data/v58.0/sobjects/Contact`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        FirstName: contact.firstName,
        LastName: contact.lastName,
        Email: contact.email,
        Phone: contact.phone,
        Company: contact.company,
        LeadSource: contact.source,
        ...contact.customFields,
      }),
    });

    const data = await response.json();
    return data.id;
  }

  async createLead(lead: CRMLead): Promise<string> {
    if (!this.accessToken) await this.authenticate();

    const response = await fetch(`${this.instanceUrl}/services/data/v58.0/sobjects/Lead`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Status: lead.status,
        LeadSource: lead.source,
        Description: lead.notes,
        OwnerId: lead.assignedTo,
        ...lead.customFields,
      }),
    });

    const data = await response.json();
    return data.id;
  }

  async createOpportunity(deal: CRMDeal): Promise<string> {
    if (!this.accessToken) await this.authenticate();

    const response = await fetch(`${this.instanceUrl}/services/data/v58.0/sobjects/Opportunity`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Name: deal.name,
        Amount: deal.amount,
        StageName: deal.stage,
        CloseDate: deal.closeDate?.toISOString().split('T')[0],
        Probability: deal.probability,
        ...deal.customFields,
      }),
    });

    const data = await response.json();
    return data.id;
  }

  async logActivity(activity: CRMActivity): Promise<string> {
    if (!this.accessToken) await this.authenticate();

    const sobjectType = activity.type === 'task' ? 'Task' : 'Event';
    const response = await fetch(`${this.instanceUrl}/services/data/v58.0/sobjects/${sobjectType}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Subject: activity.subject,
        Description: activity.description,
        WhoId: activity.contactId,
        WhatId: activity.dealId,
        ActivityDate: activity.dueDate?.toISOString().split('T')[0],
        Status: activity.completed ? 'Completed' : 'Not Started',
      }),
    });

    const data = await response.json();
    return data.id;
  }
}

/**
 * HubSpot Integration
 */
class HubSpotIntegration {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.HUBSPOT_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('HubSpot API key not configured');
    }
  }

  async createContact(contact: CRMContact): Promise<string> {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          firstname: contact.firstName,
          lastname: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          hs_lead_status: contact.source,
          ...contact.customFields,
        },
      }),
    });

    const data = await response.json();
    return data.id;
  }

  async createDeal(deal: CRMDeal): Promise<string> {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          dealname: deal.name,
          amount: deal.amount,
          dealstage: deal.stage,
          closedate: deal.closeDate?.toISOString(),
          hs_probability: deal.probability,
          ...deal.customFields,
        },
      }),
    });

    const data = await response.json();
    return data.id;
  }

  async logActivity(activity: CRMActivity): Promise<string> {
    const engagementType = activity.type === 'call' ? 'CALL' : activity.type === 'email' ? 'EMAIL' : 'NOTE';
    
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          hs_note_body: activity.description,
          hs_timestamp: new Date().toISOString(),
        },
        associations: activity.contactId ? [
          {
            to: { id: activity.contactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }],
          },
        ] : [],
      }),
    });

    const data = await response.json();
    return data.id;
  }

  async syncContact(contactId: string, updates: Partial<CRMContact>): Promise<void> {
    await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          firstname: updates.firstName,
          lastname: updates.lastName,
          email: updates.email,
          phone: updates.phone,
          ...updates.customFields,
        },
      }),
    });
  }
}

/**
 * Unified CRM Service
 */
export class CRMService {
  private salesforce: SalesforceIntegration;
  private hubspot: HubSpotIntegration | null = null;

  constructor() {
    this.salesforce = new SalesforceIntegration();
    
    try {
      this.hubspot = new HubSpotIntegration();
    } catch (error) {
      console.warn('HubSpot integration not configured');
    }
  }

  async createContact(provider: CRMProvider, contact: CRMContact): Promise<string> {
    if (provider === 'salesforce') {
      return await this.salesforce.createContact(contact);
    } else if (provider === 'hubspot' && this.hubspot) {
      return await this.hubspot.createContact(contact);
    }
    throw new Error(`CRM provider ${provider} not available`);
  }

  async createLead(provider: CRMProvider, lead: CRMLead): Promise<string> {
    if (provider === 'salesforce') {
      return await this.salesforce.createLead(lead);
    }
    throw new Error(`Lead creation not supported for ${provider}`);
  }

  async createDeal(provider: CRMProvider, deal: CRMDeal): Promise<string> {
    if (provider === 'salesforce') {
      return await this.salesforce.createOpportunity(deal);
    } else if (provider === 'hubspot' && this.hubspot) {
      return await this.hubspot.createDeal(deal);
    }
    throw new Error(`CRM provider ${provider} not available`);
  }

  async logActivity(provider: CRMProvider, activity: CRMActivity): Promise<string> {
    if (provider === 'salesforce') {
      return await this.salesforce.logActivity(activity);
    } else if (provider === 'hubspot' && this.hubspot) {
      return await this.hubspot.logActivity(activity);
    }
    throw new Error(`CRM provider ${provider} not available`);
  }
}

export const crmService = new CRMService();
