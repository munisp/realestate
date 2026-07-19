import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

export interface EmailPreviewData {
  propertyAddress?: string;
  propertyPrice?: string;
  competitorUrl?: string;
  competitorPrice?: string;
  priceDifference?: string;
  oldPrice?: string;
  newPrice?: string;
  changePercentage?: string;
  competitorCount?: number;
  avgCompetitorPrice?: string;
  lowestCompetitorPrice?: string;
  highestCompetitorPrice?: string;
}

export class CompetitorEmailTemplateService {
  /**
   * Get all available competitor email templates
   */
  static getTemplates(): EmailTemplate[] {
    return [
      {
        id: "new_competitor",
        name: "New Competitor Found",
        subject: "New Competitor Found for {{propertyAddress}}",
        html: this.getNewCompetitorTemplate(),
        variables: ["propertyAddress", "propertyPrice", "competitorUrl", "competitorPrice", "priceDifference"],
      },
      {
        id: "price_change",
        name: "Competitor Price Change",
        subject: "Price Change Alert for {{propertyAddress}}",
        html: this.getPriceChangeTemplate(),
        variables: ["propertyAddress", "competitorUrl", "oldPrice", "newPrice", "changePercentage"],
      },
      {
        id: "market_summary",
        name: "Weekly Market Summary",
        subject: "Weekly Market Summary for {{propertyAddress}}",
        html: this.getMarketSummaryTemplate(),
        variables: ["propertyAddress", "propertyPrice", "competitorCount", "avgCompetitorPrice", "lowestCompetitorPrice", "highestCompetitorPrice"],
      },
    ];
  }

  /**
   * Get template by ID
   */
  static getTemplateById(templateId: string): EmailTemplate | null {
    const templates = this.getTemplates();
    return templates.find(t => t.id === templateId) || null;
  }

  /**
   * Render template with data
   */
  static renderTemplate(templateId: string, data: EmailPreviewData): { subject: string; html: string } | null {
    const template = this.getTemplateById(templateId);
    if (!template) return null;

    let subject = template.subject;
    let html = template.html;

    // Replace variables in subject and HTML
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value?.toString() || '');
      html = html.replace(new RegExp(placeholder, 'g'), value?.toString() || '');
    });

    return { subject, html };
  }

  /**
   * Send test email
   */
  static async sendTestEmail(
    templateId: string,
    data: EmailPreviewData,
    toEmail: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const rendered = this.renderTemplate(templateId, data);
      if (!rendered) {
        return { success: false, error: "Template not found" };
      }

      if (!process.env.RESEND_API_KEY) {
        return { success: false, error: "Resend API key not configured" };
      }

      const result = await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@manus.space",
        to: toEmail,
        subject: `[TEST] ${rendered.subject}`,
        html: rendered.html,
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true, messageId: result.data?.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * New Competitor Template
   */
  private static getNewCompetitorTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .property-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .price-comparison { display: flex; justify-content: space-around; margin: 20px 0; }
    .price-box { text-align: center; padding: 15px; }
    .price { font-size: 24px; font-weight: bold; color: #667eea; }
    .label { font-size: 12px; color: #666; text-transform: uppercase; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 New Competitor Alert</h1>
  </div>
  <div class="content">
    <div class="alert-box">
      <strong>New competitor found!</strong> A similar property has been listed that may compete with your listing.
    </div>
    
    <div class="property-info">
      <h2>Your Property</h2>
      <p><strong>Address:</strong> {{propertyAddress}}</p>
      <p><strong>Your Price:</strong> {{propertyPrice}}</p>
    </div>

    <div class="property-info">
      <h2>Competitor Property</h2>
      <p><strong>Listing URL:</strong> <a href="{{competitorUrl}}">View Listing</a></p>
      <p><strong>Their Price:</strong> {{competitorPrice}}</p>
      <p><strong>Price Difference:</strong> {{priceDifference}}</p>
    </div>

    <div style="text-align: center;">
      <a href="{{competitorUrl}}" class="cta-button">View Competitor Listing</a>
    </div>

    <p><strong>What this means:</strong></p>
    <ul>
      <li>This property is competing for the same buyer pool</li>
      <li>Consider reviewing your pricing strategy</li>
      <li>Monitor this competitor's listing status and price changes</li>
    </ul>
  </div>
  
  <div class="footer">
    <p>This is an automated alert from your Real Estate Platform</p>
    <p>To manage your notification preferences, visit your dashboard</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Price Change Template
   */
  private static getPriceChangeTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .price-change { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .old-price { text-decoration: line-through; color: #999; font-size: 20px; }
    .new-price { font-size: 32px; font-weight: bold; color: #f5576c; margin: 10px 0; }
    .change-badge { display: inline-block; background: #dc3545; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; }
    .cta-button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="header">
    <h1>💰 Price Change Alert</h1>
  </div>
  <div class="content">
    <div class="alert-box">
      <strong>Competitor price changed!</strong> A competing property has adjusted their pricing.
    </div>
    
    <div class="price-change">
      <h2>{{propertyAddress}}</h2>
      <p class="old-price">{{oldPrice}}</p>
      <p class="new-price">{{newPrice}}</p>
      <span class="change-badge">{{changePercentage}} change</span>
    </div>

    <div style="text-align: center;">
      <a href="{{competitorUrl}}" class="cta-button">View Updated Listing</a>
    </div>

    <p><strong>Recommended Actions:</strong></p>
    <ul>
      <li>Review your pricing strategy in light of this change</li>
      <li>Consider if your property offers better value</li>
      <li>Monitor buyer interest and adjust accordingly</li>
    </ul>
  </div>
  
  <div class="footer">
    <p>This is an automated alert from your Real Estate Platform</p>
    <p>To manage your notification preferences, visit your dashboard</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Market Summary Template
   */
  private static getMarketSummaryTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .stat-box { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-value { font-size: 24px; font-weight: bold; color: #4facfe; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px; }
    .property-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .cta-button { display: inline-block; background: #4facfe; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Weekly Market Summary</h1>
  </div>
  <div class="content">
    <div class="property-info">
      <h2>Your Property</h2>
      <p><strong>Address:</strong> {{propertyAddress}}</p>
      <p><strong>Your Price:</strong> {{propertyPrice}}</p>
    </div>

    <h3>Market Overview</h3>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value">{{competitorCount}}</div>
        <div class="stat-label">Competing Properties</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">{{avgCompetitorPrice}}</div>
        <div class="stat-label">Average Price</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">{{lowestCompetitorPrice}}</div>
        <div class="stat-label">Lowest Price</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">{{highestCompetitorPrice}}</div>
        <div class="stat-label">Highest Price</div>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="#" class="cta-button">View Full Market Analysis</a>
    </div>

    <p><strong>Market Insights:</strong></p>
    <ul>
      <li>Your property is positioned in the competitive market</li>
      <li>Monitor these metrics weekly to stay competitive</li>
      <li>Consider adjusting your strategy based on market trends</li>
    </ul>
  </div>
  
  <div class="footer">
    <p>This is your weekly market summary from Real Estate Platform</p>
    <p>To manage your notification preferences, visit your dashboard</p>
  </div>
</body>
</html>
    `;
  }
}
