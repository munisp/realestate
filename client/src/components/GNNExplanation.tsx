/**
 * GNN Explanation Component
 * -------------------------
 * Displays explainable AI insights for GNN-based property recommendations.
 * Shows feature importance, spatial factors, and confidence scores.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Lightbulb,
  TrendingUp,
  MapPin,
  Home,
  DollarSign,
  Network,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// ============================================================================
// Types
// ============================================================================

export interface FeatureContribution {
  feature: string;
  value: number;
  contribution: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface SpatialFactor {
  factor: string;
  score: number;
  description: string;
  properties: number[];
}

export interface GNNExplanationData {
  predicted_price: number;
  confidence: number;
  feature_contributions: FeatureContribution[];
  spatial_factors: SpatialFactor[];
  network_centrality: number;
  neighborhood_effect: number;
  model_version: string;
}

interface GNNExplanationProps {
  data: GNNExplanationData;
  propertyId: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getImpactColor(impact: 'positive' | 'negative' | 'neutral'): string {
  switch (impact) {
    case 'positive':
      return 'text-green-600';
    case 'negative':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

function getImpactIcon(impact: 'positive' | 'negative' | 'neutral') {
  switch (impact) {
    case 'positive':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'negative':
      return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
    default:
      return <div className="h-4 w-4" />;
  }
}

function formatCurrency(value: number): string {
  return `₦${value.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function getFeatureIcon(feature: string) {
  const lowerFeature = feature.toLowerCase();
  if (lowerFeature.includes('bedroom') || lowerFeature.includes('bathroom')) {
    return <Home className="h-4 w-4" />;
  }
  if (lowerFeature.includes('price') || lowerFeature.includes('sqft')) {
    return <DollarSign className="h-4 w-4" />;
  }
  if (lowerFeature.includes('location') || lowerFeature.includes('neighborhood')) {
    return <MapPin className="h-4 w-4" />;
  }
  if (lowerFeature.includes('network') || lowerFeature.includes('centrality')) {
    return <Network className="h-4 w-4" />;
  }
  return <Info className="h-4 w-4" />;
}

// ============================================================================
// Component
// ============================================================================

export default function GNNExplanation({ data, propertyId }: GNNExplanationProps) {
  // Sort features by absolute contribution
  const sortedFeatures = [...data.feature_contributions].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );

  // Calculate total positive and negative contributions
  const positiveContribution = sortedFeatures
    .filter((f) => f.impact === 'positive')
    .reduce((sum, f) => sum + Math.abs(f.contribution), 0);

  const negativeContribution = sortedFeatures
    .filter((f) => f.impact === 'negative')
    .reduce((sum, f) => sum + Math.abs(f.contribution), 0);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <CardTitle>Why This Recommendation?</CardTitle>
            </div>
            <Badge variant="secondary">
              {(data.confidence * 100).toFixed(0)}% Confidence
            </Badge>
          </div>
          <CardDescription>
            AI-powered explanation of property valuation and investment potential
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Predicted Value: {formatCurrency(data.predicted_price)}</AlertTitle>
            <AlertDescription>
              Based on {data.feature_contributions.length} property features and{' '}
              {data.spatial_factors.length} spatial factors from our Graph Neural Network model.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="features" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="features">Feature Impact</TabsTrigger>
          <TabsTrigger value="spatial">Spatial Factors</TabsTrigger>
          <TabsTrigger value="network">Network Effects</TabsTrigger>
        </TabsList>

        {/* Feature Contributions Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property Features Impact</CardTitle>
              <CardDescription>
                How each property characteristic influences the valuation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Positive Factors</p>
                  <p className="text-lg font-semibold text-green-600">
                    +{formatCurrency(positiveContribution)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Negative Factors</p>
                  <p className="text-lg font-semibold text-red-600">
                    -{formatCurrency(negativeContribution)}
                  </p>
                </div>
              </div>

              {/* Feature List */}
              <div className="space-y-3">
                {sortedFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getFeatureIcon(feature.feature)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{feature.feature}</span>
                        <div className="flex items-center gap-2">
                          {getImpactIcon(feature.impact)}
                          <span className={`text-sm font-semibold ${getImpactColor(feature.impact)}`}>
                            {feature.contribution > 0 ? '+' : ''}
                            {formatCurrency(feature.contribution)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{feature.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Value:</span>
                        <span className="text-xs font-medium">{feature.value}</span>
                        <Progress
                          value={Math.abs(feature.contribution / (positiveContribution + negativeContribution)) * 100}
                          className="h-1 flex-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spatial Factors Tab */}
        <TabsContent value="spatial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spatial Intelligence</CardTitle>
              <CardDescription>
                Location-based factors from neighborhood analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.spatial_factors.map((factor, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{factor.factor}</span>
                    </div>
                    <Badge variant="outline">{(factor.score * 100).toFixed(0)}%</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{factor.description}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={factor.score * 100} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {factor.properties.length} nearby properties
                    </span>
                  </div>
                </div>
              ))}

              {data.spatial_factors.length === 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No spatial factors available. This may indicate limited neighborhood data.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Effects Tab */}
        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Network Analysis</CardTitle>
              <CardDescription>
                Graph-based insights from property relationships
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Network Centrality */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Network Centrality</span>
                  </div>
                  <Badge variant="secondary">
                    {(data.network_centrality * 100).toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Measures how strategically positioned this property is within the local real
                  estate network. Higher centrality indicates better connectivity to high-value
                  properties.
                </p>
                <Progress value={data.network_centrality * 100} className="h-2" />
              </div>

              {/* Neighborhood Effect */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Neighborhood Effect</span>
                  </div>
                  <Badge variant="secondary">
                    {data.neighborhood_effect > 0 ? '+' : ''}
                    {(data.neighborhood_effect * 100).toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  The influence of surrounding properties on this valuation. Positive values
                  indicate the neighborhood is boosting the property value through spatial
                  spillover effects.
                </p>
                <Progress
                  value={Math.abs(data.neighborhood_effect) * 100}
                  className="h-2"
                />
              </div>

              {/* Model Info */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>About the Model</AlertTitle>
                <AlertDescription>
                  This analysis uses a GraphSAGE neural network trained on {' '}
                  spatial relationships between properties. Model version: {data.model_version}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
