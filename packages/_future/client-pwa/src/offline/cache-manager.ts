/**
 * Offline Cache Manager (TS-DEVICE-007)
 *
 * Manages offline caching for content packs, learner state,
 * and event buffering using IndexedDB and Service Worker.
 */

import {
  CACHE_CONFIGS,
  nowISO,
  type CacheStrategy,
  type ContentPackManifest,
  type LearnerEvent,
  type LearnerState,
} from '@topshelf/shared';

/** IndexedDB database name */
const DB_NAME = 'topshelf-offline';
const DB_VERSION = 1;

/** Store names */
const STORES = {
  CONTENT_PACKS: 'content-packs',
  LEARNER_STATE: 'learner-state',
  EVENT_BUFFER: 'event-buffer',
  CACHE_META: 'cache-meta',
} as const;

/** Cache metadata */
interface CacheMeta {
  readonly key: string;
  readonly cachedAt: string;
  readonly expiresAt: string;
  readonly size: number;
}

/**
 * IndexedDB-based cache manager
 */
export class OfflineCacheManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.initPromise !== null) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (): void => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (): void => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event): void => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create content packs store
        if (!db.objectStoreNames.contains(STORES.CONTENT_PACKS)) {
          db.createObjectStore(STORES.CONTENT_PACKS, { keyPath: 'id' });
        }

        // Create learner state store
        if (!db.objectStoreNames.contains(STORES.LEARNER_STATE)) {
          db.createObjectStore(STORES.LEARNER_STATE, { keyPath: 'learnerId' });
        }

        // Create event buffer store
        if (!db.objectStoreNames.contains(STORES.EVENT_BUFFER)) {
          const eventStore = db.createObjectStore(STORES.EVENT_BUFFER, {
            keyPath: 'eventId',
          });
          eventStore.createIndex('learnerId', 'learnerId', { unique: false });
          eventStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create cache metadata store
        if (!db.objectStoreNames.contains(STORES.CACHE_META)) {
          db.createObjectStore(STORES.CACHE_META, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get the database, initializing if needed
   */
  private async getDb(): Promise<IDBDatabase> {
    if (this.db === null) {
      await this.init();
    }
    if (this.db === null) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // === Content Pack Operations ===

  /**
   * Cache a content pack
   */
  async cacheContentPack(pack: ContentPackManifest): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction([STORES.CONTENT_PACKS, STORES.CACHE_META], 'readwrite');

    const packStore = tx.objectStore(STORES.CONTENT_PACKS);
    const metaStore = tx.objectStore(STORES.CACHE_META);

    const now = nowISO();
    const expiresAt = new Date(
      Date.now() + CACHE_CONFIGS.contentPack.maxAgeSeconds * 1000
    ).toISOString();

    await this.promisifyRequest(packStore.put(pack));
    await this.promisifyRequest(
      metaStore.put({
        key: `pack:${pack.id}`,
        cachedAt: now,
        expiresAt,
        size: JSON.stringify(pack).length,
      })
    );
  }

  /**
   * Get a cached content pack
   */
  async getContentPack(packId: string): Promise<ContentPackManifest | null> {
    const db = await this.getDb();
    const tx = db.transaction(STORES.CONTENT_PACKS, 'readonly');
    const store = tx.objectStore(STORES.CONTENT_PACKS);

    const result = await this.promisifyRequest<ContentPackManifest | undefined>(store.get(packId));
    return result ?? null;
  }

  /**
   * Check if a content pack is cached and valid
   */
  async isContentPackCached(packId: string): Promise<boolean> {
    const meta = await this.getCacheMeta(`pack:${packId}`);
    if (meta === null) {
      return false;
    }
    return new Date(meta.expiresAt) > new Date();
  }

  // === Learner State Operations ===

  /**
   * Cache learner state
   */
  async cacheLearnerState(state: LearnerState): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction([STORES.LEARNER_STATE, STORES.CACHE_META], 'readwrite');

    const stateStore = tx.objectStore(STORES.LEARNER_STATE);
    const metaStore = tx.objectStore(STORES.CACHE_META);

    const now = nowISO();
    const expiresAt = new Date(
      Date.now() + CACHE_CONFIGS.learnerState.maxAgeSeconds * 1000
    ).toISOString();

    await this.promisifyRequest(stateStore.put(state));
    await this.promisifyRequest(
      metaStore.put({
        key: `state:${state.learnerId}`,
        cachedAt: now,
        expiresAt,
        size: JSON.stringify(state).length,
      })
    );
  }

  /**
   * Get cached learner state
   */
  async getLearnerState(learnerId: string): Promise<LearnerState | null> {
    const db = await this.getDb();
    const tx = db.transaction(STORES.LEARNER_STATE, 'readonly');
    const store = tx.objectStore(STORES.LEARNER_STATE);

    const result = await this.promisifyRequest<LearnerState | undefined>(store.get(learnerId));
    return result ?? null;
  }

  // === Event Buffer Operations ===

  /**
   * Buffer an event for later sync
   */
  async bufferEvent(event: LearnerEvent): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORES.EVENT_BUFFER, 'readwrite');
    const store = tx.objectStore(STORES.EVENT_BUFFER);

    await this.promisifyRequest(store.add(event));
  }

  /**
   * Get buffered events for a learner
   */
  async getBufferedEvents(learnerId: string): Promise<LearnerEvent[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORES.EVENT_BUFFER, 'readonly');
    const store = tx.objectStore(STORES.EVENT_BUFFER);
    const index = store.index('learnerId');

    return this.promisifyRequest<LearnerEvent[]>(index.getAll(learnerId));
  }

  /**
   * Get all buffered events
   */
  async getAllBufferedEvents(): Promise<LearnerEvent[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORES.EVENT_BUFFER, 'readonly');
    const store = tx.objectStore(STORES.EVENT_BUFFER);

    return this.promisifyRequest<LearnerEvent[]>(store.getAll());
  }

  /**
   * Remove synced events from buffer
   */
  async removeBufferedEvents(eventIds: readonly string[]): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORES.EVENT_BUFFER, 'readwrite');
    const store = tx.objectStore(STORES.EVENT_BUFFER);

    for (const eventId of eventIds) {
      await this.promisifyRequest(store.delete(eventId));
    }
  }

  /**
   * Get count of buffered events
   */
  async getBufferedEventCount(): Promise<number> {
    const db = await this.getDb();
    const tx = db.transaction(STORES.EVENT_BUFFER, 'readonly');
    const store = tx.objectStore(STORES.EVENT_BUFFER);

    return this.promisifyRequest<number>(store.count());
  }

  // === Cache Metadata Operations ===

  /**
   * Get cache metadata
   */
  private async getCacheMeta(key: string): Promise<CacheMeta | null> {
    const db = await this.getDb();
    const tx = db.transaction(STORES.CACHE_META, 'readonly');
    const store = tx.objectStore(STORES.CACHE_META);

    const result = await this.promisifyRequest<CacheMeta | undefined>(store.get(key));
    return result ?? null;
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache(): Promise<number> {
    const db = await this.getDb();
    const tx = db.transaction(STORES.CACHE_META, 'readonly');
    const store = tx.objectStore(STORES.CACHE_META);

    const allMeta = await this.promisifyRequest<CacheMeta[]>(store.getAll());
    const now = new Date();
    const expired = allMeta.filter((m) => new Date(m.expiresAt) < now);

    // Delete expired entries
    for (const meta of expired) {
      const [type, id] = meta.key.split(':');
      if (type === 'pack') {
        await this.deleteContentPack(id ?? '');
      } else if (type === 'state') {
        await this.deleteLearnerState(id ?? '');
      }
    }

    return expired.length;
  }

  /**
   * Delete a cached content pack
   */
  private async deleteContentPack(packId: string): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction([STORES.CONTENT_PACKS, STORES.CACHE_META], 'readwrite');

    await this.promisifyRequest(tx.objectStore(STORES.CONTENT_PACKS).delete(packId));
    await this.promisifyRequest(tx.objectStore(STORES.CACHE_META).delete(`pack:${packId}`));
  }

  /**
   * Delete cached learner state
   */
  private async deleteLearnerState(learnerId: string): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction([STORES.LEARNER_STATE, STORES.CACHE_META], 'readwrite');

    await this.promisifyRequest(tx.objectStore(STORES.LEARNER_STATE).delete(learnerId));
    await this.promisifyRequest(tx.objectStore(STORES.CACHE_META).delete(`state:${learnerId}`));
  }

  /**
   * Get total cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    const db = await this.getDb();
    const tx = db.transaction(STORES.CACHE_META, 'readonly');
    const store = tx.objectStore(STORES.CACHE_META);

    const allMeta = await this.promisifyRequest<CacheMeta[]>(store.getAll());
    return allMeta.reduce((sum, m) => sum + m.size, 0);
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(
      [STORES.CONTENT_PACKS, STORES.LEARNER_STATE, STORES.EVENT_BUFFER, STORES.CACHE_META],
      'readwrite'
    );

    await Promise.all([
      this.promisifyRequest(tx.objectStore(STORES.CONTENT_PACKS).clear()),
      this.promisifyRequest(tx.objectStore(STORES.LEARNER_STATE).clear()),
      this.promisifyRequest(tx.objectStore(STORES.EVENT_BUFFER).clear()),
      this.promisifyRequest(tx.objectStore(STORES.CACHE_META).clear()),
    ]);
  }

  /**
   * Promisify IndexedDB request
   */
  private promisifyRequest<T>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = (): void => resolve(request.result as T);
      request.onerror = (): void => reject(request.error);
    });
  }
}

/**
 * Create service worker cache strategies
 */
export function getServiceWorkerCacheStrategy(
  resourceType: keyof typeof CACHE_CONFIGS
): CacheStrategy {
  return CACHE_CONFIGS[resourceType].strategy as CacheStrategy;
}
