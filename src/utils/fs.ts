import { dirname } from 'node:path';

export async function ensureDir(path: string): Promise<void> {
	try {
		// Try to create the directory
		await Bun.mkdir(path, { recursive: true });
	} catch (_error) {
		// Directory might already exist or we don't have permission
		// This is okay for our use case
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
		const file = Bun.file(path);
		return await file.exists();
	} catch {
		return false;
	}
}
