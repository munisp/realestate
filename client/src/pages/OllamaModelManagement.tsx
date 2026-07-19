import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Activity, Brain, Database, Download, Play, RefreshCw, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

/**
 * Ollama Model Management Dashboard
 * 
 * Admin interface for:
 * - Viewing and managing Ollama models
 * - Triggering model fine-tuning
 * - Monitoring conversation analytics
 * - Viewing model performance metrics
 */
export default function OllamaModelManagement() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [newModelName, setNewModelName] = useState("");
  const [finetuneConfig, setFinetuneConfig] = useState({
    baseModel: "llama2",
    outputModelName: "",
    dataSource: "lakehouse" as "lakehouse" | "json",
    maxExamples: 1000,
  });

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      toast.error("Access denied. Admin privileges required.");
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  // Queries
  const { data: healthData, refetch: refetchHealth } = trpc.ollamaModelManagement.healthCheck.useQuery();
  const { data: modelsData, refetch: refetchModels } = trpc.ollamaModelManagement.listModels.useQuery();
  const { data: analyticsData } = trpc.ollamaModelManagement.getConversationSummary.useQuery();

  // Mutations
  const pullModelMutation = trpc.ollamaModelManagement.pullModel.useMutation({
    onSuccess: () => {
      toast.success("Model download started");
      setNewModelName("");
      refetchModels();
    },
    onError: (error) => {
      toast.error(`Failed to pull model: ${error.message}`);
    },
  });

  const triggerFineTuningMutation = trpc.ollamaModelManagement.triggerFineTuning.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setFinetuneConfig(prev => ({ ...prev, outputModelName: "" }));
    },
    onError: (error) => {
      toast.error(`Failed to start fine-tuning: ${error.message}`);
    },
  });

  const handlePullModel = () => {
    if (!newModelName.trim()) {
      toast.error("Please enter a model name");
      return;
    }
    pullModelMutation.mutate({ modelName: newModelName });
  };

  const handleTriggerFineTuning = () => {
    if (!finetuneConfig.outputModelName.trim()) {
      toast.error("Please enter an output model name");
      return;
    }
    triggerFineTuningMutation.mutate(finetuneConfig);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const isHealthy = healthData?.status === 'healthy';
  const ollamaStatus = healthData?.ollama || 'unknown';

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ollama Model Management</h1>
        <p className="text-muted-foreground">
          Manage AI models, trigger fine-tuning, and monitor performance
        </p>
      </div>

      {/* Health Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Service Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Overall Status</Label>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`h-3 w-3 rounded-full ${
                    isHealthy ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="font-medium">{healthData?.status || "Unknown"}</span>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Ollama</Label>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`h-3 w-3 rounded-full ${
                    ollamaStatus === "running" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="font-medium">{ollamaStatus}</span>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Current Model</Label>
              <p className="font-medium mt-1">{healthData?.model || "N/A"}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => refetchHealth()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="models" className="space-y-6">
        <TabsList>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="finetune">Fine-Tuning</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Installed Models
              </CardTitle>
              <CardDescription>
                Manage Ollama models available for inference
              </CardDescription>
            </CardHeader>
            <CardContent>
              {modelsData?.success ? (
                <div className="space-y-4">
                  {modelsData.models.length > 0 ? (
                    <div className="space-y-2">
                      {modelsData.models.map((model: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{model.name || `Model ${index + 1}`}</p>
                            <p className="text-sm text-muted-foreground">
                              {model.size ? `Size: ${model.size}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No models installed</p>
                  )}
                </div>
              ) : (
                <p className="text-destructive">
                  {modelsData?.error || "Failed to load models"}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download New Model
              </CardTitle>
              <CardDescription>
                Pull a new model from Ollama library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Model name (e.g., llama2, mistral, codellama)"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                />
                <Button
                  onClick={handlePullModel}
                  disabled={pullModelMutation.isPending}
                >
                  {pullModelMutation.isPending ? "Downloading..." : "Download"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Popular models: llama2, mistral, codellama, llava, phi
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fine-Tuning Tab */}
        <TabsContent value="finetune" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Trigger Model Fine-Tuning
              </CardTitle>
              <CardDescription>
                Fine-tune models using conversation data from lakehouse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Base Model</Label>
                <Input
                  value={finetuneConfig.baseModel}
                  onChange={(e) =>
                    setFinetuneConfig({ ...finetuneConfig, baseModel: e.target.value })
                  }
                  placeholder="llama2"
                />
              </div>

              <div>
                <Label>Output Model Name</Label>
                <Input
                  value={finetuneConfig.outputModelName}
                  onChange={(e) =>
                    setFinetuneConfig({ ...finetuneConfig, outputModelName: e.target.value })
                  }
                  placeholder="realestate-assistant-v1"
                />
              </div>

              <div>
                <Label>Data Source</Label>
                <Select
                  value={finetuneConfig.dataSource}
                  onValueChange={(value: "lakehouse" | "json") =>
                    setFinetuneConfig({ ...finetuneConfig, dataSource: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lakehouse">Lakehouse (Gold Layer)</SelectItem>
                    <SelectItem value="json">Local JSON File</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Max Training Examples</Label>
                <Input
                  type="number"
                  value={finetuneConfig.maxExamples}
                  onChange={(e) =>
                    setFinetuneConfig({
                      ...finetuneConfig,
                      maxExamples: parseInt(e.target.value) || 1000,
                    })
                  }
                />
              </div>

              <Button
                onClick={handleTriggerFineTuning}
                disabled={triggerFineTuningMutation.isPending}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {triggerFineTuningMutation.isPending
                  ? "Starting..."
                  : "Start Fine-Tuning"}
              </Button>

              <p className="text-sm text-muted-foreground">
                Note: Fine-tuning requires lakehouse infrastructure to be running. Estimated
                time: 10-30 minutes depending on dataset size.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {analyticsData?.total_conversations || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {analyticsData?.avg_response_time_ms
                    ? `${analyticsData.avg_response_time_ms.toFixed(0)}ms`
                    : "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Avg Response Length</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {analyticsData?.avg_response_length
                    ? `${analyticsData.avg_response_length.toFixed(0)} chars`
                    : "N/A"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData?.success ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">User Satisfaction</Label>
                    <p className="text-lg font-medium">
                      {analyticsData.user_satisfaction
                        ? `${(analyticsData.user_satisfaction * 100).toFixed(1)}%`
                        : "No data"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Most Used Contexts</Label>
                    <div className="mt-2 space-y-1">
                      {analyticsData.most_used_contexts?.length > 0 ? (
                        analyticsData.most_used_contexts.map((ctx: string, i: number) => (
                          <p key={i} className="text-sm">
                            • {ctx}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No data</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Analytics available when lakehouse is running
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
