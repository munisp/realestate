/**
 * Dapr Integration Client
 *
 * Dapr provides:
 *  - Service invocation (service mesh, retries, mTLS)
 *  - State management (Redis/PostgreSQL backed)
 *  - Pub/Sub messaging (Kafka/Redis backed)
 *  - Distributed tracing (OpenTelemetry)
 *  - Secrets management
 *  - Bindings (cron, external systems)
 *
 * This client wraps the Dapr HTTP API (sidecar on localhost:3500).
 * Falls back to direct HTTP calls when Dapr sidecar is not available.
 */

import axios, { AxiosInstance } from "axios";
import { logger } from "./logger";

// ── Configuration ──────────────────────────────────────────────────────────

const DAPR_HTTP_PORT = parseInt(process.env.DAPR_HTTP_PORT ?? "3500");
const DAPR_GRPC_PORT = parseInt(process.env.DAPR_GRPC_PORT ?? "50001");
const DAPR_APP_ID = process.env.DAPR_APP_ID ?? "realestate-app";
const DAPR_STATE_STORE = process.env.DAPR_STATE_STORE ?? "statestore";
const DAPR_PUBSUB_NAME = process.env.DAPR_PUBSUB_NAME ?? "pubsub";
const DAPR_BASE_URL = `http://localhost:${DAPR_HTTP_PORT}`;

// ── Dapr Client ────────────────────────────────────────────────────────────

class DaprClient {
  private client: AxiosInstance;
  private available = false;

  constructor() {
    this.client = axios.create({
      baseURL: DAPR_BASE_URL,
      timeout: 10000,
      headers: { "Content-Type": "application/json" },
    });
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    try {
      await this.client.get("/v1.0/healthz");
      this.available = true;
      logger.info(`[Dapr] Sidecar available at ${DAPR_BASE_URL}`);
    } catch {
      this.available = false;
      logger.warn("[Dapr] Sidecar not available — direct service calls will be used");
    }
  }

  // ── State Management ───────────────────────────────────────────────────

  async getState<T>(key: string): Promise<T | null> {
    if (!this.available) return null;
    try {
      const response = await this.client.get(`/v1.0/state/${DAPR_STATE_STORE}/${encodeURIComponent(key)}`);
      return response.data ?? null;
    } catch (err: any) {
      if (err.response?.status === 204 || err.response?.status === 404) return null;
      logger.warn({ err: err.message, key }, "[Dapr] getState failed");
      return null;
    }
  }

  async setState(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.available) return;
    try {
      const item: any = { key, value };
      if (ttlSeconds) item.metadata = { ttlInSeconds: String(ttlSeconds) };
      await this.client.post(`/v1.0/state/${DAPR_STATE_STORE}`, [item]);
    } catch (err: any) {
      logger.warn({ err: err.message, key }, "[Dapr] setState failed");
    }
  }

  async deleteState(key: string): Promise<void> {
    if (!this.available) return;
    try {
      await this.client.delete(`/v1.0/state/${DAPR_STATE_STORE}/${encodeURIComponent(key)}`);
    } catch (err: any) {
      logger.warn({ err: err.message, key }, "[Dapr] deleteState failed");
    }
  }

  async bulkGetState(keys: string[]): Promise<Record<string, any>> {
    if (!this.available) return {};
    try {
      const response = await this.client.post(`/v1.0/state/${DAPR_STATE_STORE}/bulk`, {
        keys,
        parallelism: 10,
      });
      const result: Record<string, any> = {};
      for (const item of response.data ?? []) {
        if (item.data !== undefined) result[item.key] = item.data;
      }
      return result;
    } catch (err: any) {
      logger.warn({ err: err.message }, "[Dapr] bulkGetState failed");
      return {};
    }
  }

  // ── Pub/Sub ────────────────────────────────────────────────────────────

  async publish(topic: string, data: any, metadata?: Record<string, string>): Promise<void> {
    if (!this.available) return;
    try {
      await this.client.post(
        `/v1.0/publish/${DAPR_PUBSUB_NAME}/${encodeURIComponent(topic)}`,
        data,
        { params: metadata }
      );
    } catch (err: any) {
      logger.warn({ err: err.message, topic }, "[Dapr] publish failed");
    }
  }

  // ── Service Invocation ─────────────────────────────────────────────────

  async invokeService<T = any>(
    appId: string,
    method: string,
    data?: any,
    httpMethod: "GET" | "POST" | "PUT" | "DELETE" = "POST"
  ): Promise<T | null> {
    if (!this.available) return null;
    try {
      const response = await this.client.request({
        method: httpMethod,
        url: `/v1.0/invoke/${appId}/method/${method}`,
        data,
      });
      return response.data as T;
    } catch (err: any) {
      logger.warn({ err: err.message, appId, method }, "[Dapr] invokeService failed");
      return null;
    }
  }

  // ── Secrets ────────────────────────────────────────────────────────────

  async getSecret(storeName: string, secretName: string): Promise<Record<string, string> | null> {
    if (!this.available) return null;
    try {
      const response = await this.client.get(`/v1.0/secrets/${storeName}/${encodeURIComponent(secretName)}`);
      return response.data ?? null;
    } catch (err: any) {
      logger.warn({ err: err.message, secretName }, "[Dapr] getSecret failed");
      return null;
    }
  }

  // ── Distributed Tracing Metadata ───────────────────────────────────────

  getTraceHeaders(): Record<string, string> {
    return {
      "dapr-app-id": DAPR_APP_ID,
    };
  }

  // ── Health ─────────────────────────────────────────────────────────────

  get isAvailable(): boolean {
    return this.available;
  }

  async healthCheck(): Promise<{ available: boolean; port: number }> {
    try {
      await this.client.get("/v1.0/healthz");
      this.available = true;
      return { available: true, port: DAPR_HTTP_PORT };
    } catch {
      this.available = false;
      return { available: false, port: DAPR_HTTP_PORT };
    }
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const dapr = new DaprClient();
export default dapr;

// ── Dapr Topic Constants ───────────────────────────────────────────────────

export const DAPR_TOPICS = {
  PROPERTY_CREATED: "property.created",
  PROPERTY_UPDATED: "property.updated",
  PROPERTY_SOLD: "property.sold",
  TRANSACTION_INITIATED: "transaction.initiated",
  TRANSACTION_COMPLETED: "transaction.completed",
  PAYMENT_PROCESSED: "payment.processed",
  ESCROW_CREATED: "escrow.created",
  ESCROW_RELEASED: "escrow.released",
  FRAUD_DETECTED: "fraud.detected",
  USER_REGISTERED: "user.registered",
  DOCUMENT_NOTARIZED: "document.notarized",
  ALERT_TRIGGERED: "alert.triggered",
} as const;
