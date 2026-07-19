import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getLoginUrl } from '@/const';
import { trpc } from '@/lib/trpc';
import { Bell, Mail, Home, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

/**
 * Email Preference Center
 * 
 * Allows users to customize which email notifications they receive
 * including property alerts, tour reminders, and market updates
 */

interface EmailPreference {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export default function EmailPreferences() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  // Fetch user preferences from backend
  const { data: dbPreferences, isLoading: prefsLoading, refetch } = trpc.notificationPreferences.get.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Update preferences mutation
  const updateMutation = trpc.notificationPreferences.update.useMutation({
    onSuccess: () => {
      toast.success('Email preferences saved successfully!');
      refetch();
      setSaving(false);
    },
    onError: (error) => {
      toast.error(`Failed to save preferences: ${error.message}`);
      setSaving(false);
    },
  });

  const [saving, setSaving] = useState(false);

  // Map database preferences to UI preferences
  const preferences: EmailPreference[] = [
    {
      id: 'newListingAlerts',
      title: 'Property Match Alerts',
      description: 'Get notified when new properties match your saved searches',
      icon: <Home className="h-5 w-5" />,
      enabled: dbPreferences?.newListingAlerts ?? true,
    },
    {
      id: 'appointmentReminders',
      title: 'Virtual Tour Reminders',
      description: 'Receive reminders 24 hours before scheduled virtual tours',
      icon: <Calendar className="h-5 w-5" />,
      enabled: dbPreferences?.appointmentReminders ?? true,
    },
    {
      id: 'marketingEmails',
      title: 'Market Trend Updates',
      description: 'Weekly digest of market trends and hot neighborhoods',
      icon: <TrendingUp className="h-5 w-5" />,
      enabled: dbPreferences?.marketingEmails ?? false,
    },
    {
      id: 'messageNotifications',
      title: 'Message Notifications',
      description: 'Get notified when you receive new messages from agents or sellers',
      icon: <Bell className="h-5 w-5" />,
      enabled: dbPreferences?.messageNotifications ?? true,
    },
    {
      id: 'priceDropAlerts',
      title: 'Price Change Alerts',
      description: 'Notifications when favorited properties change price',
      icon: <Mail className="h-5 w-5" />,
      enabled: dbPreferences?.priceDropAlerts ?? true,
    },
  ];

  const handleToggle = (id: string) => {
    if (!dbPreferences) return;

    const updatedPrefs = {
      emailNotifications: dbPreferences.emailNotifications,
      smsNotifications: dbPreferences.smsNotifications,
      priceDropAlerts: dbPreferences.priceDropAlerts,
      newListingAlerts: dbPreferences.newListingAlerts,
      appointmentReminders: dbPreferences.appointmentReminders,
      messageNotifications: dbPreferences.messageNotifications,
      marketingEmails: dbPreferences.marketingEmails,
      [id]: !(dbPreferences as any)[id],
    };

    setSaving(true);
    updateMutation.mutate(updatedPrefs);
  };

  const handleSave = async () => {
    if (!dbPreferences) return;
    
    setSaving(true);
    updateMutation.mutate({
      emailNotifications: dbPreferences.emailNotifications,
      smsNotifications: dbPreferences.smsNotifications,
      priceDropAlerts: dbPreferences.priceDropAlerts,
      newListingAlerts: dbPreferences.newListingAlerts,
      appointmentReminders: dbPreferences.appointmentReminders,
      messageNotifications: dbPreferences.messageNotifications,
      marketingEmails: dbPreferences.marketingEmails,
    });
  };

  if (authLoading || prefsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to manage your email preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Email Preferences</h1>
          <p className="text-muted-foreground">
            Manage which email notifications you receive from the platform
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Choose which updates you want to receive via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {preferences.map((pref) => (
              <div
                key={pref.id}
                className="flex items-start justify-between py-4 border-b last:border-0"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2 bg-primary/10 rounded-lg mt-1">
                    {pref.icon}
                  </div>
                  <div className="flex-1">
                    <Label
                      htmlFor={pref.id}
                      className="text-base font-medium cursor-pointer"
                    >
                      {pref.title}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pref.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={pref.id}
                  checked={pref.enabled}
                  onCheckedChange={() => handleToggle(pref.id)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Delivery</CardTitle>
            <CardDescription>
              Emails will be sent to: <strong>{user?.email || 'your registered email'}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You can update your email address in your account settings. All notifications
              are sent from noreply@realestate-platform.com
            </p>
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Preferences
              </Button>
              <Button variant="outline" onClick={() => {
                if (!dbPreferences) return;
                setSaving(true);
                updateMutation.mutate({
                  emailNotifications: false,
                  smsNotifications: false,
                  priceDropAlerts: false,
                  newListingAlerts: false,
                  appointmentReminders: false,
                  messageNotifications: false,
                  marketingEmails: false,
                });
                toast.info('All notifications disabled');
              }}>
                Disable All
              </Button>
              <Button variant="outline" onClick={() => {
                if (!dbPreferences) return;
                setSaving(true);
                updateMutation.mutate({
                  emailNotifications: true,
                  smsNotifications: true,
                  priceDropAlerts: true,
                  newListingAlerts: true,
                  appointmentReminders: true,
                  messageNotifications: true,
                  marketingEmails: true,
                });
                toast.info('All notifications enabled');
              }}>
                Enable All
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Some critical notifications (account security, transaction confirmations)
            cannot be disabled and will always be sent regardless of these preferences.
          </p>
        </div>
      </div>
    </div>
  );
}
