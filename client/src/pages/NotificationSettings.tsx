import { useState } from 'react';
import { Bell, BellOff, Mail, MessageSquare, Smartphone, TrendingUp, FileText, Home, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function NotificationSettings() {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushNotifications();
  const { data: preferences, isLoading } = trpc.notifications.getPreferences.useQuery();
  const updatePreferences = trpc.notifications.updatePreferences.useMutation();
  const testPush = trpc.push.sendTest.useMutation();

  const [localPrefs, setLocalPrefs] = useState(preferences || {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    escrowUpdates: true,
    documentSigning: true,
    propertyAlerts: true,
    messageNotifications: true,
    marketingEmails: false,
  });

  const handleToggle = async (key: string, value: boolean) => {
    setLocalPrefs((prev: any) => ({ ...prev, [key]: value }));

    try {
      await updatePreferences.mutateAsync({
        [key]: value,
      });
      toast.success('Preferences updated');
    } catch (error) {
      toast.error('Failed to update preferences');
      // Revert on error
      setLocalPrefs((prev: any) => ({ ...prev, [key]: !value }));
    }
  };

  const handleTestNotification = async () => {
    if (!isSubscribed) {
      toast.error('Please enable push notifications first');
      return;
    }

    try {
      await testPush.mutateAsync();
      toast.success('Test notification sent! Check your browser.');
    } catch (error) {
      toast.error('Failed to send test notification');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Notification Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage how you receive updates and alerts from the platform
            </p>
          </div>

          {/* Push Notifications Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Push Notifications</CardTitle>
                    <CardDescription>
                      Get instant browser notifications for important updates
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      subscribe();
                    } else {
                      unsubscribe();
                    }
                  }}
                  disabled={!isSupported}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSupported && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Push notifications are not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.
                  </AlertDescription>
                </Alert>
              )}

              {isSupported && permission === 'denied' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You have blocked notifications for this site. To enable them, please update your browser settings.
                  </AlertDescription>
                </Alert>
              )}

              {isSubscribed && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-900 dark:text-green-100">
                        Push notifications are enabled
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestNotification}
                      disabled={testPush.isPending}
                    >
                      {testPush.isPending ? 'Sending...' : 'Send Test'}
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    You'll receive push notifications on this device when important events occur.
                  </p>
                </div>
              )}

              {isSupported && !isSubscribed && permission !== 'denied' && (
                <Button onClick={subscribe} className="w-full">
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Push Notifications
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Notification Channels */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="email-enabled" className="font-medium">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via email
                    </p>
                  </div>
                </div>
                <Switch
                  id="email-enabled"
                  checked={localPrefs.emailEnabled}
                  onCheckedChange={(checked) => handleToggle('emailEnabled', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="sms-enabled" className="font-medium">
                      SMS Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get text messages for urgent updates
                    </p>
                  </div>
                </div>
                <Switch
                  id="sms-enabled"
                  checked={localPrefs.smsEnabled}
                  onCheckedChange={(checked) => handleToggle('smsEnabled', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="push-enabled" className="font-medium">
                      Browser Push
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Instant browser notifications
                    </p>
                  </div>
                </div>
                <Switch
                  id="push-enabled"
                  checked={localPrefs.pushEnabled}
                  onCheckedChange={(checked) => handleToggle('pushEnabled', checked)}
                  disabled={!isSubscribed}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Categories</CardTitle>
              <CardDescription>
                Choose which types of notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="property-alerts" className="font-medium">
                      Property Alerts
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      New listings, price changes, and saved search matches
                    </p>
                  </div>
                </div>
                <Switch
                  id="property-alerts"
                  checked={localPrefs.propertyAlerts}
                  onCheckedChange={(checked) => handleToggle('propertyAlerts', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="message-notifications" className="font-medium">
                      Messages & Offers
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      New messages, offers, and showing requests
                    </p>
                  </div>
                </div>
                <Switch
                  id="message-notifications"
                  checked={localPrefs.messageNotifications}
                  onCheckedChange={(checked) => handleToggle('messageNotifications', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="document-signing" className="font-medium">
                      Document Signing
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Signature requests and document updates
                    </p>
                  </div>
                </div>
                <Switch
                  id="document-signing"
                  checked={localPrefs.documentSigning}
                  onCheckedChange={(checked) => handleToggle('documentSigning', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="escrow-updates" className="font-medium">
                      Escrow & Transactions
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Payment updates, milestone releases, and transaction status
                    </p>
                  </div>
                </div>
                <Switch
                  id="escrow-updates"
                  checked={localPrefs.escrowUpdates}
                  onCheckedChange={(checked) => handleToggle('escrowUpdates', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="marketing-emails" className="font-medium">
                      Marketing & Tips
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Market insights, tips, and promotional offers
                    </p>
                  </div>
                </div>
                <Switch
                  id="marketing-emails"
                  checked={localPrefs.marketingEmails}
                  onCheckedChange={(checked) => handleToggle('marketingEmails', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Help Text */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Some critical notifications (like security alerts and account changes) cannot be disabled and will always be sent via email.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
