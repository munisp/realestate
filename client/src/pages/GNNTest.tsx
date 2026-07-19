import { MarketTrendPredictionLive } from "@/components/MarketTrendPredictionLive";
import { NeighborhoodIntelLive } from "@/components/NeighborhoodIntelLive";
import { TransitAccessibilityLive } from "@/components/TransitAccessibilityLive";
import { InvestmentScoreLive } from "@/components/InvestmentScoreLive";

/**
 * GNN Test Page
 * Tests all GNN inference endpoints with live data
 */
export default function GNNTest() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">GNN Inference Test</h1>
          <p className="text-muted-foreground">
            Testing real-time Graph Neural Network predictions and analysis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Market Trend Prediction */}
          <MarketTrendPredictionLive 
            neighborhood="Lekki Phase 1" 
            city="Lagos"
          />

          {/* Neighborhood Intelligence */}
          <NeighborhoodIntelLive 
            neighborhood="Lekki Phase 1" 
            city="Lagos"
          />

          {/* Transit Accessibility */}
          <TransitAccessibilityLive 
            propertyId={1}
          />

          {/* Investment Score */}
          <InvestmentScoreLive 
            propertyId={1}
          />
        </div>

        {/* Additional Test Cases */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Victoria Island Test</h2>
            <div className="space-y-6">
              <MarketTrendPredictionLive 
                neighborhood="Victoria Island" 
                city="Lagos"
                showChart={false}
              />
              <NeighborhoodIntelLive 
                neighborhood="Victoria Island" 
                city="Lagos"
              />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Ikoyi Test</h2>
            <div className="space-y-6">
              <MarketTrendPredictionLive 
                neighborhood="Ikoyi" 
                city="Lagos"
                showChart={false}
              />
              <NeighborhoodIntelLive 
                neighborhood="Ikoyi" 
                city="Lagos"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
