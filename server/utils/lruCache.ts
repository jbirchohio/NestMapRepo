/**
 * LRU Cache wrapper for ESM/CommonJS compatibility
 * Handles the import differences between Node.js versions
 */

// Import the package differently based on environment
const getLRUCache = async () => {
  try {
    // Try ESM import first
    const mod: any = await import('lru-cache');
    return mod.LRUCache || mod.default?.LRUCache || mod.default;
  } catch {
    // Fall back to require for CommonJS
    const mod = require('lru-cache');
    return mod.LRUCache || mod.default || mod;
  }
};

// Create a synchronous wrapper class
export class LRUCache<K = any, V = any> {
  private cache: any;
  private initialized = false;
  private initPromise: Promise<void>;
  private pendingOps: Array<() => void> = [];

  constructor(options: any) {
    this.initPromise = this.initialize(options);
  }

  private async initialize(options: any) {
    const LRUCacheClass = await getLRUCache();
    this.cache = new LRUCacheClass(options);
    this.initialized = true;

    // Process any pending operations
    this.pendingOps.forEach(op => op());
    this.pendingOps = [];
  }

  private ensureInitialized(callback: () => any): any {
    if (this.initialized) {
      return callback();
    }

    // Queue the operation
    return new Promise((resolve) => {
      this.pendingOps.push(() => resolve(callback()));
    });
  }

  get(key: K): V | undefined {
    if (!this.initialized) return undefined;
    return this.cache.get(key);
  }

  set(key: K, value: V, options?: any): this {
    this.ensureInitialized(() => this.cache.set(key, value, options));
    return this;
  }

  has(key: K): boolean {
    if (!this.initialized) return false;
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    if (!this.initialized) return false;
    return this.cache.delete(key);
  }

  clear(): void {
    if (this.initialized) {
      this.cache.clear();
    }
  }

  get size(): number {
    return this.initialized ? this.cache.size : 0;
  }

  get max(): number {
    return this.initialized ? this.cache.max : 0;
  }

  get calculatedSize(): number {
    return this.initialized ? (this.cache.calculatedSize || 0) : 0;
  }

  keys(): IterableIterator<K> {
    if (!this.initialized) {
      return [][Symbol.iterator]() as IterableIterator<K>;
    }
    return this.cache.keys();
  }

  async ready(): Promise<void> {
    return this.initPromise;
  }
}

// For simple synchronous usage, provide a factory function
export function createLRUCache<K = any, V = any>(options: any): any {
  try {
    // Try to load synchronously for immediate use
    const mod = require('lru-cache');
    const LRUCacheClass = mod.LRUCache || mod.default || mod;
    return new LRUCacheClass(options);
  } catch {
    // Fall back to our async wrapper
    return new LRUCache<K, V>(options);
  }
}