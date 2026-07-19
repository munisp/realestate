import { CofOVerificationResult, LandRecordData, OwnershipRecord } from './base/types';

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Verification Cache Service
 * Provides in-memory caching for government registry verification results
 * Reduces API calls and improves response times
 */
export class VerificationCacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  
  // Default TTL: 1 hour (3600 seconds)
  private defaultTTL: number = parseInt(process.env.REGISTRY_CACHE_TTL || '3600');

  /**
   * Generate cache key for C of O verification
   */
  private getCofOCacheKey(cofoNumber: string, state?: string): string {
    return `cofo:${state || 'all'}:${cofoNumber}`;
  }

  /**
   * Generate cache key for land record
   */
  private getLandRecordCacheKey(parcelId: string, state?: string): string {
    return `land:${state || 'all'}:${parcelId}`;
  }

  /**
   * Generate cache key for ownership history
   */
  private getOwnershipHistoryCacheKey(parcelId: string, state?: string): string {
    return `ownership:${state || 'all'}:${parcelId}`;
  }

  /**
   * Get cached C of O verification result
   */
  getCofOVerification(cofoNumber: string, state?: string): CofOVerificationResult | null {
    const key = this.getCofOCacheKey(cofoNumber, state);
    return this.get<CofOVerificationResult>(key);
  }

  /**
   * Cache C of O verification result
   */
  setCofOVerification(
    cofoNumber: string,
    result: CofOVerificationResult,
    state?: string,
    ttl?: number
  ): void {
    const key = this.getCofOCacheKey(cofoNumber, state);
    this.set(key, result, ttl);
  }

  /**
   * Get cached land record
   */
  getLandRecord(parcelId: string, state?: string): LandRecordData | null {
    const key = this.getLandRecordCacheKey(parcelId, state);
    return this.get<LandRecordData>(key);
  }

  /**
   * Cache land record
   */
  setLandRecord(
    parcelId: string,
    record: LandRecordData,
    state?: string,
    ttl?: number
  ): void {
    const key = this.getLandRecordCacheKey(parcelId, state);
    this.set(key, record, ttl);
  }

  /**
   * Get cached ownership history
   */
  getOwnershipHistory(parcelId: string, state?: string): OwnershipRecord[] | null {
    const key = this.getOwnershipHistoryCacheKey(parcelId, state);
    return this.get<OwnershipRecord[]>(key);
  }

  /**
   * Cache ownership history
   */
  setOwnershipHistory(
    parcelId: string,
    history: OwnershipRecord[],
    state?: string,
    ttl?: number
  ): void {
    const key = this.getOwnershipHistoryCacheKey(parcelId, state);
    this.set(key, history, ttl);
  }

  /**
   * Generic get from cache
   */
  private get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data as T;
  }

  /**
   * Generic set to cache
   */
  private set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all C of O verifications for a specific C of O
   */
  invalidateCofO(cofoNumber: string): void {
    const pattern = `cofo:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern) && key.includes(cofoNumber)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate all land records for a specific parcel
   */
  invalidateLandRecord(parcelId: string): void {
    const patterns = ['land:', 'ownership:'];
    for (const key of this.cache.keys()) {
      for (const pattern of patterns) {
        if (key.startsWith(pattern) && key.includes(parcelId)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Get cache size in entries
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Set default TTL
   */
  setDefaultTTL(seconds: number): void {
    this.defaultTTL = seconds;
  }

  /**
   * Get default TTL
   */
  getDefaultTTL(): number {
    return this.defaultTTL;
  }
}

// Export singleton instance
export const verificationCache = new VerificationCacheService();

// Schedule periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  verificationCache.clearExpired();
  console.log('[VerificationCache] Cleared expired entries. Stats:', verificationCache.getStats());
}, 5 * 60 * 1000);
