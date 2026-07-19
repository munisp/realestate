// @ts-nocheck
import { sendEmail } from './notificationService';

interface DigestData {
  period: 'daily' | 'weekly';
  dateRange: {
    start: Date;
    end: Date;
  };
  stats: {
    newUsers: number;
    newProperties: number;
    newTransactions: number;
    pendingApprovals: number;
    resolvedReports: number;
    revenue: number;
  };
  topActivities: Array<{
    type: string;
    description: string;
    timestamp: Date;
  }>;
  alerts: Array<{
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }>;
}

/**
 * Generate HTML email template for admin digest
 */
function generateDigestHTML(data: DigestData): string {
  const { period, dateRange, stats, topActivities, alerts } = data;
  
  const periodLabel = period === 'daily' ? 'Daily' : 'Weekly';
  const dateLabel = `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${periodLabel} Platform Digest</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #1f2937;
      font-size: 28px;
    }
    .header p {
      margin: 10px 0 0 0;
      color: #6b7280;
      font-size: 14px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 15px;
      text-align: center;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
    }
    .stat-value.revenue {
      color: #10b981;
    }
    .stat-value.pending {
      color: #f59e0b;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .activity-item {
      padding: 12px;
      background-color: #f9fafb;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .activity-type {
      font-weight: 600;
      color: #3b82f6;
      font-size: 14px;
    }
    .activity-description {
      color: #4b5563;
      font-size: 14px;
      margin: 5px 0;
    }
    .activity-time {
      color: #9ca3af;
      font-size: 12px;
    }
    .alert {
      padding: 12px 15px;
      border-radius: 6px;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .alert-info {
      background-color: #dbeafe;
      border-left: 4px solid #3b82f6;
      color: #1e40af;
    }
    .alert-warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }
    .alert-critical {
      background-color: #fee2e2;
      border-left: 4px solid #ef4444;
      color: #991b1b;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #3b82f6;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${periodLabel} Platform Digest</h1>
      <p>${dateLabel}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">New Users</div>
        <div class="stat-value">${stats.newUsers}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">New Properties</div>
        <div class="stat-value">${stats.newProperties}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Transactions</div>
        <div class="stat-value">${stats.newTransactions}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Revenue</div>
        <div class="stat-value revenue">$${stats.revenue.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pending Approvals</div>
        <div class="stat-value pending">${stats.pendingApprovals}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Resolved Reports</div>
        <div class="stat-value">${stats.resolvedReports}</div>
      </div>
    </div>

    ${alerts.length > 0 ? `
    <div class="section">
      <div class="section-title">⚠️ Alerts & Notifications</div>
      ${alerts.map(alert => `
        <div class="alert alert-${alert.severity}">
          ${alert.message}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${topActivities.length > 0 ? `
    <div class="section">
      <div class="section-title">📈 Top Activities</div>
      ${topActivities.map(activity => `
        <div class="activity-item">
          <div class="activity-type">${activity.type}</div>
          <div class="activity-description">${activity.description}</div>
          <div class="activity-time">${activity.timestamp.toLocaleString()}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div style="text-align: center;">
      <a href="${process.env.VITE_APP_URL || 'https://platform.example.com'}/admin" class="button">
        View Full Dashboard
      </a>
    </div>

    <div class="footer">
      <p>This is an automated ${period} digest report.</p>
      <p>To manage your email preferences, visit your admin settings.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate and send daily digest to admins
 */
export async function sendDailyDigest(adminEmails: string[]): Promise<boolean> {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  // Mock data - replace with actual database queries
  const digestData: DigestData = {
    period: 'daily',
    dateRange: {
      start: yesterday,
      end: today,
    },
    stats: {
      newUsers: 12,
      newProperties: 8,
      newTransactions: 5,
      pendingApprovals: 3,
      resolvedReports: 7,
      revenue: 45000,
    },
    topActivities: [
      {
        type: 'Property Listing',
        description: 'Luxury penthouse listed in Downtown - $1.2M',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        type: 'Transaction Completed',
        description: 'Sale finalized for Modern Condo - $450K',
        timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      },
      {
        type: 'User Registration',
        description: '5 new users joined the platform',
        timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      },
    ],
    alerts: [
      {
        severity: 'warning',
        message: '3 property listings are pending approval for more than 24 hours',
      },
      {
        severity: 'info',
        message: 'Platform traffic increased by 15% compared to last week',
      },
    ],
  };

  const htmlContent = generateDigestHTML(digestData);

  // Send to all admin emails
  const results = await Promise.all(
    adminEmails.map(email =>
      sendEmail({
        to: email,
        subject: `Daily Platform Digest - ${digestData.dateRange.end.toLocaleDateString()}`,
        htmlContent,
      })
    )
  );

  return results.every(result => result);
}

/**
 * Generate and send weekly digest to admins
 */
export async function sendWeeklyDigest(adminEmails: string[]): Promise<boolean> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  // Mock data - replace with actual database queries
  const digestData: DigestData = {
    period: 'weekly',
    dateRange: {
      start: weekAgo,
      end: now,
    },
    stats: {
      newUsers: 85,
      newProperties: 42,
      newTransactions: 28,
      pendingApprovals: 5,
      resolvedReports: 31,
      revenue: 2150000,
    },
    topActivities: [
      {
        type: 'Major Transaction',
        description: 'Commercial property sold - $5.2M',
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        type: 'Platform Milestone',
        description: 'Reached 10,000 total users',
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        type: 'High Activity',
        description: 'Record 150 property views in a single day',
        timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
    ],
    alerts: [
      {
        severity: 'critical',
        message: 'Server response time increased by 25% - investigate performance',
      },
      {
        severity: 'warning',
        message: '5 property listings flagged for potential policy violations',
      },
      {
        severity: 'info',
        message: 'User engagement rate improved by 12% this week',
      },
    ],
  };

  const htmlContent = generateDigestHTML(digestData);

  // Send to all admin emails
  const results = await Promise.all(
    adminEmails.map(email =>
      sendEmail({
        to: email,
        subject: `Weekly Platform Digest - Week of ${digestData.dateRange.start.toLocaleDateString()}`,
        htmlContent,
      })
    )
  );

  return results.every(result => result);
}

/**
 * Preview digest without sending
 */
export function previewDigest(period: 'daily' | 'weekly'): string {
  const now = new Date();
  const start = period === 'daily' 
    ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
    : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const mockData: DigestData = {
    period,
    dateRange: { start, end: now },
    stats: {
      newUsers: period === 'daily' ? 12 : 85,
      newProperties: period === 'daily' ? 8 : 42,
      newTransactions: period === 'daily' ? 5 : 28,
      pendingApprovals: 3,
      resolvedReports: period === 'daily' ? 7 : 31,
      revenue: period === 'daily' ? 45000 : 2150000,
    },
    topActivities: [
      {
        type: 'Sample Activity',
        description: 'This is a preview of digest content',
        timestamp: now,
      },
    ],
    alerts: [
      {
        severity: 'info',
        message: 'This is a preview - no actual alerts',
      },
    ],
  };

  return generateDigestHTML(mockData);
}
