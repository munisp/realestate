import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, AlertCircle, Loader2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type RegistryState = "LAGOS" | "FCT" | "RIVERS" | "KANO" | "OYO";

interface CredentialField {
  name: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
  placeholder: string;
  helpText?: string;
}

const REGISTRY_CONFIGS: Record<RegistryState, {
  name: string;
  authType: string;
  fields: CredentialField[];
  setupGuideUrl: string;
}> = {
  LAGOS: {
    name: "Lagos State Land Bureau",
    authType: "OAuth 2.0",
    fields: [
      { name: "baseUrl", label: "Base URL", type: "url", required: true, placeholder: "https://api.lagoslandbureau.gov.ng/v1" },
      { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "your_client_id" },
      { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "your_client_secret" },
      { name: "apiKey", label: "API Key", type: "password", required: true, placeholder: "your_api_key" }
    ],
    setupGuideUrl: "https://lagoslandbureau.gov.ng/api-docs"
  },
  FCT: {
    name: "FCT Abuja Land Registry",
    authType: "API Key",
    fields: [
      { name: "baseUrl", label: "Base URL", type: "url", required: true, placeholder: "https://api.fct.gov.ng/land-registry/v1" },
      { name: "apiKey", label: "API Key", type: "password", required: true, placeholder: "your_api_key" },
      { name: "orgId", label: "Organization ID", type: "text", required: true, placeholder: "your_org_id" }
    ],
    setupGuideUrl: "https://fct.gov.ng/land-registry/api"
  },
  RIVERS: {
    name: "Rivers State Land Registry",
    authType: "Basic Auth + API Key",
    fields: [
      { name: "baseUrl", label: "Base URL", type: "url", required: true, placeholder: "https://api.riversstate.gov.ng/lands/v1" },
      { name: "username", label: "Username", type: "text", required: true, placeholder: "your_username" },
      { name: "password", label: "Password", type: "password", required: true, placeholder: "your_password" },
      { name: "apiKey", label: "API Key", type: "password", required: true, placeholder: "your_api_key" }
    ],
    setupGuideUrl: "https://riversstate.gov.ng/lands/api-access"
  },
  KANO: {
    name: "Kano State Land Bureau",
    authType: "JWT",
    fields: [
      { name: "baseUrl", label: "Base URL", type: "url", required: true, placeholder: "https://api.kanostate.gov.ng/land-bureau/v1" },
      { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "your_client_id" },
      { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "your_client_secret" }
    ],
    setupGuideUrl: "https://kanostate.gov.ng/land-bureau/developers"
  },
  OYO: {
    name: "Oyo State Land Registry",
    authType: "OAuth 2.0",
    fields: [
      { name: "baseUrl", label: "Base URL", type: "url", required: true, placeholder: "https://api.oyostate.gov.ng/lands/api/v1" },
      { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "your_client_id" },
      { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "your_client_secret" },
      { name: "redirectUri", label: "Redirect URI", type: "url", required: true, placeholder: "https://yourdomain.com/oauth/callback" }
    ],
    setupGuideUrl: "https://oyostate.gov.ng/lands/api-portal"
  }
};

export default function RegistryCredentialsSetup() {
  const [activeTab, setActiveTab] = useState<RegistryState>("LAGOS");
  const [credentials, setCredentials] = useState<Record<string, Record<string, string>>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testingState, setTestingState] = useState<RegistryState | null>(null);

  const healthQuery = trpc.cofOVerification.getRegistryHealth.useQuery();
  const testConnectionMutation = trpc.cofOVerification.testRegistryConnection.useMutation();
  const saveCredentialsMutation = trpc.cofOVerification.saveRegistryCredentials.useMutation();

  const handleFieldChange = (state: RegistryState, fieldName: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [state]: {
        ...(prev[state] || {}),
        [fieldName]: value
      }
    }));
  };

  const togglePasswordVisibility = (fieldKey: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const handleTestConnection = async (state: RegistryState) => {
    const stateCredentials = credentials[state];
    if (!stateCredentials) {
      toast.error("Please fill in all required fields");
      return;
    }

    const config = REGISTRY_CONFIGS[state];
    const missingFields = config.fields
      .filter(f => f.required && !stateCredentials[f.name])
      .map(f => f.label);

    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(", ")}`);
      return;
    }

    setTestingState(state);
    try {
      const result = await testConnectionMutation.mutateAsync({
        state,
        credentials: stateCredentials
      });

      if (result.success) {
        toast.success(`✅ ${config.name} connection successful!`);
      } else {
        toast.error(`❌ Connection failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setTestingState(null);
    }
  };

  const handleSaveCredentials = async (state: RegistryState) => {
    const stateCredentials = credentials[state];
    if (!stateCredentials) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await saveCredentialsMutation.mutateAsync({
        state,
        credentials: stateCredentials
      });
      toast.success(`✅ Credentials saved for ${REGISTRY_CONFIGS[state].name}`);
      healthQuery.refetch();
    } catch (error) {
      toast.error(`Failed to save credentials: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const getRegistryStatus = (state: RegistryState) => {
    const health = healthQuery.data?.find(h => h.state === state);
    if (!health) return { status: "unknown", color: "gray" };
    
    if (health.isOnline) return { status: "online", color: "green" };
    if (health.error?.includes("credentials")) return { status: "not_configured", color: "yellow" };
    return { status: "offline", color: "red" };
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Registry API Credentials Setup</h1>
        <p className="text-muted-foreground">
          Configure API credentials for Nigerian state land registries to enable real-time C of O verification.
        </p>
      </div>

      {/* Overall Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Registry Connection Status</CardTitle>
          <CardDescription>Current status of all state registry connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {(Object.keys(REGISTRY_CONFIGS) as RegistryState[]).map(state => {
              const status = getRegistryStatus(state);
              return (
                <div key={state} className="flex items-center gap-2">
                  {status.status === "online" && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {status.status === "offline" && <XCircle className="h-5 w-5 text-red-600" />}
                  {status.status === "not_configured" && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                  {status.status === "unknown" && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
                  <div>
                    <div className="font-medium text-sm">{state}</div>
                    <Badge variant={status.status === "online" ? "default" : "secondary"} className="text-xs">
                      {status.status === "online" && "Online"}
                      {status.status === "offline" && "Offline"}
                      {status.status === "not_configured" && "Not Configured"}
                      {status.status === "unknown" && "Unknown"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RegistryState)}>
        <TabsList className="grid grid-cols-5 w-full">
          {(Object.keys(REGISTRY_CONFIGS) as RegistryState[]).map(state => (
            <TabsTrigger key={state} value={state}>
              {state}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(REGISTRY_CONFIGS) as RegistryState[]).map(state => {
          const config = REGISTRY_CONFIGS[state];
          const status = getRegistryStatus(state);

          return (
            <TabsContent key={state} value={state}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{config.name}</CardTitle>
                      <CardDescription>Authentication: {config.authType}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={config.setupGuideUrl} target="_blank" rel="noopener noreferrer">
                        Setup Guide <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Status Alert */}
                  {status.status === "not_configured" && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        API credentials not configured. Please fill in the form below and test the connection.
                      </AlertDescription>
                    </Alert>
                  )}

                  {status.status === "online" && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Registry is online and ready for verification requests.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Credential Fields */}
                  <div className="space-y-4">
                    {config.fields.map(field => {
                      const fieldKey = `${state}_${field.name}`;
                      const isPassword = field.type === "password";
                      const showPassword = showPasswords[fieldKey];

                      return (
                        <div key={field.name} className="space-y-2">
                          <Label htmlFor={fieldKey}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <div className="relative">
                            <Input
                              id={fieldKey}
                              type={isPassword && !showPassword ? "password" : "text"}
                              placeholder={field.placeholder}
                              value={credentials[state]?.[field.name] || ""}
                              onChange={(e) => handleFieldChange(state, field.name, e.target.value)}
                              className="pr-10"
                            />
                            {isPassword && (
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(fieldKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                          {field.helpText && (
                            <p className="text-sm text-muted-foreground">{field.helpText}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => handleTestConnection(state)}
                      disabled={testingState === state}
                      variant="outline"
                    >
                      {testingState === state ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test Connection"
                      )}
                    </Button>
                    <Button
                      onClick={() => handleSaveCredentials(state)}
                      disabled={saveCredentialsMutation.isPending}
                    >
                      {saveCredentialsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Credentials"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Security Notice */}
      <Alert className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> All credentials are encrypted and stored securely in environment variables. 
          They are never exposed in logs or API responses. Rotate credentials every 90 days for security best practices.
        </AlertDescription>
      </Alert>
    </div>
  );
}
