import { LmStudioClient, type LmStudioConfig } from '../llm/lmstudioClient.ts';

export interface Embedder {
	embed(texts: string[]): Promise<number[][]>;
}

export class RandomEmbedder implements Embedder {
	constructor(private readonly dim = 384) {}
	async embed(texts: string[]): Promise<number[][]> {
		return texts.map(() => Array.from({ length: this.dim }, () => Math.random()));
	}
}

export class LmStudioEmbedder implements Embedder {
	private client: LmStudioClient;

	constructor(config: LmStudioConfig = {}) {
		this.client = new LmStudioClient(config);
	}

	async embed(texts: string[]): Promise<number[][]> {
		return this.client.getEmbeddings(texts);
	}
}
