import { cmdIndex, cmdInspect, cmdSearch } from './commands.ts';

export async function main(): Promise<void> {
	const [cmd, ...rest] = process.argv.slice(2);
	switch (cmd) {
		case 'index':
			await cmdIndex();
			break;
		case 'search': {
			const q = rest[0];
			if (!q) {
				console.error('Usage: search <query>');
				process.exitCode = 1;
				return;
			}
			await cmdSearch(q);
			break;
		}
		case 'inspect': {
			const task = rest.join(' ');
			if (!task) {
				console.error('Usage: inspect <task description>');
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
			console.log('Usage:');
			console.log('  index              Index project files and symbols');
			console.log('  search <query>     Search symbols by name/path');
			console.log('  inspect <task>     Analyze project and execute task plan');
			console.log('  tui [project]      Launch interactive terminal UI');
	}
}

if (import.meta.main) {
	main();
}
