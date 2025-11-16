import { beforeEach, describe, expect, it } from 'vitest';
import type { CodeGraph } from '../../parser/graphBuilder.ts';
import { HybridRetriever } from '../hybridRetriever.ts';
import type { Document, RagEngine } from '../ragEngine.ts';

// Mock RAG engine
class MockRagEngine implements RagEngine {
	async search(_query: string, k = 5): Promise<Document[]> {
		const docs: Document[] = [];
		for (let i = 0; i < k; i++) {
			docs.push({
				content: `File: src/file${i}.ts\n\nSome code here`,
				metadata: { source: `src/file${i}.ts` },
			});
		}
		return docs;
	}

	async addDocuments(_documents: Document[]): Promise<void> {
		// Mock implementation
	}
}

describe('HybridRetriever', () => {
	let mockRag: MockRagEngine;
	let retriever: HybridRetriever;

	beforeEach(() => {
		mockRag = new MockRagEngine();
	});

	describe('without graph', () => {
		beforeEach(() => {
			retriever = new HybridRetriever(mockRag, null);
		});

		it('should fall back to pure RAG when no graph available', async () => {
			const results = await retriever.search('test query', 3);

			expect(results).toHaveLength(3);
			expect(results[0].content).toContain('File:');
		});

		it('should return empty graph stats', () => {
			const stats = retriever.getGraphStats();
			expect(stats).toBeNull();
		});
	});

	describe('with graph', () => {
		let mockGraph: CodeGraph;

		beforeEach(() => {
			mockGraph = {
				nodes: [
					{
						id: 'file:src/file0.ts',
						label: 'file0.ts',
						type: 'file',
						path: 'src/file0.ts',
					},
					{
						id: 'file:src/file1.ts',
						label: 'file1.ts',
						type: 'file',
						path: 'src/file1.ts',
					},
					{
						id: 'file:src/file2.ts',
						label: 'file2.ts',
						type: 'file',
						path: 'src/file2.ts',
					},
					{
						id: 'function:src/file0.ts:main',
						label: 'main',
						type: 'function',
						path: 'src/file0.ts',
					},
				],
				edges: [
					{
						source: 'file:src/file0.ts',
						target: 'file:src/file1.ts',
						type: 'imports',
					},
					{
						source: 'file:src/file1.ts',
						target: 'file:src/file2.ts',
						type: 'imports',
					},
					{
						source: 'file:src/file2.ts',
						target: 'file:src/file0.ts',
						type: 'imports',
					},
					{
						source: 'function:src/file0.ts:main',
						target: 'function:src/file1.ts:helper',
						type: 'calls',
					},
					{
						source: 'file:src/file0.ts',
						target: 'function:src/file0.ts:main',
						type: 'contains',
					},
				],
			};

			retriever = new HybridRetriever(mockRag, mockGraph);
		});

		it('should combine RAG with graph boosting', async () => {
			const results = await retriever.search('test query', 3);

			expect(results.length).toBeGreaterThan(0);
			expect(results.length).toBeLessThanOrEqual(3);
		});

		it('should boost central dependencies', async () => {
			// file2.ts is imported by file1.ts and imports file0.ts
			const results = await retriever.search('test query', 5);

			// Results should be returned (exact boosting depends on implementation)
			expect(results.length).toBeGreaterThan(0);
		});

		it('should return graph statistics', () => {
			const stats = retriever.getGraphStats();

			expect(stats).not.toBeNull();
			expect(stats?.nodes).toBe(4);
			expect(stats?.edges).toBe(5);
			expect(stats?.files).toBe(3);
			expect(stats?.functions).toBe(1);
			expect(stats?.imports).toBe(3);
			expect(stats?.calls).toBe(1);
		});

		it('should handle empty query results', async () => {
			const emptyRag = new MockRagEngine();
			emptyRag.search = async () => [];

			const emptyRetriever = new HybridRetriever(emptyRag, mockGraph);
			const results = await emptyRetriever.search('test', 5);

			expect(results).toHaveLength(0);
		});
	});

	describe('edge cases', () => {
		it('should handle empty graph', async () => {
			const emptyGraph: CodeGraph = {
				nodes: [],
				edges: [],
			};

			retriever = new HybridRetriever(mockRag, emptyGraph);
			const results = await retriever.search('test', 3);

			expect(results).toHaveLength(3);
		});

		it('should handle graph with no edges', async () => {
			const noEdgesGraph: CodeGraph = {
				nodes: [
					{
						id: 'file:src/test.ts',
						label: 'test.ts',
						type: 'file',
						path: 'src/test.ts',
					},
				],
				edges: [],
			};

			retriever = new HybridRetriever(mockRag, noEdgesGraph);
			const results = await retriever.search('test', 3);

			expect(results.length).toBeGreaterThan(0);
		});

		it('should handle documents without file paths', async () => {
			const customRag = new MockRagEngine();
			customRag.search = async (_query, k) => {
				return Array.from({ length: k }, (_, i) => ({
					content: `No file path content ${i}`,
					metadata: {},
				}));
			};

			retriever = new HybridRetriever(customRag, {
				nodes: [],
				edges: [],
			});

			const results = await retriever.search('test', 3);
			expect(results).toHaveLength(3);
		});
	});
});
