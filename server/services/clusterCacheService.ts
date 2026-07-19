import Redis from 'ioredis';
import { latLngToCell, cellToBoundary } from 'h3-js';

/**
 * Redis Cluster Cache Service
 * 
 * Caches map cluster data to reduce database load and improve response times.
 * Uses H3 hexagonal indexing as cache keys for efficient spatial lookups.
 * 
 * Features:
 * - TTL-based cache expiration (5 minutes default)
 * - Automatic cache invalidation on property changes
 * - Cache warming for popular viewport bounds
 * - Cluster statistics caching
 * - Viewport-based cache keys
 */

interface ClusterCacheData {
  clusters: Array<{
    h3Index: string;
    centroid: { lat: number; lng: number };
    boundary: Array<[number, number]>;
    count: number;
    avgPrice: number;
    formattedPrice: string;
    color: string;
    propertyIds: number[];
  }>;
  properties: Array<{
    id: number;
    latitude: number;
    longitude: number;
    price: number;
    title: string;
  }>;
  stats: {
    totalProperties: number;
    clusteredProperties: number;
    individualProperties: number;
    clusterCount: number;
    h3Resolution: number;
  };
  cachedAt: number;
}

interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

class ClusterCacheService {
  private redis: Redis | null = null;
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly STATS_TTL = 60; // 1 minute for stats
  private readonly POPULAR_BOUNDS_TTL = 600; // 10 minutes for popular areas
  
  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   * Falls back to in-memory caching if Redis is unavailable
   */
  private initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('[ClusterCache] Redis connection failed, using in-memory cache');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        lazyConnect: true,
      });

      this.redis.on('error', (err) => {
        console.error('[ClusterCache] Redis error:', err.message);
      });

      this.redis.on('connect', () => {
        console.log('[ClusterCache] Redis connected successfully');
      });

      // Connect asynchronously
      this.redis.connect().catch((err) => {
        console.warn('[ClusterCache] Redis connection failed:', err.message);
        this.redis = null;
      });
    } catch (error) {
      console.warn('[ClusterCache] Redis initialization failed:', error);
      this.redis = null;
    }
  }

  /**
   * Generate cache key for viewport bounds and zoom level
   */
  private generateCacheKey(bounds: ViewportBounds, zoom: number, resolution: number): string {
    // Round bounds to 4 decimal places to group similar viewports
    const roundedBounds = {
      north: Math.round(bounds.north * 10000) / 10000,
      south: Math.round(bounds.south * 10000) / 10000,
      east: Math.round(bounds.east * 10000) / 10000,
      west: Math.round(bounds.west * 10000) / 10000,
    };
    
    return `cluster:z${zoom}:r${resolution}:${roundedBounds.north},${roundedBounds.south},${roundedBounds.east},${roundedBounds.west}`;
  }

  /**
   * Generate cache key for H3 cell
   */
  private generateH3CacheKey(h3Index: string): string {
    return `cluster:h3:${h3Index}`;
  }

  /**
   * Get cached cluster data
   */
  async getCachedClusters(
    bounds: ViewportBounds,
    zoom: number,
    resolution: number
  ): Promise<ClusterCacheData | null> {
    if (!this.redis) return null;

    try {
      const key = this.generateCacheKey(bounds, zoom, resolution);
      const cached = await this.redis.get(key);
      
      if (!cached) return null;

      const data = JSON.parse(cached) as ClusterCacheData;
      
      // Check if cache is still fresh (within TTL)
      const age = Date.now() - data.cachedAt;
      if (age > this.DEFAULT_TTL * 1000) {
        await this.redis.del(key);
        return null;
      }

      console.log(`[ClusterCache] Cache HIT for zoom ${zoom}, age: ${Math.round(age / 1000)}s`);
      return data;
    } catch (error) {
      console.error('[ClusterCache] Error getting cached clusters:', error);
      return null;
    }
  }

  /**
   * Cache cluster data
   */
  async setCachedClusters(
    bounds: ViewportBounds,
    zoom: number,
    resolution: number,
    data: Omit<ClusterCacheData, 'cachedAt'>
  ): Promise<void> {
    if (!this.redis) return;

    try {
      const key = this.generateCacheKey(bounds, zoom, resolution);
      const cacheData: ClusterCacheData = {
        ...data,
        cachedAt: Date.now(),
      };

      await this.redis.setex(key, this.DEFAULT_TTL, JSON.stringify(cacheData));
      console.log(`[ClusterCache] Cached clusters for zoom ${zoom}, TTL: ${this.DEFAULT_TTL}s`);
    } catch (error) {
      console.error('[ClusterCache] Error caching clusters:', error);
    }
  }

  /**
   * Get cached cluster properties by H3 index
   */
  async getCachedClusterProperties(h3Index: string): Promise<any[] | null> {
    if (!this.redis) return null;

    try {
      const key = this.generateH3CacheKey(h3Index);
      const cached = await this.redis.get(key);
      
      if (!cached) return null;

      const data = JSON.parse(cached);
      console.log(`[ClusterCache] Cache HIT for H3 cell ${h3Index}`);
      return data.properties;
    } catch (error) {
      console.error('[ClusterCache] Error getting cached cluster properties:', error);
      return null;
    }
  }

  /**
   * Cache cluster properties by H3 index
   */
  async setCachedClusterProperties(h3Index: string, properties: any[]): Promise<void> {
    if (!this.redis) return;

    try {
      const key = this.generateH3CacheKey(h3Index);
      const cacheData = {
        properties,
        cachedAt: Date.now(),
      };

      await this.redis.setex(key, this.DEFAULT_TTL, JSON.stringify(cacheData));
      console.log(`[ClusterCache] Cached ${properties.length} properties for H3 cell ${h3Index}`);
    } catch (error) {
      console.error('[ClusterCache] Error caching cluster properties:', error);
    }
  }

  /**
   * Invalidate cache for a specific property
   * Called when property is created, updated, or deleted
   */
  async invalidatePropertyCache(propertyId: number, latitude: number, longitude: number): Promise<void> {
    if (!this.redis) return;

    try {
      // Get all H3 resolutions that might contain this property
      const resolutions = [3, 4, 5, 6, 7, 8, 9, 10, 11];
      const h3Indexes = resolutions.map(res => latLngToCell(latitude, longitude, res));

      // Delete cache for all H3 cells containing this property
      const keys = h3Indexes.map(h3 => this.generateH3CacheKey(h3));
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`[ClusterCache] Invalidated ${keys.length} H3 cell caches for property ${propertyId}`);
      }

      // Also invalidate viewport caches (use pattern matching)
      const pattern = 'cluster:z*';
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100,
      });

      let deletedCount = 0;
      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0) {
          await this.redis!.del(...keys);
          deletedCount += keys.length;
        }
      });

      stream.on('end', () => {
        console.log(`[ClusterCache] Invalidated ${deletedCount} viewport caches`);
      });
    } catch (error) {
      console.error('[ClusterCache] Error invalidating property cache:', error);
    }
  }

  /**
   * Invalidate all cluster caches
   * Called when bulk property operations occur
   */
  async invalidateAllCaches(): Promise<void> {
    if (!this.redis) return;

    try {
      const pattern = 'cluster:*';
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100,
      });

      let deletedCount = 0;
      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0) {
          await this.redis!.del(...keys);
          deletedCount += keys.length;
        }
      });

      stream.on('end', () => {
        console.log(`[ClusterCache] Invalidated all ${deletedCount} cluster caches`);
      });
    } catch (error) {
      console.error('[ClusterCache] Error invalidating all caches:', error);
    }
  }

  /**
   * Warm cache for popular viewport bounds
   * Pre-populate cache for frequently accessed areas
   */
  async warmCache(
    popularBounds: ViewportBounds[],
    zoomLevels: number[],
    dataFetcher: (bounds: ViewportBounds, zoom: number) => Promise<Omit<ClusterCacheData, 'cachedAt'>>
  ): Promise<void> {
    if (!this.redis) return;

    console.log(`[ClusterCache] Warming cache for ${popularBounds.length} popular areas...`);

    for (const bounds of popularBounds) {
      for (const zoom of zoomLevels) {
        try {
          // Check if already cached
          const resolution = this.getH3Resolution(zoom);
          const existing = await this.getCachedClusters(bounds, zoom, resolution);
          
          if (existing) {
            console.log(`[ClusterCache] Already cached: zoom ${zoom}`);
            continue;
          }

          // Fetch and cache data
          const data = await dataFetcher(bounds, zoom);
          await this.setCachedClusters(bounds, zoom, resolution, data);
          
          console.log(`[ClusterCache] Warmed cache: zoom ${zoom}, ${data.stats.totalProperties} properties`);
        } catch (error) {
          console.error(`[ClusterCache] Error warming cache for zoom ${zoom}:`, error);
        }
      }
    }

    console.log('[ClusterCache] Cache warming complete');
  }

  /**
   * Get H3 resolution based on zoom level
   */
  private getH3Resolution(zoom: number): number {
    if (zoom >= 18) return 11;
    if (zoom >= 16) return 10;
    if (zoom >= 14) return 9;
    if (zoom >= 12) return 8;
    if (zoom >= 10) return 7;
    if (zoom >= 8) return 6;
    if (zoom >= 6) return 5;
    if (zoom >= 4) return 4;
    return 3;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    if (!this.redis) {
      return {
        totalKeys: 0,
        memoryUsage: '0 MB',
        hitRate: 0,
      };
    }

    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();
      
      // Parse hit rate from info
      const hitsMatch = info.match(/keyspace_hits:(\d+)/);
      const missesMatch = info.match(/keyspace_misses:(\d+)/);
      
      const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
      const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
      const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

      // Get memory usage
      const memoryInfo = await this.redis.info('memory');
      const memoryMatch = memoryInfo.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : '0 MB';

      return {
        totalKeys: dbSize,
        memoryUsage,
        hitRate: Math.round(hitRate * 100) / 100,
      };
    } catch (error) {
      console.error('[ClusterCache] Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: '0 MB',
        hitRate: 0,
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      console.log('[ClusterCache] Redis connection closed');
    }
  }
}

// Export singleton instance
export const clusterCacheService = new ClusterCacheService();
