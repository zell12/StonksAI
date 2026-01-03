
// Caching Strategy Definitions
export const CACHE_TIERS = {
  IMMEDIATE: 60 * 1000,           // 1 minute (Price Snapshots)
  SHORT_TERM: 15 * 60 * 1000,     // 15 minutes (News, Historical Bars)
  MEDIUM_TERM: 4 * 60 * 60 * 1000,// 4 hours (Qandle Technicals)
  LONG_TERM: 24 * 60 * 60 * 1000, // 24 hours (Financial Metrics)
  WEEKLY: 7 * 24 * 60 * 60 * 1000 // 1 week (Company Facts, Insider Trades)
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheMeta {
  hit: boolean;
  age: number; // Seconds
  ttl: number; // Seconds
  reason: 'VALID' | 'EXPIRED' | 'MISSING' | 'ERROR';
}

const CACHE_PREFIX = 'quantai_api_cache_';

export const cacheService = {
  /**
   * Retrieve data with Metadata for debugging
   */
  getWithMeta: <T>(key: string): { data: T | null; meta: CacheMeta } => {
    if (typeof window === 'undefined') {
        return { data: null, meta: { hit: false, age: 0, ttl: 0, reason: 'ERROR' } };
    }

    try {
      const itemStr = localStorage.getItem(CACHE_PREFIX + key);
      
      if (!itemStr) {
        return { 
            data: null, 
            meta: { hit: false, age: 0, ttl: 0, reason: 'MISSING' } 
        };
      }

      const item: CacheEntry<T> = JSON.parse(itemStr);
      const now = Date.now();
      const ageMs = now - item.timestamp;
      const ageSeconds = Math.round(ageMs / 1000);
      const ttlSeconds = Math.round(item.ttl / 1000);

      // Check expiry
      if (ageMs > item.ttl) {
        // Passive expiration: remove it now
        localStorage.removeItem(CACHE_PREFIX + key);
        return { 
            data: null, 
            meta: { hit: false, age: ageSeconds, ttl: ttlSeconds, reason: 'EXPIRED' } 
        };
      }

      return { 
          data: item.data, 
          meta: { hit: true, age: ageSeconds, ttl: ttlSeconds, reason: 'VALID' } 
      };

    } catch (e) {
      console.warn("Cache parse error", e);
      return { data: null, meta: { hit: false, age: 0, ttl: 0, reason: 'ERROR' } };
    }
  },

  /**
   * Simple Get Wrapper (Legacy support)
   */
  get: <T>(key: string): T | null => {
      const { data } = cacheService.getWithMeta<T>(key);
      return data;
  },

  /**
   * Save data to cache with Quota Handling
   */
  set: <T>(key: string, data: T, ttl: number): void => {
    if (typeof window === 'undefined') return;

    try {
      const item: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
    } catch (e: any) {
      // Explicitly catch Quota Exceeded errors
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          console.warn(`%c[CACHE WRITE FAIL] Storage Full! Could not cache: ${key}`, "color: red; font-weight: bold;");
          // Optional: Clear old items strategy could go here
      } else {
          console.warn("Cache write error", e);
      }
    }
  },

  /**
   * Invalidate specific key
   */
  invalidate: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CACHE_PREFIX + key);
  },

  /**
   * Clear all API cache
   */
  clearAll: (): void => {
    if (typeof window === 'undefined') return;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};
