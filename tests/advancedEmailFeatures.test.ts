import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../server/routers';
import type { Context } from '../server/_core/context';

/**
 * Tests for Advanced Email Features
 * 
 * Tests three main features:
 * 1. A/B Testing for Email Campaigns
 * 2. Email Template Builder
 * 3. Re-engagement Campaigns
 */

// Mock context for testing
const mockContext: Context = {
  user: {
    id: 1,
    openId: 'test-user',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    loginMethod: 'test',
  },
  req: {} as any,
  res: {} as any,
};

const caller = appRouter.createCaller(mockContext);

describe('A/B Testing for Email Campaigns', () => {
  let testId: number;

  it('should create an A/B test', async () => {
    const result = await caller.emailAbTesting.create({
      campaignId: 1,
      name: 'Subject Line Test',
      description: 'Testing different subject lines',
      testType: 'subject_line',
      trafficSplit: 50,
      confidenceLevel: 95,
      winnerMetric: 'open_rate',
      autoPromoteWinner: true,
      variantA: {
        subjectLine: 'Check out these amazing properties!',
      },
      variantB: {
        subjectLine: 'Your dream home is waiting',
      },
    });

    expect(result).toHaveProperty('testId');
    expect(typeof result.testId).toBe('number');
    testId = result.testId;
  });

  it('should get test details', async () => {
    const details = await caller.emailAbTesting.getDetails({ testId });

    expect(details).toHaveProperty('test');
    expect(details).toHaveProperty('variants');
    expect(details.test.name).toBe('Subject Line Test');
    expect(details.variants).toHaveLength(2);
  });

  it('should start an A/B test', async () => {
    const result = await caller.emailAbTesting.start({ testId });

    expect(result.success).toBe(true);

    const details = await caller.emailAbTesting.getDetails({ testId });
    expect(details.test.status).toBe('running');
  });

  it('should update variant metrics', async () => {
    const details = await caller.emailAbTesting.getDetails({ testId });
    const variantAId = details.variants.find(v => v.variant === 'A')!.id;

    const result = await caller.emailAbTesting.updateMetrics({
      variantId: variantAId,
      sent: 100,
      delivered: 95,
      opened: 45,
      clicked: 12,
    });

    expect(result.success).toBe(true);

    // Verify metrics were updated
    const updated = await caller.emailAbTesting.getDetails({ testId });
    const updatedVariant = updated.variants.find(v => v.variant === 'A')!;
    expect(updatedVariant.sentCount).toBe(100);
    expect(updatedVariant.deliveredCount).toBe(95);
    expect(updatedVariant.openedCount).toBe(45);
  });

  it('should analyze test results (insufficient data)', async () => {
    const result = await caller.emailAbTesting.analyze({ testId });

    // With only one variant having data, should not be significant
    expect(result.isSignificant).toBe(false);
    expect(result.recommendation).toContain('Continue test');
  });

  it('should delete an A/B test', async () => {
    const result = await caller.emailAbTesting.delete({ testId });
    expect(result.success).toBe(true);

    // Verify deletion
    await expect(
      caller.emailAbTesting.getDetails({ testId })
    ).rejects.toThrow('Test not found');
  });
});

describe('Email Template Builder', () => {
  let blockId: number;
  let templateId: number;

  it('should seed default template blocks', async () => {
    const result = await caller.emailTemplateBuilder.seedDefaultBlocks();

    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThan(0);
  });

  it('should get all template blocks', async () => {
    const blocks = await caller.emailTemplateBuilder.getBlocks({});

    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('should create a custom template block', async () => {
    const result = await caller.emailTemplateBuilder.createBlock({
      name: 'Test Block',
      description: 'A test block',
      category: 'text',
      htmlContent: '<p>{{message}}</p>',
      variables: ['message'],
      isPublic: true,
    });

    expect(result).toHaveProperty('blockId');
    expect(typeof result.blockId).toBe('number');
    blockId = result.blockId;
  });

  it('should update a template block', async () => {
    const result = await caller.emailTemplateBuilder.updateBlock({
      blockId,
      name: 'Updated Test Block',
      htmlContent: '<p>{{updated_message}}</p>',
    });

    expect(result.success).toBe(true);
  });

  it('should create a custom template from blocks', async () => {
    const blocks = await caller.emailTemplateBuilder.getBlocks({ category: 'header' });
    const headerBlock = blocks[0];

    const result = await caller.emailTemplateBuilder.createTemplate({
      name: 'Test Email Template',
      description: 'A test template',
      blockSequence: [headerBlock.id, blockId],
      availableVariables: [
        { name: 'company_name', description: 'Company name' },
        { name: 'message', description: 'Main message' },
      ],
    });

    expect(result).toHaveProperty('templateId');
    expect(typeof result.templateId).toBe('number');
    templateId = result.templateId;
  });

  it('should get all custom templates', async () => {
    const templates = await caller.emailTemplateBuilder.getTemplates();

    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.some(t => t.id === templateId)).toBe(true);
  });

  it('should render a template with variables', async () => {
    const result = await caller.emailTemplateBuilder.renderTemplate({
      templateId,
      variables: {
        company_name: 'Test Company',
        message: 'Welcome to our platform!',
      },
    });

    expect(result).toHaveProperty('html');
    expect(result.html).toContain('Test Company');
    expect(result.html).toContain('Welcome to our platform!');
  });

  it('should delete a template block', async () => {
    const result = await caller.emailTemplateBuilder.deleteBlock({ blockId });
    expect(result.success).toBe(true);
  });

  it('should delete a custom template', async () => {
    const result = await caller.emailTemplateBuilder.deleteTemplate({ templateId });
    expect(result.success).toBe(true);
  });
});

describe('Re-engagement Campaigns', () => {
  let campaignId: number;

  it('should create a re-engagement campaign', async () => {
    const result = await caller.reEngagement.createCampaign({
      name: 'Test Re-engagement Campaign',
      description: 'Testing re-engagement',
      inactivityDays: 30,
      targetSegment: 'all',
      emailSequence: [
        { subject: 'We miss you!', content: 'Come back...' },
        { subject: 'Special offer', content: 'Here is an offer...' },
      ],
      delayBetweenEmails: 3,
      maxEmails: 2,
    });

    expect(result).toHaveProperty('campaignId');
    expect(typeof result.campaignId).toBe('number');
    campaignId = result.campaignId;
  });

  it('should get all campaigns', async () => {
    const campaigns = await caller.reEngagement.getCampaigns();

    expect(Array.isArray(campaigns)).toBe(true);
    expect(campaigns.some(c => c.id === campaignId)).toBe(true);
  });

  it('should get campaign by ID', async () => {
    const campaign = await caller.reEngagement.getCampaignById({ campaignId });

    expect(campaign.name).toBe('Test Re-engagement Campaign');
    expect(campaign.status).toBe('draft');
  });

  it('should start a campaign', async () => {
    const result = await caller.reEngagement.startCampaign({ campaignId });

    expect(result.success).toBe(true);
    expect(typeof result.triggered).toBe('number');

    const campaign = await caller.reEngagement.getCampaignById({ campaignId });
    expect(campaign.status).toBe('active');
  });

  it('should track user activity', async () => {
    const result = await caller.reEngagement.trackActivity({
      activityType: 'login',
    });

    expect(result.success).toBe(true);
  });

  it('should get user activity status', async () => {
    const activity = await caller.reEngagement.getUserActivity();

    // May be null if no activity tracked yet
    if (activity) {
      expect(activity).toHaveProperty('userId');
      expect(activity.userId).toBe(mockContext.user.id);
    }
  });

  it('should get campaign analytics', async () => {
    const analytics = await caller.reEngagement.getAnalytics({ campaignId });

    expect(analytics).toHaveProperty('totalTriggered');
    expect(analytics).toHaveProperty('totalReEngaged');
    expect(analytics).toHaveProperty('reEngagementRate');
    expect(analytics).toHaveProperty('emailsSent');
    expect(analytics).toHaveProperty('openRate');
    expect(analytics).toHaveProperty('clickRate');
  });

  it('should get inactive users report', async () => {
    const report = await caller.reEngagement.getInactiveUsers();

    expect(Array.isArray(report)).toBe(true);
    // Report may be empty if no inactive users
  });

  it('should pause a campaign', async () => {
    const result = await caller.reEngagement.pauseCampaign({ campaignId });

    expect(result.success).toBe(true);

    const campaign = await caller.reEngagement.getCampaignById({ campaignId });
    expect(campaign.status).toBe('paused');
  });

  it('should update a campaign', async () => {
    const result = await caller.reEngagement.updateCampaign({
      campaignId,
      name: 'Updated Campaign Name',
      inactivityDays: 45,
    });

    expect(result.success).toBe(true);

    const campaign = await caller.reEngagement.getCampaignById({ campaignId });
    expect(campaign.name).toBe('Updated Campaign Name');
    expect(campaign.inactivityDays).toBe(45);
  });

  it('should delete a campaign', async () => {
    const result = await caller.reEngagement.deleteCampaign({ campaignId });
    expect(result.success).toBe(true);

    // Verify deletion
    await expect(
      caller.reEngagement.getCampaignById({ campaignId })
    ).rejects.toThrow('Campaign not found');
  });
});

describe('Integration Tests', () => {
  it('should handle A/B testing with template builder', async () => {
    // Create template blocks
    const blocks = await caller.emailTemplateBuilder.getBlocks({});
    expect(blocks.length).toBeGreaterThan(0);

    // Create a template
    const template = await caller.emailTemplateBuilder.createTemplate({
      name: 'A/B Test Template',
      blockSequence: [blocks[0].id],
    });

    // Create A/B test using the template
    const abTest = await caller.emailAbTesting.create({
      campaignId: 1,
      name: 'Template A/B Test',
      testType: 'content',
      variantA: { content: 'Version A content' },
      variantB: { content: 'Version B content' },
    });

    expect(abTest.testId).toBeDefined();
    expect(template.templateId).toBeDefined();

    // Cleanup
    await caller.emailAbTesting.delete({ testId: abTest.testId });
    await caller.emailTemplateBuilder.deleteTemplate({ templateId: template.templateId });
  });

  it('should handle re-engagement with activity tracking', async () => {
    // Track activity
    await caller.reEngagement.trackActivity({ activityType: 'property_view' });
    await caller.reEngagement.trackActivity({ activityType: 'search' });

    // Get activity
    const activity = await caller.reEngagement.getUserActivity();
    
    if (activity) {
      expect(activity.lastPropertyViewAt).toBeDefined();
      expect(activity.lastSearchAt).toBeDefined();
    }
  });
});
