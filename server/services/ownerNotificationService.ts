/**
 * Property Owner Notification Service
 * 
 * Sends notifications to property owners about:
 * - Price change recommendations
 * - Market optimization opportunities
 * - Competitor insights
 */

import { notifyOwner } from '../_core/notification';
import { getDb } from '../db';
import { shortLetProperties, marketPricingRecommendations, users } from '../../drizzle/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

interface PriceAlert {
  propertyId: number;
  propertyTitle: string;
  currentPrice: number;
  recommendedPrice: number;
  priceChange: number;
  priceChangePercent: number;
  confidence: number;
  reasoning: string[];
  marketAvgPrice: number;
  demandScore: number;
}

interface OptimizationOpportunity {
  type: 'underpriced' | 'overpriced' | 'high_demand' | 'low_occupancy';
  propertyId: number;
  propertyTitle: string;
  description: string;
  actionItems: string[];
  potentialRevenue?: number;
}

export class OwnerNotificationService {
  /**
   * Analyze and send price change alerts for all properties
   */
  async sendPriceChangeAlerts(): Promise<{
    sent: number;
    alerts: PriceAlert[];
  }> {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const alerts: PriceAlert[] = [];
    let sent = 0;

    try {
      // Get all active properties with recent pricing recommendations
      const properties = await db
        .select()
        .from(shortLetProperties)
        .where(eq(shortLetProperties.status, 'active'));

      for (const property of properties) {
        // Get latest pricing recommendation
        const recommendations = await db
          .select()
          .from(marketPricingRecommendations)
          .where(eq(marketPricingRecommendations.propertyId, property.id))
          .orderBy(desc(marketPricingRecommendations.createdAt))
          .limit(1);

        if (recommendations.length === 0) continue;

        const recommendation = recommendations[0];
        const currentPrice = property.nightlyRate || 0;
        const recommendedPrice = recommendation.recommendedBasePrice || 0;
        const priceChange = recommendedPrice - currentPrice;
        const priceChangePercent = currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0;

        // Only alert if price change is significant (>10%)
        if (Math.abs(priceChangePercent) > 10) {
          const alert: PriceAlert = {
            propertyId: property.id,
            propertyTitle: property.title || 'Untitled Property',
            currentPrice,
            recommendedPrice,
            priceChange,
            priceChangePercent,
            confidence: recommendation.confidence || 0,
            reasoning: recommendation.reasoning ? recommendation.reasoning.split('; ') : [],
            marketAvgPrice: recommendation.competitorAvgPrice || 0,
            demandScore: recommendation.marketDemandScore || 0,
          };

          alerts.push(alert);

          // Send notification to property owner
          const notificationSent = await this.sendPriceAlertNotification(alert);
          if (notificationSent) sent++;
        }
      }

      console.log(`[OwnerNotificationService] Sent ${sent} price change alerts`);
    } catch (error) {
      console.error('[OwnerNotificationService] Error sending price alerts:', error);
      throw error;
    }

    return { sent, alerts };
  }

  /**
   * Identify and send optimization opportunity alerts
   */
  async sendOptimizationAlerts(): Promise<{
    sent: number;
    opportunities: OptimizationOpportunity[];
  }> {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const opportunities: OptimizationOpportunity[] = [];
    let sent = 0;

    try {
      // Get all active properties with recent recommendations
      const properties = await db
        .select()
        .from(shortLetProperties)
        .where(eq(shortLetProperties.status, 'active'));

      for (const property of properties) {
        const recommendations = await db
          .select()
          .from(marketPricingRecommendations)
          .where(eq(marketPricingRecommendations.propertyId, property.id))
          .orderBy(desc(marketPricingRecommendations.createdAt))
          .limit(1);

        if (recommendations.length === 0) continue;

        const recommendation = recommendations[0];
        const currentPrice = property.nightlyRate || 0;
        const recommendedPrice = recommendation.recommendedBasePrice || 0;
        const demandScore = recommendation.marketDemandScore || 0;

        // Identify opportunities
        
        // 1. Underpriced property in high demand market
        if (currentPrice < recommendedPrice * 0.85 && demandScore > 70) {
          const potentialRevenue = (recommendedPrice - currentPrice) * 20; // 20 nights/month estimate
          opportunities.push({
            type: 'underpriced',
            propertyId: property.id,
            propertyTitle: property.title || 'Untitled Property',
            description: `Your property is priced ${Math.round(((recommendedPrice - currentPrice) / currentPrice) * 100)}% below market in a high-demand area (demand score: ${demandScore}/100)`,
            actionItems: [
              `Increase price from ₦${currentPrice.toLocaleString()} to ₦${recommendedPrice.toLocaleString()}`,
              'Monitor booking rate for 2 weeks',
              'Adjust based on occupancy feedback',
            ],
            potentialRevenue,
          });
        }

        // 2. Overpriced property
        if (currentPrice > recommendedPrice * 1.15 && demandScore < 50) {
          opportunities.push({
            type: 'overpriced',
            propertyId: property.id,
            propertyTitle: property.title || 'Untitled Property',
            description: `Your property may be overpriced for current market conditions (demand score: ${demandScore}/100)`,
            actionItems: [
              `Consider reducing price from ₦${currentPrice.toLocaleString()} to ₦${recommendedPrice.toLocaleString()}`,
              'Offer promotional discounts for longer stays',
              'Enhance property photos and description',
            ],
          });
        }

        // 3. High demand opportunity
        if (demandScore > 85 && Math.abs(currentPrice - recommendedPrice) < currentPrice * 0.1) {
          opportunities.push({
            type: 'high_demand',
            propertyId: property.id,
            propertyTitle: property.title || 'Untitled Property',
            description: `Exceptional market demand detected (${demandScore}/100) - opportunity to maximize revenue`,
            actionItems: [
              'Implement dynamic weekend pricing (+25%)',
              'Set minimum stay requirements for peak dates',
              'Update calendar to capture high-demand periods',
            ],
          });
        }
      }

      // Send notifications for top opportunities
      for (const opportunity of opportunities) {
        const notificationSent = await this.sendOptimizationNotification(opportunity);
        if (notificationSent) sent++;
      }

      console.log(`[OwnerNotificationService] Sent ${sent} optimization alerts`);
    } catch (error) {
      console.error('[OwnerNotificationService] Error sending optimization alerts:', error);
      throw error;
    }

    return { sent, opportunities };
  }

  /**
   * Send weekly market summary to all property owners
   */
  async sendWeeklyMarketSummary(): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    try {
      // Get all active properties grouped by owner
      const properties = await db
        .select()
        .from(shortLetProperties)
        .where(eq(shortLetProperties.status, 'active'));

      if (properties.length === 0) {
        console.log('[OwnerNotificationService] No active properties for weekly summary');
        return false;
      }

      // Get latest recommendations for all properties
      const propertySummaries = [];
      let totalRevenuePotential = 0;

      for (const property of properties) {
        const recommendations = await db
          .select()
          .from(marketPricingRecommendations)
          .where(eq(marketPricingRecommendations.propertyId, property.id))
          .orderBy(desc(marketPricingRecommendations.createdAt))
          .limit(1);

        if (recommendations.length > 0) {
          const rec = recommendations[0];
          const currentPrice = property.nightlyRate || 0;
          const recommendedPrice = rec.recommendedBasePrice || 0;
          const potentialIncrease = (recommendedPrice - currentPrice) * 20; // 20 nights estimate
          
          if (potentialIncrease > 0) {
            totalRevenuePotential += potentialIncrease;
          }

          propertySummaries.push({
            title: property.title,
            currentPrice,
            recommendedPrice,
            demandScore: rec.marketDemandScore,
            marketAvg: rec.competitorAvgPrice,
          });
        }
      }

      // Create summary content
      const summaryContent = this.formatWeeklySummary(propertySummaries, totalRevenuePotential);

      // Send to platform owner
      const sent = await notifyOwner({
        title: '📊 Weekly Market Summary - Shortlet Properties',
        content: summaryContent,
      });

      console.log('[OwnerNotificationService] Weekly summary sent:', sent);
      return sent;
    } catch (error) {
      console.error('[OwnerNotificationService] Error sending weekly summary:', error);
      return false;
    }
  }

  /**
   * Send individual price alert notification
   */
  private async sendPriceAlertNotification(alert: PriceAlert): Promise<boolean> {
    const direction = alert.priceChange > 0 ? 'increase' : 'decrease';
    const emoji = alert.priceChange > 0 ? '📈' : '📉';
    
    const content = `
${emoji} **Price Adjustment Recommended: ${alert.propertyTitle}**

**Current Price:** ₦${alert.currentPrice.toLocaleString()}/night
**Recommended Price:** ₦${alert.recommendedPrice.toLocaleString()}/night
**Change:** ${alert.priceChangePercent > 0 ? '+' : ''}${alert.priceChangePercent.toFixed(1)}% (₦${Math.abs(alert.priceChange).toLocaleString()})

**Market Context:**
- Competitor Average: ₦${alert.marketAvgPrice.toLocaleString()}/night
- Market Demand Score: ${alert.demandScore}/100
- Confidence Level: ${alert.confidence}%

**Reasoning:**
${alert.reasoning.map(r => `• ${r}`).join('\n')}

**Action Required:**
Review this recommendation in your dashboard and adjust pricing accordingly.
    `.trim();

    try {
      return await notifyOwner({
        title: `${emoji} Price Alert: ${alert.propertyTitle}`,
        content,
      });
    } catch (error) {
      console.error('[OwnerNotificationService] Error sending price alert:', error);
      return false;
    }
  }

  /**
   * Send optimization opportunity notification
   */
  private async sendOptimizationNotification(opportunity: OptimizationOpportunity): Promise<boolean> {
    const emojiMap = {
      underpriced: '💰',
      overpriced: '⚠️',
      high_demand: '🔥',
      low_occupancy: '📊',
    };

    const emoji = emojiMap[opportunity.type];
    
    let content = `
${emoji} **${opportunity.description}**

**Property:** ${opportunity.propertyTitle}
    `.trim();

    if (opportunity.potentialRevenue) {
      content += `\n**Potential Additional Revenue:** ₦${opportunity.potentialRevenue.toLocaleString()}/month`;
    }

    content += `\n\n**Recommended Actions:**\n${opportunity.actionItems.map(item => `• ${item}`).join('\n')}`;

    try {
      return await notifyOwner({
        title: `${emoji} Optimization Opportunity: ${opportunity.propertyTitle}`,
        content,
      });
    } catch (error) {
      console.error('[OwnerNotificationService] Error sending optimization alert:', error);
      return false;
    }
  }

  /**
   * Format weekly summary content
   */
  private formatWeeklySummary(
    properties: Array<{
      title: string | null;
      currentPrice: number;
      recommendedPrice: number;
      demandScore: number | null;
      marketAvg: number | null;
    }>,
    totalRevenuePotential: number
  ): string {
    const propertiesNeedingAttention = properties.filter(
      p => Math.abs(p.recommendedPrice - p.currentPrice) > p.currentPrice * 0.1
    );

    let content = `
📊 **Weekly Market Summary**

**Portfolio Overview:**
- Total Active Properties: ${properties.length}
- Properties Needing Price Adjustment: ${propertiesNeedingAttention.length}
- Total Revenue Optimization Potential: ₦${totalRevenuePotential.toLocaleString()}/month

**Market Insights:**
    `.trim();

    if (propertiesNeedingAttention.length > 0) {
      content += '\n\n**Properties Requiring Attention:**\n';
      propertiesNeedingAttention.slice(0, 5).forEach(p => {
        const change = p.recommendedPrice - p.currentPrice;
        const changePercent = (change / p.currentPrice) * 100;
        content += `\n• **${p.title}**\n`;
        content += `  Current: ₦${p.currentPrice.toLocaleString()} → Recommended: ₦${p.recommendedPrice.toLocaleString()} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)\n`;
        content += `  Demand Score: ${p.demandScore}/100 | Market Avg: ₦${p.marketAvg?.toLocaleString()}\n`;
      });
    }

    content += '\n\n**Next Steps:**\n';
    content += '• Review individual property recommendations in your dashboard\n';
    content += '• Adjust pricing for properties with >10% variance\n';
    content += '• Monitor booking rates after price changes\n';

    return content;
  }
}

// Singleton instance
export const ownerNotificationService = new OwnerNotificationService();
