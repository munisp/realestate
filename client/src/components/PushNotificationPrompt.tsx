import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushNotificationPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem('push-notification-prompt-dismissed');
    
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show prompt after 5 seconds if:
    // - Push is supported
    // - User is not subscribed
    // - Permission is default (not granted or denied)
    if (isSupported && !isSubscribed && permission === 'default') {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, permission]);

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('push-notification-prompt-dismissed', 'true');
  };

  const handleRemindLater = () => {
    setIsVisible(false);
    // Show again in 7 days
    const remindDate = new Date();
    remindDate.setDate(remindDate.getDate() + 7);
    localStorage.setItem('push-notification-remind-date', remindDate.toISOString());
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-full">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Stay Updated</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="mt-2">
            Get instant notifications about:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>New properties matching your saved searches</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Price changes on properties you're watching</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>New messages and offer updates</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Upcoming showing reminders</span>
            </li>
          </ul>

          <div className="flex flex-col gap-2">
            <Button onClick={handleEnable} className="w-full">
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleRemindLater}
              >
                Remind Me Later
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={handleDismiss}
              >
                No Thanks
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You can change this anytime in your notification settings
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Compact notification banner for top of page
export function PushNotificationBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();

  useEffect(() => {
    // Show banner if push is supported but not enabled
    if (isSupported && !isSubscribed && permission === 'default') {
      const dismissed = localStorage.getItem('push-notification-banner-dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    }
  }, [isSupported, isSubscribed, permission]);

  const handleEnable = async () => {
    await subscribe();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('push-notification-banner-dismissed', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-primary/10 border-b border-primary/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Bell className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Never miss an update!</span> Enable notifications to get instant alerts about new properties and messages.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" onClick={handleEnable}>
              Enable
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
