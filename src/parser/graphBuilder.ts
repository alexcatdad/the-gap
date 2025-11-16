import { join } from 'node:path';
import { ensureDir, readJson, writeJson } from '../utils/fs.ts';

export type GraphNodeType = 'function' | 'class' | 'file' | 'module';

export interface GraphNode {
	id: string;
	label: string;
	type: GraphNodeType;
	path?: string;
}

export interface GraphEdge {
	source: string;
	target: string;
	type: 'imports' | 'calls' | 'contains';
}

export interface CodeGraph {
	nodes: GraphNode[];
	edges: GraphEdge[];
}

const DATA_DIR = join(process.cwd(), '.the-gap');
const GRAPH_JSON = join(DATA_DIR, 'graph.json');

export class GraphBuilder {
	async buildMinimalGraphFromSymbols(): Promise<CodeGraph> {
		// MVP: derive a minimal file-level graph from the indexed symbols file
		// Future: integrate tree-sitter for AST-based edges
		type MinimalSymbol = { filePath: string };
		const symbols = await readJson<MinimalSymbol[]>(join(DATA_DIR, 'symbols.json'), []);
		const fileSet = new Set<string>(symbols.map((s) => s.filePath));

		const nodes: GraphNode[] = Array.from(fileSet).map((p) => ({
			id: `file:${p}`,
			label: p.split('/').pop() ?? p,
			type: 'file',
			path: p,
		}));

		const edges: GraphEdge[] = [];
		// Placeholder: no edges for now

		const graph: CodeGraph = { nodes, edges };
		await ensureDir(DATA_DIR);
		await writeJson(GRAPH_JSON, graph);
		return graph;
	}

	async loadGraph(): Promise<CodeGraph | null> {
		try {
			return await readJson<CodeGraph>(GRAPH_JSON, null as unknown as CodeGraph);
		} catch {
			return null;
		}
	}
}
