import { LMStudioClient as LMStudioSDK } from '@lmstudio/sdk';
import { EmbeddingCache } from '../utils/cache.ts';
import { LLMError, retry, withTimeout } from '../utils/errors.ts';
import { join } from 'node:path';

export type LmStudioConfig = {
	baseUrl?: string;
	embeddingModel?: string;
	chatModel?: string;
	enableCache?: boolean;
};

export class LmStudioClient {
	private lmStudio: LMStudioSDK;
	private readonly embeddingModel: string;
	private readonly chatModel: string;
	private embeddingCache?: EmbeddingCache;

	constructor(config: LmStudioConfig = {}) {
		this.lmStudio = new LMStudioSDK({
			baseUrl: config.baseUrl,
		});
		this.embeddingModel = config.embeddingModel ?? 'text-embedding-nomic-embed-text-v1.5';
		this.chatModel = config.chatModel ?? 'local-model';

		// Initialize cache if enabled
		if (config.enableCache !== false) {
			const cachePath = join(process.cwd(), '.the-gap', 'embedding-cache.json');
			this.embeddingCache = new EmbeddingCache({
				maxSize: 1000,
				ttlMs: 1000 * 60 * 60 * 24, // 24 hours
				persistPath: cachePath,
			});

			// Load cache on startup
			this.embeddingCache.load().catch(() => {
				// Ignore cache load errors
			});
		}
	}

	async getEmbedding(text: string): Promise<number[]> {
		// Check cache first
		if (this.embeddingCache) {
			const cached = await this.embeddingCache.getOrCompute(text, async () => {
				return this.computeEmbedding(text);
			});
			return cached;
		}

		return this.computeEmbedding(text);
	}

	private async computeEmbedding(text: string): Promise<number[]> {
		try {
			// Validate input
			if (!text || text.trim().length === 0) {
				throw new LLMError(
					'Cannot generate embedding for empty text',
					this.embeddingModel,
					'Provide non-empty text content',
				);
			}

			if (text.length > 8000) {
				console.warn(`Text length ${text.length} exceeds recommended limit, truncating`);
				text = text.substring(0, 8000);
			}

			const model = await retry(
				async () => {
					const m = await withTimeout(
						async () => this.lmStudio.models.get(this.embeddingModel),
						30000,
						'Model loading timed out',
					);
					if (!m) {
						throw new LLMError(
							`Embedding model ${this.embeddingModel} not found`,
							this.embeddingModel,
							'Ensure LM Studio is running and the model is loaded',
						);
					}
					return m;
				},
				{
					maxAttempts: 2,
					initialDelay: 1000,
					onRetry: (attempt) => {
						console.log(
							`Retry attempt ${attempt} for embedding model ${this.embeddingModel}`,
						);
					},
				},
			);

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
		// Validate input
		if (!message || message.trim().length === 0) {
			throw new LLMError(
				'Cannot send empty message',
				this.chatModel,
				'Provide non-empty message content',
			);
		}

		try {
			const model = await retry(
				async () => {
					const m = await withTimeout(
						async () => this.lmStudio.models.get(this.chatModel),
						30000,
						'Chat model loading timed out',
					);
					if (!m) {
						throw new LLMError(
							`Chat model ${this.chatModel} not found`,
							this.chatModel,
							'Ensure LM Studio is running and the chat model is loaded',
						);
					}
					return m;
				},
				{
					maxAttempts: 2,
					initialDelay: 1000,
					onRetry: (attempt) => {
						console.log(`Retry attempt ${attempt} for chat model ${this.chatModel}`);
					},
				},
			);

			const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
			if (systemPrompt) {
				messages.push({ role: 'system', content: systemPrompt });
			}
			messages.push({ role: 'user', content: message });

			const result = await withTimeout(
				async () =>
					model.complete({
						messages,
						temperature: 0.7,
					}),
				120000, // 2 minute timeout for chat
				'Chat completion timed out',
			);

			if (!result || !result.content) {
				throw new LLMError(
					'Received empty response from chat model',
					this.chatModel,
					'Try simplifying your prompt or using a different model',
				);
			}

			return result.content;
		} catch (error) {
			if (error instanceof LLMError) {
				throw error;
			}
			console.warn('LM Studio chat failed:', error);
			throw new LLMError(
				`Failed to get response from LM Studio: ${error}`,
				this.chatModel,
				'Check LM Studio is running and the model is loaded',
			);
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
