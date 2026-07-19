/**
 * Hybrid Valuation Display Component
 * Shows valuation results with confidence metrics and uncertainty ranges
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Info, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  Satellite,
  Database,
  BarChart3
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DataSourceContribution {
  source_name: string;
  weight: number;
  confidence: number;
  value_contribution: number;
  importance_rank: number;
}

interface ConfidenceBreakdown {
  data_completeness_contribution: number;
  model_accuracy_contribution: number;
  comparable_quality_contribution: number;
  satellite_confidence_contribution: number;
  market_stability_contribution: number;
  overall_confidence: number;
  confidence_level: string;
  limiting_factors: string[];
}

interface UncertaintyMetrics {
  prediction_interval_lower: number;
  prediction_interval_upper: number;
  interval_width_percent: number;
  standard_error: number;
  coefficient_of_variation: number;
  uncertainty_sources: Record<string, number>;
}

interface DataCompleteness {
  comparable_sales_count: number;
  comparable_sales_score: number;
  transaction_history_count: number;
  transaction_history_score: number;
  satellite_data_available: boolean;
  satellite_data_score: number;
  alternative_data_sources: number;
  alternative_data_score: number;
  overall_completeness: number;
  quality_flag: string;
}

interface ConfidenceDetails {
  overall_confidence: number;
  confidence_level: string;
  data_completeness: DataCompleteness;
  confidence_breakdown: ConfidenceBreakdown;
  uncertainty_metrics: UncertaintyMetrics;
  data_source_contributions: DataSourceContribution[];
  quality_flags: string[];
  recommendations: string[];
}

interface SatelliteAnalysis {
  building_footprint_sqm: number;
  estimated_height_m: number;
  num_floors: number;
  roof_material: string;
  roof_condition: string;
  building_density: number;
  green_space_ratio: number;
  road_access_quality: string;
  confidence_score: number;
}

interface HybridValuationResult {
  final_valuation: number;
  confidence_score: number;
  uncertainty_range: [number, number];
  pathway_used: string;
  data_availability_score: number;
  confidence_details: ConfidenceDetails;
  satellite_analysis?: SatelliteAnalysis;
  model_version: string;
  valuation_timestamp: string;
  num_components: number;
  component_methods: string[];
}

interface HybridValuationDisplayProps {
  result: HybridValuationResult;
}

export function HybridValuationDisplay({ result }: HybridValuationDisplayProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getConfidenceLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      very_high: 'text-green-600 bg-green-50 border-green-200',
      high: 'text-green-500 bg-green-50 border-green-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      low: 'text-orange-600 bg-orange-50 border-orange-200',
      very_low: 'text-red-600 bg-red-50 border-red-200',
    };
    return colors[level] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getConfidenceLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      very_high: 'Very High',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      very_low: 'Very Low',
    };
    return labels[level] || level;
  };

  const getPathwayLabel = (pathway: string) => {
    const labels: Record<string, string> = {
      data_rich: 'Data-Rich (Traditional ML)',
      data_scarce: 'Data-Scarce (Satellite + Proxies)',
      hybrid: 'Hybrid (Ensemble)',
    };
    return labels[pathway] || pathway;
  };

  const getPathwayIcon = (pathway: string) => {
    if (pathway === 'data_rich') return <Database className="h-4 w-4" />;
    if (pathway === 'data_scarce') return <Satellite className="h-4 w-4" />;
    return <BarChart3 className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Main Valuation Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">
                {formatCurrency(result.final_valuation)}
              </CardTitle>
              <CardDescription className="mt-2">
                Estimated Property Value
              </CardDescription>
            </div>
            <Badge 
              variant="outline" 
              className={`${getConfidenceLevelColor(result.confidence_details.confidence_level)} px-4 py-2`}
            >
              {getConfidenceLevelLabel(result.confidence_details.confidence_level)} Confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Uncertainty Range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valuation Range</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>95% confidence interval for the valuation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {formatCurrency(result.uncertainty_range[0])}
              </span>
              <span className="text-sm text-muted-foreground">to</span>
              <span className="text-sm font-medium">
                {formatCurrency(result.uncertainty_range[1])}
              </span>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              ±{result.confidence_details.uncertainty_metrics.interval_width_percent.toFixed(1)}% uncertainty
            </div>
          </div>

          {/* Pathway Used */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            {getPathwayIcon(result.pathway_used)}
            <div className="flex-1">
              <div className="text-sm font-medium">Valuation Method</div>
              <div className="text-xs text-muted-foreground">
                {getPathwayLabel(result.pathway_used)}
              </div>
            </div>
            <Badge variant="secondary">
              {(result.data_availability_score * 100).toFixed(0)}% data available
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Confidence Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Confidence Breakdown</CardTitle>
          <CardDescription>
            Factors contributing to valuation confidence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <ConfidenceMetric
              label="Data Completeness"
              value={result.confidence_details.confidence_breakdown.data_completeness_contribution}
              description={`${result.confidence_details.data_completeness.comparable_sales_count} comparables, ${result.confidence_details.data_completeness.transaction_history_count} transactions`}
            />
            <ConfidenceMetric
              label="Model Accuracy"
              value={result.confidence_details.confidence_breakdown.model_accuracy_contribution}
              description="Historical model performance"
            />
            <ConfidenceMetric
              label="Comparable Quality"
              value={result.confidence_details.confidence_breakdown.comparable_quality_contribution}
              description="Recency and similarity of comparables"
            />
            {result.satellite_analysis && (
              <ConfidenceMetric
                label="Satellite Data"
                value={result.confidence_details.confidence_breakdown.satellite_confidence_contribution}
                description="Building features from satellite imagery"
              />
            )}
            <ConfidenceMetric
              label="Market Stability"
              value={result.confidence_details.confidence_breakdown.market_stability_contribution}
              description="Market volatility and trends"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Source Contributions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Sources</CardTitle>
          <CardDescription>
            Contribution of each data source to final valuation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.confidence_details.data_source_contributions
              .sort((a, b) => b.weight - a.weight)
              .map((source, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">
                      {source.source_name.replace(/_/g, ' ')}
                    </span>
                    <span className="text-muted-foreground">
                      {(source.weight * 100).toFixed(1)}% weight
                    </span>
                  </div>
                  <Progress value={source.weight * 100} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Confidence: {(source.confidence * 100).toFixed(0)}%</span>
                    <span>Contributes: {formatCurrency(source.value_contribution)}</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Satellite Analysis (if available) */}
      {result.satellite_analysis && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Satellite className="h-5 w-5" />
              <CardTitle className="text-lg">Satellite Imagery Analysis</CardTitle>
            </div>
            <CardDescription>
              Building features detected from satellite imagery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Building Footprint</div>
                <div className="text-lg font-semibold">
                  {result.satellite_analysis.building_footprint_sqm.toFixed(0)} m²
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Estimated Height</div>
                <div className="text-lg font-semibold">
                  {result.satellite_analysis.estimated_height_m.toFixed(1)} m ({result.satellite_analysis.num_floors} floors)
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Roof Material</div>
                <div className="text-lg font-semibold capitalize">
                  {result.satellite_analysis.roof_material}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Roof Condition</div>
                <div className="text-lg font-semibold capitalize">
                  {result.satellite_analysis.roof_condition}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Road Access</div>
                <div className="text-lg font-semibold capitalize">
                  {result.satellite_analysis.road_access_quality}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Green Space</div>
                <div className="text-lg font-semibold">
                  {(result.satellite_analysis.green_space_ratio * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Flags & Recommendations */}
      {(result.confidence_details.quality_flags.length > 0 || 
        result.confidence_details.recommendations.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quality Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quality Flags */}
            {result.confidence_details.quality_flags.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Data Quality Flags:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {result.confidence_details.quality_flags.map((flag, index) => (
                      <li key={index} className="capitalize">
                        {flag.replace(/_/g, ' ')}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Recommendations */}
            {result.confidence_details.recommendations.length > 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Recommendations:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {result.confidence_details.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper component for confidence metrics
function ConfidenceMetric({ 
  label, 
  value, 
  description 
}: { 
  label: string; 
  value: number; 
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{(value * 100).toFixed(0)}%</span>
      </div>
      <Progress value={value * 100} className="h-2" />
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}
