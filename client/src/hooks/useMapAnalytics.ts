import { useEffect, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

export type MapProvider = 'google' | 'maplibre';
export type MapEventType = 'load' | 'interaction' | 'error' | 'switch';

interface MapAnalyticsEvent {
  provider: MapProvider;
  eventType: MapEventType;
  loadTime?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Hook for tracking map analytics events
 * Automatically tracks load time and sends events to backend
 */
export function useMapAnalytics(provider: MapProvider) {
  const { user } = useAuth();
  const sessionId = useRef<string>();
  const loadStartTime = useRef<number>();
  const trackEvent = trpc.mapAnalytics.trackEvent.useMutation();

  // Initialize session ID
  useEffect(() => {
    if (!sessionId.current) {
      sessionId.current =
        sessionStorage.getItem('ab-test-session') ||
        Math.random().toString(36).substring(7);
      sessionStorage.setItem('ab-test-session', sessionId.current);
    }
  }, []);

  // Track map load start
  useEffect(() => {
    loadStartTime.current = Date.now();
  }, [provider]);

  /**
   * Track analytics event
   */
  const track = (event: MapAnalyticsEvent) => {
    if (!sessionId.current) return;

    trackEvent.mutate({
      userId: user?.id,
      sessionId: sessionId.current,
      provider: event.provider,
      eventType: event.eventType,
      loadTime: event.loadTime,
      errorMessage: event.errorMessage,
      metadata: event.metadata,
    });
  };

  /**
   * Track map load complete
   */
  const trackLoad = () => {
    if (!loadStartTime.current) return;

    const loadTime = Date.now() - loadStartTime.current;
    track({
      provider,
      eventType: 'load',
      loadTime,
    });

    console.log(`[Map Analytics] ${provider} loaded in ${loadTime}ms`);
  };

  /**
   * Track map interaction (pan, zoom, etc.)
   */
  const trackInteraction = (interactionType: string) => {
    track({
      provider,
      eventType: 'interaction',
      metadata: { interactionType },
    });
  };

  /**
   * Track map error
   */
  const trackError = (errorMessage: string, metadata?: Record<string, any>) => {
    track({
      provider,
      eventType: 'error',
      errorMessage,
      metadata,
    });

    console.error(`[Map Analytics] ${provider} error:`, errorMessage);
  };

  /**
   * Track provider switch
   */
  const trackSwitch = (fromProvider: MapProvider, toProvider: MapProvider) => {
    track({
      provider: fromProvider,
      eventType: 'switch',
      metadata: { toProvider },
    });

    console.log(`[Map Analytics] Switched from ${fromProvider} to ${toProvider}`);
  };

  return {
    trackLoad,
    trackInteraction,
    trackError,
    trackSwitch,
  };
}
