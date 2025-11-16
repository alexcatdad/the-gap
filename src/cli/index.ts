import { cmdIndex, cmdInspect, cmdSearch } from './commands.ts';

const VERSION = '0.1.0';

function showHelp(): void {
	console.log(`
╭─────────────────────────────────────────────────────────────╮
│  The Gap - Local AI Code Assistant                         │
│  Version ${VERSION}                                              │
╰─────────────────────────────────────────────────────────────╯

USAGE:
  the-gap <command> [options]

COMMANDS:
  index                   Index project files and build knowledge graph
                          Creates embeddings and analyzes code structure

  search <query>          Search indexed symbols by name or path
                          Uses semantic search to find relevant code

  inspect <task>          Analyze project and execute task plan
                          Uses AI to plan and execute development tasks

  tui [project]           Launch interactive terminal UI
                          Full-featured interface for project exploration

  help, --help, -h        Show this help message

  version, --version, -v  Show version information

EXAMPLES:
  $ the-gap index
  $ the-gap search "authentication"
  $ the-gap inspect "refactor user service"
  $ the-gap tui

For more information, visit: https://github.com/yourusername/the-gap
`);
}

function showVersion(): void {
	console.log(`The Gap v${VERSION}`);
}

export async function main(): Promise<void> {
	const [cmd, ...rest] = process.argv.slice(2);

	// Handle help and version flags
	if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
		showHelp();
		return;
	}

	if (cmd === 'version' || cmd === '--version' || cmd === '-v') {
		showVersion();
		return;
	}

	try {
		switch (cmd) {
			case 'index':
				await cmdIndex();
				break;

			case 'search': {
				const q = rest[0];
				if (!q) {
					console.error('❌ Error: Missing search query\n');
					console.log('Usage: the-gap search <query>\n');
					console.log('Example: the-gap search "authentication"\n');
					process.exitCode = 1;
					return;
				}
				await cmdSearch(q);
				break;
			}

			case 'inspect': {
				const task = rest.join(' ');
				if (!task) {
					console.error('❌ Error: Missing task description\n');
					console.log('Usage: the-gap inspect <task description>\n');
					console.log('Example: the-gap inspect "refactor authentication"\n');
					process.exitCode = 1;
					return;
				}
				await cmdInspect(task);
				break;
			}

			case 'tui': {
				const { runTUI } = await import('./tui.tsx');
				const projectPath = rest[0] || process.cwd();
				await runTUI(projectPath);
				break;
			}

			default:
				console.error(`❌ Error: Unknown command '${cmd}'\n`);
				showHelp();
				process.exitCode = 1;
		}
	} catch (error) {
		console.error('❌ Fatal error:', error);
		process.exitCode = 1;
	}
}

if (import.meta.main) {
	main();
}
