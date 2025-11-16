import { dirname } from 'node:path';

export async function ensureDir(path: string): Promise<void> {
	try {
		// Use node:fs for better cross-platform compatibility
		const { mkdir } = await import('node:fs/promises');
		await mkdir(path, { recursive: true });
	} catch (error: any) {
		// Directory already exists is OK
		if (error.code !== 'EEXIST') {
			// Re-throw other errors
			throw error;
		}
	}
}

export async function writeJson(path: string, data: unknown): Promise<void> {
	await ensureDir(dirname(path));
	await Bun.write(path, JSON.stringify(data, null, 2));
}

export async function readJson<T>(path: string, fallback: T): Promise<T> {
	try {
		const file = Bun.file(path);
		const text = await file.text();
		return JSON.parse(text) as T;
	} catch {
		return fallback;
	}
}

export async function readFile(path: string): Promise<string> {
	const file = Bun.file(path);
	return await file.text();
}

export async function exists(path: string): Promise<boolean> {
	try {
		// Bun.file().exists() only works for files, not directories
		// Use node:fs for universal exists check
		const { stat } = await import('node:fs/promises');
		await stat(path);
		return true;
	} catch {
		return false;
	}
}
