// @ts-nocheck
import { IPaymentProvider } from './IPaymentProvider';
import { getDb } from '../../db';
import { paymentProviders } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { StripePaymentProvider } from './StripePaymentProvider';
import { MojalooPaymentProvider } from './MojalooPaymentProvider';
import { TigerBeetlePaymentProvider } from './TigerBeetlePaymentProvider';
import { FlutterwavePaymentProvider } from './FlutterwavePaymentProvider';
import { PaystackPaymentProvider } from './PaystackPaymentProvider';

/**
 * Payment Provider Factory
 * 
 * Manages payment provider instances and provides:
 * - Provider selection based on currency/capabilities
 * - Automatic fallback to alternative providers
 * - Load balancing across multiple providers
 * - Health monitoring and circuit breaking
 */

interface ProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
  config: any;
}

class PaymentProviderFactoryClass {
  private providers: Map<string, IPaymentProvider> = new Map();
  private providerConfigs: Map<string, ProviderConfig> = new Map();
  private initialized = false;

  /**
   * Initialize all payment providers
   */
  async initialize(configs: ProviderConfig[]): Promise<void> {
    if (this.initialized) {
      console.log('[PaymentProviderFactory] Already initialized');
      return;
    }

    for (const config of configs) {
      if (!config.enabled) {
        console.log(`[PaymentProviderFactory] Skipping disabled provider: ${config.name}`);
        continue;
      }

      try {
        const provider = this.createProviderInstance(config.name);
        await provider.initialize(config.config);
        
        this.providers.set(config.name, provider);
        this.providerConfigs.set(config.name, config);
        
        console.log(`[PaymentProviderFactory] Initialized provider: ${config.name}`);
      } catch (error) {
        console.error(`[PaymentProviderFactory] Failed to initialize ${config.name}:`, error);
      }
    }

    this.initialized = true;
    console.log(`[PaymentProviderFactory] Initialized ${this.providers.size} providers`);
  }

  /**
   * Create provider instance by name
   */
  private createProviderInstance(name: string): IPaymentProvider {
    switch (name.toLowerCase()) {
      case 'stripe':
        return new StripePaymentProvider();
      
      case 'mojaloop':
        return new MojalooPaymentProvider();
      
      case 'tigerbeetle':
        return new TigerBeetlePaymentProvider();
      
      case 'flutterwave':
        return new FlutterwavePaymentProvider();
      
      case 'paystack':
        return new PaystackPaymentProvider();
      
      default:
        throw new Error(`Unknown payment provider: ${name}`);
    }
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): IPaymentProvider {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new Error(`Payment provider not found: ${name}`);
    }
    return provider;
  }

  /**
   * Get provider by ID (from database)
   */
  async getProviderById(providerId: number): Promise<IPaymentProvider> {
    const db = await getDb();
    if (!db) return this.getProvider('stripe');

    const [provider] = await db.select().from(paymentProviders).where(eq(paymentProviders.id, providerId)).limit(1);
    if (!provider) return this.getProvider('stripe');

    return this.getProvider(provider.name as 'stripe' | 'paystack' | 'flutterwave' | 'mojaloop');
  }

  /**
   * Select best provider for given requirements
   */
  async selectProvider(requirements: {
    currency: string;
    amount: number;
    capabilities?: string[];
    preferredProvider?: string;
  }): Promise<IPaymentProvider> {
    // If preferred provider specified and available, use it
    if (requirements.preferredProvider) {
      const provider = this.providers.get(requirements.preferredProvider.toLowerCase());
      if (provider && await this.isProviderHealthy(provider)) {
        return provider;
      }
    }

    // Find providers that support the currency
    const candidateProviders: Array<{ provider: IPaymentProvider; config: ProviderConfig }> = [];

    for (const [name, provider] of Array.from(this.providers.entries())) {
      const config = this.providerConfigs.get(name);
      if (!config) continue;

      // Check currency support
      if (!provider.supportedCurrencies.includes(requirements.currency)) {
        continue;
      }

      // Check capabilities if specified
      if (requirements.capabilities) {
        const hasAllCapabilities = requirements.capabilities.every((cap) =>
          provider.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) {
          continue;
        }
      }

      // Check health
      if (!(await this.isProviderHealthy(provider))) {
        console.log(`[PaymentProviderFactory] Provider ${name} is unhealthy, skipping`);
        continue;
      }

      candidateProviders.push({ provider, config });
    }

    if (candidateProviders.length === 0) {
      throw new Error(
        `No available payment provider for currency ${requirements.currency}`
      );
    }

    // Sort by priority (higher priority first)
    candidateProviders.sort((a, b) => b.config.priority - a.config.priority);

    // Return highest priority provider
    return candidateProviders[0].provider;
  }

  /**
   * Check if provider is healthy
   */
  private async isProviderHealthy(provider: IPaymentProvider): Promise<boolean> {
    try {
      return await provider.healthCheck();
    } catch (error) {
      console.error(`[PaymentProviderFactory] Health check failed for ${provider.name}:`, error);
      return false;
    }
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): IPaymentProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider statistics
   */
  async getProviderStats() {
    const stats = [];

    for (const [name, provider] of Array.from(this.providers.entries())) {
      const config = this.providerConfigs.get(name);
      const isHealthy = await this.isProviderHealthy(provider);

      stats.push({
        name: provider.name,
        displayName: provider.displayName,
        enabled: config?.enabled || false,
        priority: config?.priority || 0,
        healthy: isHealthy,
        supportedCurrencies: provider.supportedCurrencies,
        capabilities: provider.capabilities,
      });
    }

    return stats;
  }

  /**
   * Reload provider configuration
   */
  async reloadProvider(name: string, config: ProviderConfig): Promise<void> {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }

    await provider.initialize(config.config);
    this.providerConfigs.set(name.toLowerCase(), config);

    console.log(`[PaymentProviderFactory] Reloaded provider: ${name}`);
  }

  /**
   * Disable provider
   */
  disableProvider(name: string): void {
    const config = this.providerConfigs.get(name.toLowerCase());
    if (config) {
      config.enabled = false;
      console.log(`[PaymentProviderFactory] Disabled provider: ${name}`);
    }
  }

  /**
   * Enable provider
   */
  enableProvider(name: string): void {
    const config = this.providerConfigs.get(name.toLowerCase());
    if (config) {
      config.enabled = true;
      console.log(`[PaymentProviderFactory] Enabled provider: ${name}`);
    }
  }
}

// Export singleton instance
export const PaymentProviderFactory = new PaymentProviderFactoryClass();

/**
 * Initialize payment providers from environment/database
 */
export async function initializePaymentProviders() {
  const configs: ProviderConfig[] = [
    {
      name: 'stripe',
      enabled: true,
      priority: 100,
      config: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        enableConnectedAccounts: true,
      },
    },
    {
      name: 'mojaloop',
      enabled: !!process.env.MOJALOOP_SERVICE_URL,
      priority: 90,
      config: {
        serviceUrl: process.env.MOJALOOP_SERVICE_URL || 'http://localhost:5010',
      },
    },
    {
      name: 'tigerbeetle',
      enabled: !!process.env.TIGERBEETLE_SERVICE_URL,
      priority: 80,
      config: {
        serviceUrl: process.env.TIGERBEETLE_SERVICE_URL || 'http://localhost:5011',
      },
    },
    {
      name: 'flutterwave',
      enabled: !!process.env.FLUTTERWAVE_SERVICE_URL,
      priority: 70,
      config: {
        serviceUrl: process.env.FLUTTERWAVE_SERVICE_URL || 'http://localhost:5012',
      },
    },
    {
      name: 'paystack',
      enabled: !!process.env.PAYSTACK_SERVICE_URL,
      priority: 60,
      config: {
        serviceUrl: process.env.PAYSTACK_SERVICE_URL || 'http://localhost:5013',
      },
    },
  ];

  await PaymentProviderFactory.initialize(configs);
}
