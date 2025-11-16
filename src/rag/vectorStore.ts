export type Vector = number[];

export type VectorRecord = {
	id: string;
	text: string;
	metadata?: Record<string, unknown>;
	vector: Vector;
};

export interface VectorStore {
	upsertMany(records: VectorRecord[]): Promise<void>;
	query(vector: Vector, k: number): Promise<VectorRecord[]>;
}

export class InMemoryVectorStore implements VectorStore {
	private readonly records: VectorRecord[] = [];

	async upsertMany(records: VectorRecord[]): Promise<void> {
		// naive replace by id
		for (const rec of records) {
			const idx = this.records.findIndex((r) => r.id === rec.id);
			if (idx >= 0) this.records[idx] = rec;
			else this.records.push(rec);
		}
	}

	async query(vector: Vector, k: number): Promise<VectorRecord[]> {
		const scored = this.records.map((r) => ({ r, score: cosineSim(vector, r.vector) }));
		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, k).map((s) => s.r);
	}
}

export function cosineSim(a: Vector, b: Vector): number {
	const min = Math.min(a.length, b.length);
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < min; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
