/**
 * Performance Monitoring and Error Tracking
 * Integrates with Sentry for production monitoring
 */

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Request, Response, NextFunction } from 'express';

interface MonitoringConfig {
  dsn?: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  enabled: boolean;
}

class PerformanceMonitoring {
  private config: MonitoringConfig;
  private initialized = false;

  constructor() {
    this.config = {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || '1.0.0',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
      enabled: process.env.SENTRY_ENABLED === 'true',
    };
  }

  /**
   * Initialize Sentry monitoring
   */
  initialize() {
    if (this.initialized || !this.config.enabled || !this.config.dsn) {
      console.log('[Monitoring] Sentry disabled or DSN not configured');
      return;
    }

    try {
      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        
        // Performance Monitoring
        tracesSampleRate: this.config.tracesSampleRate,
        
        // Profiling
        profilesSampleRate: this.config.profilesSampleRate,
        integrations: [
          new ProfilingIntegration(),
        ],

        // Error filtering
        beforeSend(event, hint) {
          // Filter out certain errors
          const error = hint.originalException;
          
          if (error instanceof Error) {
            // Ignore certain error types
            if (error.message.includes('ECONNRESET') || 
                error.message.includes('ETIMEDOUT')) {
              return null;
            }
          }

          return event;
        },

        // Add custom tags
        initialScope: {
          tags: {
            service: 'realestate-platform',
          },
        },
      });

      this.initialized = true;
      console.log('[Monitoring] Sentry initialized successfully');
    } catch (error) {
      console.error('[Monitoring] Failed to initialize Sentry:', error);
    }
  }

  /**
   * Express middleware for request tracking
   */
  requestHandler() {
    return Sentry.Handlers.requestHandler();
  }

  /**
   * Express middleware for error tracking
   */
  errorHandler() {
    return Sentry.Handlers.errorHandler();
  }

  /**
   * Track custom event
   */
  trackEvent(name: string, data?: Record<string, any>) {
    if (!this.initialized) return;

    Sentry.addBreadcrumb({
      category: 'custom',
      message: name,
      data,
      level: 'info',
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, any>) {
    if (!this.initialized) {
      console.error('[Monitoring] Error:', error, context);
      return;
    }

    Sentry.captureException(error, {
      extra: context,
    });
  }

  /**
   * Track message
   */
  trackMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (!this.initialized) {
      console.log(`[Monitoring] ${level.toUpperCase()}: ${message}`);
      return;
    }

    Sentry.captureMessage(message, level);
  }

  /**
   * Set user context
   */
  setUser(user: { id: number; email?: string; username?: string }) {
    if (!this.initialized) return;

    Sentry.setUser({
      id: user.id.toString(),
      email: user.email,
      username: user.username,
    });
  }

  /**
   * Clear user context
   */
  clearUser() {
    if (!this.initialized) return;

    Sentry.setUser(null);
  }

  /**
   * Add custom tag
   */
  setTag(key: string, value: string) {
    if (!this.initialized) return;

    Sentry.setTag(key, value);
  }

  /**
   * Start transaction for performance monitoring
   */
  startTransaction(name: string, op: string) {
    if (!this.initialized) {
      return null;
    }

    return Sentry.startTransaction({
      name,
      op,
    });
  }

  /**
   * Middleware for API performance tracking
   */
  apiPerformanceMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.initialized) {
        return next();
      }

      const transaction = Sentry.startTransaction({
        op: 'http.server',
        name: `${req.method} ${req.path}`,
      });

      // Add request context
      Sentry.getCurrentHub().configureScope((scope) => {
        scope.setSpan(transaction);
        scope.setContext('request', {
          method: req.method,
          url: req.url,
          headers: req.headers,
          query: req.query,
        });
      });

      // Track response time
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        transaction.setHttpStatus(res.statusCode);
        transaction.setData('duration', duration);
        transaction.finish();

        // Log slow requests
        if (duration > 1000) {
          this.trackMessage(
            `Slow API request: ${req.method} ${req.path} took ${duration}ms`,
            'warning'
          );
        }
      });

      next();
    };
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(query: string, duration: number, success: boolean) {
    if (!this.initialized) return;

    const span = Sentry.getCurrentHub().getScope()?.getSpan();
    if (span) {
      const child = span.startChild({
        op: 'db.query',
        description: query,
      });

      child.setData('duration', duration);
      child.setStatus(success ? 'ok' : 'internal_error');
      child.finish();
    }

    // Log slow queries
    if (duration > 500) {
      this.trackMessage(
        `Slow database query: ${query} took ${duration}ms`,
        'warning'
      );
    }
  }

  /**
   * Track external API call performance
   */
  trackExternalAPI(service: string, endpoint: string, duration: number, success: boolean) {
    if (!this.initialized) return;

    const span = Sentry.getCurrentHub().getScope()?.getSpan();
    if (span) {
      const child = span.startChild({
        op: 'http.client',
        description: `${service}: ${endpoint}`,
      });

      child.setData('duration', duration);
      child.setData('service', service);
      child.setStatus(success ? 'ok' : 'internal_error');
      child.finish();
    }

    // Log slow API calls
    if (duration > 2000) {
      this.trackMessage(
        `Slow external API call: ${service} ${endpoint} took ${duration}ms`,
        'warning'
      );
    }
  }

  /**
   * Track memory usage
   */
  trackMemoryUsage() {
    if (!this.initialized) return;

    const usage = process.memoryUsage();
    
    Sentry.addBreadcrumb({
      category: 'system',
      message: 'Memory usage',
      data: {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      },
      level: 'info',
    });

    // Alert on high memory usage
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 1024) { // > 1GB
      this.trackMessage(
        `High memory usage: ${Math.round(heapUsedMB)}MB heap used`,
        'warning'
      );
    }
  }

  /**
   * Flush pending events (useful for serverless)
   */
  async flush(timeout = 2000) {
    if (!this.initialized) return;

    try {
      await Sentry.flush(timeout);
    } catch (error) {
      console.error('[Monitoring] Failed to flush events:', error);
    }
  }
}

// Export singleton instance
export const monitoring = new PerformanceMonitoring();

// Helper function to wrap async functions with error tracking
export function withMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: Record<string, any>
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        monitoring.trackError(error, {
          ...context,
          function: fn.name,
          arguments: args,
        });
      }
      throw error;
    }
  }) as T;
}

// Helper function to measure execution time
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    monitoring.trackEvent('performance', {
      name,
      duration,
      success: true,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    monitoring.trackEvent('performance', {
      name,
      duration,
      success: false,
    });
    
    throw error;
  }
}
