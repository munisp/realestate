/**
 * GNN Property Recommendations
 * ----------------------------
 * Spatial network-based property recommendations using Graph Neural Networks.
 * Shows similar properties based on network centrality and spatial relationships.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Network,
  MapPin,
  TrendingUp,
  Heart,
  ExternalLink,
  Sparkles,
  Home,
  DollarSign,
} from 'lucide-react';
import { Link } from 'wouter';

// ============================================================================
// Types
// ============================================================================

export interface PropertyRecommendation {
  id: number;
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  primaryImage?: string;
  similarityScore: number;
  networkCentralityScore: number;
  spatialProximityScore: number;
  overallScore: number;
  explanation: {
    reasons: string[];
    spatial_factors: string[];
    network_effects: string[];
  };
}

interface GNNPropertyRecommendationsProps {
  sourcePropertyId?: number;
  recommendations: PropertyRecommendation[];
  title?: string;
  description?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number): string {
  return `₦${(value / 1000000).toFixed(1)}M`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-gray-600';
}

function getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'outline' {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  return 'outline';
}

// ============================================================================
// Component
// ============================================================================

export default function GNNPropertyRecommendations({
  sourcePropertyId,
  recommendations,
  title = 'AI-Recommended Properties',
  description = 'Properties with similar spatial characteristics and network relationships',
}: GNNPropertyRecommendationsProps) {
  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No recommendations available yet. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-600" />
            {title}
          </h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Network className="h-3 w-3" />
          GNN-Powered
        </Badge>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((property) => (
          <Card key={property.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="p-0">
              {/* Property Image */}
              <div className="relative h-48 bg-muted rounded-t-lg overflow-hidden">
                {property.primaryImage ? (
                  <img
                    src={property.primaryImage}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Home className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                {/* Overall Score Badge */}
                <div className="absolute top-2 right-2">
                  <Badge variant={getScoreBadgeVariant(property.overallScore)} className="font-bold">
                    {property.overallScore}% Match
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Title & Price */}
              <div>
                <h4 className="font-semibold text-lg line-clamp-1">{property.title}</h4>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(property.price)}
                  </p>
                  <Button variant="ghost" size="sm">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{property.location}</span>
              </div>

              {/* Property Details */}
              <div className="flex items-center gap-4 text-sm">
                <span>{property.bedrooms} beds</span>
                <span>•</span>
                <span>{property.bathrooms} baths</span>
                <span>•</span>
                <span>{property.squareFeet.toLocaleString()} sqft</span>
              </div>

              {/* Similarity Scores */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Spatial Similarity</span>
                  <span className={`font-semibold ${getScoreColor(property.spatialProximityScore)}`}>
                    {property.spatialProximityScore}%
                  </span>
                </div>
                <Progress value={property.spatialProximityScore} className="h-1" />

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Network Centrality</span>
                  <span className={`font-semibold ${getScoreColor(property.networkCentralityScore)}`}>
                    {property.networkCentralityScore}%
                  </span>
                </div>
                <Progress value={property.networkCentralityScore} className="h-1" />

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Feature Match</span>
                  <span className={`font-semibold ${getScoreColor(property.similarityScore)}`}>
                    {property.similarityScore}%
                  </span>
                </div>
                <Progress value={property.similarityScore} className="h-1" />
              </div>

              {/* Why Recommended */}
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground">Why Recommended:</p>
                <ul className="text-xs space-y-1">
                  {property.explanation.reasons.slice(0, 2).map((reason, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <TrendingUp className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-600" />
                      <span className="line-clamp-1">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Link href={`/property/${property.id}`} className="flex-1">
                  <Button variant="default" size="sm" className="w-full">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                </Link>
                <Button variant="outline" size="sm">
                  <Network className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Explanation Footer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Network className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">How GNN Recommendations Work</p>
              <p className="text-xs text-muted-foreground">
                Our Graph Neural Network analyzes spatial relationships between properties,
                neighborhood connectivity, and market patterns to find properties with similar
                characteristics and investment potential. Recommendations consider not just property
                features, but also their position within the real estate network and proximity to
                high-value areas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
