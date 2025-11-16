import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureDir, exists, readFile, readJson, writeJson } from '../fs.ts';

describe('File System Utilities', () => {
	const testDir = join(process.cwd(), '.test-fs-utils');
	const testFile = join(testDir, 'test.json');

	beforeEach(async () => {
		await ensureDir(testDir);
	});

	afterEach(async () => {
		try {
			await rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe('ensureDir', () => {
		it('should create directory if it does not exist', async () => {
			const newDir = join(testDir, 'new-dir');
			await ensureDir(newDir);

			const dirExists = await exists(newDir);
			expect(dirExists).toBe(true);
		});

		it('should not error if directory already exists', async () => {
			await ensureDir(testDir);
			await ensureDir(testDir); // Call again

			const dirExists = await exists(testDir);
			expect(dirExists).toBe(true);
		});

		it('should create nested directories', async () => {
			const nestedDir = join(testDir, 'level1', 'level2', 'level3');
			await ensureDir(nestedDir);

			const dirExists = await exists(nestedDir);
			expect(dirExists).toBe(true);
		});
	});

	describe('writeJson', () => {
		it('should write JSON to file', async () => {
			const data = { name: 'test', value: 123 };
			await writeJson(testFile, data);

			const fileExists = await exists(testFile);
			expect(fileExists).toBe(true);
		});

		it('should create parent directories if needed', async () => {
			const nestedFile = join(testDir, 'nested', 'deep', 'file.json');
			const data = { test: true };

			await writeJson(nestedFile, data);

			const fileExists = await exists(nestedFile);
			expect(fileExists).toBe(true);
		});

		it('should handle complex objects', async () => {
			const data = {
				array: [1, 2, 3],
				nested: { deep: { value: 'test' } },
				nullValue: null,
				boolean: true,
			};

			await writeJson(testFile, data);

			const read = await readJson(testFile, {});
			expect(read).toEqual(data);
		});
	});

	describe('readJson', () => {
		it('should read JSON from file', async () => {
			const data = { name: 'test', value: 123 };
			await writeJson(testFile, data);

			const read = await readJson(testFile, {});
			expect(read).toEqual(data);
		});

		it('should return fallback if file does not exist', async () => {
			const fallback = { default: true };
			const read = await readJson(join(testDir, 'nonexistent.json'), fallback);

			expect(read).toEqual(fallback);
		});

		it('should return fallback if JSON is invalid', async () => {
			// Write invalid JSON
			const invalidFile = join(testDir, 'invalid.json');
			await Bun.write(invalidFile, '{invalid json}');

			const fallback = { error: true };
			const read = await readJson(invalidFile, fallback);

			expect(read).toEqual(fallback);
		});

		it('should handle arrays', async () => {
			const data = [1, 2, 3, 4, 5];
			await writeJson(testFile, data);

			const read = await readJson<number[]>(testFile, []);
			expect(read).toEqual(data);
		});
	});

	describe('readFile', () => {
		it('should read file contents as string', async () => {
			const content = 'Hello, World!';
			await Bun.write(join(testDir, 'text.txt'), content);

			const read = await readFile(join(testDir, 'text.txt'));
			expect(read).toBe(content);
		});

		it('should handle multi-line content', async () => {
			const content = 'Line 1\nLine 2\nLine 3';
			await Bun.write(join(testDir, 'multiline.txt'), content);

			const read = await readFile(join(testDir, 'multiline.txt'));
			expect(read).toBe(content);
		});

		it('should handle UTF-8 content', async () => {
			const content = 'Hello 世界 🌍';
			await Bun.write(join(testDir, 'utf8.txt'), content);

			const read = await readFile(join(testDir, 'utf8.txt'));
			expect(read).toBe(content);
		});

		it('should throw error if file does not exist', async () => {
			await expect(readFile(join(testDir, 'nonexistent.txt'))).rejects.toThrow();
		});
	});

	describe('exists', () => {
		it('should return true for existing file', async () => {
			await Bun.write(testFile, '{}');

			const fileExists = await exists(testFile);
			expect(fileExists).toBe(true);
		});

		it('should return true for existing directory', async () => {
			const dirExists = await exists(testDir);
			expect(dirExists).toBe(true);
		});

		it('should return false for non-existent path', async () => {
			const doesNotExist = await exists(join(testDir, 'nonexistent'));
			expect(doesNotExist).toBe(false);
		});

		it('should handle permission errors gracefully', async () => {
			// This test is tricky to implement across platforms
			// Just verify it doesn't crash
			const result = await exists('/root/some-restricted-path');
			expect(typeof result).toBe('boolean');
		});
	});
});
