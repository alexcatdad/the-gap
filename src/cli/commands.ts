import { join } from 'node:path';
import { CommandExecutor } from '../execution/executor.ts';
import { CheckpointManager } from '../memory/checkpoint.ts';
import { indexProjectFiles } from '../parser/fileIndexer.ts';
import { type ParsedSymbol, parseFileSymbols } from '../parser/tsParser.ts';
import { TaskPlanner } from '../planning/planner.ts';
import { LmStudioEmbedder, RandomEmbedder } from '../rag/embeddings.ts';
import { type Document, RagEngine } from '../rag/ragEngine.ts';
import { ensureDir, readJson, writeJson } from '../utils/fs.ts';

const DATA_DIR = join(process.cwd(), '.the-gap');
const SYMBOLS_JSON = join(DATA_DIR, 'symbols.json');

export async function cmdIndex(root = process.cwd()): Promise<void> {
	await ensureDir(DATA_DIR);
	const files = await indexProjectFiles(root);
	const symbols: ParsedSymbol[] = [];
	for (const f of files) {
		try {
			const file = Bun.file(f.path);
			const text = await file.text();
			symbols.push(...parseFileSymbols(f.path, text));
		} catch (error) {
			console.warn(`Failed to read file ${f.path}:`, error);
		}
	}
	await writeJson(SYMBOLS_JSON, symbols);
	console.log(`Indexed ${files.length} files, found ${symbols.length} symbols.`);

	// Try LM Studio embedder first, fall back to random if LM Studio unavailable
	let embedder: LmStudioEmbedder | RandomEmbedder;
	try {
		console.log('Attempting to use LM Studio for embeddings...');
		embedder = new LmStudioEmbedder();
		await embedder.embed(['test']); // Test if LM Studio is available
		console.log('✅ Using LM Studio embeddings');
	} catch (error) {
		console.log('⚠️ LM Studio not available, using random embeddings:', error);
		embedder = new RandomEmbedder(256);
	}

	const rag = new RagEngine(embedder);
	const docs: Document[] = symbols.map((s, i) => ({
		id: `${i}:${s.filePath}:${s.name}`,
		text: `${s.kind} ${s.name} in ${s.filePath}`,
		metadata: s as unknown as Record<string, unknown>,
	}));
	await rag.indexDocuments(docs);
	// Save minimal snapshot (not persisting vectors in this MVP)
	await writeJson(join(DATA_DIR, 'rag_meta.json'), { count: docs.length, dim: 256 });
}

export async function cmdSearch(query: string, k = 10): Promise<void> {
	const symbols = await readJson<ParsedSymbol[]>(SYMBOLS_JSON, []);
	if (!symbols.length) {
		console.error('No symbols indexed. Run: bun run src/cli/index.ts index');
		return;
	}
	// Simple keyword match on name + path
	const lowered = query.toLowerCase();
	const matches = symbols
		.filter(
			(s) => s.name.toLowerCase().includes(lowered) || s.filePath.toLowerCase().includes(lowered),
		)
		.slice(0, k);
	for (const m of matches) {
		console.log(`${m.kind} ${m.name} — ${m.filePath}`);
	}
	if (matches.length === 0) console.log('No matches.');
}

export async function cmdInspect(taskDescription: string): Promise<void> {
	console.log('🔍 Inspecting project and creating task plan...');

	// Check if project is indexed
	const symbols = await readJson<ParsedSymbol[]>(SYMBOLS_JSON, []);
	if (!symbols.length) {
		console.error('Project not indexed. Run: bun run src/cli/index.ts index');
		return;
	}

	// Initialize checkpoint manager
	const checkpointManager = new CheckpointManager();

	// Create initial checkpoint
	await checkpointManager.createCheckpoint(
		`Starting task: ${taskDescription}`,
		{
			symbolsCount: symbols.length,
			filesIndexed: symbols.length > 0 ? [...new Set(symbols.map((s) => s.filePath))].length : 0,
		},
		{
			currentTask: taskDescription,
			completedSteps: 0,
			totalSteps: 0,
		},
	);

	// Create project context summary
	const projectContext =
		`Project has ${symbols.length} symbols across multiple files. ` +
		`Languages: ${[...new Set(symbols.map((s) => s.filePath.split('.').pop()))].join(', ')}`;

	console.log(`📊 Project context: ${projectContext}`);

	// Create plan
	const planner = new TaskPlanner();
	console.log(`\n🎯 Task: ${taskDescription}`);
	console.log('🤖 Generating plan...');

	const plan = await planner.createPlan(taskDescription, projectContext);

	console.log('\n📋 Generated Plan:');
	plan.steps.forEach((step, i) => {
		console.log(`\n${i + 1}. ${step.name}`);
		console.log(`   ${step.description}`);
		if (step.files_affected.length > 0) {
			console.log(`   Files: ${step.files_affected.join(', ')}`);
		}
		if (step.commands && step.commands.length > 0) {
			console.log(`   Commands: ${step.commands.join('; ')}`);
		}
	});

	// Execute plan
	const executor = new CommandExecutor();
	console.log('\n🚀 Executing plan...\n');

	for (let i = 0; i < plan.steps.length; i++) {
		const step = plan.steps[i];
		console.log(`\n--- Step ${i + 1}/${plan.steps.length} ---`);

		// Create checkpoint before each step
		await checkpointManager.createCheckpoint(
			`Before step ${i + 1}: ${step.name}`,
			{
				symbolsCount: symbols.length,
				filesIndexed: symbols.length > 0 ? [...new Set(symbols.map((s) => s.filePath))].length : 0,
			},
			{
				currentTask: taskDescription,
				completedSteps: i,
				totalSteps: plan.steps.length,
			},
			{ currentStep: step.name, stepIndex: i },
		);

		const result = await executor.executeStep(step);
		if (!result.success) {
			console.log(`❌ Step failed: ${result.error}`);
			console.log('Stopping execution.');

			// Create failure checkpoint
			await checkpointManager.createCheckpoint(
				`Task failed at step ${i + 1}: ${step.name}`,
				{
					symbolsCount: symbols.length,
					filesIndexed:
						symbols.length > 0 ? [...new Set(symbols.map((s) => s.filePath))].length : 0,
				},
				{
					currentTask: taskDescription,
					completedSteps: i,
					totalSteps: plan.steps.length,
				},
				{ failureStep: step.name, error: result.error },
			);

			break;
		}

		console.log(`✅ Step completed successfully`);
	}

	// Create final checkpoint
	await checkpointManager.createCheckpoint(
		`Task completed: ${taskDescription}`,
		{
			symbolsCount: symbols.length,
			filesIndexed: symbols.length > 0 ? [...new Set(symbols.map((s) => s.filePath))].length : 0,
		},
		{
			currentTask: taskDescription,
			completedSteps: plan.steps.length,
			totalSteps: plan.steps.length,
		},
	);

	console.log('\n🎉 Task execution completed!');
}
