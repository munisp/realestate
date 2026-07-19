// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  Trash2, 
  TrendingUp, 
  Mail, 
  Users, 
  MousePointerClick,
  CheckCircle2,
  AlertCircle,
  BarChart3
} from "lucide-react";

export default function EmailAbTesting() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch tests for selected campaign
  const { data: tests, isLoading: testsLoading } = trpc.emailAbTesting.getForCampaign.useQuery(
    { campaignId: selectedCampaignId! },
    { enabled: !!selectedCampaignId }
  );

  // Fetch test details
  const { data: testDetails } = trpc.emailAbTesting.getDetails.useQuery(
    { testId: selectedTestId! },
    { enabled: !!selectedTestId }
  );

  // Mutations
  const createTest = trpc.emailAbTesting.create.useMutation({
    onSuccess: () => {
      toast.success("A/B test created successfully");
      setShowCreateDialog(false);
      utils.emailAbTesting.getForCampaign.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create test: ${error.message}`);
    },
  });

  const startTest = trpc.emailAbTesting.start.useMutation({
    onSuccess: () => {
      toast.success("A/B test started");
      utils.emailAbTesting.getForCampaign.invalidate();
      utils.emailAbTesting.getDetails.invalidate();
    },
  });

  const pauseTest = trpc.emailAbTesting.pause.useMutation({
    onSuccess: () => {
      toast.success("A/B test paused");
      utils.emailAbTesting.getForCampaign.invalidate();
      utils.emailAbTesting.getDetails.invalidate();
    },
  });

  const analyzeTest = trpc.emailAbTesting.analyze.useMutation({
    onSuccess: (data) => {
      if (data.isSignificant) {
        toast.success(`Winner: Variant ${data.winnerVariant} (+${data.improvementPercentage}%)`);
      } else {
        toast.info("No significant difference detected yet");
      }
      utils.emailAbTesting.getDetails.invalidate();
    },
  });

  const deleteTest = trpc.emailAbTesting.delete.useMutation({
    onSuccess: () => {
      toast.success("A/B test deleted");
      utils.emailAbTesting.getForCampaign.invalidate();
      setSelectedTestId(null);
    },
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Email A/B Testing</h1>
          <p className="text-muted-foreground mt-2">
            Test different email variations to optimize engagement
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <BarChart3 className="mr-2 h-4 w-4" />
              Create A/B Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <CreateTestForm
              onSubmit={(data) => createTest.mutate(data)}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Label>Select Campaign</Label>
        <Input
          type="number"
          placeholder="Enter campaign ID"
          onChange={(e) => setSelectedCampaignId(Number(e.target.value) || null)}
          className="max-w-xs"
        />
      </div>

      {testsLoading && <div>Loading tests...</div>}

      {tests && tests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No A/B tests found for this campaign</p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              Create Your First Test
            </Button>
          </CardContent>
        </Card>
      )}

      {tests && tests.length > 0 && (
        <div className="grid gap-6">
          {tests.map((test) => (
            <Card key={test.id} className="cursor-pointer hover:border-primary" onClick={() => setSelectedTestId(test.id)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{test.name}</CardTitle>
                    <CardDescription>{test.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={test.status === "running" ? "default" : "secondary"}>
                      {test.status}
                    </Badge>
                    {test.winnerVariant && (
                      <Badge variant="outline">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Winner: {test.winnerVariant}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Test Type</p>
                    <p className="font-medium capitalize">{test.testType.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Traffic Split</p>
                    <p className="font-medium">{test.trafficSplit}% / {100 - test.trafficSplit}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Winner Metric</p>
                    <p className="font-medium capitalize">{test.winnerMetric.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Confidence Level</p>
                    <p className="font-medium">{test.confidenceLevel}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedTestId && testDetails && (
        <Dialog open={!!selectedTestId} onOpenChange={() => setSelectedTestId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{testDetails.test.name}</DialogTitle>
              <DialogDescription>{testDetails.test.description}</DialogDescription>
            </DialogHeader>

            <div className="flex gap-2 mb-4">
              {testDetails.test.status === "draft" && (
                <Button onClick={() => startTest.mutate({ testId: selectedTestId })}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Test
                </Button>
              )}
              {testDetails.test.status === "running" && (
                <>
                  <Button onClick={() => pauseTest.mutate({ testId: selectedTestId })}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause Test
                  </Button>
                  <Button onClick={() => analyzeTest.mutate({ testId: selectedTestId })}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Analyze Results
                  </Button>
                </>
              )}
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this test?")) {
                    deleteTest.mutate({ testId: selectedTestId });
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>

            <Tabs defaultValue="variants">
              <TabsList>
                <TabsTrigger value="variants">Variants</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
              </TabsList>

              <TabsContent value="variants" className="space-y-4">
                {testDetails.variants.map((variant) => (
                  <Card key={variant.id}>
                    <CardHeader>
                      <CardTitle>Variant {variant.variant}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {variant.subjectLine && (
                        <div>
                          <Label>Subject Line</Label>
                          <p className="text-sm">{variant.subjectLine}</p>
                        </div>
                      )}
                      {variant.fromName && (
                        <div>
                          <Label>From Name</Label>
                          <p className="text-sm">{variant.fromName}</p>
                        </div>
                      )}
                      {variant.sendTime && (
                        <div>
                          <Label>Send Time</Label>
                          <p className="text-sm">{variant.sendTime}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                        <MetricCard
                          icon={<Mail className="h-4 w-4" />}
                          label="Sent"
                          value={variant.sentCount}
                        />
                        <MetricCard
                          icon={<CheckCircle2 className="h-4 w-4" />}
                          label="Delivered"
                          value={variant.deliveredCount}
                          percentage={variant.deliveryRate / 100}
                        />
                        <MetricCard
                          icon={<Users className="h-4 w-4" />}
                          label="Opened"
                          value={variant.openedCount}
                          percentage={variant.openRate / 100}
                        />
                        <MetricCard
                          icon={<MousePointerClick className="h-4 w-4" />}
                          label="Clicked"
                          value={variant.clickedCount}
                          percentage={variant.clickRate / 100}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="results">
                {testDetails.results ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Statistical Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>P-Value</Label>
                          <p className="text-2xl font-bold">{testDetails.results.pValue}</p>
                        </div>
                        <div>
                          <Label>Confidence Interval</Label>
                          <p className="text-sm">{testDetails.results.confidenceInterval}</p>
                        </div>
                      </div>

                      {testDetails.results.isSignificant ? (
                        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <h3 className="font-semibold text-green-900 dark:text-green-100">
                              Statistically Significant Result
                            </h3>
                          </div>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            Variant {testDetails.results.winnerVariant} is the winner with{" "}
                            {testDetails.results.improvementPercentage / 100}% improvement
                          </p>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                              Not Statistically Significant
                            </h3>
                          </div>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Continue testing to gather more data
                          </p>
                        </div>
                      )}

                      <div>
                        <Label>Recommendation</Label>
                        <p className="text-sm mt-2">{testDetails.results.recommendation}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No results yet. Start the test and analyze when you have enough data.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  percentage,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  percentage?: number;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {percentage !== undefined && (
        <p className="text-xs text-muted-foreground">{percentage.toFixed(2)}%</p>
      )}
    </div>
  );
}

function CreateTestForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    campaignId: 0,
    name: "",
    description: "",
    testType: "subject_line" as const,
    trafficSplit: 50,
    confidenceLevel: 95,
    winnerMetric: "open_rate" as const,
    autoPromoteWinner: true,
    variantA: {
      subjectLine: "",
      fromName: "",
      content: "",
      sendTime: "",
    },
    variantB: {
      subjectLine: "",
      fromName: "",
      content: "",
      sendTime: "",
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DialogHeader>
        <DialogTitle>Create A/B Test</DialogTitle>
        <DialogDescription>
          Set up a new A/B test to compare email variations
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label>Campaign ID</Label>
          <Input
            type="number"
            value={formData.campaignId || ""}
            onChange={(e) => setFormData({ ...formData, campaignId: Number(e.target.value) })}
            required
          />
        </div>

        <div>
          <Label>Test Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Subject Line Test - March 2024"
            required
          />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What are you testing and why?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Test Type</Label>
            <Select
              value={formData.testType}
              onValueChange={(value: any) => setFormData({ ...formData, testType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subject_line">Subject Line</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="send_time">Send Time</SelectItem>
                <SelectItem value="from_name">From Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Winner Metric</Label>
            <Select
              value={formData.winnerMetric}
              onValueChange={(value: any) => setFormData({ ...formData, winnerMetric: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open_rate">Open Rate</SelectItem>
                <SelectItem value="click_rate">Click Rate</SelectItem>
                <SelectItem value="conversion_rate">Conversion Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Traffic Split (% for Variant A)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.trafficSplit}
              onChange={(e) => setFormData({ ...formData, trafficSplit: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Variant B gets {100 - formData.trafficSplit}%
            </p>
          </div>

          <div>
            <Label>Confidence Level</Label>
            <Select
              value={formData.confidenceLevel.toString()}
              onValueChange={(value) => setFormData({ ...formData, confidenceLevel: Number(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90">90%</SelectItem>
                <SelectItem value="95">95%</SelectItem>
                <SelectItem value="99">99%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold">Variant A</h3>
          <div>
            <Label>Subject Line</Label>
            <Input
              value={formData.variantA.subjectLine}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  variantA: { ...formData.variantA, subjectLine: e.target.value },
                })
              }
            />
          </div>
          <div>
            <Label>From Name</Label>
            <Input
              value={formData.variantA.fromName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  variantA: { ...formData.variantA, fromName: e.target.value },
                })
              }
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold">Variant B</h3>
          <div>
            <Label>Subject Line</Label>
            <Input
              value={formData.variantB.subjectLine}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  variantB: { ...formData.variantB, subjectLine: e.target.value },
                })
              }
            />
          </div>
          <div>
            <Label>From Name</Label>
            <Input
              value={formData.variantB.fromName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  variantB: { ...formData.variantB, fromName: e.target.value },
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Test</Button>
      </div>
    </form>
  );
}
