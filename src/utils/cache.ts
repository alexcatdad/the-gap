import { join } from 'node:path';
import { ensureDir, readJson, writeJson } from './fs.ts';

/**
 * Generic cache entry
 */
interface CacheEntry<T> {
	key: string;
	value: T;
	timestamp: number;
	accessCount: number;
}

/**
 * LRU Cache with persistence support
 */
export class SemanticCache<T> {
	private cache: Map<string, CacheEntry<T>> = new Map();
	private readonly maxSize: number;
	private readonly ttlMs: number;
	private readonly persistPath?: string;

	constructor(options: { maxSize?: number; ttlMs?: number; persistPath?: string } = {}) {
		this.maxSize = options.maxSize ?? 1000;
		this.ttlMs = options.ttlMs ?? 1000 * 60 * 60; // 1 hour default
		this.persistPath = options.persistPath;
	}

	/**
	 * Load cache from disk
	 */
	async load(): Promise<void> {
		if (!this.persistPath) return;

		try {
			const entries = await readJson<CacheEntry<T>[]>(this.persistPath, []);
			const now = Date.now();

			for (const entry of entries) {
				// Only load non-expired entries
				if (now - entry.timestamp < this.ttlMs) {
					this.cache.set(entry.key, entry);
				}
			}

			console.log(`Loaded ${this.cache.size} cache entries from ${this.persistPath}`);
		} catch (error) {
			console.warn(`Failed to load cache from ${this.persistPath}:`, error);
		}
	}

	/**
	 * Save cache to disk
	 */
	async save(): Promise<void> {
		if (!this.persistPath) return;

		try {
			const entries = Array.from(this.cache.values());
			await ensureDir(join(this.persistPath, '..'));
			await writeJson(this.persistPath, entries);
			console.log(`Saved ${entries.length} cache entries to ${this.persistPath}`);
		} catch (error) {
			console.warn(`Failed to save cache to ${this.persistPath}:`, error);
		}
	}

	/**
	 * Get value from cache
	 */
	get(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		const now = Date.now();
		if (now - entry.timestamp > this.ttlMs) {
			// Entry expired
			this.cache.delete(key);
			return null;
		}

		// Update access count and timestamp
		entry.accessCount++;
		entry.timestamp = now;
		return entry.value;
	}

	/**
	 * Set value in cache
	 */
	set(key: string, value: T): void {
		const now = Date.now();

		// If at max size, evict least recently used
		if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
			this.evictLRU();
		}

		this.cache.set(key, {
			key,
			value,
			timestamp: now,
			accessCount: 0,
		});
	}

	/**
	 * Check if key exists in cache
	 */
	has(key: string): boolean {
		const entry = this.cache.get(key);
		if (!entry) return false;

		const now = Date.now();
		if (now - entry.timestamp > this.ttlMs) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		size: number;
		maxSize: number;
		hitRate?: number;
		entries: number;
	} {
		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			entries: this.cache.size,
		};
	}

	/**
	 * Evict least recently used entry
	 */
	private evictLRU(): void {
		let oldestEntry: CacheEntry<T> | null = null;
		let oldestKey: string | null = null;

		for (const [key, entry] of this.cache.entries()) {
			if (!oldestEntry || entry.timestamp < oldestEntry.timestamp) {
				oldestEntry = entry;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	/**
	 * Invalidate entries matching a pattern
	 */
	invalidatePattern(pattern: RegExp): number {
		let count = 0;
		for (const key of this.cache.keys()) {
			if (pattern.test(key)) {
				this.cache.delete(key);
				count++;
			}
		}
		return count;
	}
}

/**
 * Specialized cache for embeddings
 */
export class EmbeddingCache extends SemanticCache<number[]> {
	/**
	 * Create a cache key from text using a hash
	 */
	static createKey(text: string): string {
		// Simple hash function for cache key
		let hash = 0;
		for (let i = 0; i < text.length; i++) {
			const char = text.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return `emb_${hash.toString(36)}`;
	}

	/**
	 * Get or compute embedding
	 */
	async getOrCompute(text: string, computeFn: () => Promise<number[]>): Promise<number[]> {
		const key = EmbeddingCache.createKey(text);
		const cached = this.get(key);

		if (cached) {
			return cached;
		}

		const embedding = await computeFn();
		this.set(key, embedding);
		return embedding;
	}
}

/**
 * Specialized cache for graph queries
 */
export class GraphQueryCache extends SemanticCache<unknown> {
	/**
	 * Create cache key from query parameters
	 */
	static createKey(queryType: string, ...params: unknown[]): string {
		const paramsStr = params.map((p) => JSON.stringify(p)).join('_');
		return `graph_${queryType}_${paramsStr}`;
	}

	/**
	 * Invalidate all graph caches (e.g., when graph is rebuilt)
	 */
	invalidateAll(): void {
		this.clear();
	}
}
