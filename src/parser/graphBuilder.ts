import { dirname, join, relative, resolve } from 'node:path';
import { ensureDir, exists, readFile, readJson, writeJson } from '../utils/fs.ts';
import { type ParseResult, parseFileComplete } from './tsParser.ts';

export type GraphNodeType = 'function' | 'class' | 'file' | 'module' | 'interface' | 'type';

export interface GraphNode {
	id: string;
	label: string;
	type: GraphNodeType;
	path?: string;
	exported?: boolean;
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

export class GraphBuilder {
	private get dataDir(): string {
		return join(process.cwd(), '.the-gap');
	}

	private get graphJsonPath(): string {
		return join(this.dataDir, 'graph.json');
	}
	private nodes: Map<string, GraphNode> = new Map();
	private edges: GraphEdge[] = [];
	private fileParseResults: Map<string, ParseResult> = new Map();

	/**
	 * Build a complete code graph from TypeScript files
	 */
	async buildCompleteGraph(projectRoot: string): Promise<CodeGraph> {
		this.nodes.clear();
		this.edges = [];
		this.fileParseResults.clear();

		// Read all indexed files from symbols.json
		type MinimalSymbol = { filePath: string };
		const symbolsPath = join(this.dataDir, 'symbols.json');
		const symbols = await readJson<MinimalSymbol[]>(symbolsPath, []);
		const files = Array.from(new Set(symbols.map((s) => s.filePath)));

		// Phase 1: Parse all files and extract symbols, imports, and calls
		for (const filePath of files) {
			await this.parseAndIndexFile(filePath);
		}

		// Phase 2: Build edges based on imports and calls
		await this.buildEdges(projectRoot);

		const graph: CodeGraph = {
			nodes: Array.from(this.nodes.values()),
			edges: this.edges,
		};

		await ensureDir(this.dataDir);
		await writeJson(this.graphJsonPath, graph);
		return graph;
	}

	/**
	 * Legacy method for backwards compatibility
	 */
	async buildMinimalGraphFromSymbols(): Promise<CodeGraph> {
		return this.buildCompleteGraph(process.cwd());
	}

	private async parseAndIndexFile(filePath: string): Promise<void> {
		try {
			// Validate file path
			if (!filePath || filePath.trim().length === 0) {
				console.warn('Empty file path provided, skipping');
				return;
			}

			const fullPath = resolve(filePath);

			// Check if file exists before reading
			if (!(await exists(fullPath))) {
				console.warn(`File not found: ${fullPath}`);
				return;
			}

			const content = await readFile(fullPath);

			// Skip empty files
			if (content.trim().length === 0) {
				console.log(`Skipping empty file: ${filePath}`);
				return;
			}

			const parseResult = parseFileComplete(filePath, content);
			this.fileParseResults.set(filePath, parseResult);

			// Add file node
			const fileId = `file:${filePath}`;
			this.nodes.set(fileId, {
				id: fileId,
				label: filePath.split('/').pop() ?? filePath,
				type: 'file',
				path: filePath,
			});

			// Add symbol nodes (functions, classes, interfaces, types)
			for (const symbol of parseResult.symbols) {
				const symbolId = `${symbol.kind}:${filePath}:${symbol.name}`;
				this.nodes.set(symbolId, {
					id: symbolId,
					label: symbol.name,
					type: symbol.kind as GraphNodeType,
					path: filePath,
					exported: symbol.exported,
				});

				// Add "contains" edge from file to symbol
				this.edges.push({
					source: fileId,
					target: symbolId,
					type: 'contains',
				});
			}
		} catch (error) {
			console.warn(`Failed to parse file ${filePath}:`, error);
		}
	}

	private async buildEdges(projectRoot: string): Promise<void> {
		for (const [filePath, parseResult] of this.fileParseResults.entries()) {
			// Build import edges
			for (const imp of parseResult.imports) {
				const resolvedPath = this.resolveImportPath(imp.modulePath, filePath, projectRoot);
				if (resolvedPath) {
					const sourceFileId = `file:${filePath}`;
					const targetFileId = `file:${resolvedPath}`;

					// Only add edge if target file exists in our graph
					if (this.nodes.has(targetFileId)) {
						this.edges.push({
							source: sourceFileId,
							target: targetFileId,
							type: 'imports',
						});
					}
				}
			}

			// Build call edges
			for (const call of parseResult.calls) {
				const sourceId = call.callerFunction
					? `function:${filePath}:${call.callerFunction}`
					: `file:${filePath}`;

				// Try to find the callee in the same file first
				const targetId = this.findCallTarget(call.calleeName, filePath, parseResult);
				if (targetId && this.nodes.has(targetId)) {
					this.edges.push({
						source: sourceId,
						target: targetId,
						type: 'calls',
					});
				}
			}
		}
	}

	private resolveImportPath(
		importPath: string,
		fromFile: string,
		projectRoot: string,
	): string | null {
		try {
			// Handle relative imports
			if (importPath.startsWith('.')) {
				const fromDir = dirname(resolve(fromFile));
				const resolved = resolve(fromDir, importPath);

				// Try common TypeScript extensions
				const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
				for (const ext of extensions) {
					const withExt = resolved + ext;
					const relPath = relative(projectRoot, withExt);
					if (this.fileParseResults.has(relPath) || this.fileParseResults.has(withExt)) {
						return relPath.startsWith('.') ? withExt : relPath;
					}
				}

				// Return as-is if we can't resolve (might be in node_modules)
				return relative(projectRoot, resolved);
			}

			// For node_modules or absolute imports, we don't track them for now
			return null;
		} catch {
			return null;
		}
	}

	private findCallTarget(
		calleeName: string,
		filePath: string,
		_parseResult: ParseResult,
	): string | null {
		// Check if it's a method call (e.g., "obj.method")
		if (calleeName.includes('.')) {
			const parts = calleeName.split('.');
			const className = parts[0];
			const methodName = parts.slice(1).join('.');

			// Look for class method in the same file
			const methodId = `function:${filePath}:${className}.${methodName}`;
			if (this.nodes.has(methodId)) {
				return methodId;
			}
		}

		// Look for function in the same file
		const functionId = `function:${filePath}:${calleeName}`;
		if (this.nodes.has(functionId)) {
			return functionId;
		}

		// Look for imported function
		// (For now, we don't cross-file resolve calls; this can be enhanced)
		return null;
	}

	/**
	 * Query functions for graph traversal
	 */
	getCallersOf(symbolId: string): GraphNode[] {
		const callers: GraphNode[] = [];
		for (const edge of this.edges) {
			if (edge.target === symbolId && edge.type === 'calls') {
				const node = this.nodes.get(edge.source);
				if (node) callers.push(node);
			}
		}
		return callers;
	}

	getCalleesOf(symbolId: string): GraphNode[] {
		const callees: GraphNode[] = [];
		for (const edge of this.edges) {
			if (edge.source === symbolId && edge.type === 'calls') {
				const node = this.nodes.get(edge.target);
				if (node) callees.push(node);
			}
		}
		return callees;
	}

	getImportsOf(fileId: string): GraphNode[] {
		const imports: GraphNode[] = [];
		for (const edge of this.edges) {
			if (edge.source === fileId && edge.type === 'imports') {
				const node = this.nodes.get(edge.target);
				if (node) imports.push(node);
			}
		}
		return imports;
	}

	getImportersOf(fileId: string): GraphNode[] {
		const importers: GraphNode[] = [];
		for (const edge of this.edges) {
			if (edge.target === fileId && edge.type === 'imports') {
				const node = this.nodes.get(edge.source);
				if (node) importers.push(node);
			}
		}
		return importers;
	}

	async loadGraph(): Promise<CodeGraph | null> {
		try {
			const graph = await readJson<CodeGraph>(this.graphJsonPath, null as unknown as CodeGraph);
			if (graph) {
				// Rebuild internal structures for querying
				this.nodes.clear();
				this.edges = graph.edges;
				for (const node of graph.nodes) {
					this.nodes.set(node.id, node);
				}
			}
			return graph;
		} catch {
			return null;
		}
	}
}
