import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'enum', enum: ['new', 'contacted', 'qualified', 'converted', 'lost'] })
  status!: string;

  @Column({ type: 'enum', enum: ['hot', 'warm', 'cold'] })
  temperature!: string;

  @Column({ nullable: true })
  source?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true })
  assignedTo?: string;

  @Column({ type: 'jsonb', nullable: true })
  propertyPreferences?: any;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimatedBudget?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Activity, (activity) => activity.lead)
  activities!: Activity[];
}

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  company?: string;

  @Column({ nullable: true })
  position?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'jsonb', nullable: true })
  customFields?: any;

  @Column({ type: 'text', array: true, default: [] })
  tags!: string[];

  @Column({ nullable: true })
  assignedTo?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Deal, (deal) => deal.contact)
  deals!: Deal[];

  @OneToMany(() => Activity, (activity) => activity.contact)
  activities!: Activity[];
}

@Entity('deals')
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  value!: number;

  @Column({ type: 'enum', enum: ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] })
  stage!: string;

  @Column({ type: 'int', default: 0 })
  probability!: number;

  @Column({ nullable: true })
  propertyId?: string;

  @Column({ nullable: true })
  contactId?: string;

  @ManyToOne(() => Contact, (contact) => contact.deals)
  @JoinColumn({ name: 'contactId' })
  contact!: Contact;

  @Column({ nullable: true })
  assignedTo?: string;

  @Column({ type: 'date', nullable: true })
  expectedCloseDate?: Date;

  @Column({ type: 'date', nullable: true })
  actualCloseDate?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  customFields?: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Activity, (activity) => activity.deal)
  activities!: Activity[];
}

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ['call', 'email', 'meeting', 'task', 'note', 'property_viewing'] })
  type!: string;

  @Column()
  subject!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ['scheduled', 'completed', 'cancelled'] })
  status!: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ nullable: true })
  leadId?: string;

  @ManyToOne(() => Lead, (lead) => lead.activities)
  @JoinColumn({ name: 'leadId' })
  lead?: Lead;

  @Column({ nullable: true })
  contactId?: string;

  @ManyToOne(() => Contact, (contact) => contact.activities)
  @JoinColumn({ name: 'contactId' })
  contact?: Contact;

  @Column({ nullable: true })
  dealId?: string;

  @ManyToOne(() => Deal, (deal) => deal.activities)
  @JoinColumn({ name: 'dealId' })
  deal?: Deal;

  @Column({ nullable: true })
  assignedTo?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ['pending', 'in_progress', 'completed', 'cancelled'] })
  status!: string;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high', 'urgent'] })
  priority!: string;

  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date;

  @Column({ nullable: true })
  assignedTo?: string;

  @Column({ nullable: true })
  leadId?: string;

  @Column({ nullable: true })
  contactId?: string;

  @Column({ nullable: true })
  dealId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
