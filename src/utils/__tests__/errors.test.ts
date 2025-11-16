import { describe, expect, it } from 'vitest';
import {
	ExecutionError,
	FileSystemError,
	formatError,
	LLMError,
	ParsingError,
	retry,
	safeExecute,
	withTimeout,
} from '../errors.ts';

describe('Custom Errors', () => {
	it('should create FileSystemError with path', () => {
		const error = new FileSystemError(
			'File not found',
			'/path/to/file',
			'Check if the file exists',
		);

		expect(error.name).toBe('FileSystemError');
		expect(error.message).toBe('File not found');
		expect(error.path).toBe('/path/to/file');
		expect(error.remediation).toBe('Check if the file exists');
		expect(error.code).toBe('FS_ERROR');
	});

	it('should create ParsingError with file path', () => {
		const error = new ParsingError('Invalid syntax', 'test.ts', 'Fix the syntax error');

		expect(error.name).toBe('ParsingError');
		expect(error.filePath).toBe('test.ts');
		expect(error.code).toBe('PARSE_ERROR');
	});

	it('should create LLMError with model name', () => {
		const error = new LLMError('Model not available', 'gpt-4', 'Ensure LM Studio is running');

		expect(error.name).toBe('LLMError');
		expect(error.modelName).toBe('gpt-4');
		expect(error.code).toBe('LLM_ERROR');
	});

	it('should create ExecutionError with command and exit code', () => {
		const error = new ExecutionError('Command failed', 'npm install', 1, 'Check npm configuration');

		expect(error.name).toBe('ExecutionError');
		expect(error.command).toBe('npm install');
		expect(error.exitCode).toBe(1);
		expect(error.code).toBe('EXEC_ERROR');
	});
});

describe('Error Formatting and Utilities', () => {
	describe('formatError', () => {
		it('should format FileSystemError', () => {
			const error = new FileSystemError('File not found', '/path/to/file', 'Check the path');
			const formatted = formatError(error);

			expect(formatted).toContain('FileSystemError');
			expect(formatted).toContain('File not found');
			expect(formatted).toContain('/path/to/file');
			expect(formatted).toContain('Check the path');
		});

		it('should format ParsingError', () => {
			const error = new ParsingError('Syntax error', 'test.ts');
			const formatted = formatError(error);

			expect(formatted).toContain('ParsingError');
			expect(formatted).toContain('test.ts');
		});

		it('should format ExecutionError', () => {
			const error = new ExecutionError('Command failed', 'npm test', 1);
			const formatted = formatError(error);

			expect(formatted).toContain('ExecutionError');
			expect(formatted).toContain('npm test');
			expect(formatted).toContain('Exit Code: 1');
		});

		it('should format generic Error', () => {
			const error = new Error('Generic error');
			const formatted = formatError(error);

			expect(formatted).toContain('Generic error');
		});

		it('should format unknown errors', () => {
			const formatted = formatError('string error');

			expect(formatted).toContain('Unknown error');
			expect(formatted).toContain('string error');
		});
	});

	describe('retry', () => {
		it('should succeed on first attempt', async () => {
			let attempts = 0;
			const result = await retry(async () => {
				attempts++;
				return 'success';
			});

			expect(result).toBe('success');
			expect(attempts).toBe(1);
		});

		it('should retry on failure and eventually succeed', async () => {
			let attempts = 0;
			const result = await retry(
				async () => {
					attempts++;
					if (attempts < 3) {
						throw new Error('Temporary failure');
					}
					return 'success';
				},
				{ maxAttempts: 3, initialDelay: 10 },
			);

			expect(result).toBe('success');
			expect(attempts).toBe(3);
		});

		it('should throw error after max attempts', async () => {
			let attempts = 0;

			await expect(
				retry(
					async () => {
						attempts++;
						throw new Error('Permanent failure');
					},
					{ maxAttempts: 3, initialDelay: 10 },
				),
			).rejects.toThrow('Permanent failure');

			expect(attempts).toBe(3);
		});

		it('should call onRetry callback', async () => {
			const retryAttempts: number[] = [];
			let _attempts = 0;

			try {
				await retry(
					async () => {
						_attempts++;
						throw new Error('Failure');
					},
					{
						maxAttempts: 3,
						initialDelay: 10,
						onRetry: (attempt) => retryAttempts.push(attempt),
					},
				);
			} catch {
				// Expected to fail
			}

			expect(retryAttempts).toEqual([1, 2]);
		});
	});

	describe('withTimeout', () => {
		it('should succeed before timeout', async () => {
			const result = await withTimeout(async () => {
				return 'success';
			}, 1000);

			expect(result).toBe('success');
		});

		it('should throw timeout error', async () => {
			await expect(
				withTimeout(
					async () => {
						await new Promise((resolve) => setTimeout(resolve, 100));
						return 'success';
					},
					50,
					'Custom timeout message',
				),
			).rejects.toThrow('Custom timeout message');
		});
	});

	describe('safeExecute', () => {
		it('should return result on success', async () => {
			const result = await safeExecute(async () => 'success', 'fallback');

			expect(result).toBe('success');
		});

		it('should return fallback on error', async () => {
			const result = await safeExecute(
				async () => {
					throw new Error('Failure');
				},
				'fallback',
				'test-context',
			);

			expect(result).toBe('fallback');
		});
	});
});
