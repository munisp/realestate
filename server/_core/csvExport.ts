/**
 * CSV Export Utility
 * 
 * Provides functions to export analytics data to CSV format
 */

export interface CSVColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

/**
 * Convert data array to CSV string
 */
export function arrayToCSV(data: any[], columns: CSVColumn[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Create header row
  const headers = columns.map(col => escapeCSVValue(col.label));
  const headerRow = headers.join(',');

  // Create data rows
  const dataRows = data.map(item => {
    const values = columns.map(col => {
      let value = item[col.key];
      
      // Apply custom formatter if provided
      if (col.format && value !== null && value !== undefined) {
        value = col.format(value);
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      
      // Handle dates
      if (value instanceof Date) {
        return escapeCSVValue(value.toISOString());
      }
      
      // Handle objects/arrays
      if (typeof value === 'object') {
        return escapeCSVValue(JSON.stringify(value));
      }
      
      return escapeCSVValue(String(value));
    });
    
    return values.join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Escape CSV value (handle quotes, commas, newlines)
 */
function escapeCSVValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format currency value (cents to dollars)
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format datetime to readable string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Export moderation metrics to CSV
 */
export function exportModerationMetricsCSV(metrics: any): string {
  const data = [
    {
      metric: 'Total Reports',
      value: metrics.totalReports,
      category: 'Overview',
    },
    {
      metric: 'Pending Reports',
      value: metrics.pendingReports,
      category: 'Overview',
    },
    {
      metric: 'Resolved Reports',
      value: metrics.resolvedReports,
      category: 'Overview',
    },
    {
      metric: 'Average Response Time (hours)',
      value: metrics.averageResponseTimeHours,
      category: 'Performance',
    },
    {
      metric: 'Property Reports',
      value: metrics.reportsByType.property,
      category: 'By Type',
    },
    {
      metric: 'User Reports',
      value: metrics.reportsByType.user,
      category: 'By Type',
    },
    {
      metric: 'Review Reports',
      value: metrics.reportsByType.review,
      category: 'By Type',
    },
  ];

  const columns: CSVColumn[] = [
    { key: 'category', label: 'Category' },
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ];

  return arrayToCSV(data, columns);
}

/**
 * Export property metrics to CSV
 */
export function exportPropertyMetricsCSV(metrics: any): string {
  const data = [
    { metric: 'Total Properties', value: metrics.totalProperties },
    { metric: 'Active Properties', value: metrics.activeProperties },
    { metric: 'Pending Approvals', value: metrics.pendingApprovals },
    { metric: 'Approved Today', value: metrics.approvedToday },
    { metric: 'Rejected Today', value: metrics.rejectedToday },
    { metric: 'Average Approval Time (hours)', value: metrics.averageApprovalTimeHours },
  ];

  const columns: CSVColumn[] = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ];

  return arrayToCSV(data, columns);
}

/**
 * Export user metrics to CSV
 */
export function exportUserMetricsCSV(metrics: any): string {
  const data = [
    { metric: 'Total Users', value: metrics.totalUsers },
    { metric: 'Active Users Today', value: metrics.activeUsersToday },
    { metric: 'New Users Today', value: metrics.newUsersToday },
    { metric: 'New Users This Week', value: metrics.newUsersThisWeek },
    { metric: 'New Users This Month', value: metrics.newUsersThisMonth },
  ];

  const columns: CSVColumn[] = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ];

  return arrayToCSV(data, columns);
}

/**
 * Export transaction metrics to CSV
 */
export function exportTransactionMetricsCSV(metrics: any): string {
  const data = [
    { metric: 'Total Transactions', value: metrics.totalTransactions },
    { metric: 'Active Transactions', value: metrics.activeTransactions },
    { metric: 'Completed Transactions', value: metrics.completedTransactions },
    { metric: 'Total Volume', value: formatCurrency(metrics.totalVolume) },
    { metric: 'Average Transaction Value', value: formatCurrency(metrics.averageTransactionValue) },
  ];

  const columns: CSVColumn[] = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ];

  return arrayToCSV(data, columns);
}

/**
 * Export escrow metrics to CSV
 */
export function exportEscrowMetricsCSV(metrics: any): string {
  const data = [
    { metric: 'Total Escrows', value: metrics.totalEscrows },
    { metric: 'Active Escrows', value: metrics.activeEscrows },
    { metric: 'Completed Escrows', value: metrics.completedEscrows },
    { metric: 'Disputed Escrows', value: metrics.disputedEscrows },
    { metric: 'Total Funds Held', value: formatCurrency(metrics.totalFundsHeld) },
    { metric: 'Total Funds Released', value: formatCurrency(metrics.totalFundsReleased) },
    { metric: 'Average Escrow Duration (days)', value: metrics.averageEscrowDurationDays },
  ];

  const columns: CSVColumn[] = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ];

  return arrayToCSV(data, columns);
}

/**
 * Export all dashboard metrics to CSV
 */
export function exportDashboardMetricsCSV(dashboardMetrics: any): string {
  const sections = [
    '=== MODERATION METRICS ===',
    exportModerationMetricsCSV(dashboardMetrics.moderation),
    '',
    '=== PROPERTY METRICS ===',
    exportPropertyMetricsCSV(dashboardMetrics.property),
    '',
    '=== USER METRICS ===',
    exportUserMetricsCSV(dashboardMetrics.user),
    '',
    '=== TRANSACTION METRICS ===',
    exportTransactionMetricsCSV(dashboardMetrics.transaction),
    '',
    '=== ESCROW METRICS ===',
    exportEscrowMetricsCSV(dashboardMetrics.escrow),
    '',
    `Generated At: ${new Date(dashboardMetrics.generatedAt).toISOString()}`,
  ];

  return sections.join('\n');
}

/**
 * Create a downloadable CSV file response
 */
export function createCSVResponse(csvContent: string, filename: string) {
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${timestamp}.csv`;
  
  return {
    content: csvContent,
    filename: fullFilename,
    mimeType: 'text/csv',
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fullFilename}"`,
    },
  };
}
