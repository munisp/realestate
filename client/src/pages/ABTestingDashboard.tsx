import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BarChart3, FlaskConical, Play, Pause, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function ABTestingDashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: experiments, isLoading, refetch } = trpc.abTesting.listExperiments.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const updateStatusMutation = trpc.abTesting.updateExperimentStatus.useMutation({
    onSuccess: () => {
      toast.success("Experiment status updated");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const handleStatusChange = async (experimentId: number, newStatus: "active" | "paused" | "completed") => {
    await updateStatusMutation.mutateAsync({
      experimentId,
      status: newStatus,
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
            <CardDescription>Please log in to access A/B testing dashboard</CardDescription>
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      active: "default",
      paused: "outline",
      completed: "secondary",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FlaskConical className="h-8 w-8 text-primary" />
                A/B Testing Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Track and compare recommendation algorithm performance
              </p>
            </div>
            <Button asChild>
              <Link href="/ab-testing/create">Create Experiment</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Experiments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{experiments?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {experiments?.filter((e) => e.status === "active").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paused</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {experiments?.filter((e) => e.status === "paused").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {experiments?.filter((e) => e.status === "completed").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Experiments List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">All Experiments</h2>

          {!experiments || experiments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No experiments yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first A/B test to compare recommendation algorithms
                </p>
                <Button asChild>
                  <Link href="/ab-testing/create">Create Experiment</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            experiments.map((experiment) => (
              <ExperimentCard
                key={experiment.id}
                experiment={experiment}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface ExperimentCardProps {
  experiment: any;
  onStatusChange: (id: number, status: "active" | "paused" | "completed") => void;
}

function ExperimentCard({ experiment, onStatusChange }: ExperimentCardProps) {
  const { data: metrics } = trpc.abTesting.getExperimentMetrics.useQuery({
    experimentId: experiment.id,
  });

  const variants = JSON.parse(experiment.variants || "{}");
  const variantNames = Object.keys(variants);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      active: "default",
      paused: "outline",
      completed: "secondary",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle>{experiment.name}</CardTitle>
              {getStatusBadge(experiment.status)}
            </div>
            {experiment.description && (
              <CardDescription>{experiment.description}</CardDescription>
            )}
          </div>

          <div className="flex gap-2">
            {experiment.status === "draft" && (
              <Button
                size="sm"
                onClick={() => onStatusChange(experiment.id, "active")}
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}

            {experiment.status === "active" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange(experiment.id, "paused")}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange(experiment.id, "completed")}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              </>
            )}

            {experiment.status === "paused" && (
              <Button
                size="sm"
                onClick={() => onStatusChange(experiment.id, "active")}
              >
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            )}

            <Button size="sm" variant="outline" asChild>
              <Link href={`/ab-testing/${experiment.id}`}>
                <BarChart3 className="h-4 w-4 mr-1" />
                View Results
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Variants */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Variants</div>
            <div className="flex flex-wrap gap-2">
              {variantNames.map((name) => (
                <Badge key={name} variant="outline">
                  {name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Total Users */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Total Users</div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {metrics?.userCounts.reduce((sum, uc) => sum + uc.userCount, 0) || 0}
              </span>
            </div>
          </div>

          {/* Total Events */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Total Events</div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {metrics?.metrics.reduce((sum, m) => sum + m.count, 0) || 0}
              </span>
            </div>
          </div>
        </div>

        {experiment.startDate && (
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            Started: {new Date(experiment.startDate).toLocaleDateString()}
            {experiment.endDate && (
              <> • Ended: {new Date(experiment.endDate).toLocaleDateString()}</>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
