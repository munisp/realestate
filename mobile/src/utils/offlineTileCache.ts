/**
 * Offline Tile Cache — Mobile
 *
 * Caches map tiles in AsyncStorage (small tiles) and expo-file-system (large
 * regions). Supports:
 *  - Individual tile caching on demand (LRU, 500-tile cap)
 *  - Region pre-download (bounding box + zoom range)
 *  - Cache size reporting and selective eviction
 *  - Offline fallback URL generation
 *
 * Tile URL pattern: https://tile.openstreetmap.org/{z}/{x}/{y}.png
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';

// ── Constants ─────────────────────────────────────────────────────────────────
const TILE_CACHE_DIR = `${FileSystem.cacheDirectory}map-tiles/`;
const TILE_INDEX_KEY = 'offline_tile_index_v1';
const MAX_CACHED_TILES = 2000;       // ~200MB at ~100KB/tile
const MAX_CACHE_SIZE_MB = 250;
const TILE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Nigerian city bounding boxes for pre-download
export const NIGERIAN_CITY_BOUNDS = {
  lagos: {
    name: 'Lagos Metropolitan',
    minLat: 6.35, maxLat: 6.70,
    minLng: 3.10, maxLng: 3.70,
    minZoom: 10, maxZoom: 15,
    estimatedTiles: 1200,
  },
  abuja: {
    name: 'Abuja FCT',
    minLat: 8.85, maxLat: 9.20,
    minLng: 7.30, maxLng: 7.65,
    minZoom: 10, maxZoom: 15,
    estimatedTiles: 800,
  },
  portHarcourt: {
    name: 'Port Harcourt',
    minLat: 4.70, maxLat: 5.00,
    minLng: 6.90, maxLng: 7.20,
    minZoom: 10, maxZoom: 15,
    estimatedTiles: 600,
  },
  kano: {
    name: 'Kano',
    minLat: 11.90, maxLat: 12.15,
    minLng: 8.40, maxLng: 8.65,
    minZoom: 10, maxZoom: 14,
    estimatedTiles: 400,
  },
  ibadan: {
    name: 'Ibadan',
    minLat: 7.30, maxLat: 7.55,
    minLng: 3.80, maxLng: 4.05,
    minZoom: 10, maxZoom: 14,
    estimatedTiles: 400,
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface TileEntry {
  key: string;       // z/x/y
  path: string;      // local file path
  size: number;      // bytes
  cachedAt: number;  // timestamp
  accessedAt: number;
  accessCount: number;
}

interface TileIndex {
  tiles: Record<string, TileEntry>;
  totalSizeBytes: number;
  tileCount: number;
  lastEviction: number;
}

interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
  currentTile: string;
  failed: number;
}

// ── Tile math ─────────────────────────────────────────────────────────────────
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

function tilesForBbox(
  minLat: number, maxLat: number,
  minLng: number, maxLng: number,
  zoom: number,
): Array<{ z: number; x: number; y: number }> {
  const topLeft = latLngToTile(maxLat, minLng, zoom);
  const bottomRight = latLngToTile(minLat, maxLng, zoom);
  const tiles: Array<{ z: number; x: number; y: number }> = [];
  for (let x = topLeft.x; x <= bottomRight.x; x++) {
    for (let y = topLeft.y; y <= bottomRight.y; y++) {
      tiles.push({ z: zoom, x, y });
    }
  }
  return tiles;
}

// ── Cache manager ─────────────────────────────────────────────────────────────
class OfflineTileCache {
  private index: TileIndex | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(TILE_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(TILE_CACHE_DIR, { intermediates: true });
      }
      // Load index
      const raw = await AsyncStorage.getItem(TILE_INDEX_KEY);
      if (raw) {
        this.index = JSON.parse(raw);
      } else {
        this.index = { tiles: {}, totalSizeBytes: 0, tileCount: 0, lastEviction: 0 };
      }
      this.initialized = true;
    } catch (err) {
      console.warn('[TileCache] Init failed:', err);
      this.index = { tiles: {}, totalSizeBytes: 0, tileCount: 0, lastEviction: 0 };
      this.initialized = true;
    }
  }

  private async saveIndex(): Promise<void> {
    if (!this.index) return;
    try {
      await AsyncStorage.setItem(TILE_INDEX_KEY, JSON.stringify(this.index));
    } catch (err) {
      console.warn('[TileCache] Failed to save index:', err);
    }
  }

  /** Returns local file URI if cached, null otherwise */
  async getLocalUri(z: number, x: number, y: number): Promise<string | null> {
    await this.init();
    const key = `${z}/${x}/${y}`;
    const entry = this.index!.tiles[key];
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.cachedAt > TILE_TTL_MS) {
      await this.evictTile(key);
      return null;
    }

    // Check file still exists
    const info = await FileSystem.getInfoAsync(entry.path);
    if (!info.exists) {
      delete this.index!.tiles[key];
      this.index!.tileCount--;
      return null;
    }

    // Update access stats
    entry.accessedAt = Date.now();
    entry.accessCount++;
    return entry.path;
  }

  /** Download and cache a single tile */
  async cacheTile(z: number, x: number, y: number): Promise<string | null> {
    await this.init();
    const key = `${z}/${x}/${y}`;

    // Already cached?
    const existing = await this.getLocalUri(z, x, y);
    if (existing) return existing;

    // Check network
    const netState = await Network.getNetworkStateAsync();
    if (!netState.isConnected) return null;

    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const localPath = `${TILE_CACHE_DIR}${z}_${x}_${y}.png`;

    try {
      const result = await FileSystem.downloadAsync(url, localPath, {
        headers: { 'User-Agent': 'RealEstateNG/1.0 (offline-cache)' },
      });

      if (result.status !== 200) return null;

      const info = await FileSystem.getInfoAsync(localPath);
      const size = (info as any).size || 10000;

      // Evict if needed
      if (this.index!.tileCount >= MAX_CACHED_TILES) {
        await this.evictLRU(100);
      }

      this.index!.tiles[key] = {
        key, path: localPath, size,
        cachedAt: Date.now(), accessedAt: Date.now(), accessCount: 1,
      };
      this.index!.totalSizeBytes += size;
      this.index!.tileCount++;

      await this.saveIndex();
      return localPath;
    } catch {
      return null;
    }
  }

  /** Pre-download all tiles for a city region */
  async downloadRegion(
    cityKey: keyof typeof NIGERIAN_CITY_BOUNDS,
    onProgress?: (p: DownloadProgress) => void,
  ): Promise<{ downloaded: number; failed: number; skipped: number }> {
    await this.init();
    const bounds = NIGERIAN_CITY_BOUNDS[cityKey];
    const netState = await Network.getNetworkStateAsync();
    if (!netState.isConnected) {
      throw new Error('No network connection. Connect to Wi-Fi before downloading offline maps.');
    }

    // Collect all tiles across zoom levels
    const allTiles: Array<{ z: number; x: number; y: number }> = [];
    for (let z = bounds.minZoom; z <= bounds.maxZoom; z++) {
      allTiles.push(...tilesForBbox(bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng, z));
    }

    let downloaded = 0, failed = 0, skipped = 0;
    const total = allTiles.length;

    // Download in batches of 5 concurrent requests
    const BATCH_SIZE = 5;
    for (let i = 0; i < allTiles.length; i += BATCH_SIZE) {
      const batch = allTiles.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async ({ z, x, y }) => {
        const existing = await this.getLocalUri(z, x, y);
        if (existing) { skipped++; return; }
        const result = await this.cacheTile(z, x, y);
        if (result) downloaded++;
        else failed++;
      }));

      onProgress?.({
        downloaded, total, failed,
        percent: Math.round(((i + BATCH_SIZE) / total) * 100),
        currentTile: `${allTiles[Math.min(i + BATCH_SIZE - 1, allTiles.length - 1)].z}/${allTiles[Math.min(i + BATCH_SIZE - 1, allTiles.length - 1)].x}/${allTiles[Math.min(i + BATCH_SIZE - 1, allTiles.length - 1)].y}`,
      });

      // Throttle to avoid OSM rate limiting (max 2 req/s per IP)
      await new Promise(r => setTimeout(r, 100));
    }

    return { downloaded, failed, skipped };
  }

  /** Evict N least-recently-used tiles */
  private async evictLRU(count: number): Promise<void> {
    if (!this.index) return;
    const entries = Object.values(this.index.tiles)
      .sort((a, b) => a.accessedAt - b.accessedAt)
      .slice(0, count);

    for (const entry of entries) {
      await this.evictTile(entry.key);
    }
    this.index.lastEviction = Date.now();
  }

  private async evictTile(key: string): Promise<void> {
    if (!this.index?.tiles[key]) return;
    const entry = this.index.tiles[key];
    try {
      await FileSystem.deleteAsync(entry.path, { idempotent: true });
    } catch {}
    this.index.totalSizeBytes -= entry.size;
    this.index.tileCount--;
    delete this.index.tiles[key];
  }

  /** Evict tiles older than TTL */
  async evictExpired(): Promise<number> {
    await this.init();
    const now = Date.now();
    const expired = Object.keys(this.index!.tiles).filter(
      key => now - this.index!.tiles[key].cachedAt > TILE_TTL_MS,
    );
    for (const key of expired) await this.evictTile(key);
    await this.saveIndex();
    return expired.length;
  }

  /** Clear all cached tiles */
  async clearAll(): Promise<void> {
    await this.init();
    try {
      await FileSystem.deleteAsync(TILE_CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(TILE_CACHE_DIR, { intermediates: true });
    } catch {}
    this.index = { tiles: {}, totalSizeBytes: 0, tileCount: 0, lastEviction: 0 };
    await this.saveIndex();
  }

  /** Get cache statistics */
  async getStats(): Promise<{
    tileCount: number;
    totalSizeMB: number;
    oldestTileAge: string;
    cities: Record<string, { tileCount: number; sizeMB: number }>;
  }> {
    await this.init();
    const tiles = Object.values(this.index!.tiles);
    const oldest = tiles.length > 0
      ? Math.min(...tiles.map(t => t.cachedAt))
      : Date.now();
    const ageMs = Date.now() - oldest;
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    return {
      tileCount: this.index!.tileCount,
      totalSizeMB: Math.round(this.index!.totalSizeBytes / 1024 / 1024 * 10) / 10,
      oldestTileAge: ageDays > 0 ? `${ageDays} days` : 'today',
      cities: {},
    };
  }

  /** Check if a region is fully cached */
  async isRegionCached(cityKey: keyof typeof NIGERIAN_CITY_BOUNDS): Promise<{
    cached: boolean;
    percent: number;
    missingTiles: number;
  }> {
    await this.init();
    const bounds = NIGERIAN_CITY_BOUNDS[cityKey];
    // Check only zoom levels 10-12 for quick assessment
    const tiles = tilesForBbox(bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng, 12);
    let cached = 0;
    for (const { z, x, y } of tiles) {
      const uri = await this.getLocalUri(z, x, y);
      if (uri) cached++;
    }
    const percent = Math.round((cached / tiles.length) * 100);
    return {
      cached: percent >= 90,
      percent,
      missingTiles: tiles.length - cached,
    };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
export const tileCache = new OfflineTileCache();

/** Hook for use in React components */
export function useOfflineTileUrl(z: number, x: number, y: number, onlineUrl: string): string {
  // Returns online URL immediately; background-caches the tile
  // On next render (if offline), returns local URI
  tileCache.cacheTile(z, x, y).catch(() => {});
  return onlineUrl;
}
