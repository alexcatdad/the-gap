import type { CodeGraph } from '../parser/graphBuilder.ts';
import type { Document, RagEngine } from './ragEngine.ts';

export class HybridRetriever {
	constructor(
		private readonly rag: RagEngine,
		private readonly graph?: CodeGraph | null,
	) {}

	// MVP: use pure RAG; later, boost results connected in the graph
	async search(query: string, k = 5): Promise<Document[]> {
		const results = await this.rag.search(query, k);
		if (!this.graph || this.graph.nodes.length === 0) return results;
		// Placeholder for boosting causally related nodes
		return results;
	}
}
