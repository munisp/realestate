import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, TrendingUp, DollarSign, Shield, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface InvestmentScoreLiveProps {
  propertyId: number;
}

export function InvestmentScoreLive({ propertyId }: InvestmentScoreLiveProps) {
  const { data, isLoading, error } = trpc.gnn.getInvestmentScore.useQuery({
    propertyId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment Analysis</CardTitle>
          <CardDescription>Calculating investment metrics...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment Analysis</CardTitle>
          <CardDescription>Unable to load investment data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading investment analysis. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Fair";
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-600 bg-green-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "high":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Investment Analysis</CardTitle>
            <CardDescription>AI-powered investment scoring</CardDescription>
          </div>
          <Badge variant="default">
            {getScoreBadge(data.investmentScore)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Investment Score */}
        <div className="text-center py-4 border-b">
          <p className="text-sm text-muted-foreground mb-2">Investment Score</p>
          <p className={`text-4xl font-bold ${getScoreColor(data.investmentScore)}`}>
            {data.investmentScore.toFixed(0)}/100
          </p>
          <p className="text-sm text-muted-foreground mt-2">{data.recommendation}</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">ROI Estimate</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {data.roiEstimate.toFixed(1)}%
            </p>
          </div>

          <div className="p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Rental Yield</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {data.rentalYield.toFixed(1)}%
            </p>
          </div>

          <div className="p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Appreciation</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {data.appreciationPotential.toFixed(1)}%
            </p>
          </div>

          <div className="p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Risk Level</p>
            </div>
            <Badge className={getRiskColor(data.riskLevel)}>
              {data.riskLevel.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Time Horizon */}
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Recommended Time Horizon</p>
          <p className="font-semibold">{data.timeHorizon}</p>
        </div>

        {/* Strengths */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            Investment Strengths
          </h4>
          <ul className="space-y-2">
            {data.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4" />
            Potential Risks
          </h4>
          <ul className="space-y-2">
            {data.risks.map((risk, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
