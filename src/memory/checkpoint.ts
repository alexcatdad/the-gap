import { join } from 'node:path';
import { ensureDir, readJson, writeJson } from '../utils/fs.ts';

export interface Checkpoint {
	id: string;
	timestamp: number;
	description: string;
	projectState: {
		symbolsCount: number;
		filesIndexed: number;
	};
	taskState?: {
		currentTask: string;
		completedSteps: number;
		totalSteps: number;
	};
	sessionData: Record<string, unknown>;
}

export class CheckpointManager {
	private readonly checkpointDir: string;

	constructor(dataDir = join(process.cwd(), '.the-gap')) {
		this.checkpointDir = join(dataDir, 'checkpoints');
	}

	async createCheckpoint(
		description: string,
		projectState: Checkpoint['projectState'],
		taskState?: Checkpoint['taskState'],
		sessionData: Record<string, unknown> = {},
	): Promise<string> {
		await ensureDir(this.checkpointDir);

		const checkpoint: Checkpoint = {
			id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			timestamp: Date.now(),
			description,
			projectState,
			taskState,
			sessionData,
		};

		const checkpointPath = join(this.checkpointDir, `${checkpoint.id}.json`);
		await writeJson(checkpointPath, checkpoint);

		console.log(`📸 Checkpoint created: ${checkpoint.id} - ${description}`);
		return checkpoint.id;
	}

	async listCheckpoints(): Promise<Checkpoint[]> {
		try {
			const checkpointFiles = await this.getCheckpointFiles();
			const checkpoints: Checkpoint[] = [];

			for (const file of checkpointFiles) {
				try {
					const checkpoint = await readJson<Checkpoint>(file, null as unknown as Checkpoint);
					checkpoints.push(checkpoint);
				} catch (error) {
					console.warn(`Failed to read checkpoint ${file}:`, error);
				}
			}

			// Sort by timestamp (newest first)
			return checkpoints.sort((a, b) => b.timestamp - a.timestamp);
		} catch {
			return [];
		}
	}

	async restoreCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
		try {
			const checkpointPath = join(this.checkpointDir, `${checkpointId}.json`);
			const checkpoint = await readJson<Checkpoint>(checkpointPath, null as unknown as Checkpoint);
			console.log(`🔄 Restored checkpoint: ${checkpoint.id} - ${checkpoint.description}`);
			return checkpoint;
		} catch (error) {
			console.warn(`Failed to restore checkpoint ${checkpointId}:`, error);
			return null;
		}
	}

	async cleanupOldCheckpoints(keepLast = 10): Promise<void> {
		try {
			const checkpoints = await this.listCheckpoints();
			if (checkpoints.length <= keepLast) return;

			const toDelete = checkpoints.slice(keepLast);
			for (const checkpoint of toDelete) {
				const checkpointPath = join(this.checkpointDir, `${checkpoint.id}.json`);
				try {
					await Bun.write(checkpointPath, ''); // This will effectively delete by overwriting with empty content
					console.log(`🗑️ Cleaned up old checkpoint: ${checkpoint.id}`);
				} catch (error) {
					console.warn(`Failed to cleanup checkpoint ${checkpoint.id}:`, error);
				}
			}
		} catch (error) {
			console.warn('Failed to cleanup checkpoints:', error);
		}
	}

	private async getCheckpointFiles(): Promise<string[]> {
		try {
			const files: string[] = [];
			for await (const entry of await Bun.readdir(this.checkpointDir)) {
				if (entry.endsWith('.json')) {
					files.push(join(this.checkpointDir, entry));
				}
			}
			return files;
		} catch {
			return [];
		}
	}
}
