/**
 * Client-side Cache Manager
 *
 * Implements high-performance in-memory and sessionStorage caching with TTL
 * to minimize redundant server-side Firestore read operations.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time-to-live in milliseconds
}

const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes default cache duration
const STORAGE_PREFIX = 'ucds_cache_';

class ClientCacheManager {
  private memoryCache = new Map<string, CacheEntry<unknown>>();

  /**
   * Get cached data if present and unexpired.
   */
  get<T>(key: string): T | null {
    const now = Date.now();

    // 1. Check in-memory cache
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key) as CacheEntry<T>;
      if (now - entry.timestamp < entry.ttl) {
        return entry.data;
      }
      this.memoryCache.delete(key);
    }

    // 2. Check sessionStorage fallback
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (raw) {
          const parsed = JSON.parse(raw) as CacheEntry<T>;
          if (now - parsed.timestamp < parsed.ttl) {
            // Re-populate in-memory cache for speed
            this.memoryCache.set(key, parsed);
            return parsed.data;
          }
          sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
        }
      } catch (err) {
        console.warn(`[ClientCache] Error reading key "${key}":`, err);
      }
    }

    return null;
  }

  /**
   * Store data in memory and sessionStorage with TTL.
   */
  set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    this.memoryCache.set(key, entry);

    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
      } catch (err) {
        // Quota exceeded or private mode
        console.warn(`[ClientCache] Storage quota exceeded for key "${key}":`, err);
      }
    }
  }

  /**
   * Invalidate a specific cache key.
   */
  invalidate(key: string): void {
    this.memoryCache.delete(key);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Invalidate all keys matching a prefix.
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }

    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(`${STORAGE_PREFIX}${prefix}`)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Optimistically add an item to a cached collection array without re-fetching from Firestore.
   */
  addCollectionItem<T extends { id: string }>(collectionKey: string, item: T): void {
    const existing = this.get<T[]>(collectionKey);
    if (Array.isArray(existing)) {
      const filtered = existing.filter((i) => i.id !== item.id);
      const updated = [item, ...filtered];
      this.set(collectionKey, updated);
    }
  }

  /**
   * Optimistically update an existing item in a cached collection array without re-fetching.
   */
  updateCollectionItem<T extends { id: string }>(
    collectionKey: string,
    id: string,
    updatedProps: Partial<T>
  ): void {
    const existing = this.get<T[]>(collectionKey);
    if (Array.isArray(existing)) {
      const updated = existing.map((item) => {
        if (item.id === id) {
          return { ...item, ...updatedProps };
        }
        return item;
      });
      this.set(collectionKey, updated);
    }
  }

  /**
   * Optimistically remove an item from a cached collection array without re-fetching.
   */
  removeCollectionItem<T extends { id: string }>(collectionKey: string, id: string): void {
    const existing = this.get<T[]>(collectionKey);
    if (Array.isArray(existing)) {
      const updated = existing.filter((item) => item.id !== id);
      this.set(collectionKey, updated);
    }
  }

  /**
   * Clear all cached items.
   */
  clear(): void {
    this.memoryCache.clear();
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {
        // Ignore
      }
    }
  }
}

export const clientCache = new ClientCacheManager();
