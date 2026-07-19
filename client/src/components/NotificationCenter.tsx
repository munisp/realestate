import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, AlertCircle, Home, Users, DollarSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface Notification {
  id: number;
  type: 'property_report' | 'user_report' | 'property_approval' | 'transaction' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

const notificationIcons: Record<Notification['type'], any> = {
  property_report: AlertCircle,
  user_report: Users,
  property_approval: Home,
  transaction: DollarSign,
  system: FileText,
};

const notificationColors: Record<Notification['type'], string> = {
  property_report: 'text-red-500',
  user_report: 'text-orange-500',
  property_approval: 'text-blue-500',
  transaction: 'text-green-500',
  system: 'text-gray-500',
};

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: 'property_report',
      title: 'New Property Report',
      message: 'Property #12345 has been reported for misleading information',
      timestamp: new Date(Date.now() - 5 * 60000),
      read: false,
    },
    {
      id: 2,
      type: 'property_approval',
      title: 'Pending Approval',
      message: '3 new properties awaiting approval',
      timestamp: new Date(Date.now() - 15 * 60000),
      read: false,
    },
    {
      id: 3,
      type: 'user_report',
      title: 'User Report',
      message: 'User reported for suspicious activity',
      timestamp: new Date(Date.now() - 30 * 60000),
      read: false,
    },
    {
      id: 4,
      type: 'transaction',
      title: 'Transaction Completed',
      message: 'Escrow released for Property #98765',
      timestamp: new Date(Date.now() - 60 * 60000),
      read: true,
    },
    {
      id: 5,
      type: 'system',
      title: 'System Update',
      message: 'Platform maintenance scheduled for tonight',
      timestamp: new Date(Date.now() - 120 * 60000),
      read: true,
    },
  ]);

  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toLocaleDateString();
  };

  // Simulate real-time notifications
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly add new notifications (for demo purposes)
      if (Math.random() > 0.7) {
        const types: Notification['type'][] = ['property_report', 'user_report', 'property_approval', 'transaction', 'system'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        const newNotification: Notification = {
          id: Date.now(),
          type: randomType,
          title: `New ${randomType.replace(/_/g, ' ')}`,
          message: 'This is a demo notification',
          timestamp: new Date(),
          read: false,
        };

        setNotifications(prev => [newNotification, ...prev].slice(0, 20)); // Keep max 20 notifications
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-6 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-6 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type];
              const colorClass = notificationColors[notification.type];

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'flex gap-3 p-3 cursor-pointer',
                    !notification.read && 'bg-accent/50'
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className={cn('flex-shrink-0 mt-0.5', colorClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      {!notification.read && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(notification.timestamp)}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
