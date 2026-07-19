import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bell,
  Mail,
  MessageSquare,
  FileText,
  Home,
  TrendingUp,
  AlertCircle,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export default function EmailPreferenceCenter() {
  const utils = trpc.useUtils();

  // Fetch preferences
  const { data: preferences, isLoading } = trpc.emailPreferences.getMyPreferences.useQuery();

  // Update preferences mutation
  const updatePreferences = trpc.emailPreferences.updateMyPreferences.useMutation({
    onSuccess: () => {
      toast.success("Preferences updated successfully");
      utils.emailPreferences.getMyPreferences.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update preferences: ${error.message}`);
    },
  });

  // Unsubscribe all mutation
  const unsubscribeAll = trpc.emailPreferences.unsubscribeAll.useMutation({
    onSuccess: () => {
      toast.success("Unsubscribed from all notifications");
      utils.emailPreferences.getMyPreferences.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to unsubscribe: ${error.message}`);
    },
  });

  // Local state for form
  const [formData, setFormData] = useState({
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    escrowUpdates: true,
    documentSigning: true,
    propertyAlerts: true,
    messageNotifications: true,
    marketingEmails: false,
  });

  // Update form when preferences load
  useEffect(() => {
    if (preferences) {
      setFormData({
        emailEnabled: preferences.emailEnabled,
        smsEnabled: preferences.smsEnabled,
        pushEnabled: preferences.pushEnabled,
        escrowUpdates: preferences.escrowUpdates,
        documentSigning: preferences.documentSigning,
        propertyAlerts: preferences.propertyAlerts,
        messageNotifications: preferences.messageNotifications,
        marketingEmails: preferences.marketingEmails,
      });
    }
  }, [preferences]);

  const handleToggle = (key: keyof typeof formData) => {
    setFormData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    updatePreferences.mutate(formData);
  };

  const handleUnsubscribeAll = () => {
    if (
      confirm(
        "Are you sure you want to unsubscribe from all notifications? You can re-enable them later."
      )
    ) {
      unsubscribeAll.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading preferences...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Email Preference Center</h1>
        <p className="text-muted-foreground mt-1">
          Manage your notification preferences and control what emails you receive
        </p>
      </div>

      {/* Global Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Global Notification Settings</CardTitle>
          <CardDescription>
            Control which channels you want to receive notifications through
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="emailEnabled" className="text-base font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              id="emailEnabled"
              checked={formData.emailEnabled}
              onCheckedChange={() => handleToggle("emailEnabled")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <Label htmlFor="smsEnabled" className="text-base font-medium">
                  SMS Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via text message
                </p>
              </div>
            </div>
            <Switch
              id="smsEnabled"
              checked={formData.smsEnabled}
              onCheckedChange={() => handleToggle("smsEnabled")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Bell className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <Label htmlFor="pushEnabled" className="text-base font-medium">
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive in-app and browser notifications
                </p>
              </div>
            </div>
            <Switch
              id="pushEnabled"
              checked={formData.pushEnabled}
              onCheckedChange={() => handleToggle("pushEnabled")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Preferences */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Email Categories</CardTitle>
          <CardDescription>
            Choose which types of emails you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <Label htmlFor="escrowUpdates" className="text-base font-medium">
                  Escrow Updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Important updates about your escrow transactions
                </p>
              </div>
            </div>
            <Switch
              id="escrowUpdates"
              checked={formData.escrowUpdates}
              onCheckedChange={() => handleToggle("escrowUpdates")}
              disabled={!formData.emailEnabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <Label htmlFor="documentSigning" className="text-base font-medium">
                  Document Signing
                </Label>
                <p className="text-sm text-muted-foreground">
                  Notifications when documents need your signature
                </p>
              </div>
            </div>
            <Switch
              id="documentSigning"
              checked={formData.documentSigning}
              onCheckedChange={() => handleToggle("documentSigning")}
              disabled={!formData.emailEnabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Home className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <Label htmlFor="propertyAlerts" className="text-base font-medium">
                  Property Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  New properties matching your saved searches
                </p>
              </div>
            </div>
            <Switch
              id="propertyAlerts"
              checked={formData.propertyAlerts}
              onCheckedChange={() => handleToggle("propertyAlerts")}
              disabled={!formData.emailEnabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <Label htmlFor="messageNotifications" className="text-base font-medium">
                  Message Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  New messages from agents and other users
                </p>
              </div>
            </div>
            <Switch
              id="messageNotifications"
              checked={formData.messageNotifications}
              onCheckedChange={() => handleToggle("messageNotifications")}
              disabled={!formData.emailEnabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <Label htmlFor="marketingEmails" className="text-base font-medium">
                  Marketing Emails
                </Label>
                <p className="text-sm text-muted-foreground">
                  Tips, news, and promotional content
                </p>
              </div>
            </div>
            <Switch
              id="marketingEmails"
              checked={formData.marketingEmails}
              onCheckedChange={() => handleToggle("marketingEmails")}
              disabled={!formData.emailEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Warning Alert */}
      {!formData.emailEnabled && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Email notifications are currently disabled. You will not receive any emails until you
            enable them.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="destructive" onClick={handleUnsubscribeAll}>
          Unsubscribe from All
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (preferences) {
                setFormData({
                  emailEnabled: preferences.emailEnabled,
                  smsEnabled: preferences.smsEnabled,
                  pushEnabled: preferences.pushEnabled,
                  escrowUpdates: preferences.escrowUpdates,
                  documentSigning: preferences.documentSigning,
                  propertyAlerts: preferences.propertyAlerts,
                  messageNotifications: preferences.messageNotifications,
                  marketingEmails: preferences.marketingEmails,
                });
                toast.info("Changes discarded");
              }
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updatePreferences.isPending}>
            <Check className="w-4 h-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="mt-6 bg-muted">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">About Your Preferences</p>
              <p>
                Your preferences are saved automatically and will take effect immediately. You can
                change these settings at any time. Some transactional emails (like password resets)
                cannot be disabled for security reasons.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
