import { join } from 'node:path';

export type IndexedFile = {
	path: string;
	size: number;
};

export async function indexProjectFiles(rootDir: string): Promise<IndexedFile[]> {
	console.log(`Indexing project files in: ${rootDir}`);
	const results: IndexedFile[] = [];

	// For now, hardcode the known source files to get started
	// TODO: Implement proper recursive directory traversal
	const knownFiles = [
		'src/cli/index.ts',
		'src/cli/commands.ts',
		'src/llm/lmstudioClient.ts',
		'src/parser/fileIndexer.ts',
		'src/parser/tsParser.ts',
		'src/rag/embeddings.ts',
		'src/rag/ragEngine.ts',
		'src/rag/vectorStore.ts',
		'src/utils/fs.ts',
	];

	for (const filePath of knownFiles) {
		const fullPath = join(rootDir, filePath);
		try {
			const file = Bun.file(fullPath);
			const exists = await file.exists();
			if (exists) {
				results.push({ path: fullPath, size: file.size });
			}
		} catch (error) {
			console.warn(`Failed to check file ${fullPath}:`, error);
		}
	}

	console.log(`Total files found: ${results.length}`);
	return results;
}
