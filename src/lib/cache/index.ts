// ============================================================
// Server-Side In-Memory Cache
//
// Rationale: Google Sheets API has a 100 req/100s quota per user.
// Without caching, even a modest dashboard would exhaust this.
//
// This is a Vercel-compatible approach: each serverless instance
// has its own in-memory store. For multi-instance deployments,
// migrate to Redis/Upstash (swap CacheStore implementation only).
//
// Cache keys follow: "<module>:<operation>:<params_hash>"
// ============================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

// TTL constants per domain (milliseconds)
export const CACHE_TTL = {
  TASKS: 30_000,       // 30s — tasks change frequently
  DIARY: 60_000,       // 1min — diary entries are less volatile
  TRAINING: 120_000,   // 2min
  DASHBOARD: 60_000,   // 1min — aggregated view
} as const;

class CacheStore {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Periodic cleanup to prevent memory leaks in long-running instances
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    });
  }

  invalidate(keyPrefix: string): void {
    Array.from(this.store.keys()).forEach((key) => {
      if (key.startsWith(keyPrefix)) {
        this.store.delete(key);
      }
    });
  }

  invalidateAll(): void {
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    Array.from(this.store.entries()).forEach(([key, entry]) => {
      if (now > entry.expiresAt) this.store.delete(key);
    });
  }

  stats() {
    return { size: this.store.size };
  }
}

// Global singleton — shared across requests within the same instance
const globalCache = global as typeof global & { __lifeOsCache?: CacheStore };
if (!globalCache.__lifeOsCache) {
  globalCache.__lifeOsCache = new CacheStore();
}

export const cache = globalCache.__lifeOsCache;

// ---- Cache-aside helper ------------------------------------

/**
 * Wraps an async function with cache-aside pattern.
 * If cached, returns immediately. Otherwise calls fetcher,
 * caches the result, and returns it.
 *
 * Usage:
 *   const tasks = await withCache("tasks:daily:2024-03-15", CACHE_TTL.TASKS, () => fetchFromSheets())
 */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return { data: cached, cached: true };
  }

  const data = await fetcher();
  cache.set(key, data, ttlMs);
  return { data, cached: false };
}

// ---- Cache key builders ------------------------------------

export const cacheKeys = {
  tasks: (params?: Record<string, unknown>) =>
    `tasks:list:${JSON.stringify(params ?? {})}`,
  task: (id: string) => `tasks:item:${id}`,
  diary: (params?: Record<string, unknown>) =>
    `diary:list:${JSON.stringify(params ?? {})}`,
  diaryEntry: (id: string) => `diary:item:${id}`,
  training: (params?: Record<string, unknown>) =>
    `training:list:${JSON.stringify(params ?? {})}`,
  trainingSession: (id: string) => `training:item:${id}`,
  dashboard: () => `dashboard:main`,
};
