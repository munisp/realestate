// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Bell, Check, Mail, Settings, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function RecommendationPreferences() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [digestFrequency, setDigestFrequency] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [matchScoreThreshold, setMatchScoreThreshold] = useState(70);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const { data: preferences, isLoading } = trpc.recommendationPreferences.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const updateMutation = trpc.recommendationPreferences.update.useMutation({
    onSuccess: () => {
      toast.success("Preferences saved successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to save preferences: ${error.message}`);
    },
  });

  // Load preferences when data is available
  useEffect(() => {
    if (preferences) {
      setDigestFrequency(preferences.digestFrequency);
      setMatchScoreThreshold(preferences.matchScoreThreshold);
      setEmailEnabled(preferences.emailEnabled === 1);
    }
  }, [preferences]);

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      digestFrequency,
      matchScoreThreshold,
      emailEnabled: emailEnabled ? 1 : 0,
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to manage your recommendation preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary" />
                Recommendation Preferences
              </h1>
              <p className="text-muted-foreground mt-1">
                Customize your property recommendation email digest settings
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/smart-recommendations">View Recommendations</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-3xl">
        <div className="space-y-6">
          {/* Email Digest Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Digest
              </CardTitle>
              <CardDescription>
                Receive personalized property recommendations directly in your inbox
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-enabled" className="text-base font-medium">
                    Enable Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get weekly property recommendations based on your preferences
                  </p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Digest Frequency */}
          <Card className={!emailEnabled ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Digest Frequency
              </CardTitle>
              <CardDescription>
                How often would you like to receive recommendation emails?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={digestFrequency} onValueChange={(value) => setDigestFrequency(value as any)}>
                <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly" className="flex-1 cursor-pointer">
                    <div className="font-medium">Weekly</div>
                    <div className="text-sm text-muted-foreground">Receive recommendations every week</div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="biweekly" id="biweekly" />
                  <Label htmlFor="biweekly" className="flex-1 cursor-pointer">
                    <div className="font-medium">Biweekly</div>
                    <div className="text-sm text-muted-foreground">Receive recommendations every two weeks</div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                    <div className="font-medium">Monthly</div>
                    <div className="text-sm text-muted-foreground">Receive recommendations once a month</div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Match Score Threshold */}
          <Card className={!emailEnabled ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Match Score Threshold
              </CardTitle>
              <CardDescription>
                Only show properties with a match score above this threshold
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Minimum Match Score</Label>
                  <span className="text-2xl font-bold text-primary">{matchScoreThreshold}%</span>
                </div>

                <Slider
                  value={[matchScoreThreshold]}
                  onValueChange={(value) => setMatchScoreThreshold(value[0])}
                  min={70}
                  max={90}
                  step={10}
                  className="w-full"
                />

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>70% (More results)</span>
                  <span>80% (Balanced)</span>
                  <span>90% (Best matches)</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm">
                  {matchScoreThreshold === 70 && (
                    <>
                      <strong>70% Threshold:</strong> You'll receive more property recommendations, including
                      those that partially match your preferences.
                    </>
                  )}
                  {matchScoreThreshold === 80 && (
                    <>
                      <strong>80% Threshold:</strong> You'll receive a balanced mix of properties that closely
                      match your preferences.
                    </>
                  )}
                  {matchScoreThreshold === 90 && (
                    <>
                      <strong>90% Threshold:</strong> You'll only receive properties that are excellent matches
                      for your preferences.
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4">
            <Button asChild variant="outline">
              <Link href="/smart-recommendations">Cancel</Link>
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="min-w-[120px]"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>

          {/* Info Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">How it works</p>
                  <p className="text-sm text-muted-foreground">
                    Based on your saved searches, favorites, and feedback, our AI analyzes new property
                    listings and sends you the top matches according to your preferences. You can adjust
                    these settings anytime.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
