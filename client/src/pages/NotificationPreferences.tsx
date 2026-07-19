// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Bell, Mail, MessageSquare, DollarSign, Home, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPreferences() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  
  const { data: preferences } = trpc.notifications.getPreferences.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updatePreferences = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences updated");
      utils.notifications.getPreferences.invalidate();
    },
    onError: () => {
      toast.error("Failed to update preferences");
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please sign in to manage notification preferences</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleToggle = (key: string, value: boolean) => {
    updatePreferences.mutate({ [key]: value });
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Preferences</h1>
        <p className="text-muted-foreground">
          Manage how you receive updates about properties, messages, and account activity
        </p>
      </div>

      <div className="space-y-6">
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>Control which emails you receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailNotifications">All Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Master switch for all email notifications
                </p>
              </div>
              <Switch
                id="emailNotifications"
                checked={preferences?.emailNotifications ?? true}
                onCheckedChange={(checked) => handleToggle('emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketingEmails">Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">
                  Receive newsletters and promotional content
                </p>
              </div>
              <Switch
                id="marketingEmails"
                checked={preferences?.marketingEmails ?? false}
                onCheckedChange={(checked) => handleToggle('marketingEmails', checked)}
                disabled={!preferences?.emailNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* SMS Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Notifications
            </CardTitle>
            <CardDescription>Receive text message alerts (carrier rates may apply)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="smsNotifications">SMS Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get important updates via text message
                </p>
              </div>
              <Switch
                id="smsNotifications"
                checked={preferences?.smsNotifications ?? false}
                onCheckedChange={(checked) => handleToggle('smsNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Property Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Property Alerts
            </CardTitle>
            <CardDescription>Get notified about property updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="priceDropAlerts">Price Drop Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    When favorited properties decrease in price
                  </p>
                </div>
              </div>
              <Switch
                id="priceDropAlerts"
                checked={preferences?.priceDropAlerts ?? true}
                onCheckedChange={(checked) => handleToggle('priceDropAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="newListingAlerts">New Listing Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    When new properties match your saved searches
                  </p>
                </div>
              </div>
              <Switch
                id="newListingAlerts"
                checked={preferences?.newListingAlerts ?? true}
                onCheckedChange={(checked) => handleToggle('newListingAlerts', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Activity Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Activity Notifications
            </CardTitle>
            <CardDescription>Stay updated on your account activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="appointmentReminders">Appointment Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Reminders for upcoming property viewings
                  </p>
                </div>
              </div>
              <Switch
                id="appointmentReminders"
                checked={preferences?.appointmentReminders ?? true}
                onCheckedChange={(checked) => handleToggle('appointmentReminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="messageNotifications">Message Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    When you receive new messages from agents
                  </p>
                </div>
              </div>
              <Switch
                id="messageNotifications"
                checked={preferences?.messageNotifications ?? true}
                onCheckedChange={(checked) => handleToggle('messageNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={() => toast.success("Preferences are automatically saved")}
            variant="outline"
          >
            All changes are saved automatically
          </Button>
        </div>
      </div>
    </div>
  );
}
