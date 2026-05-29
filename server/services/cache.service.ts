import { BlingProduct, DashboardStats } from '../../src/types';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { data, expiresAt });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  /**
   * Sweeper to delete expired keys and prevent memory leaks.
   */
  pruneExpired(): void {
    const now = Date.now();
    let prunedCount = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        prunedCount++;
      }
    }
    if (prunedCount > 0) {
      console.log(`[Cache Pruner] Automatically swept ${prunedCount} expired entries from cache.`);
    }
  }
}

// Separate Cache instances for Products and Dashboard Stats
export const productsCache = new MemoryCache<BlingProduct[]>(30000); // 30s TTL
export const statsCache = new MemoryCache<DashboardStats>(30000); // 30s TTL

// Set a periodic cache sweeping interval (every 5 minutes) to avoid memory accumulation
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const prunerInterval = setInterval(() => {
  productsCache.pruneExpired();
  statsCache.pruneExpired();
}, FIVE_MINUTES_MS);

// Ensure the process isn't kept alive node-side if this is the only timer
if (prunerInterval.unref) {
  prunerInterval.unref();
}
