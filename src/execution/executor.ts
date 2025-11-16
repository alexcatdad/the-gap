import type { TaskStep } from '../planning/planner.ts';
import { ExecutionError } from '../utils/errors.ts';

export interface ExecutionResult {
	success: boolean;
	output: string;
	error?: string;
}

export class CommandExecutor {
	async executeStep(step: TaskStep, approveFirst = true): Promise<ExecutionResult> {
		// Validate step input
		if (!step || typeof step !== 'object') {
			throw new ExecutionError(
				'Invalid step provided',
				'',
				0,
				'Provide a valid TaskStep object',
			);
		}

		if (!step.name || step.name.trim().length === 0) {
			throw new ExecutionError(
				'Step name is required',
				'',
				0,
				'Provide a non-empty step name',
			);
		}

		if (!step.description || step.description.trim().length === 0) {
			throw new ExecutionError(
				'Step description is required',
				'',
				0,
				'Provide a non-empty step description',
			);
		}

		console.log(`\n📋 Step: ${step.name}`);
		console.log(`📝 Description: ${step.description}`);

		if (step.files_affected.length > 0) {
			console.log(`📁 Files affected: ${step.files_affected.join(', ')}`);
		}

		if (step.commands && step.commands.length > 0) {
			console.log(`💻 Commands to execute:`);
			for (const cmd of step.commands) {
				console.log(`   ${cmd}`);
			}

			if (approveFirst) {
				const approved = await this.getUserApproval();
				if (!approved) {
					return {
						success: false,
						output: 'User declined to execute commands',
					};
				}
			}

			// Execute commands
			const results: ExecutionResult[] = [];
			for (const cmd of step.commands) {
				console.log(`\n⚡ Executing: ${cmd}`);
				const result = await this.executeCommand(cmd);
				results.push(result);

				if (!result.success) {
					console.log(`❌ Command failed: ${result.error}`);
					// Continue with other commands but mark overall as failed
				} else {
					console.log(`✅ Command succeeded`);
					if (result.output) {
						console.log(`Output: ${result.output}`);
					}
				}
			}

			const overallSuccess = results.every((r) => r.success);
			const combinedOutput = results
				.map(
					(r, i) => `Command ${i + 1}: ${r.success ? 'SUCCESS' : 'FAILED'}\n${r.output || r.error}`,
				)
				.join('\n\n');

			const hasErrors = results.some((r) => !r.success);
			const combinedError = hasErrors
				? results
						.filter((r) => !r.success)
						.map((r) => r.error)
						.join('; ')
				: undefined;

			return {
				success: overallSuccess,
				output: combinedOutput,
				error: combinedError,
			};
		}

		// No commands to execute
		return {
			success: true,
			output: 'Step completed (no commands to execute)',
		};
	}

	private async executeCommand(cmd: string): Promise<ExecutionResult> {
		// Validate command input
		if (!cmd || cmd.trim().length === 0) {
			return {
				success: false,
				output: '',
				error: 'Cannot execute empty command',
			};
		}

		// Basic command sanitization - warn about potentially dangerous commands
		const dangerousPatterns = [
			/rm\s+-rf\s+\//, // rm -rf /
			/:\(\)\{\s*:\|:&\s*\};:/, // fork bomb
			/>\s*\/dev\/sd[a-z]/, // writing to disk devices
		];

		for (const pattern of dangerousPatterns) {
			if (pattern.test(cmd)) {
				return {
					success: false,
					output: '',
					error: 'Command rejected: potentially dangerous pattern detected',
				};
			}
		}

		try {
			const process = Bun.spawn(cmd.split(' '), {
				stdout: 'pipe',
				stderr: 'pipe',
			});

			const [stdout, stderr] = await Promise.all([
				new Response(process.stdout).text(),
				new Response(process.stderr).text(),
			]);

			const exitCode = await process.exited;

			if (exitCode === 0) {
				return {
					success: true,
					output: stdout,
				};
			} else {
				return {
					success: false,
					output: stdout,
					error: stderr || `Command exited with code ${exitCode}`,
				};
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				output: '',
				error: `Failed to execute command: ${errorMessage}`,
			};
		}
	}

	private async getUserApproval(): Promise<boolean> {
		// For now, we'll auto-approve in non-interactive mode
		// TODO: Implement proper user interaction
		console.log('🤔 Auto-approving command execution (non-interactive mode)');
		return true;
	}
}
