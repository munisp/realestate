/**
 * Zestimate ML Services Client
 * TypeScript client for interacting with Python ML microservices
 */

import { ENV } from "../_core/env";

// Service URLs from environment or defaults
const GNN_SERVICE_URL = process.env.GNN_SERVICE_URL || 'http://localhost:5003';
const CV_SERVICE_URL = process.env.CV_SERVICE_URL || 'http://localhost:5004';
const ALTDATA_SERVICE_URL = process.env.ALTDATA_SERVICE_URL || 'http://localhost:5005';
const ENSEMBLE_SERVICE_URL = process.env.ENSEMBLE_SERVICE_URL || 'http://localhost:5006';
const BIAS_SERVICE_URL = process.env.BIAS_SERVICE_URL || 'http://localhost:5007';

// Feature flags
const ENABLE_GNN = process.env.ENABLE_GNN_VALUATION !== 'false';
const ENABLE_CV = process.env.ENABLE_CV_ASSESSMENT !== 'false';
const ENABLE_ALTDATA = process.env.ENABLE_ALTDATA_ENRICHMENT !== 'false';
const ENABLE_ENSEMBLE = process.env.ENABLE_ENSEMBLE_PREDICTION !== 'false';
const ENABLE_BIAS = process.env.ENABLE_BIAS_CORRECTION !== 'false';

// Types
export interface PropertyFeatures {
  price: number;
  sqft?: number;
  beds?: number;
  baths?: number;
  year_built?: number;
  latitude?: string;
  longitude?: string;
}

export interface NeighborProperty {
  id: number;
  distance: number;
  price: number;
}

export interface GNNPrediction {
  estimated_value: number;
  confidence: number;
  base_value: number;
  neighbor_influence: number;
  influence_weight: number;
  num_neighbors: number;
}

export interface VisualAssessment {
  aerial_image_url: string;
  street_view_url: string | null;
  aerial_analysis: {
    roof_condition: string;
    has_pool: boolean;
    has_solar_panels: boolean;
    has_deck: boolean;
    vegetation_index: number;
    lot_size_estimate: number;
  };
  street_analysis: {
    curb_appeal: number;
    exterior_condition: string;
    parking_spaces: number;
    walkability_score: number;
  };
  overall_condition: string;
  condition_score: number;
  map_source: string;
}

export interface AlternativeData {
  walkability_score: number;
  amenity_density_025mi: number;
  amenity_density_05mi: number;
  amenity_density_1mi: number;
  restaurant_quality_avg: number;
  school_quality_proxy: number;
  retail_accessibility: number;
  unemployment_rate: number;
  wage_growth_yoy: number;
  price_growth_yoy: number;
  search_interest_index: number;
  buyer_urgency_score: number;
  poi_breakdown: Record<string, any>;
}

export interface EnsemblePrediction {
  estimated_value: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
  model_predictions: Record<string, {
    prediction: number;
    weight: number;
    name: string;
  }>;
  std_dev: number;
}

export interface BiasCorrection {
  original_prediction: number;
  corrected_prediction: number;
  calibration_factor: number;
  segment: string;
}

/**
 * GNN Valuation Service Client
 */
export class GNNValuationClient {
  private baseUrl: string;

  constructor(baseUrl: string = GNN_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  async predict(
    propertyId: number,
    features: PropertyFeatures,
    neighbors: NeighborProperty[],
    modelType: string = 'ensemble'
  ): Promise<GNNPrediction> {
    if (!ENABLE_GNN) {
      throw new Error('GNN valuation is disabled');
    }

    const response = await fetch(`${this.baseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: propertyId,
        features,
        neighbors,
        model_type: modelType,
      }),
    });

    if (!response.ok) {
      throw new Error(`GNN prediction failed: ${response.statusText}`);
    }

    return response.json();
  }

  async buildGraph(
    propertyId: number,
    latitude: number,
    longitude: number,
    kNeighbors: number = 10,
    maxDistanceMiles: number = 2.0
  ): Promise<{ neighbors: NeighborProperty[] }> {
    const response = await fetch(`${this.baseUrl}/build-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: propertyId,
        latitude,
        longitude,
        k_neighbors: kNeighbors,
        max_distance_miles: maxDistanceMiles,
      }),
    });

    if (!response.ok) {
      throw new Error(`Graph building failed: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Computer Vision Service Client
 */
export class CVServiceClient {
  private baseUrl: string;

  constructor(baseUrl: string = CV_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  async assessProperty(
    latitude: number,
    longitude: number,
    includeStreetView: boolean = true
  ): Promise<VisualAssessment> {
    if (!ENABLE_CV) {
      throw new Error('Computer vision assessment is disabled');
    }

    const response = await fetch(`${this.baseUrl}/assess-property`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude,
        longitude,
        include_street_view: includeStreetView,
      }),
    });

    if (!response.ok) {
      throw new Error(`CV assessment failed: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Alternative Data Service Client
 */
export class AltDataServiceClient {
  private baseUrl: string;

  constructor(baseUrl: string = ALTDATA_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  async enrichProperty(
    propertyId: number,
    latitude: number,
    longitude: number,
    zipCode: string
  ): Promise<AlternativeData> {
    if (!ENABLE_ALTDATA) {
      throw new Error('Alternative data enrichment is disabled');
    }

    const response = await fetch(`${this.baseUrl}/enrich-property`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: propertyId,
        latitude,
        longitude,
        zip_code: zipCode,
      }),
    });

    if (!response.ok) {
      throw new Error(`Alternative data enrichment failed: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Ensemble Models Service Client
 */
export class EnsembleServiceClient {
  private baseUrl: string;

  constructor(baseUrl: string = ENSEMBLE_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  async predict(
    propertyId: number,
    features: PropertyFeatures
  ): Promise<EnsemblePrediction> {
    if (!ENABLE_ENSEMBLE) {
      throw new Error('Ensemble prediction is disabled');
    }

    const response = await fetch(`${this.baseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: propertyId,
        features,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ensemble prediction failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getModelWeights(): Promise<Record<string, number>> {
    const response = await fetch(`${this.baseUrl}/model-weights`);

    if (!response.ok) {
      throw new Error(`Failed to get model weights: ${response.statusText}`);
    }

    const data = await response.json();
    return data.weights;
  }
}

/**
 * Bias Correction Service Client
 */
export class BiasServiceClient {
  private baseUrl: string;

  constructor(baseUrl: string = BIAS_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  async correctBias(
    propertyId: number,
    prediction: number,
    segment: string
  ): Promise<BiasCorrection> {
    if (!ENABLE_BIAS) {
      throw new Error('Bias correction is disabled');
    }

    const response = await fetch(`${this.baseUrl}/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: propertyId,
        prediction,
        segment,
      }),
    });

    if (!response.ok) {
      throw new Error(`Bias correction failed: ${response.statusText}`);
    }

    return response.json();
  }

  async calculateMetrics(
    predictions: number[],
    actuals: number[],
    segments: string[]
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/calculate-metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        predictions,
        actuals,
        segments,
      }),
    });

    if (!response.ok) {
      throw new Error(`Metrics calculation failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export singleton instances
export const gnnClient = new GNNValuationClient();
export const cvClient = new CVServiceClient();
export const altDataClient = new AltDataServiceClient();
export const ensembleClient = new EnsembleServiceClient();
export const biasClient = new BiasServiceClient();
