import { Link, useLocation } from 'wouter';
import { Activity, AlertTriangle, Database, BarChart3, Settings, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Admin Monitoring Navigation Component
 * 
 * Provides navigation for monitoring and alerting tools in the admin panel
 */

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const monitoringNavItems: NavItem[] = [
  {
    label: 'Alert Configuration',
    href: '/admin/monitoring/alerts',
    icon: AlertTriangle,
    description: 'Configure automated alerts and thresholds',
  },
  {
    label: 'Data Quality',
    href: '/admin/monitoring/data-quality',
    icon: Database,
    description: 'Monitor data quality metrics and accuracy',
  },
  {
    label: 'Service Health',
    href: '/admin/monitoring/service-health',
    icon: Activity,
    description: 'View service health and uptime status',
  },
  {
    label: 'Performance Metrics',
    href: '/admin/monitoring/performance',
    icon: BarChart3,
    description: 'Analyze API performance and response times',
  },
  {
    label: 'Scheduled Jobs',
    href: '/admin/monitoring/jobs',
    icon: Clock,
    description: 'Monitor and manage scheduled background jobs',
  },
  {
    label: 'Monitoring Settings',
    href: '/admin/monitoring/settings',
    icon: Settings,
    description: 'Configure monitoring preferences',
  },
];

export function AdminMonitoringNav() {
  const [location] = useLocation();

  return (
    <nav className="space-y-1">
      <div className="px-3 py-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Monitoring & Alerts
        </h3>
      </div>
      {monitoringNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;

        return (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                'flex items-start gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', isActive && 'text-primary-foreground')} />
              <div className="flex-1 min-w-0">
                <div className={cn('text-sm font-medium', isActive && 'text-primary-foreground')}>
                  {item.label}
                </div>
                <div
                  className={cn(
                    'text-xs mt-0.5',
                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {item.description}
                </div>
              </div>
            </a>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Compact version for sidebar
 */
export function AdminMonitoringNavCompact() {
  const [location] = useLocation();

  return (
    <nav className="space-y-1">
      {monitoringNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;

        return (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
              title={item.description}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </a>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Monitoring dashboard overview card
 */
export function MonitoringOverviewCard() {
  return (
    <div className="bg-card text-card-foreground rounded-lg border p-6">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-semibold">Monitoring & Alerts</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Configure automated monitoring, alerts, and data quality checks for your platform.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {monitoringNavItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <a className="flex items-center gap-2 p-3 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
