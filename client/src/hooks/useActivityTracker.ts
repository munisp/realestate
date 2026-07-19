// @ts-nocheck
import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';

interface TrackActivityOptions {
  activityType: 'view' | 'search' | 'favorite' | 'inquiry' | 'comparison' | 'download';
  propertyId?: number;
  searchQuery?: string;
  metadata?: Record<string, any>;
}

export function useActivityTracker(options: TrackActivityOptions) {
  const trackActivity = trpc.analytics.trackActivity.useMutation();
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();

    return () => {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      trackActivity.mutate({
        ...options,
        metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
        duration,
      });
    };
  }, [options.propertyId, options.activityType]);
}

interface TrackIntentSignalOptions {
  signalType: 'repeat_view' | 'long_view' | 'favorite' | 'inquiry' | 'comparison' | 'download_docs' | 'mortgage_calc';
  propertyId?: number;
  weight?: number;
}

export function useIntentSignalTracker() {
  const trackSignal = trpc.analytics.trackIntentSignal.useMutation();

  return (options: TrackIntentSignalOptions) => {
    trackSignal.mutate(options);
  };
}
