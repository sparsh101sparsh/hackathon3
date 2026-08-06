type CacheEntry<T> = {
  expiresAt: number;
  value?: T;
  pending?: Promise<T>;
};

const globalForCache = globalThis as unknown as {
  ttlCache?: Map<string, CacheEntry<unknown>>;
};

const cache = globalForCache.ttlCache ?? new Map<string, CacheEntry<unknown>>();
globalForCache.ttlCache = cache;
const MAX_ENTRIES = 128;

function setEntry<T>(key: string, entry: CacheEntry<T>): void {
  if (cache.size >= MAX_ENTRIES && !cache.has(key)) {
    const now = Date.now();
    for (const [existingKey, existingEntry] of cache) {
      if (existingEntry.expiresAt <= now) cache.delete(existingKey);
    }
    while (cache.size >= MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
  }
  cache.set(key, entry);
}

/** Small process-local cache for public, read-only data on warm instances. */
export async function getTtlCached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    if (existing.pending) return existing.pending;
    if (existing.value !== undefined) return existing.value;
  }

  const pending = loader();
  setEntry(key, { expiresAt: now + ttlMs, pending });
  try {
    const value = await pending;
    setEntry(key, { expiresAt: Date.now() + ttlMs, value });
    return value;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
}
