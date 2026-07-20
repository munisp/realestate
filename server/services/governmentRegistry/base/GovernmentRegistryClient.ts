import axios, { AxiosInstance, AxiosError } from 'axios';
import { RegistryConfig, RegistryError, GovernmentRegistryClient as IGovernmentRegistryClient } from './types';
import { logger } from "../../../_core/logger";

/**
 * Base class for government registry clients
 * Provides common functionality for HTTP requests, authentication, rate limiting, and error handling
 */
export abstract class BaseGovernmentRegistryClient implements IGovernmentRegistryClient {
  protected client: AxiosInstance;
  protected config: RegistryConfig;
  protected state: string;
  protected accessToken?: string;
  protected tokenExpiry?: Date;
  
  // Rate limiting
  private requestQueue: Array<() => Promise<any>> = [];
  private requestTimestamps: number[] = [];
  private isProcessingQueue = false;

  constructor(state: string, config: RegistryConfig) {
    this.state = state;
    this.config = config;
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RealEstatePlatform/1.0',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        await this.ensureAuthenticated();
        return this.addAuthHeaders(config);
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  /**
   * Ensure client is authenticated before making requests
   */
  protected async ensureAuthenticated(): Promise<void> {
    if (this.config.authType === 'oauth' || this.config.authType === 'jwt') {
      if (!this.accessToken || (this.tokenExpiry && this.tokenExpiry < new Date())) {
        await this.authenticate();
      }
    }
  }

  /**
   * Authenticate with the government registry API
   * Override this method in state-specific implementations
   */
  protected abstract authenticate(): Promise<void>;

  /**
   * Add authentication headers to request
   */
  protected addAuthHeaders(config: any): any {
    switch (this.config.authType) {
      case 'oauth':
      case 'jwt':
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        break;
      case 'api_key':
        if (this.config.credentials.apiKey) {
          config.headers['X-API-Key'] = this.config.credentials.apiKey;
        }
        break;
      case 'basic':
        if (this.config.credentials.username && this.config.credentials.password) {
          const auth = Buffer.from(
            `${this.config.credentials.username}:${this.config.credentials.password}`
          ).toString('base64');
          config.headers.Authorization = `Basic ${auth}`;
        }
        break;
    }
    return config;
  }

  /**
   * Handle API errors
   */
  protected handleError(error: AxiosError): Promise<never> {
    const registryError: RegistryError = {
      code: error.response?.status?.toString() || 'UNKNOWN_ERROR',
      message: error.message,
      state: this.state,
      timestamp: new Date(),
      retryable: this.isRetryable(error),
      fallbackAvailable: true,
      originalError: error,
    };

    logger.error(`[${this.state} Registry] Error:`, { error: String(registryError) });
    
    return Promise.reject(registryError);
  }

  /**
   * Determine if error is retryable
   */
  protected isRetryable(error: AxiosError): boolean {
    if (!error.response) return true; // Network errors are retryable
    
    const status = error.response.status;
    return status === 429 || status >= 500;
  }

  /**
   * Make rate-limited request
   */
  protected async makeRateLimitedRequest<T>(
    requestFn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.executeWithRetry(requestFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Process request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Clean up old timestamps
      const now = Date.now();
      const windowMs = this.config.rateLimit.perMinutes * 60 * 1000;
      this.requestTimestamps = this.requestTimestamps.filter(
        (timestamp) => now - timestamp < windowMs
      );

      // Check if we can make a request
      if (this.requestTimestamps.length < this.config.rateLimit.maxRequests) {
        const request = this.requestQueue.shift();
        if (request) {
          this.requestTimestamps.push(now);
          await request();
        }
      } else {
        // Wait before checking again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Execute request with retry logic
   */
  protected async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      if (attempt >= this.config.retryConfig.maxRetries || !error.retryable) {
        throw error;
      }

      const delay =
        this.config.retryConfig.retryDelay *
        Math.pow(this.config.retryConfig.backoffMultiplier, attempt - 1);

      console.log(
        `[${this.state} Registry] Retrying request (attempt ${attempt + 1}/${
          this.config.retryConfig.maxRetries
        }) after ${delay}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.executeWithRetry(requestFn, attempt + 1);
    }
  }

  /**
   * Get state identifier
   */
  public getState(): string {
    return this.state;
  }

  /**
   * Abstract methods to be implemented by state-specific clients
   */
  abstract verifyCofO(cofoNumber: string): Promise<any>;
  abstract getLandRecord(parcelId: string): Promise<any>;
  abstract getOwnershipHistory(parcelId: string): Promise<any>;
  abstract submitVerificationRequest(data: any): Promise<any>;
  abstract healthCheck(): Promise<boolean>;
}
