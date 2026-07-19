/**
 * A/B Testing Framework with Feature Flags
 * Supports experiments, gradual rollouts, and statistical analysis
 */

import { getDb } from '../db';
import { sql } from 'drizzle-orm';

interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: Date;
  endDate?: Date;
  targetAudience?: TargetAudience;
  metrics: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Variant {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-100, percentage of traffic
  config: Record<string, any>;
}

interface TargetAudience {
  userIds?: number[];
  userRoles?: string[];
  locations?: string[];
  platforms?: ('web' | 'mobile' | 'api')[];
  percentage?: number; // 0-100, percentage of all users
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  targetAudience?: TargetAudience;
  createdAt: Date;
  updatedAt: Date;
}

interface ExperimentAssignment {
  experimentId: string;
  userId: number;
  variantId: string;
  assignedAt: Date;
}

interface ExperimentEvent {
  experimentId: string;
  userId: number;
  variantId: string;
  eventType: string;
  eventData?: Record<string, any>;
  timestamp: Date;
}

class ABTestingService {
  private experiments: Map<string, Experiment> = new Map();
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private assignments: Map<string, Map<number, string>> = new Map(); // experimentId -> userId -> variantId

  constructor() {
    this.loadFromDatabase();
  }

  private async loadFromDatabase() {
    // In production, load from database
    // For now, initialize with empty maps
    console.log('[A/B Testing] Service initialized');
  }

  /**
   * Create a new experiment
   */
  createExperiment(experiment: Omit<Experiment, 'createdAt' | 'updatedAt'>): Experiment {
    const now = new Date();
    const fullExperiment: Experiment = {
      ...experiment,
      createdAt: now,
      updatedAt: now,
    };

    // Validate variant weights sum to 100
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error(`Variant weights must sum to 100, got ${totalWeight}`);
    }

    this.experiments.set(experiment.id, fullExperiment);
    this.assignments.set(experiment.id, new Map());

    return fullExperiment;
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * Get all experiments
   */
  getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Start an experiment
   */
  startExperiment(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    experiment.status = 'running';
    experiment.startDate = new Date();
    experiment.updatedAt = new Date();
  }

  /**
   * Stop an experiment
   */
  stopExperiment(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    experiment.status = 'completed';
    experiment.endDate = new Date();
    experiment.updatedAt = new Date();
  }

  /**
   * Assign user to experiment variant
   */
  assignVariant(experimentId: string, userId: number): string {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (experiment.status !== 'running') {
      throw new Error(`Experiment ${experimentId} is not running`);
    }

    // Check if user already assigned
    const assignments = this.assignments.get(experimentId);
    if (assignments?.has(userId)) {
      return assignments.get(userId)!;
    }

    // Check target audience
    if (experiment.targetAudience && !this.matchesTargetAudience(userId, experiment.targetAudience)) {
      // Return control variant (first variant)
      return experiment.variants[0].id;
    }

    // Assign variant based on weights
    const variantId = this.selectVariantByWeight(experiment.variants, userId);

    // Store assignment
    if (!assignments) {
      this.assignments.set(experimentId, new Map());
    }
    this.assignments.get(experimentId)!.set(userId, variantId);

    // Log assignment
    this.logAssignment(experimentId, userId, variantId);

    return variantId;
  }

  /**
   * Get variant for user
   */
  getVariant(experimentId: string, userId: number): string | null {
    const assignments = this.assignments.get(experimentId);
    return assignments?.get(userId) || null;
  }

  /**
   * Get variant configuration
   */
  getVariantConfig(experimentId: string, userId: number): Record<string, any> | null {
    const variantId = this.getVariant(experimentId, userId);
    if (!variantId) {
      return null;
    }

    const experiment = this.experiments.get(experimentId);
    const variant = experiment?.variants.find(v => v.id === variantId);
    
    return variant?.config || null;
  }

  /**
   * Track experiment event
   */
  trackEvent(experimentId: string, userId: number, eventType: string, eventData?: Record<string, any>): void {
    const variantId = this.getVariant(experimentId, userId);
    if (!variantId) {
      console.warn(`User ${userId} not assigned to experiment ${experimentId}`);
      return;
    }

    const event: ExperimentEvent = {
      experimentId,
      userId,
      variantId,
      eventType,
      eventData,
      timestamp: new Date(),
    };

    this.logEvent(event);
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(experimentId: string): Promise<ExperimentResults> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    // Get results for each variant
    const variantResults: VariantResults[] = [];

    for (const variant of experiment.variants) {
      const assignments = await this.getVariantAssignments(experimentId, variant.id);
      const events = await this.getVariantEvents(experimentId, variant.id);

      // Calculate metrics
      const conversions = events.filter(e => e.eventType === 'conversion').length;
      const conversionRate = assignments > 0 ? conversions / assignments : 0;

      variantResults.push({
        variantId: variant.id,
        variantName: variant.name,
        assignments,
        conversions,
        conversionRate,
        events: events.length,
      });
    }

    // Calculate statistical significance
    const significance = this.calculateStatisticalSignificance(variantResults);

    return {
      experimentId,
      experimentName: experiment.name,
      status: experiment.status,
      startDate: experiment.startDate,
      endDate: experiment.endDate,
      variants: variantResults,
      winner: this.determineWinner(variantResults, significance),
      statisticalSignificance: significance,
    };
  }

  /**
   * Create feature flag
   */
  createFeatureFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): FeatureFlag {
    const now = new Date();
    const fullFlag: FeatureFlag = {
      ...flag,
      createdAt: now,
      updatedAt: now,
    };

    this.featureFlags.set(flag.id, fullFlag);

    return fullFlag;
  }

  /**
   * Check if feature is enabled for user
   */
  isFeatureEnabled(flagId: string, userId: number): boolean {
    const flag = this.featureFlags.get(flagId);
    if (!flag) {
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check target audience
    if (flag.targetAudience && !this.matchesTargetAudience(userId, flag.targetAudience)) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashUserId(userId, flagId);
      return hash < flag.rolloutPercentage;
    }

    return true;
  }

  /**
   * Update feature flag
   */
  updateFeatureFlag(flagId: string, updates: Partial<FeatureFlag>): void {
    const flag = this.featureFlags.get(flagId);
    if (!flag) {
      throw new Error(`Feature flag ${flagId} not found`);
    }

    Object.assign(flag, updates, { updatedAt: new Date() });
  }

  /**
   * Get all feature flags
   */
  getAllFeatureFlags(): FeatureFlag[] {
    return Array.from(this.featureFlags.values());
  }

  // Private helper methods

  private matchesTargetAudience(userId: number, audience: TargetAudience): boolean {
    // Check user IDs
    if (audience.userIds && !audience.userIds.includes(userId)) {
      return false;
    }

    // Check percentage
    if (audience.percentage !== undefined) {
      const hash = this.hashUserId(userId, 'audience');
      if (hash >= audience.percentage) {
        return false;
      }
    }

    // Add more checks for roles, locations, platforms as needed

    return true;
  }

  private selectVariantByWeight(variants: Variant[], userId: number): string {
    const hash = this.hashUserId(userId, 'variant');
    
    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (hash < cumulative) {
        return variant.id;
      }
    }

    // Fallback to last variant
    return variants[variants.length - 1].id;
  }

  private hashUserId(userId: number, salt: string): number {
    // Simple hash function for consistent assignment
    // Returns value between 0 and 100
    const str = `${userId}-${salt}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash % 100);
  }

  private async logAssignment(experimentId: string, userId: number, variantId: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await db.execute(sql`
        INSERT INTO experiment_assignments (experiment_id, user_id, variant_id, assigned_at)
        VALUES (${experimentId}, ${userId}, ${variantId}, NOW())
        ON DUPLICATE KEY UPDATE assigned_at = NOW()
      `);
    } catch (error) {
      console.error('Error logging assignment:', error);
    }
  }

  private async logEvent(event: ExperimentEvent): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await db.execute(sql`
        INSERT INTO experiment_events 
        (experiment_id, user_id, variant_id, event_type, event_data, timestamp)
        VALUES (
          ${event.experimentId},
          ${event.userId},
          ${event.variantId},
          ${event.eventType},
          ${JSON.stringify(event.eventData || {})},
          ${event.timestamp}
        )
      `);
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  private async getVariantAssignments(experimentId: string, variantId: string): Promise<number> {
    const db = await getDb();
    if (!db) return 0;

    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM experiment_assignments
        WHERE experiment_id = ${experimentId} AND variant_id = ${variantId}
      `);
      return (result[0] as any)?.count || 0;
    } catch (error) {
      console.error('Error getting variant assignments:', error);
      return 0;
    }
  }

  private async getVariantEvents(experimentId: string, variantId: string): Promise<ExperimentEvent[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const results = await db.execute(sql`
        SELECT *
        FROM experiment_events
        WHERE experiment_id = ${experimentId} AND variant_id = ${variantId}
      `);
      return results as any[];
    } catch (error) {
      console.error('Error getting variant events:', error);
      return [];
    }
  }

  private calculateStatisticalSignificance(variants: VariantResults[]): number {
    if (variants.length < 2) return 0;

    // Simple z-test for two proportions
    const control = variants[0];
    const treatment = variants[1];

    const p1 = control.conversionRate;
    const p2 = treatment.conversionRate;
    const n1 = control.assignments;
    const n2 = treatment.assignments;

    if (n1 === 0 || n2 === 0) return 0;

    const p = (control.conversions + treatment.conversions) / (n1 + n2);
    const se = Math.sqrt(p * (1 - p) * (1/n1 + 1/n2));
    
    if (se === 0) return 0;

    const z = Math.abs(p2 - p1) / se;
    
    // Convert z-score to confidence level (approximate)
    const confidence = 1 - 2 * (1 - this.normalCDF(z));
    
    return Math.round(confidence * 100);
  }

  private normalCDF(x: number): number {
    // Approximation of normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  private determineWinner(variants: VariantResults[], significance: number): string | null {
    if (significance < 95) {
      return null; // Not statistically significant
    }

    // Find variant with highest conversion rate
    let maxRate = 0;
    let winner: string | null = null;

    for (const variant of variants) {
      if (variant.conversionRate > maxRate) {
        maxRate = variant.conversionRate;
        winner = variant.variantId;
      }
    }

    return winner;
  }
}

// Types for results
interface VariantResults {
  variantId: string;
  variantName: string;
  assignments: number;
  conversions: number;
  conversionRate: number;
  events: number;
}

interface ExperimentResults {
  experimentId: string;
  experimentName: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
  variants: VariantResults[];
  winner: string | null;
  statisticalSignificance: number;
}

// Export singleton instance
export const abTestingService = new ABTestingService();
