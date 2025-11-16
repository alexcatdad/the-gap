import { beforeEach, describe, expect, it } from 'vitest';
import type { TaskStep } from '../../planning/planner.ts';
import { CommandExecutor } from '../executor.ts';

describe('CommandExecutor', () => {
	let executor: CommandExecutor;

	beforeEach(() => {
		executor = new CommandExecutor();
	});

	describe('executeStep', () => {
		it('should execute step without commands', async () => {
			const step: TaskStep = {
				name: 'Analysis',
				description: 'Analyze the code',
				files_affected: ['file.ts'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(true);
			expect(result.output).toContain('no commands');
		});

		it('should execute simple command successfully', async () => {
			const step: TaskStep = {
				name: 'Echo test',
				description: 'Test echo command',
				files_affected: [],
				commands: ['echo "Hello World"'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(true);
			expect(result.output).toContain('Hello World');
		});

		it('should handle command with exit code 0', async () => {
			const step: TaskStep = {
				name: 'True command',
				description: 'Run true command',
				files_affected: [],
				commands: ['true'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(true);
		});

		it('should handle command failure', async () => {
			const step: TaskStep = {
				name: 'Failing command',
				description: 'Run failing command',
				files_affected: [],
				commands: ['false'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(false);
			expect(result.error || result.output).toBeDefined();
		});

		it('should execute multiple commands in sequence', async () => {
			const step: TaskStep = {
				name: 'Multiple commands',
				description: 'Run several commands',
				files_affected: [],
				commands: ['echo "First"', 'echo "Second"', 'echo "Third"'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(true);
			expect(result.output).toContain('First');
			expect(result.output).toContain('Second');
			expect(result.output).toContain('Third');
		});

		it('should continue executing commands even if one fails', async () => {
			const step: TaskStep = {
				name: 'Mixed success',
				description: 'Some commands fail',
				files_affected: [],
				commands: ['echo "First"', 'false', 'echo "Third"'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(false);
			expect(result.output).toContain('First');
			expect(result.output).toContain('Third');
		});

		it('should handle command with output', async () => {
			const step: TaskStep = {
				name: 'List files',
				description: 'List current directory',
				files_affected: [],
				commands: ['ls'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(true);
			expect(result.output.length).toBeGreaterThan(0);
		});

		it('should capture stderr on error', async () => {
			const step: TaskStep = {
				name: 'Error command',
				description: 'Command that writes to stderr',
				files_affected: [],
				commands: ['ls /nonexistent/directory'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(false);
			expect(result.error || result.output).toBeTruthy();
		});
	});

	describe('approval mechanism', () => {
		it('should auto-approve when approveFirst is false', async () => {
			const step: TaskStep = {
				name: 'Test',
				description: 'Test approval',
				files_affected: [],
				commands: ['echo "test"'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(true);
		});

		it('should auto-approve in non-interactive mode', async () => {
			const step: TaskStep = {
				name: 'Test',
				description: 'Test auto-approval',
				files_affected: [],
				commands: ['echo "auto-approved"'],
			};

			// Currently auto-approves
			const result = await executor.executeStep(step, true);

			expect(result.success).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('should handle empty commands array', async () => {
			const step: TaskStep = {
				name: 'Empty',
				description: 'No commands',
				files_affected: [],
				commands: [],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(true);
		});

		it('should handle invalid command', async () => {
			const step: TaskStep = {
				name: 'Invalid',
				description: 'Invalid command',
				files_affected: [],
				commands: ['nonexistent_command_xyz'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should handle very long output', async () => {
			const step: TaskStep = {
				name: 'Long output',
				description: 'Generate long output',
				files_affected: [],
				commands: ['cat package.json'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(true);
			expect(result.output.length).toBeGreaterThan(0);
		});

		it('should handle commands with arguments', async () => {
			const step: TaskStep = {
				name: 'Command with args',
				description: 'Test command parsing',
				files_affected: [],
				commands: ['echo "arg1" "arg2" "arg3"'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(true);
			expect(result.output).toContain('arg1');
		});

		it('should handle special characters in commands', async () => {
			const step: TaskStep = {
				name: 'Special chars',
				description: 'Test special characters',
				files_affected: [],
				commands: ['echo "Special: $HOME"'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.success).toBe(true);
		});
	});

	describe('result formatting', () => {
		it('should include success status in combined output', async () => {
			const step: TaskStep = {
				name: 'Multiple',
				description: 'Multiple commands',
				files_affected: [],
				commands: ['echo "1"', 'echo "2"'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.output).toContain('Command 1');
			expect(result.output).toContain('Command 2');
			expect(result.output).toContain('SUCCESS');
		});

		it('should mark failed commands in output', async () => {
			const step: TaskStep = {
				name: 'Mixed',
				description: 'Success and failure',
				files_affected: [],
				commands: ['echo "ok"', 'false'],
			};

			const result = await executor.executeStep(step, false);

			expect(result.output).toContain('SUCCESS');
			expect(result.output).toContain('FAILED');
		});
	});
});
