import type { Embedder } from './embeddings.ts';
import { InMemoryVectorStore, type VectorRecord } from './vectorStore.ts';

export type Document = {
	id: string;
	text: string;
	metadata?: Record<string, unknown>;
};

export class RagEngine {
	constructor(
		private readonly embedder: Embedder,
		private readonly store = new InMemoryVectorStore(),
	) {}

	async indexDocuments(docs: Document[]): Promise<void> {
		const embeddings = await this.embedder.embed(docs.map((d) => d.text));
		const records: VectorRecord[] = docs.map((d, i) => ({
			id: d.id,
			text: d.text,
			metadata: d.metadata,
			vector: embeddings[i],
		}));
		await this.store.upsertMany(records);
	}

	async search(query: string, k = 5): Promise<Document[]> {
		const [qv] = await this.embedder.embed([query]);
		const results = await this.store.query(qv, k);
		return results.map((r) => ({ id: r.id, text: r.text, metadata: r.metadata }));
	}
}
