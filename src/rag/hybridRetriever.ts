import type { CodeGraph } from '../parser/graphBuilder.ts';
import type { Document, RagEngine } from './ragEngine.ts';

interface ScoredDocument extends Document {
	score: number;
	boostReason?: string[];
}

export class HybridRetriever {
	constructor(
		private readonly rag: RagEngine,
		private readonly graph?: CodeGraph | null,
	) {}

	/**
	 * Hybrid search that combines semantic RAG with graph-based boosting
	 */
	async search(query: string, k = 5): Promise<Document[]> {
		// Get initial RAG results (fetch more than k to allow for re-ranking)
		const initialResults = await this.rag.search(query, k * 3);

		// If no graph available, fall back to pure RAG
		if (!this.graph || this.graph.nodes.length === 0) {
			return initialResults.slice(0, k);
		}

		// Score and boost results based on graph connections
		const scoredResults = this.scoreWithGraphBoost(initialResults);

		// Sort by final score and return top k
		scoredResults.sort((a, b) => b.score - a.score);
		return scoredResults.slice(0, k);
	}

	/**
	 * Score documents and boost based on graph connectivity
	 */
	private scoreWithGraphBoost(documents: Document[]): ScoredDocument[] {
		const scoredDocs: ScoredDocument[] = documents.map((doc, index) => ({
			...doc,
			score: 1.0 / (index + 1), // Initial score based on RAG ranking
			boostReason: [],
		}));

		if (!this.graph) return scoredDocs;

		// Build a map of file paths to their graph connections
		const fileConnectionMap = this.buildFileConnectionMap();

		// Boost documents based on their connections
		for (const doc of scoredDocs) {
			const filePath = this.extractFilePath(doc.content);
			if (!filePath) continue;

			const fileId = `file:${filePath}`;
			const connections = fileConnectionMap.get(fileId);
			if (!connections) continue;

			// Boost score based on connection strength
			let boostMultiplier = 1.0;

			// Boost if imported by many files (central dependency)
			if (connections.importedBy > 2) {
				boostMultiplier += 0.3;
				doc.boostReason?.push(`Central dependency (imported by ${connections.importedBy} files)`);
			}

			// Boost if imports many files (integration point)
			if (connections.imports > 3) {
				boostMultiplier += 0.2;
				doc.boostReason?.push(`Integration point (imports ${connections.imports} files)`);
			}

			// Boost if connected to other results (related code)
			const relatedCount = this.countRelatedDocuments(fileId, scoredDocs, fileConnectionMap);
			if (relatedCount > 0) {
				boostMultiplier += 0.4 * relatedCount;
				doc.boostReason?.push(`Related to ${relatedCount} other result(s)`);
			}

			// Apply boost
			doc.score *= boostMultiplier;
		}

		return scoredDocs;
	}

	/**
	 * Build a map of file connections for quick lookup
	 */
	private buildFileConnectionMap(): Map<
		string,
		{ imports: number; importedBy: number; calls: number; calledBy: number }
	> {
		const map = new Map<
			string,
			{ imports: number; importedBy: number; calls: number; calledBy: number }
		>();

		if (!this.graph) return map;

		// Initialize all file nodes
		for (const node of this.graph.nodes) {
			if (node.type === 'file') {
				map.set(node.id, { imports: 0, importedBy: 0, calls: 0, calledBy: 0 });
			}
		}

		// Count connections
		for (const edge of this.graph.edges) {
			const sourceConn = map.get(edge.source);
			const targetConn = map.get(edge.target);

			if (edge.type === 'imports') {
				if (sourceConn) sourceConn.imports++;
				if (targetConn) targetConn.importedBy++;
			} else if (edge.type === 'calls') {
				if (sourceConn) sourceConn.calls++;
				if (targetConn) targetConn.calledBy++;
			}
		}

		return map;
	}

	/**
	 * Count how many other documents in the result set are related to this file
	 */
	private countRelatedDocuments(
		fileId: string,
		documents: ScoredDocument[],
		_connectionMap: Map<
			string,
			{ imports: number; importedBy: number; calls: number; calledBy: number }
		>,
	): number {
		if (!this.graph) return 0;

		// Get direct connections (imports and imported-by)
		const connectedFileIds = new Set<string>();
		for (const edge of this.graph.edges) {
			if (edge.source === fileId && edge.type === 'imports') {
				connectedFileIds.add(edge.target);
			}
			if (edge.target === fileId && edge.type === 'imports') {
				connectedFileIds.add(edge.source);
			}
		}

		// Count how many result documents are connected
		let count = 0;
		for (const doc of documents) {
			const docFilePath = this.extractFilePath(doc.content);
			if (!docFilePath) continue;

			const docFileId = `file:${docFilePath}`;
			if (docFileId !== fileId && connectedFileIds.has(docFileId)) {
				count++;
			}
		}

		return count;
	}

	/**
	 * Extract file path from document content
	 * Assumes content starts with "File: <path>" or similar
	 */
	private extractFilePath(content: string): string | null {
		// Try to extract from common patterns
		const fileMatch = content.match(/^(?:File|Path):\s*(.+?)(?:\n|$)/i);
		if (fileMatch) {
			return fileMatch[1].trim();
		}

		// Try to extract from markdown code block header
		const codeBlockMatch = content.match(/```\w*\s*\/\/\s*(.+\.(?:ts|js|tsx|jsx))/);
		if (codeBlockMatch) {
			return codeBlockMatch[1].trim();
		}

		return null;
	}

	/**
	 * Get graph statistics for debugging/monitoring
	 */
	getGraphStats(): {
		nodes: number;
		edges: number;
		files: number;
		functions: number;
		imports: number;
		calls: number;
	} | null {
		if (!this.graph) return null;

		const stats = {
			nodes: this.graph.nodes.length,
			edges: this.graph.edges.length,
			files: this.graph.nodes.filter((n) => n.type === 'file').length,
			functions: this.graph.nodes.filter((n) => n.type === 'function').length,
			imports: this.graph.edges.filter((e) => e.type === 'imports').length,
			calls: this.graph.edges.filter((e) => e.type === 'calls').length,
		};

		return stats;
	}
}
