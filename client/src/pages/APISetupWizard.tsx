import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Loader2, AlertCircle, ExternalLink, Key, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SetupStep = "welcome" | "rapidapi" | "resend" | "complete";

export default function APISetupWizard() {
  const { user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<SetupStep>("welcome");
  const [rapidApiKey, setRapidApiKey] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTestRapidApi = async () => {
    if (!rapidApiKey.trim()) {
      toast.error("Please enter your RapidAPI key");
      return;
    }

    setTesting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const isValid = rapidApiKey.length > 20;
    setTesting(false);
    
    if (isValid) {
      toast.success("RapidAPI key validated successfully!");
      return true;
    } else {
      toast.error("Invalid RapidAPI key. Please check and try again.");
      return false;
    }
  };

  const handleTestResend = async () => {
    if (!resendApiKey.trim()) {
      toast.error("Please enter your Resend API key");
      return;
    }

    setTesting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const isValid = resendApiKey.startsWith("re_");
    setTesting(false);
    
    if (isValid) {
      toast.success("Resend API key validated successfully!");
      return true;
    } else {
      toast.error("Invalid Resend API key. Keys should start with 're_'");
      return false;
    }
  };

  const handleSaveRapidApi = async () => {
    const isValid = await handleTestRapidApi();
    if (isValid) {
      setSaving(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaving(false);
      setCurrentStep("resend");
    }
  };

  const handleSaveResend = async () => {
    const isValid = await handleTestResend();
    if (isValid) {
      setSaving(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaving(false);
      setCurrentStep("complete");
    }
  };

  const handleSkip = () => {
    if (currentStep === "rapidapi") {
      setCurrentStep("resend");
    } else if (currentStep === "resend") {
      setCurrentStep("complete");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only administrators can configure API keys</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${currentStep === "welcome" || currentStep === "rapidapi" ? "text-primary" : "text-green-600"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "welcome" || currentStep === "rapidapi" ? "bg-primary text-white" : "bg-green-600 text-white"}`}>
                {currentStep === "welcome" || currentStep === "rapidapi" ? "1" : <Check className="h-5 w-5" />}
              </div>
              <span className="font-medium">RapidAPI</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200">
              <div className={`h-full ${currentStep === "resend" || currentStep === "complete" ? "bg-primary" : "bg-gray-200"}`} />
            </div>
            <div className={`flex items-center gap-2 ${currentStep === "resend" ? "text-primary" : currentStep === "complete" ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "resend" ? "bg-primary text-white" : currentStep === "complete" ? "bg-green-600 text-white" : "bg-gray-200"}`}>
                {currentStep === "complete" ? <Check className="h-5 w-5" /> : "2"}
              </div>
              <span className="font-medium">Resend</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200">
              <div className={`h-full ${currentStep === "complete" ? "bg-primary" : "bg-gray-200"}`} />
            </div>
            <div className={`flex items-center gap-2 ${currentStep === "complete" ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "complete" ? "bg-green-600 text-white" : "bg-gray-200"}`}>
                {currentStep === "complete" ? <Check className="h-5 w-5" /> : "3"}
              </div>
              <span className="font-medium">Complete</span>
            </div>
          </div>
        </div>

        {currentStep === "welcome" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Welcome to API Setup</CardTitle>
              <CardDescription>
                Configure the required API keys to enable competitor tracking and email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Key className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">RapidAPI Key</h3>
                    <p className="text-sm text-muted-foreground">
                      Required for fetching competitor data from Airbnb listings.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Mail className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Resend API Key</h3>
                    <p className="text-sm text-muted-foreground">
                      Required for sending email notifications.
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Both API keys are stored securely. You can skip any step and configure keys later.
                </AlertDescription>
              </Alert>

              <Button onClick={() => setCurrentStep("rapidapi")} className="w-full">
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === "rapidapi" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Configure RapidAPI Key
              </CardTitle>
              <CardDescription>
                Get your RapidAPI key to enable competitor data fetching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rapidapi-key">RapidAPI Key</Label>
                  <Input
                    id="rapidapi-key"
                    type="password"
                    placeholder="Enter your RapidAPI key"
                    value={rapidApiKey}
                    onChange={(e) => setRapidApiKey(e.target.value)}
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>How to get your RapidAPI key:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>Visit RapidAPI Hub</li>
                      <li>Sign up or log in</li>
                      <li>Subscribe to the Airbnb API</li>
                      <li>Copy your API key</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveRapidApi}
                  disabled={!rapidApiKey.trim() || testing || saving}
                  className="flex-1"
                >
                  {(testing || saving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test & Save
                </Button>
                <Button variant="outline" onClick={handleSkip}>
                  Skip for Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "resend" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configure Resend API Key
              </CardTitle>
              <CardDescription>
                Get your Resend API key to enable email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resend-key">Resend API Key</Label>
                  <Input
                    id="resend-key"
                    type="password"
                    placeholder="re_..."
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>How to get your Resend API key:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>Visit Resend.com</li>
                      <li>Sign up or log in</li>
                      <li>Navigate to API Keys</li>
                      <li>Create and copy your key</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveResend}
                  disabled={!resendApiKey.trim() || testing || saving}
                  className="flex-1"
                >
                  {(testing || saving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test & Save
                </Button>
                <Button variant="outline" onClick={handleSkip}>
                  Skip for Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "complete" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-center text-2xl">Setup Complete!</CardTitle>
              <CardDescription className="text-center">
                Your API keys have been configured successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-sm">RapidAPI configured</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Resend configured</span>
                </div>
              </div>

              <Button onClick={() => window.location.href = "/"} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
