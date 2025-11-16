import type { TaskStep } from '../planning/planner.ts';

export interface ExecutionResult {
	success: boolean;
	output: string;
	error?: string;
}

export class CommandExecutor {
	async executeStep(step: TaskStep, approveFirst = true): Promise<ExecutionResult> {
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

			return {
				success: overallSuccess,
				output: combinedOutput,
			};
		}

		// No commands to execute
		return {
			success: true,
			output: 'Step completed (no commands to execute)',
		};
	}

	private async executeCommand(cmd: string): Promise<ExecutionResult> {
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
			return {
				success: false,
				output: '',
				error: `Failed to execute command: ${error}`,
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
