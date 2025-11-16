import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureDir, writeJson } from '../../utils/fs.ts';
import { GraphBuilder } from '../graphBuilder.ts';

describe('GraphBuilder', () => {
	let builder: GraphBuilder;
	const originalCwd = process.cwd();
	const testDir = join(originalCwd, '.test-graph-builder');
	const gapDir = join(testDir, '.the-gap');

	beforeEach(async () => {
		// Always start from original directory
		process.chdir(originalCwd);

		builder = new GraphBuilder();

		// Create test directory structure
		await ensureDir(testDir);
		await ensureDir(gapDir);

		// Change to test directory
		process.chdir(testDir);

		// Create test source files with relative paths
		const srcDir = 'src';
		await ensureDir(srcDir);

		const test1Content = `import { helper } from './test2';

export function main() {
	helper();
}`;

		const test2Content = `export function helper() {
	console.log('help');
}`;

		await Bun.write(join(srcDir, 'test1.ts'), test1Content);
		await Bun.write(join(srcDir, 'test2.ts'), test2Content);

		// Create symbols.json with relative paths
		await writeJson(join('.the-gap', 'symbols.json'), [
			{ filePath: 'src/test1.ts' },
			{ filePath: 'src/test2.ts' },
		]);
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		try {
			await rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe('buildCompleteGraph', () => {
		it('should build graph with nodes and edges', async () => {
			const graph = await builder.buildCompleteGraph(process.cwd());

			expect(graph.nodes.length).toBeGreaterThan(0);
			expect(graph.edges.length).toBeGreaterThan(0);
		});

		it('should create file nodes', async () => {
			const graph = await builder.buildCompleteGraph(process.cwd());

			const fileNodes = graph.nodes.filter((n) => n.type === 'file');
			expect(fileNodes.length).toBeGreaterThanOrEqual(2);
			expect(fileNodes[0].id).toMatch(/^file:/);
		});

		it('should create function nodes', async () => {
			const graph = await builder.buildCompleteGraph(process.cwd());

			const funcNodes = graph.nodes.filter((n) => n.type === 'function');
			expect(funcNodes.length).toBeGreaterThan(0);
			const hasMain = funcNodes.some((n) => n.label === 'main');
			const hasHelper = funcNodes.some((n) => n.label === 'helper');
			expect(hasMain).toBe(true);
			expect(hasHelper).toBe(true);
		});

		it('should create import edges', async () => {
			const graph = await builder.buildCompleteGraph(process.cwd());

			const importEdges = graph.edges.filter((e) => e.type === 'imports');
			expect(importEdges.length).toBeGreaterThan(0);
		});

		it('should create contains edges', async () => {
			const graph = await builder.buildCompleteGraph(process.cwd());

			const containsEdges = graph.edges.filter((e) => e.type === 'contains');
			expect(containsEdges.length).toBeGreaterThan(0);
		});

		it('should handle exported functions', async () => {
			const graph = await builder.buildCompleteGraph(process.cwd());

			const exportedFuncs = graph.nodes.filter((n) => n.type === 'function' && n.exported === true);
			expect(exportedFuncs.length).toBeGreaterThan(0);
		});
	});

	describe('loadGraph', () => {
		it('should load graph from disk', async () => {
			// First build a graph
			await builder.buildCompleteGraph(process.cwd());

			// Create new builder and load
			const newBuilder = new GraphBuilder();
			const loaded = await newBuilder.loadGraph();
			expect(loaded).not.toBeNull();
			expect(loaded?.nodes).toBeDefined();
			expect(loaded?.edges).toBeDefined();
		});

		it('should return null if graph does not exist', async () => {
			// Save current dir
			const currentDir = process.cwd();

			// Use a fresh directory without graph
			const emptyDir = join(testDir, 'empty');
			await ensureDir(emptyDir);
			process.chdir(emptyDir);

			const newBuilder = new GraphBuilder();
			const loaded = await newBuilder.loadGraph();
			expect(loaded).toBeNull();

			// Restore directory
			process.chdir(currentDir);
		});
	});

	describe('graph queries', () => {
		it('should get callers of a function', async () => {
			const graph = await builder.buildCompleteGraph(process.cwd());
			await builder.loadGraph();

			// Find the helper function
			const helperNode = graph.nodes.find((n) => n.type === 'function' && n.label === 'helper');
			if (helperNode) {
				const callers = builder.getCallersOf(helperNode.id);
				expect(Array.isArray(callers)).toBe(true);
			}
		});

		it('should get callees of a function', async () => {
			const graph = await builder.buildCompleteGraph(process.cwd());
			await builder.loadGraph();

			const mainNode = graph.nodes.find((n) => n.type === 'function' && n.label === 'main');
			if (mainNode) {
				const callees = builder.getCalleesOf(mainNode.id);
				expect(Array.isArray(callees)).toBe(true);
			}
		});

		it('should get imports of a file', async () => {
			const graph = await builder.buildCompleteGraph(process.cwd());
			await builder.loadGraph();

			const test1File = graph.nodes.find((n) => n.type === 'file' && n.path?.includes('test1'));
			if (test1File) {
				const imports = builder.getImportsOf(test1File.id);
				expect(Array.isArray(imports)).toBe(true);
			}
		});

		it('should get importers of a file', async () => {
			const graph = await builder.buildCompleteGraph(process.cwd());
			await builder.loadGraph();

			const test2File = graph.nodes.find((n) => n.type === 'file' && n.path?.includes('test2'));
			if (test2File) {
				const importers = builder.getImportersOf(test2File.id);
				expect(Array.isArray(importers)).toBe(true);
			}
		});
	});

	describe('edge cases', () => {
		it('should handle empty files', async () => {
			const srcDir = 'src';
			await Bun.write(join(srcDir, 'empty.ts'), '');

			await writeJson(join('.the-gap', 'symbols.json'), [{ filePath: 'src/empty.ts' }]);

			const graph = await builder.buildCompleteGraph(process.cwd());
			expect(graph.nodes).toBeDefined();
			expect(graph.edges).toBeDefined();
		});

		it('should handle files with syntax errors gracefully', async () => {
			const srcDir = 'src';
			await Bun.write(join(srcDir, 'invalid.ts'), 'invalid typescript }{][');

			await writeJson(join('.the-gap', 'symbols.json'), [{ filePath: 'src/invalid.ts' }]);

			const graph = await builder.buildCompleteGraph(process.cwd());
			// Should not crash, just skip the invalid file
			expect(graph.nodes).toBeDefined();
		});
	});
});
