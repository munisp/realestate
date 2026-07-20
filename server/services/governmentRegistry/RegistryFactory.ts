import { GovernmentRegistryClient, StateCode } from './base/types';
import { LagosRegistryClient } from './implementations/LagosRegistryClient';
import { FCTRegistryClient } from './implementations/FCTRegistryClient';
import { RiversRegistryClient } from './implementations/RiversRegistryClient';
import { KanoRegistryClient } from './implementations/KanoRegistryClient';
import { OyoRegistryClient } from './implementations/OyoRegistryClient';
import { logger } from "../../_core/logger";

/**
 * Factory class to create and manage government registry clients
 * Implements singleton pattern to reuse client instances
 */
export class RegistryFactory {
  private static clients: Map<StateCode, GovernmentRegistryClient> = new Map();

  /**
   * Get a registry client for a specific state
   * Returns cached instance if available
   */
  static getClient(state: StateCode): GovernmentRegistryClient {
    // Return cached client if exists
    if (this.clients.has(state)) {
      return this.clients.get(state)!;
    }

    // Create new client based on state
    let client: GovernmentRegistryClient;

    switch (state) {
      case 'LAGOS':
        client = new LagosRegistryClient();
        break;
      case 'FCT':
        client = new FCTRegistryClient();
        break;
      case 'RIVERS':
        client = new RiversRegistryClient();
        break;
      case 'KANO':
        client = new KanoRegistryClient();
        break;
      case 'OYO':
        client = new OyoRegistryClient();
        break;
      default:
        throw new Error(`Unsupported state: ${state}`);
    }

    // Cache the client
    this.clients.set(state, client);
    return client;
  }

  /**
   * Get all available state codes
   */
  static getAvailableStates(): StateCode[] {
    return ['LAGOS', 'FCT', 'RIVERS', 'KANO', 'OYO'];
  }

  /**
   * Check if a state is supported
   */
  static isStateSupported(state: string): state is StateCode {
    const supportedStates: StateCode[] = ['LAGOS', 'FCT', 'RIVERS', 'KANO', 'OYO'];
    return supportedStates.includes(state as StateCode);
  }

  /**
   * Clear all cached clients (useful for testing)
   */
  static clearCache(): void {
    this.clients.clear();
  }

  /**
   * Health check for all available registries
   */
  static async healthCheckAll(): Promise<Record<StateCode, boolean>> {
    const results: Partial<Record<StateCode, boolean>> = {};
    const states = this.getAvailableStates();

    await Promise.all(
      states.map(async (state) => {
        try {
          const client = this.getClient(state);
          results[state] = await client.healthCheck();
        } catch (error) {
          logger.error(`[RegistryFactory] Health check failed for ${state}:`, { error: String(error) });
          results[state] = false;
        }
      })
    );

    return results as Record<StateCode, boolean>;
  }
}
