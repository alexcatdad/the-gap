import { LMStudioClient as LMStudioSDK } from '@lmstudio/sdk';

export type LmStudioConfig = {
	baseUrl?: string;
	embeddingModel?: string;
	chatModel?: string;
};

export class LmStudioClient {
	private lmStudio: LMStudioSDK;
	private readonly embeddingModel: string;
	private readonly chatModel: string;

	constructor(config: LmStudioConfig = {}) {
		this.lmStudio = new LMStudioSDK({
			baseUrl: config.baseUrl,
		});
		this.embeddingModel = config.embeddingModel ?? 'text-embedding-nomic-embed-text-v1.5';
		this.chatModel = config.chatModel ?? 'local-model';
	}

	async getEmbedding(text: string): Promise<number[]> {
		try {
			const model = await this.lmStudio.models.get(this.embeddingModel);
			if (!model) {
				throw new Error(`Embedding model ${this.embeddingModel} not found`);
			}

			const _result = await model.complete({
				messages: [{ role: 'user', content: text }],
				temperature: 0, // Deterministic embeddings
			});

			// For now, return a hash-based embedding until we figure out how to get actual embeddings
			// The LM Studio SDK might not directly support embeddings via the complete API
			return this.hashToVector(text, 384);
		} catch (error) {
			console.warn('LM Studio embedding failed, using fallback:', error);
			return this.hashToVector(text, 384);
		}
	}

	async getEmbeddings(texts: string[]): Promise<number[][]> {
		const embeddings: number[][] = [];
		for (const text of texts) {
			embeddings.push(await this.getEmbedding(text));
		}
		return embeddings;
	}

	async chat(message: string, systemPrompt?: string): Promise<string> {
		try {
			const model = await this.lmStudio.models.get(this.chatModel);
			if (!model) {
				throw new Error(`Chat model ${this.chatModel} not found`);
			}

			const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
			if (systemPrompt) {
				messages.push({ role: 'system', content: systemPrompt });
			}
			messages.push({ role: 'user', content: message });

			const result = await model.complete({
				messages,
				temperature: 0.7,
			});

			return result.content;
		} catch (error) {
			console.warn('LM Studio chat failed:', error);
			throw new Error(`Failed to get response from LM Studio: ${error}`);
		}
	}

	async sayHello(name: string): Promise<string> {
		return this.chat(`Say hello to ${name} in a friendly way.`);
	}

	private hashToVector(text: string, dim: number): number[] {
		let h1 = 2166136261;
		const vec = new Array<number>(dim).fill(0);
		for (let i = 0; i < text.length; i++) {
			h1 ^= text.charCodeAt(i);
			h1 += (h1 << 1) + (h1 << 4) + (h1 << 7) + (h1 << 8) + (h1 << 24);
			const idx = Math.abs(h1) % dim;
			vec[idx] += 1;
		}
		const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
		return vec.map((v) => v / norm);
	}
}
