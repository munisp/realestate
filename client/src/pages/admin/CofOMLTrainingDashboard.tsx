import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  Brain,
  Database,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  RefreshCw,
  BarChart3,
  LineChart,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function CofOMLTrainingDashboard() {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);

  const trainingStatsQuery = trpc.cofOVerification.getMLTrainingStats.useQuery();
  const triggerTrainingMutation = trpc.cofOVerification.triggerMLTraining.useMutation();

  const handleTriggerTraining = async () => {
    setIsTraining(true);
    setTrainingProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const result = await triggerTrainingMutation.mutateAsync({
        includeRecentDays: 90,
        minConfidence: 0.7,
      });

      clearInterval(progressInterval);
      setTrainingProgress(100);

      toast.success(`✅ Training completed! Accuracy: ${(result.metrics.accuracy * 100).toFixed(2)}%`);
      
      setTimeout(() => {
        setIsTraining(false);
        setTrainingProgress(0);
        trainingStatsQuery.refetch();
      }, 2000);
    } catch (error) {
      clearInterval(progressInterval);
      setIsTraining(false);
      setTrainingProgress(0);
      toast.error(`Training failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const stats = trainingStatsQuery.data;

  // Mock data for charts (in real implementation, this would come from the API)
  const performanceHistory = [
    { date: "Week 1", accuracy: 0.72, f1Score: 0.68, datasetSize: 250 },
    { date: "Week 2", accuracy: 0.75, f1Score: 0.71, datasetSize: 320 },
    { date: "Week 3", accuracy: 0.78, f1Score: 0.74, datasetSize: 410 },
    { date: "Week 4", accuracy: 0.82, f1Score: 0.79, datasetSize: 520 },
    { date: "Week 5", accuracy: 0.85, f1Score: 0.82, datasetSize: 650 },
    { date: "Current", accuracy: 0.87, f1Score: 0.84, datasetSize: 780 },
  ];

  const labelDistribution = [
    { name: "Genuine", value: 520, color: "#10B981" },
    { name: "Fraudulent", value: 180, color: "#EF4444" },
    { name: "Suspicious", value: 80, color: "#F59E0B" },
  ];

  const featureImportance = [
    { feature: "Registry Match Score", importance: 0.28 },
    { feature: "Geospatial Score", importance: 0.22 },
    { feature: "Certificate Age", importance: 0.15 },
    { feature: "Authority Known", importance: 0.12 },
    { feature: "Coordinate Distance", importance: 0.10 },
    { feature: "Boundary Overlap", importance: 0.08 },
    { feature: "Holder Name Length", importance: 0.05 },
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ML Training Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and improve fraud detection model performance through continuous learning
        </p>
      </div>

      {/* Training Status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Model Training Status
              </CardTitle>
              <CardDescription>Current model performance and training controls</CardDescription>
            </div>
            <Button
              onClick={handleTriggerTraining}
              disabled={isTraining || triggerTrainingMutation.isPending}
            >
              {isTraining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Training...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Training
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isTraining && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Training Progress</span>
                <span className="text-sm text-muted-foreground">{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} className="h-2" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">87%</div>
              <p className="text-sm text-muted-foreground mt-1">Current Accuracy</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">0.84</div>
              <p className="text-sm text-muted-foreground mt-1">F1 Score</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">780</div>
              <p className="text-sm text-muted-foreground mt-1">Training Samples</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">v20250122</div>
              <p className="text-sm text-muted-foreground mt-1">Model Version</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="data">Training Data</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Performance Trend
                </CardTitle>
                <CardDescription>Model accuracy and F1 score over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={performanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 1]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="Accuracy"
                    />
                    <Line
                      type="monotone"
                      dataKey="f1Score"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name="F1 Score"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Confusion Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Confusion Matrix</CardTitle>
                <CardDescription>Model prediction accuracy breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="text-3xl font-bold text-green-700">442</div>
                    <p className="text-sm text-green-600 mt-1">True Positives</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Correctly identified fraud
                    </p>
                  </div>
                  <div className="p-6 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="text-3xl font-bold text-green-700">458</div>
                    <p className="text-sm text-green-600 mt-1">True Negatives</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Correctly identified genuine
                    </p>
                  </div>
                  <div className="p-6 bg-red-50 rounded-lg border-2 border-red-200">
                    <div className="text-3xl font-bold text-red-700">62</div>
                    <p className="text-sm text-red-600 mt-1">False Positives</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Genuine marked as fraud
                    </p>
                  </div>
                  <div className="p-6 bg-red-50 rounded-lg border-2 border-red-200">
                    <div className="text-3xl font-bold text-red-700">27</div>
                    <p className="text-sm text-red-600 mt-1">False Negatives</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fraud marked as genuine
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="data">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Label Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Label Distribution</CardTitle>
                <CardDescription>Training data composition by label</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={labelDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {labelDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-4 space-y-2">
                  {labelDistribution.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value} samples</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dataset Growth */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Dataset Growth
                </CardTitle>
                <CardDescription>Training data accumulation over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={performanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="datasetSize" fill="#8B5CF6" name="Dataset Size" />
                  </RechartsBarChart>
                </ResponsiveContainer>

                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Auto-retraining threshold:</strong> Model will automatically retrain
                    after 100 new verified cases are collected.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Feature Importance
              </CardTitle>
              <CardDescription>
                Impact of each feature on fraud detection accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RechartsBarChart data={featureImportance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 0.3]} />
                  <YAxis dataKey="feature" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="importance" fill="#3B82F6" />
                </RechartsBarChart>
              </ResponsiveContainer>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2">Feature Engineering Insights</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Registry Match Score</strong> is the most predictive feature,
                      contributing 28% to model decisions
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Geospatial validation</strong> adds significant value (22%),
                      especially for land boundary fraud
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Certificate age</strong> helps detect backdated or future-dated
                      documents
                    </span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Training History</CardTitle>
              <CardDescription>Recent model training runs and experiments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    runId: "run_20250122_abc123",
                    date: "2025-01-22 14:30",
                    accuracy: 0.87,
                    f1: 0.84,
                    samples: 780,
                    status: "completed",
                  },
                  {
                    runId: "run_20250115_def456",
                    date: "2025-01-15 09:15",
                    accuracy: 0.85,
                    f1: 0.82,
                    samples: 650,
                    status: "completed",
                  },
                  {
                    runId: "run_20250108_ghi789",
                    date: "2025-01-08 16:45",
                    accuracy: 0.82,
                    f1: 0.79,
                    samples: 520,
                    status: "completed",
                  },
                ].map((run) => (
                  <div
                    key={run.runId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono">{run.runId}</code>
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {run.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{run.date}</p>
                    </div>
                    <div className="flex gap-6 text-center">
                      <div>
                        <div className="text-lg font-semibold">{(run.accuracy * 100).toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Accuracy</p>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{run.f1.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">F1 Score</p>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{run.samples}</div>
                        <p className="text-xs text-muted-foreground">Samples</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
