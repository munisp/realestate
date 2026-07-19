/**
 * GNN Valuation Display Component
 * --------------------------------
 * Displays GNN-based property valuation with spatial confidence and factors.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  MapPin,
  Users,
  Zap,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ============================================================================
// Types
// ============================================================================

interface GNNValuationData {
  estimated_value: number;
  confidence_score: number;
  value_range: {
    min: number;
    max: number;
  };
  spatial_factors: {
    neighborhood_effect: number;
    location_premium: number;
    accessibility_score: number;
  };
  comparable_properties: Array<{
    id: number;
    price: number;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    distance: number;
  }>;
  model_version: string;
  timestamp: string;
}

interface GNNValuationDisplayProps {
  data: GNNValuationData;
  currency?: string;
  showComparables?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number, currency: string = '₦'): string {
  return `${currency}${value.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function getConfidenceBadge(score: number) {
  if (score >= 0.8) {
    return { label: 'High Confidence', variant: 'default' as const, icon: CheckCircle };
  } else if (score >= 0.6) {
    return { label: 'Medium Confidence', variant: 'secondary' as const, icon: Info };
  } else {
    return { label: 'Low Confidence', variant: 'destructive' as const, icon: AlertCircle };
  }
}

// ============================================================================
// Component
// ============================================================================

export function GNNValuationDisplay({
  data,
  currency = '₦',
  showComparables = true,
}: GNNValuationDisplayProps) {
  const confidenceBadge = getConfidenceBadge(data.confidence_score);
  const ConfidenceIcon = confidenceBadge.icon;

  return (
    <div className="space-y-6">
      {/* Main Valuation Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">GNN-Based Valuation</CardTitle>
              <CardDescription>
                AI-powered valuation using spatial neural networks
              </CardDescription>
            </div>
            <Badge variant={confidenceBadge.variant} className="flex items-center gap-1">
              <ConfidenceIcon className="h-3 w-3" />
              {confidenceBadge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estimated Value */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Estimated Value
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Valuation based on Graph Neural Networks analyzing spatial
                      dependencies and neighborhood effects
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-4xl font-bold text-primary">
              {formatCurrency(data.estimated_value, currency)}
            </div>
            <div className="text-sm text-muted-foreground">
              Range: {formatCurrency(data.value_range.min, currency)} -{' '}
              {formatCurrency(data.value_range.max, currency)}
            </div>
          </div>

          {/* Confidence Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence Score</span>
              <span className="text-sm font-bold">
                {(data.confidence_score * 100).toFixed(0)}%
              </span>
            </div>
            <Progress value={data.confidence_score * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Based on data availability and model certainty
            </p>
          </div>

          <Separator />

          {/* Spatial Factors */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Spatial Factors
            </h3>

            {/* Neighborhood Effect */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Neighborhood Effect</span>
                </div>
                <span className="text-sm font-medium">
                  {formatCurrency(data.spatial_factors.neighborhood_effect, currency)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                Average value of surrounding properties
              </p>
            </div>

            {/* Location Premium */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Location Premium</span>
                </div>
                <span className="text-sm font-medium">
                  {(data.spatial_factors.location_premium * 100).toFixed(0)}%
                </span>
              </div>
              <Progress
                value={data.spatial_factors.location_premium * 100}
                className="h-1.5"
              />
              <p className="text-xs text-muted-foreground pl-6">
                Network centrality and strategic location score
              </p>
            </div>

            {/* Accessibility Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Accessibility Score</span>
                </div>
                <span className="text-sm font-medium">
                  {data.spatial_factors.accessibility_score.toFixed(0)}/100
                </span>
              </div>
              <Progress
                value={data.spatial_factors.accessibility_score}
                className="h-1.5"
              />
              <p className="text-xs text-muted-foreground pl-6">
                Walkability and transit accessibility
              </p>
            </div>
          </div>

          {/* Model Info */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Model Version: {data.model_version}</span>
              <span>
                Updated: {new Date(data.timestamp).toLocaleDateString('en-NG')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparable Properties */}
      {showComparables && data.comparable_properties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparable Properties</CardTitle>
            <CardDescription>
              Similar properties in the spatial network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.comparable_properties.map((comp, index) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {comp.bedrooms} bed, {comp.bathrooms} bath
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {comp.sqft.toLocaleString()} sqft
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {comp.distance.toFixed(0)}m away
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatCurrency(comp.price, currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Methodology Note */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">About GNN Valuation</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This valuation uses Graph Neural Networks (GNN) to model spatial
                dependencies between properties. Unlike traditional methods that treat
                properties independently, GNN captures neighborhood effects, network
                centrality, and spatial patterns to provide more accurate valuations,
                especially in data-scarce environments like developing markets.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GNNValuationDisplay;
