import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, MapPin, Users, Building, AlertTriangle } from "lucide-react";

interface InvestmentFactors {
  priceGrowthPotential: number; // 0-100
  rentYieldPotential: number; // 0-100
  locationScore: number; // 0-100
  demandIndicator: number; // 0-100
  developmentPipeline: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
}

interface InvestmentOpportunityData {
  propertyId: number;
  overallScore: number; // 0-100
  factors: InvestmentFactors;
  estimatedROI: number; // percentage
  timeHorizon: string; // e.g., "3-5 years"
  confidence: number; // 0-1
  comparablePerformance: {
    betterThan: number; // percentage of comparable properties
  };
  keyDrivers: string[];
  risks: string[];
}

interface InvestmentOpportunityScoreProps {
  data: InvestmentOpportunityData;
}

export function InvestmentOpportunityScore({ data }: InvestmentOpportunityScoreProps) {
  const getScoreGrade = (score: number) => {
    if (score >= 85) return { grade: 'A+', color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-300' };
    if (score >= 75) return { grade: 'A', color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-300' };
    if (score >= 65) return { grade: 'B+', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' };
    if (score >= 55) return { grade: 'B', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' };
    if (score >= 45) return { grade: 'C', color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-300' };
    return { grade: 'D', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-300' };
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const scoreGrade = getScoreGrade(data.overallScore);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Investment Opportunity Score
            </CardTitle>
            <CardDescription>
              GNN-powered investment analysis with network centrality metrics
            </CardDescription>
          </div>
          <div className={`px-4 py-2 rounded-lg border ${scoreGrade.bgColor} ${scoreGrade.borderColor}`}>
            <div className={`text-3xl font-bold ${scoreGrade.color}`}>{scoreGrade.grade}</div>
            <div className="text-xs text-center text-muted-foreground">{data.overallScore}/100</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Est. ROI</span>
              </div>
              <p className="text-2xl font-bold text-green-600">+{data.estimatedROI}%</p>
              <p className="text-xs text-muted-foreground">{data.timeHorizon}</p>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Performance</span>
              </div>
              <p className="text-2xl font-bold">Top {100 - data.comparablePerformance.betterThan}%</p>
              <p className="text-xs text-muted-foreground">vs comparables</p>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Risk Level</span>
              </div>
              <Badge className={getRiskColor(data.factors.riskLevel)}>
                {data.factors.riskLevel.toUpperCase()}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {data.confidence >= 0.8 ? 'High' : data.confidence >= 0.6 ? 'Medium' : 'Low'} confidence
              </p>
            </div>
          </div>

          {/* Investment Factors */}
          <div>
            <h4 className="font-medium mb-3">Investment Factors</h4>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Price Growth Potential</span>
                  </div>
                  <span className="text-sm font-semibold">{data.factors.priceGrowthPotential}/100</span>
                </div>
                <Progress value={data.factors.priceGrowthPotential} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Rent Yield Potential</span>
                  </div>
                  <span className="text-sm font-semibold">{data.factors.rentYieldPotential}/100</span>
                </div>
                <Progress value={data.factors.rentYieldPotential} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Location Score</span>
                  </div>
                  <span className="text-sm font-semibold">{data.factors.locationScore}/100</span>
                </div>
                <Progress value={data.factors.locationScore} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Demand Indicator</span>
                  </div>
                  <span className="text-sm font-semibold">{data.factors.demandIndicator}/100</span>
                </div>
                <Progress value={data.factors.demandIndicator} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Development Pipeline</span>
                  </div>
                  <span className="text-sm font-semibold">{data.factors.developmentPipeline}/100</span>
                </div>
                <Progress value={data.factors.developmentPipeline} className="h-2" />
              </div>
            </div>
          </div>

          {/* Key Drivers */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2 text-green-900">
              <TrendingUp className="h-4 w-4" />
              Key Investment Drivers
            </h4>
            <ul className="space-y-1 text-sm text-green-800">
              {data.keyDrivers.map((driver, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          {data.risks.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-900">
                <AlertTriangle className="h-4 w-4" />
                Risk Factors to Consider
              </h4>
              <ul className="space-y-1 text-sm text-yellow-800">
                {data.risks.map((risk, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Investment Recommendation */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-medium mb-2">Investment Recommendation</h4>
            <p className="text-sm text-muted-foreground">
              {data.overallScore >= 75 && (
                <>
                  <strong>Strong Buy:</strong> This property shows excellent investment potential with high scores across
                  multiple factors. The combination of strong location, growth potential, and demand indicators suggests
                  this is a compelling opportunity for {data.timeHorizon} investment horizon.
                </>
              )}
              {data.overallScore >= 55 && data.overallScore < 75 && (
                <>
                  <strong>Consider:</strong> This property shows good investment potential with solid fundamentals.
                  Review the risk factors and ensure they align with your investment strategy and risk tolerance.
                </>
              )}
              {data.overallScore < 55 && (
                <>
                  <strong>Proceed with Caution:</strong> While this property may have some positive attributes,
                  the overall investment score suggests moderate potential. Conduct thorough due diligence and
                  consider alternative opportunities.
                </>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
