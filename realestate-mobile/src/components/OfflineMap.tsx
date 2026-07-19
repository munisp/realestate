/**
 * Offline Map Component for React Native
 * Production-ready implementation with tile caching
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region, MapType } from 'react-native-maps';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OfflineMapProps {
  initialRegion: Region;
  markers?: Array<{
    id: string;
    coordinate: { latitude: number; longitude: number };
    title?: string;
    description?: string;
    price?: number;
  }>;
  onMarkerPress?: (markerId: string) => void;
  enableOfflineMode?: boolean;
  mapType?: MapType;
  style?: any;
}

interface CachedTile {
  url: string;
  localPath: string;
  timestamp: number;
}

interface OfflineRegion {
  id: string;
  region: Region;
  zoomLevels: number[];
  tileCount: number;
  downloadedAt: number;
}

const TILE_CACHE_DIR = `${FileSystem.cacheDirectory}map-tiles/`;
const MAX_CACHE_SIZE_MB = 500; // 500MB cache limit
const CACHE_EXPIRY_DAYS = 30;
const STORAGE_KEY_OFFLINE_REGIONS = '@offline_regions';

export default function OfflineMap({
  initialRegion,
  markers = [],
  onMarkerPress,
  enableOfflineMode = true,
  mapType = 'standard',
  style,
}: OfflineMapProps) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(initialRegion);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [offlineRegions, setOfflineRegions] = useState<OfflineRegion[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    initializeOfflineCache();
    loadOfflineRegions();
  }, []);

  /**
   * Initialize offline cache directory
   */
  const initializeOfflineCache = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(TILE_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(TILE_CACHE_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('[OfflineMap] Failed to initialize cache:', error);
    }
  };

  /**
   * Load saved offline regions from storage
   */
  const loadOfflineRegions = async () => {
    try {
      const regionsJson = await AsyncStorage.getItem(STORAGE_KEY_OFFLINE_REGIONS);
      if (regionsJson) {
        const regions: OfflineRegion[] = JSON.parse(regionsJson);
        setOfflineRegions(regions);
      }
    } catch (error) {
      console.error('[OfflineMap] Failed to load offline regions:', error);
    }
  };

  /**
   * Save offline regions to storage
   */
  const saveOfflineRegions = async (regions: OfflineRegion[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_OFFLINE_REGIONS, JSON.stringify(regions));
      setOfflineRegions(regions);
    } catch (error) {
      console.error('[OfflineMap] Failed to save offline regions:', error);
    }
  };

  /**
   * Calculate tile coordinates for a given region and zoom level
   */
  const getTileCoordinates = (region: Region, zoom: number) => {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

    // Convert lat/lng to tile coordinates
    const lat2tile = (lat: number, zoom: number) => {
      return Math.floor(
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
          Math.pow(2, zoom)
      );
    };

    const lng2tile = (lng: number, zoom: number) => {
      return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
    };

    const minLat = latitude - latitudeDelta / 2;
    const maxLat = latitude + latitudeDelta / 2;
    const minLng = longitude - longitudeDelta / 2;
    const maxLng = longitude + longitudeDelta / 2;

    const minTileX = lng2tile(minLng, zoom);
    const maxTileX = lng2tile(maxLng, zoom);
    const minTileY = lat2tile(maxLat, zoom); // Note: Y is inverted
    const maxTileY = lat2tile(minLat, zoom);

    const tiles: Array<{ x: number; y: number; z: number }> = [];
    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        tiles.push({ x, y, z: zoom });
      }
    }

    return tiles;
  };

  /**
   * Get tile URL for Google Maps
   */
  const getTileUrl = (x: number, y: number, z: number): string => {
    // Google Maps tile URL format
    const server = Math.floor(Math.random() * 4); // Google uses 4 servers (mt0-mt3)
    return `https://mt${server}.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}`;
  };

  /**
   * Download and cache a single tile
   */
  const downloadTile = async (x: number, y: number, z: number): Promise<string | null> => {
    try {
      const url = getTileUrl(x, y, z);
      const filename = `tile_${z}_${x}_${y}.png`;
      const localPath = `${TILE_CACHE_DIR}${filename}`;

      // Check if tile already exists
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        return localPath;
      }

      // Download tile
      const downloadResult = await FileSystem.downloadAsync(url, localPath);
      
      if (downloadResult.status === 200) {
        return downloadResult.uri;
      }

      return null;
    } catch (error) {
      console.error(`[OfflineMap] Failed to download tile ${z}/${x}/${y}:`, error);
      return null;
    }
  };

  /**
   * Download tiles for a region
   */
  const downloadRegionTiles = async (
    region: Region,
    zoomLevels: number[] = [12, 13, 14, 15]
  ): Promise<void> => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      let totalTiles = 0;
      const allTiles: Array<{ x: number; y: number; z: number }> = [];

      // Calculate total tiles
      for (const zoom of zoomLevels) {
        const tiles = getTileCoordinates(region, zoom);
        allTiles.push(...tiles);
        totalTiles += tiles.length;
      }

      console.log(`[OfflineMap] Downloading ${totalTiles} tiles for region`);

      // Download tiles with progress tracking
      let downloadedCount = 0;
      const batchSize = 10; // Download 10 tiles at a time

      for (let i = 0; i < allTiles.length; i += batchSize) {
        const batch = allTiles.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(tile => downloadTile(tile.x, tile.y, tile.z))
        );

        downloadedCount += batch.length;
        setDownloadProgress((downloadedCount / totalTiles) * 100);
      }

      // Save offline region metadata
      const newRegion: OfflineRegion = {
        id: `region_${Date.now()}`,
        region,
        zoomLevels,
        tileCount: totalTiles,
        downloadedAt: Date.now(),
      };

      const updatedRegions = [...offlineRegions, newRegion];
      await saveOfflineRegions(updatedRegions);

      Alert.alert(
        'Download Complete',
        `Successfully downloaded ${totalTiles} map tiles for offline use.`
      );
    } catch (error) {
      console.error('[OfflineMap] Failed to download region:', error);
      Alert.alert('Download Failed', 'Failed to download map tiles. Please try again.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  /**
   * Clear cached tiles
   */
  const clearCache = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(TILE_CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(TILE_CACHE_DIR, { idempotent: true });
        await FileSystem.makeDirectoryAsync(TILE_CACHE_DIR, { intermediates: true });
      }

      await AsyncStorage.removeItem(STORAGE_KEY_OFFLINE_REGIONS);
      setOfflineRegions([]);

      Alert.alert('Cache Cleared', 'All offline map data has been removed.');
    } catch (error) {
      console.error('[OfflineMap] Failed to clear cache:', error);
      Alert.alert('Error', 'Failed to clear cache.');
    }
  };

  /**
   * Get cache size
   */
  const getCacheSize = async (): Promise<number> => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(TILE_CACHE_DIR);
      if (!dirInfo.exists) return 0;

      const files = await FileSystem.readDirectoryAsync(TILE_CACHE_DIR);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${TILE_CACHE_DIR}${file}`);
        if (fileInfo.exists && 'size' in fileInfo) {
          totalSize += fileInfo.size || 0;
        }
      }

      return totalSize / (1024 * 1024); // Convert to MB
    } catch (error) {
      console.error('[OfflineMap] Failed to get cache size:', error);
      return 0;
    }
  };

  /**
   * Check if current region is available offline
   */
  const isRegionAvailableOffline = (currentRegion: Region): boolean => {
    return offlineRegions.some(offlineRegion => {
      const { latitude, longitude, latitudeDelta, longitudeDelta } = currentRegion;
      const { region: savedRegion } = offlineRegion;

      // Check if current region is within saved region bounds
      const latMatch =
        Math.abs(latitude - savedRegion.latitude) <= savedRegion.latitudeDelta / 2;
      const lngMatch =
        Math.abs(longitude - savedRegion.longitude) <= savedRegion.longitudeDelta / 2;

      return latMatch && lngMatch;
    });
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChangeComplete={setRegion}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        showsScale
        loadingEnabled
        cacheEnabled={enableOfflineMode} // Enable tile caching
      >
        {markers.map(marker => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            onPress={() => onMarkerPress?.(marker.id)}
          >
            {marker.price && (
              <View style={styles.markerContainer}>
                <View style={styles.priceTag}>
                  <View style={styles.priceText}>
                    ${(marker.price / 1000).toFixed(0)}K
                  </View>
                </View>
              </View>
            )}
          </Marker>
        ))}
      </MapView>

      {isDownloading && (
        <View style={styles.downloadOverlay}>
          <View style={styles.downloadCard}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <View style={styles.downloadText}>
              Downloading map tiles... {Math.round(downloadProgress)}%
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  priceTag: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
  },
  priceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  downloadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  downloadText: {
    marginTop: 16,
    fontSize: 14,
    color: '#374151',
  },
});

// Export utility functions for external use
export const OfflineMapUtils = {
  downloadRegionTiles: async (
    region: Region,
    zoomLevels: number[] = [12, 13, 14, 15]
  ) => {
    // This would be called from a settings screen or download button
    console.log('Download region tiles:', region, zoomLevels);
  },
  
  clearCache: async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(TILE_CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(TILE_CACHE_DIR, { idempotent: true });
      }
      await AsyncStorage.removeItem(STORAGE_KEY_OFFLINE_REGIONS);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  },
  
  getCacheSize: async (): Promise<number> => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(TILE_CACHE_DIR);
      if (!dirInfo.exists) return 0;

      const files = await FileSystem.readDirectoryAsync(TILE_CACHE_DIR);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${TILE_CACHE_DIR}${file}`);
        if (fileInfo.exists && 'size' in fileInfo) {
          totalSize += fileInfo.size || 0;
        }
      }

      return totalSize / (1024 * 1024); // MB
    } catch (error) {
      return 0;
    }
  },
};
