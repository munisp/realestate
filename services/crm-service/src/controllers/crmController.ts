import { Request, Response } from 'express';
import { crmService } from '../services/crmService';
import { logger } from '../config/logger';

export class CRMController {
  // Lead endpoints
  async createLead(req: Request, res: Response) {
    try {
      const lead = await crmService.createLead(req.body);
      res.status(201).json(lead);
    } catch (error) {
      logger.error('Create lead error:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  }

  async updateLead(req: Request, res: Response) {
    try {
      const lead = await crmService.updateLead(req.params.id, req.body);
      res.json(lead);
    } catch (error) {
      logger.error('Update lead error:', error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  }

  async getLeads(req: Request, res: Response) {
    try {
      const filters = {
        status: req.query.status,
        temperature: req.query.temperature,
        assignedTo: req.query.assignedTo,
        search: req.query.search,
        skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
        take: req.query.take ? parseInt(req.query.take as string) : 20,
      };
      const result = await crmService.getLeads(filters);
      res.json(result);
    } catch (error) {
      logger.error('Get leads error:', error);
      res.status(500).json({ error: 'Failed to get leads' });
    }
  }

  async convertLead(req: Request, res: Response) {
    try {
      const contact = await crmService.convertLeadToContact(req.params.id);
      res.json(contact);
    } catch (error) {
      logger.error('Convert lead error:', error);
      res.status(500).json({ error: 'Failed to convert lead' });
    }
  }

  // Contact endpoints
  async createContact(req: Request, res: Response) {
    try {
      const contact = await crmService.createContact(req.body);
      res.status(201).json(contact);
    } catch (error) {
      logger.error('Create contact error:', error);
      res.status(500).json({ error: 'Failed to create contact' });
    }
  }

  async updateContact(req: Request, res: Response) {
    try {
      const contact = await crmService.updateContact(req.params.id, req.body);
      res.json(contact);
    } catch (error) {
      logger.error('Update contact error:', error);
      res.status(500).json({ error: 'Failed to update contact' });
    }
  }

  async getContacts(req: Request, res: Response) {
    try {
      const filters = {
        assignedTo: req.query.assignedTo,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search: req.query.search,
        skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
        take: req.query.take ? parseInt(req.query.take as string) : 20,
      };
      const result = await crmService.getContacts(filters);
      res.json(result);
    } catch (error) {
      logger.error('Get contacts error:', error);
      res.status(500).json({ error: 'Failed to get contacts' });
    }
  }

  // Deal endpoints
  async createDeal(req: Request, res: Response) {
    try {
      const deal = await crmService.createDeal(req.body);
      res.status(201).json(deal);
    } catch (error) {
      logger.error('Create deal error:', error);
      res.status(500).json({ error: 'Failed to create deal' });
    }
  }

  async updateDeal(req: Request, res: Response) {
    try {
      const deal = await crmService.updateDeal(req.params.id, req.body);
      res.json(deal);
    } catch (error) {
      logger.error('Update deal error:', error);
      res.status(500).json({ error: 'Failed to update deal' });
    }
  }

  async moveDealStage(req: Request, res: Response) {
    try {
      const { stage } = req.body;
      const deal = await crmService.moveDealStage(req.params.id, stage);
      res.json(deal);
    } catch (error) {
      logger.error('Move deal stage error:', error);
      res.status(500).json({ error: 'Failed to move deal stage' });
    }
  }

  async getDealsByStage(req: Request, res: Response) {
    try {
      const result = await crmService.getDealsByStage();
      res.json(result);
    } catch (error) {
      logger.error('Get deals by stage error:', error);
      res.status(500).json({ error: 'Failed to get deals by stage' });
    }
  }

  // Activity endpoints
  async createActivity(req: Request, res: Response) {
    try {
      const activity = await crmService.createActivity(req.body);
      res.status(201).json(activity);
    } catch (error) {
      logger.error('Create activity error:', error);
      res.status(500).json({ error: 'Failed to create activity' });
    }
  }

  async updateActivity(req: Request, res: Response) {
    try {
      const activity = await crmService.updateActivity(req.params.id, req.body);
      res.json(activity);
    } catch (error) {
      logger.error('Update activity error:', error);
      res.status(500).json({ error: 'Failed to update activity' });
    }
  }

  async getActivities(req: Request, res: Response) {
    try {
      const filters = {
        type: req.query.type,
        status: req.query.status,
        assignedTo: req.query.assignedTo,
        leadId: req.query.leadId,
        contactId: req.query.contactId,
        dealId: req.query.dealId,
        skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
        take: req.query.take ? parseInt(req.query.take as string) : 20,
      };
      const result = await crmService.getActivities(filters);
      res.json(result);
    } catch (error) {
      logger.error('Get activities error:', error);
      res.status(500).json({ error: 'Failed to get activities' });
    }
  }

  // Task endpoints
  async createTask(req: Request, res: Response) {
    try {
      const task = await crmService.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      logger.error('Create task error:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  }

  async updateTask(req: Request, res: Response) {
    try {
      const task = await crmService.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (error) {
      logger.error('Update task error:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  }

  async getTasks(req: Request, res: Response) {
    try {
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        assignedTo: req.query.assignedTo,
        skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
        take: req.query.take ? parseInt(req.query.take as string) : 20,
      };
      const result = await crmService.getTasks(filters);
      res.json(result);
    } catch (error) {
      logger.error('Get tasks error:', error);
      res.status(500).json({ error: 'Failed to get tasks' });
    }
  }

  // Analytics endpoints
  async getAnalytics(req: Request, res: Response) {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      const [conversionRate, winRate] = await Promise.all([
        crmService.getLeadConversionRate(startDate, endDate),
        crmService.getDealWinRate(startDate, endDate),
      ]);

      res.json({ conversionRate, winRate });
    } catch (error) {
      logger.error('Get analytics error:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }
}

export const crmController = new CRMController();
