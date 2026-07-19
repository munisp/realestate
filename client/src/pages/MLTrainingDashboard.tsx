import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Brain, TrendingUp, Database, Activity, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function MLTrainingDashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [isTraining, setIsTraining] = useState(false);

  const { data: trainingHistory, isLoading, refetch } = trpc.mlTraining.getTrainingHistory.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: dataQuality } = trpc.mlTraining.getDataQuality.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const trainModelMutation = trpc.mlTraining.trainModel.useMutation({
    onSuccess: (result) => {
      toast.success(`Model training completed! Accuracy: ${(result.metrics.accuracy * 100).toFixed(2)}%`);
      setIsTraining(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Training failed: ${error.message}`);
      setIsTraining(false);
    },
  });

  const handleTrainModel = async () => {
    setIsTraining(true);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    await trainModelMutation.mutateAsync({
      modelType: "hybrid",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      hyperparameters: {
        learningRate: 0.001,
        epochs: 10,
        batchSize: 32,
        embeddingDim: 64,
      },
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
            <CardDescription>Please log in to access ML training dashboard</CardDescription>
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
                <Brain className="h-8 w-8 text-primary" />
                ML Training Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Train and monitor recommendation models using lakehouse data
              </p>
            </div>
            <Button onClick={handleTrainModel} disabled={isTraining}>
              {isTraining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Training...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Train New Model
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Data Quality Metrics */}
        {dataQuality && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Lakehouse Data Quality
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Bronze Layer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Events</span>
                      <span className="font-semibold">{dataQuality.bronze.totalEvents.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Events Today</span>
                      <span className="font-semibold">{dataQuality.bronze.eventsToday.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Quality Score</span>
                      <Badge variant="default">{dataQuality.bronze.quality}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Silver Layer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Records</span>
                      <span className="font-semibold">{dataQuality.silver.totalRecords.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Validation Rate</span>
                      <span className="font-semibold">{dataQuality.silver.validationRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Quality Score</span>
                      <Badge variant="default">{dataQuality.silver.quality}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Gold Layer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Aggregates</span>
                      <span className="font-semibold">{dataQuality.gold.totalAggregates}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Freshness Score</span>
                      <span className="font-semibold">{dataQuality.gold.freshnessScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Quality Score</span>
                      <Badge variant="default">{dataQuality.gold.quality}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {dataQuality.issues.length > 0 && (
              <Card className="mt-4 border-yellow-200 bg-yellow-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    Data Quality Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dataQuality.issues.map((issue, index) => (
                      <div key={index} className="text-sm">
                        <Badge variant="outline" className="mr-2">{issue.layer}</Badge>
                        <span className="font-medium">{issue.table}:</span> {issue.issue}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Training History */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Training History
          </h2>

          {!trainingHistory || trainingHistory.models.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No models trained yet</h3>
                <p className="text-muted-foreground mb-4">
                  Train your first recommendation model using lakehouse data
                </p>
                <Button onClick={handleTrainModel} disabled={isTraining}>
                  <Play className="h-4 w-4 mr-2" />
                  Train Model
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {trainingHistory.models.map((model, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-3">
                          {model.modelId}
                          <Badge variant={model.status === "deployed" ? "default" : "secondary"}>
                            {model.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Version {model.modelVersion} • Trained {new Date(model.trainedAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {model.status === "deployed" && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Accuracy</div>
                        <div className="text-lg font-semibold">{(model.metrics.accuracy * 100).toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Precision</div>
                        <div className="text-lg font-semibold">{(model.metrics.precision * 100).toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Recall</div>
                        <div className="text-lg font-semibold">{(model.metrics.recall * 100).toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">F1 Score</div>
                        <div className="text-lg font-semibold">{(model.metrics.f1Score * 100).toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Sample Size</div>
                        <div className="text-lg font-semibold">{model.sampleSize.toLocaleString()}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="bg-muted/50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Total Training Runs: {trainingHistory.totalTrainingRuns}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Last trained: {new Date(trainingHistory.lastTrainingDate).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
