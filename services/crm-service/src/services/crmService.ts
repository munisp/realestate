import { Repository } from 'typeorm';
import { Lead, Contact, Deal, Activity, Task } from '../models/entities';
import { AppDataSource } from '../config/database';
import { logger } from '../config/logger';
import { kafkaProducer } from '../config/kafka';

export class CRMService {
  private leadRepo: Repository<Lead>;
  private contactRepo: Repository<Contact>;
  private dealRepo: Repository<Deal>;
  private activityRepo: Repository<Activity>;
  private taskRepo: Repository<Task>;

  constructor() {
    this.leadRepo = AppDataSource.getRepository(Lead);
    this.contactRepo = AppDataSource.getRepository(Contact);
    this.dealRepo = AppDataSource.getRepository(Deal);
    this.activityRepo = AppDataSource.getRepository(Activity);
    this.taskRepo = AppDataSource.getRepository(Task);
  }

  // Lead Management
  async createLead(data: Partial<Lead>): Promise<Lead> {
    const lead = this.leadRepo.create(data);
    const saved = await this.leadRepo.save(lead);
    
    await kafkaProducer.send({
      topic: 'crm.lead.created',
      messages: [{ value: JSON.stringify(saved) }],
    });

    logger.info(`Lead created: ${saved.id}`);
    return saved;
  }

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
    await this.leadRepo.update(id, data);
    const updated = await this.leadRepo.findOneOrFail({ where: { id } });
    
    await kafkaProducer.send({
      topic: 'crm.lead.updated',
      messages: [{ value: JSON.stringify(updated) }],
    });

    return updated;
  }

  async convertLeadToContact(leadId: string): Promise<Contact> {
    const lead = await this.leadRepo.findOneOrFail({ where: { id: leadId } });
    
    const contact = this.contactRepo.create({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      assignedTo: lead.assignedTo,
    });

    const saved = await this.contactRepo.save(contact);
    await this.leadRepo.update(leadId, { status: 'converted' });

    await kafkaProducer.send({
      topic: 'crm.lead.converted',
      messages: [{ value: JSON.stringify({ leadId, contactId: saved.id }) }],
    });

    return saved;
  }

  async getLeads(filters: any): Promise<{ leads: Lead[]; total: number }> {
    const query = this.leadRepo.createQueryBuilder('lead');

    if (filters.status) {
      query.andWhere('lead.status = :status', { status: filters.status });
    }

    if (filters.temperature) {
      query.andWhere('lead.temperature = :temperature', { temperature: filters.temperature });
    }

    if (filters.assignedTo) {
      query.andWhere('lead.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    if (filters.search) {
      query.andWhere(
        '(lead.firstName ILIKE :search OR lead.lastName ILIKE :search OR lead.email ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const [leads, total] = await query
      .skip(filters.skip || 0)
      .take(filters.take || 20)
      .orderBy('lead.createdAt', 'DESC')
      .getManyAndCount();

    return { leads, total };
  }

  // Contact Management
  async createContact(data: Partial<Contact>): Promise<Contact> {
    const contact = this.contactRepo.create(data);
    const saved = await this.contactRepo.save(contact);
    
    await kafkaProducer.send({
      topic: 'crm.contact.created',
      messages: [{ value: JSON.stringify(saved) }],
    });

    logger.info(`Contact created: ${saved.id}`);
    return saved;
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
    await this.contactRepo.update(id, data);
    const updated = await this.contactRepo.findOneOrFail({ where: { id } });
    
    await kafkaProducer.send({
      topic: 'crm.contact.updated',
      messages: [{ value: JSON.stringify(updated) }],
    });

    return updated;
  }

  async getContacts(filters: any): Promise<{ contacts: Contact[]; total: number }> {
    const query = this.contactRepo.createQueryBuilder('contact');

    if (filters.assignedTo) {
      query.andWhere('contact.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    if (filters.tags && filters.tags.length > 0) {
      query.andWhere('contact.tags && :tags', { tags: filters.tags });
    }

    if (filters.search) {
      query.andWhere(
        '(contact.firstName ILIKE :search OR contact.lastName ILIKE :search OR contact.email ILIKE :search OR contact.company ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const [contacts, total] = await query
      .skip(filters.skip || 0)
      .take(filters.take || 20)
      .orderBy('contact.createdAt', 'DESC')
      .getManyAndCount();

    return { contacts, total };
  }

  // Deal Management
  async createDeal(data: Partial<Deal>): Promise<Deal> {
    const deal = this.dealRepo.create(data);
    const saved = await this.dealRepo.save(deal);
    
    await kafkaProducer.send({
      topic: 'crm.deal.created',
      messages: [{ value: JSON.stringify(saved) }],
    });

    logger.info(`Deal created: ${saved.id}`);
    return saved;
  }

  async updateDeal(id: string, data: Partial<Deal>): Promise<Deal> {
    await this.dealRepo.update(id, data);
    const updated = await this.dealRepo.findOneOrFail({ where: { id }, relations: ['contact'] });
    
    await kafkaProducer.send({
      topic: 'crm.deal.updated',
      messages: [{ value: JSON.stringify(updated) }],
    });

    return updated;
  }

  async moveDealStage(id: string, newStage: string): Promise<Deal> {
    const deal = await this.dealRepo.findOneOrFail({ where: { id } });
    
    deal.stage = newStage;
    
    if (newStage === 'closed_won' || newStage === 'closed_lost') {
      deal.actualCloseDate = new Date();
    }

    const saved = await this.dealRepo.save(deal);

    await kafkaProducer.send({
      topic: 'crm.deal.stage_changed',
      messages: [{ value: JSON.stringify({ dealId: id, newStage }) }],
    });

    return saved;
  }

  async getDealsByStage(): Promise<any> {
    const deals = await this.dealRepo
      .createQueryBuilder('deal')
      .select('deal.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(deal.value)', 'totalValue')
      .groupBy('deal.stage')
      .getRawMany();

    return deals;
  }

  // Activity Management
  async createActivity(data: Partial<Activity>): Promise<Activity> {
    const activity = this.activityRepo.create(data);
    const saved = await this.activityRepo.save(activity);
    
    await kafkaProducer.send({
      topic: 'crm.activity.created',
      messages: [{ value: JSON.stringify(saved) }],
    });

    logger.info(`Activity created: ${saved.id}`);
    return saved;
  }

  async updateActivity(id: string, data: Partial<Activity>): Promise<Activity> {
    await this.activityRepo.update(id, data);
    const updated = await this.activityRepo.findOneOrFail({ where: { id } });
    
    if (data.status === 'completed') {
      updated.completedAt = new Date();
      await this.activityRepo.save(updated);
    }

    return updated;
  }

  async getActivities(filters: any): Promise<{ activities: Activity[]; total: number }> {
    const query = this.activityRepo.createQueryBuilder('activity');

    if (filters.type) {
      query.andWhere('activity.type = :type', { type: filters.type });
    }

    if (filters.status) {
      query.andWhere('activity.status = :status', { status: filters.status });
    }

    if (filters.assignedTo) {
      query.andWhere('activity.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    if (filters.leadId) {
      query.andWhere('activity.leadId = :leadId', { leadId: filters.leadId });
    }

    if (filters.contactId) {
      query.andWhere('activity.contactId = :contactId', { contactId: filters.contactId });
    }

    if (filters.dealId) {
      query.andWhere('activity.dealId = :dealId', { dealId: filters.dealId });
    }

    const [activities, total] = await query
      .skip(filters.skip || 0)
      .take(filters.take || 20)
      .orderBy('activity.scheduledAt', 'DESC')
      .getManyAndCount();

    return { activities, total };
  }

  // Task Management
  async createTask(data: Partial<Task>): Promise<Task> {
    const task = this.taskRepo.create(data);
    const saved = await this.taskRepo.save(task);
    
    await kafkaProducer.send({
      topic: 'crm.task.created',
      messages: [{ value: JSON.stringify(saved) }],
    });

    logger.info(`Task created: ${saved.id}`);
    return saved;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    await this.taskRepo.update(id, data);
    const updated = await this.taskRepo.findOneOrFail({ where: { id } });
    
    await kafkaProducer.send({
      topic: 'crm.task.updated',
      messages: [{ value: JSON.stringify(updated) }],
    });

    return updated;
  }

  async getTasks(filters: any): Promise<{ tasks: Task[]; total: number }> {
    const query = this.taskRepo.createQueryBuilder('task');

    if (filters.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      query.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters.assignedTo) {
      query.andWhere('task.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    const [tasks, total] = await query
      .skip(filters.skip || 0)
      .take(filters.take || 20)
      .orderBy('task.dueDate', 'ASC')
      .getManyAndCount();

    return { tasks, total };
  }

  // Analytics
  async getLeadConversionRate(startDate: Date, endDate: Date): Promise<number> {
    const totalLeads = await this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getCount();

    const convertedLeads = await this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('lead.status = :status', { status: 'converted' })
      .getCount();

    return totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  }

  async getDealWinRate(startDate: Date, endDate: Date): Promise<number> {
    const totalDeals = await this.dealRepo
      .createQueryBuilder('deal')
      .where('deal.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('deal.stage IN (:...stages)', { stages: ['closed_won', 'closed_lost'] })
      .getCount();

    const wonDeals = await this.dealRepo
      .createQueryBuilder('deal')
      .where('deal.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('deal.stage = :stage', { stage: 'closed_won' })
      .getCount();

    return totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;
  }
}

export const crmService = new CRMService();
