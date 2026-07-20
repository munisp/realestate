/**
 * OpenSearch Integration Client
 *
 * Provides full-text search, semantic search, and analytics for:
 *  - Property listings (title, description, location, features)
 *  - Neighbourhood intelligence
 *  - Agent profiles
 *  - Document search (contracts, deeds)
 *
 * Falls back to PostgreSQL ILIKE queries when OpenSearch is unavailable.
 */

import axios, { AxiosInstance } from "axios";
import { logger } from "./logger";

// ── Configuration ──────────────────────────────────────────────────────────

const OPENSEARCH_URL = process.env.OPENSEARCH_URL ?? "http://localhost:9200";
const OPENSEARCH_USERNAME = process.env.OPENSEARCH_USERNAME ?? "admin";
const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD ?? "";
const OPENSEARCH_INDEX_PREFIX = process.env.OPENSEARCH_INDEX_PREFIX ?? "realestate";

// ── Index Names ────────────────────────────────────────────────────────────

export const INDICES = {
  PROPERTIES: `${OPENSEARCH_INDEX_PREFIX}_properties`,
  AGENTS: `${OPENSEARCH_INDEX_PREFIX}_agents`,
  NEIGHBOURHOODS: `${OPENSEARCH_INDEX_PREFIX}_neighbourhoods`,
  DOCUMENTS: `${OPENSEARCH_INDEX_PREFIX}_documents`,
  AUDIT_LOGS: `${OPENSEARCH_INDEX_PREFIX}_audit_logs`,
} as const;

// ── Index Mappings ─────────────────────────────────────────────────────────

const PROPERTY_MAPPING = {
  mappings: {
    properties: {
      id: { type: "keyword" },
      title: { type: "text", analyzer: "english", fields: { keyword: { type: "keyword" } } },
      description: { type: "text", analyzer: "english" },
      price: { type: "long" },
      bedrooms: { type: "integer" },
      bathrooms: { type: "integer" },
      sqft: { type: "integer" },
      propertyType: { type: "keyword" },
      status: { type: "keyword" },
      city: { type: "keyword" },
      state: { type: "keyword" },
      address: { type: "text" },
      location: { type: "geo_point" },
      amenities: { type: "keyword" },
      agentId: { type: "keyword" },
      createdAt: { type: "date" },
      updatedAt: { type: "date" },
      pricePerSqft: { type: "float" },
      yearBuilt: { type: "integer" },
      features: { type: "text" },
    },
  },
  settings: {
    number_of_shards: 2,
    number_of_replicas: 1,
    analysis: {
      analyzer: {
        nigerian_address: {
          type: "custom",
          tokenizer: "standard",
          filter: ["lowercase", "stop"],
        },
      },
    },
  },
};

// ── Client ─────────────────────────────────────────────────────────────────

class OpenSearchClient {
  private client: AxiosInstance;
  private available = false;

  constructor() {
    const auth = OPENSEARCH_PASSWORD
      ? Buffer.from(`${OPENSEARCH_USERNAME}:${OPENSEARCH_PASSWORD}`).toString("base64")
      : null;

    this.client = axios.create({
      baseURL: OPENSEARCH_URL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: `Basic ${auth}` } : {}),
      },
    });

    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    try {
      await this.client.get("/_cluster/health");
      this.available = true;
      logger.info("[OpenSearch] Connected successfully");
      await this.ensureIndices();
    } catch {
      this.available = false;
      logger.warn("[OpenSearch] Not available — search will use PostgreSQL fallback");
    }
  }

  // ── Index Management ───────────────────────────────────────────────────

  async ensureIndices(): Promise<void> {
    try {
      const exists = await this.client.head(`/${INDICES.PROPERTIES}`).then(() => true).catch(() => false);
      if (!exists) {
        await this.client.put(`/${INDICES.PROPERTIES}`, PROPERTY_MAPPING);
        logger.info(`[OpenSearch] Created index ${INDICES.PROPERTIES}`);
      }
    } catch (err) {
      logger.warn({ err }, "[OpenSearch] Failed to ensure indices");
    }
  }

  // ── Document Operations ────────────────────────────────────────────────

  async indexProperty(property: Record<string, any>): Promise<void> {
    if (!this.available) return;
    try {
      const doc = {
        ...property,
        location: property.lat && property.lng
          ? { lat: parseFloat(property.lat), lon: parseFloat(property.lng) }
          : undefined,
        pricePerSqft: property.price && property.sqft
          ? Math.round(property.price / property.sqft)
          : undefined,
      };
      await this.client.put(`/${INDICES.PROPERTIES}/_doc/${property.id}`, doc);
    } catch (err) {
      logger.warn({ err, propertyId: property.id }, "[OpenSearch] Failed to index property");
    }
  }

  async deleteProperty(propertyId: string): Promise<void> {
    if (!this.available) return;
    try {
      await this.client.delete(`/${INDICES.PROPERTIES}/_doc/${propertyId}`);
    } catch (err) {
      logger.warn({ err, propertyId }, "[OpenSearch] Failed to delete property from index");
    }
  }

  async bulkIndexProperties(properties: Record<string, any>[]): Promise<void> {
    if (!this.available || properties.length === 0) return;
    try {
      const body = properties.flatMap((p) => [
        { index: { _index: INDICES.PROPERTIES, _id: p.id } },
        {
          ...p,
          location: p.lat && p.lng ? { lat: parseFloat(p.lat), lon: parseFloat(p.lng) } : undefined,
        },
      ]);
      const response = await this.client.post("/_bulk", body.map((l) => JSON.stringify(l)).join("\n") + "\n", {
        headers: { "Content-Type": "application/x-ndjson" },
      });
      if (response.data.errors) {
        logger.warn("[OpenSearch] Bulk index had errors");
      }
    } catch (err) {
      logger.warn({ err }, "[OpenSearch] Bulk index failed");
    }
  }

  // ── Search ─────────────────────────────────────────────────────────────

  async searchProperties(params: {
    query?: string;
    city?: string;
    state?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    status?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    from?: number;
    size?: number;
    sortBy?: "price_asc" | "price_desc" | "newest" | "relevance";
  }): Promise<{ hits: any[]; total: number; took: number } | null> {
    if (!this.available) return null;

    const must: any[] = [{ term: { status: params.status ?? "active" } }];
    const filter: any[] = [];

    if (params.query) {
      must.push({
        multi_match: {
          query: params.query,
          fields: ["title^3", "description^2", "address", "city", "features"],
          type: "best_fields",
          fuzziness: "AUTO",
        },
      });
    }

    if (params.city) filter.push({ term: { city: params.city } });
    if (params.state) filter.push({ term: { state: params.state } });
    if (params.propertyType) filter.push({ term: { propertyType: params.propertyType } });
    if (params.bedrooms) filter.push({ term: { bedrooms: params.bedrooms } });
    if (params.bathrooms) filter.push({ term: { bathrooms: params.bathrooms } });

    if (params.minPrice || params.maxPrice) {
      filter.push({
        range: {
          price: {
            ...(params.minPrice ? { gte: params.minPrice } : {}),
            ...(params.maxPrice ? { lte: params.maxPrice } : {}),
          },
        },
      });
    }

    if (params.lat && params.lng && params.radiusKm) {
      filter.push({
        geo_distance: {
          distance: `${params.radiusKm}km`,
          location: { lat: params.lat, lon: params.lng },
        },
      });
    }

    const sort: any[] = [];
    switch (params.sortBy) {
      case "price_asc": sort.push({ price: "asc" }); break;
      case "price_desc": sort.push({ price: "desc" }); break;
      case "newest": sort.push({ createdAt: "desc" }); break;
      default: sort.push("_score");
    }

    try {
      const response = await this.client.post(`/${INDICES.PROPERTIES}/_search`, {
        from: params.from ?? 0,
        size: params.size ?? 20,
        query: { bool: { must, filter } },
        sort,
        highlight: {
          fields: { title: {}, description: { fragment_size: 150 } },
        },
        aggs: {
          by_city: { terms: { field: "city", size: 20 } },
          by_type: { terms: { field: "propertyType", size: 10 } },
          price_stats: { stats: { field: "price" } },
        },
      });

      return {
        hits: response.data.hits.hits.map((h: any) => ({
          ...h._source,
          _score: h._score,
          _highlight: h.highlight,
        })),
        total: response.data.hits.total.value,
        took: response.data.took,
      };
    } catch (err) {
      logger.warn({ err }, "[OpenSearch] Search failed");
      return null;
    }
  }

  async suggestProperties(prefix: string, size: number = 5): Promise<string[]> {
    if (!this.available) return [];
    try {
      const response = await this.client.post(`/${INDICES.PROPERTIES}/_search`, {
        suggest: {
          property_suggest: {
            prefix,
            completion: { field: "title.keyword", size },
          },
        },
      });
      return response.data.suggest?.property_suggest?.[0]?.options?.map((o: any) => o.text) ?? [];
    } catch {
      return [];
    }
  }

  // ── Audit Log Indexing ─────────────────────────────────────────────────

  async indexAuditLog(log: Record<string, any>): Promise<void> {
    if (!this.available) return;
    try {
      await this.client.post(`/${INDICES.AUDIT_LOGS}/_doc`, {
        ...log,
        "@timestamp": new Date().toISOString(),
      });
    } catch { /* non-critical */ }
  }

  get isAvailable(): boolean {
    return this.available;
  }

  async healthCheck(): Promise<{ status: string; available: boolean }> {
    try {
      const response = await this.client.get("/_cluster/health");
      return { status: response.data.status, available: true };
    } catch {
      return { status: "unavailable", available: false };
    }
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const opensearch = new OpenSearchClient();
export default opensearch;
