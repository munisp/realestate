import { createContext, useContext, useState, ReactNode } from 'react';

export type MapProvider = 'google' | 'maplibre';

interface MapProviderContextType {
  provider: MapProvider;
  setProvider: (provider: MapProvider) => void;
  isMapLibreEnabled: boolean;
  toggleProvider: () => void;
}

const MapProviderContext = createContext<MapProviderContextType | undefined>(undefined);

export function MapProviderProvider({ children }: { children: ReactNode }) {
  // Feature flag: Enable MapLibre by default for testing
  // In production, this would be controlled by user preferences or A/B testing
  const [provider, setProvider] = useState<MapProvider>(() => {
    // Check localStorage for user preference
    const saved = localStorage.getItem('map-provider');
    if (saved) return saved as MapProvider;

    // A/B Testing: 10% rollout to MapLibre
    // Use session-based assignment for consistency
    const sessionId = sessionStorage.getItem('ab-test-session') || 
      Math.random().toString(36).substring(7);
    sessionStorage.setItem('ab-test-session', sessionId);

    // Hash session ID to get consistent assignment
    const hash = sessionId.split('').reduce((acc, char) => 
      ((acc << 5) - acc) + char.charCodeAt(0), 0);
    const bucket = Math.abs(hash) % 100;

    // 10% get MapLibre, 90% get Google Maps
    const assigned = bucket < 10 ? 'maplibre' : 'google';
    console.log(`[A/B Test] Assigned to: ${assigned} (bucket: ${bucket})`);
    
    return assigned;
  });

  const [isMapLibreEnabled] = useState(true); // Feature flag

  const toggleProvider = () => {
    const newProvider = provider === 'google' ? 'maplibre' : 'google';
    setProvider(newProvider);
    localStorage.setItem('map-provider', newProvider);
  };

  return (
    <MapProviderContext.Provider
      value={{
        provider,
        setProvider: (p) => {
          setProvider(p);
          localStorage.setItem('map-provider', p);
        },
        isMapLibreEnabled,
        toggleProvider,
      }}
    >
      {children}
    </MapProviderContext.Provider>
  );
}

export function useMapProvider() {
  const context = useContext(MapProviderContext);
  if (!context) {
    throw new Error('useMapProvider must be used within MapProviderProvider');
  }
  return context;
}
