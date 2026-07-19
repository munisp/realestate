import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActivityFeed, ActivityEvent } from '@/hooks/useRealtimeMetrics';
import { 
  Home, 
  DollarSign, 
  UserPlus, 
  CheckCircle, 
  Wallet, 
  AlertTriangle,
  Circle,
  Wifi,
  WifiOff
} from 'lucide-react';

const activityIcons: Record<ActivityEvent['type'], any> = {
  property_listed: Home,
  property_sold: DollarSign,
  user_registered: UserPlus,
  transaction_completed: CheckCircle,
  escrow_funded: Wallet,
  report_filed: AlertTriangle,
};

const activityColors: Record<ActivityEvent['type'], string> = {
  property_listed: 'bg-blue-500',
  property_sold: 'bg-green-500',
  user_registered: 'bg-purple-500',
  transaction_completed: 'bg-emerald-500',
  escrow_funded: 'bg-yellow-500',
  report_filed: 'bg-red-500',
};

const activityLabels: Record<ActivityEvent['type'], string> = {
  property_listed: 'New Listing',
  property_sold: 'Property Sold',
  user_registered: 'New User',
  transaction_completed: 'Transaction',
  escrow_funded: 'Escrow Funded',
  report_filed: 'Report Filed',
};

export function ActivityFeed() {
  const { activities, connected } = useActivityFeed();
  const [filter, setFilter] = useState<ActivityEvent['type'] | 'all'>('all');

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter);

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Activity Feed</CardTitle>
            <CardDescription>Real-time platform events</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="h-4 w-4" />
                <span className="text-xs font-medium">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-400">
                <WifiOff className="h-4 w-4" />
                <span className="text-xs font-medium">Offline</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            All
          </Badge>
          {Object.entries(activityLabels).map(([type, label]) => (
            <Badge
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter(type as ActivityEvent['type'])}
            >
              {label}
            </Badge>
          ))}
        </div>

        {/* Activity List */}
        <ScrollArea className="h-[400px] pr-4">
          {filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Circle className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {connected ? 'No recent activity' : 'Connecting to live feed...'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const Icon = activityIcons[activity.type];
                const colorClass = activityColors[activity.type];
                
                return (
                  <div
                    key={activity.id}
                    className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{activity.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {activity.description}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {activityLabels[activity.type]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTimestamp(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
