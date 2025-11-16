import { beforeEach, describe, expect, it } from 'vitest';
import { EmbeddingCache, GraphQueryCache, SemanticCache } from '../cache.ts';

describe('SemanticCache', () => {
	let cache: SemanticCache<string>;

	beforeEach(() => {
		cache = new SemanticCache({ maxSize: 3, ttlMs: 1000 });
	});

	it('should store and retrieve values', () => {
		cache.set('key1', 'value1');
		expect(cache.get('key1')).toBe('value1');
	});

	it('should return null for non-existent keys', () => {
		expect(cache.get('nonexistent')).toBeNull();
	});

	it('should evict LRU entry when max size is reached', async () => {
		cache.set('key1', 'value1');
		cache.set('key2', 'value2');
		cache.set('key3', 'value3');

		// Small delay to ensure different timestamps
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Access key1 and key3 to make them more recently used
		expect(cache.get('key1')).toBe('value1');
		expect(cache.get('key3')).toBe('value3');

		await new Promise((resolve) => setTimeout(resolve, 10));

		// Add a new entry, should evict key2 (least recently used)
		cache.set('key4', 'value4');

		// Check that key2 was evicted
		expect(cache.get('key2')).toBeNull();
		// And others are still there
		expect(cache.has('key1')).toBe(true);
		expect(cache.has('key3')).toBe(true);
		expect(cache.has('key4')).toBe(true);
	});

	it('should expire entries after TTL', async () => {
		const shortTtlCache = new SemanticCache<string>({ ttlMs: 50 });
		shortTtlCache.set('key1', 'value1');

		expect(shortTtlCache.get('key1')).toBe('value1');

		// Wait for expiration
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(shortTtlCache.get('key1')).toBeNull();
	});

	it('should clear all entries', () => {
		cache.set('key1', 'value1');
		cache.set('key2', 'value2');

		cache.clear();

		expect(cache.get('key1')).toBeNull();
		expect(cache.get('key2')).toBeNull();
		expect(cache.getStats().size).toBe(0);
	});

	it('should invalidate entries matching a pattern', () => {
		cache.set('user_123', 'value1');
		cache.set('user_456', 'value2');
		cache.set('post_789', 'value3');

		const invalidated = cache.invalidatePattern(/^user_/);

		expect(invalidated).toBe(2);
		expect(cache.get('user_123')).toBeNull();
		expect(cache.get('user_456')).toBeNull();
		expect(cache.get('post_789')).toBe('value3');
	});

	it('should provide accurate statistics', () => {
		cache.set('key1', 'value1');
		cache.set('key2', 'value2');

		const stats = cache.getStats();
		expect(stats.size).toBe(2);
		expect(stats.maxSize).toBe(3);
	});
});

describe('EmbeddingCache', () => {
	let cache: EmbeddingCache;

	beforeEach(() => {
		cache = new EmbeddingCache({ maxSize: 10 });
	});

	it('should create consistent keys for same text', () => {
		const key1 = EmbeddingCache.createKey('hello world');
		const key2 = EmbeddingCache.createKey('hello world');
		expect(key1).toBe(key2);
	});

	it('should create different keys for different text', () => {
		const key1 = EmbeddingCache.createKey('hello');
		const key2 = EmbeddingCache.createKey('world');
		expect(key1).not.toBe(key2);
	});

	it('should cache and retrieve embeddings', async () => {
		const embedding = [1, 2, 3, 4];
		let computeCount = 0;

		const result1 = await cache.getOrCompute('test text', async () => {
			computeCount++;
			return embedding;
		});

		const result2 = await cache.getOrCompute('test text', async () => {
			computeCount++;
			return [5, 6, 7, 8]; // Different value, should not be used
		});

		expect(result1).toEqual(embedding);
		expect(result2).toEqual(embedding);
		expect(computeCount).toBe(1); // Should only compute once
	});
});

describe('GraphQueryCache', () => {
	let cache: GraphQueryCache;

	beforeEach(() => {
		cache = new GraphQueryCache({ maxSize: 10 });
	});

	it('should create consistent keys for same query', () => {
		const key1 = GraphQueryCache.createKey('getCallers', 'function:foo');
		const key2 = GraphQueryCache.createKey('getCallers', 'function:foo');
		expect(key1).toBe(key2);
	});

	it('should create different keys for different queries', () => {
		const key1 = GraphQueryCache.createKey('getCallers', 'function:foo');
		const key2 = GraphQueryCache.createKey('getCallees', 'function:foo');
		expect(key1).not.toBe(key2);
	});

	it('should invalidate all entries', () => {
		cache.set('key1', { data: 'value1' });
		cache.set('key2', { data: 'value2' });

		cache.invalidateAll();

		expect(cache.get('key1')).toBeNull();
		expect(cache.get('key2')).toBeNull();
	});
});
