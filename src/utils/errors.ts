/**
 * Custom error types for better error handling
 */

export class GapError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly remediation?: string,
	) {
		super(message);
		this.name = 'GapError';
	}
}

export class FileSystemError extends GapError {
	constructor(
		message: string,
		public readonly path: string,
		remediation?: string,
	) {
		super(message, 'FS_ERROR', remediation);
		this.name = 'FileSystemError';
	}
}

export class ParsingError extends GapError {
	constructor(
		message: string,
		public readonly filePath: string,
		remediation?: string,
	) {
		super(message, 'PARSE_ERROR', remediation);
		this.name = 'ParsingError';
	}
}

export class LLMError extends GapError {
	constructor(
		message: string,
		public readonly modelName?: string,
		remediation?: string,
	) {
		super(message, 'LLM_ERROR', remediation);
		this.name = 'LLMError';
	}
}

export class ExecutionError extends GapError {
	constructor(
		message: string,
		public readonly command: string,
		public readonly exitCode?: number,
		remediation?: string,
	) {
		super(message, 'EXEC_ERROR', remediation);
		this.name = 'ExecutionError';
	}
}

/**
 * Error handler utilities
 */

/**
 * Format error for user display
 */
export function formatError(error: unknown): string {
	if (error instanceof GapError) {
		let message = `❌ ${error.name}: ${error.message}`;

		if (error instanceof FileSystemError) {
			message += `\n   Path: ${error.path}`;
		} else if (error instanceof ParsingError) {
			message += `\n   File: ${error.filePath}`;
		} else if (error instanceof LLMError && error.modelName) {
			message += `\n   Model: ${error.modelName}`;
		} else if (error instanceof ExecutionError) {
			message += `\n   Command: ${error.command}`;
			if (error.exitCode !== undefined) {
				message += `\n   Exit Code: ${error.exitCode}`;
			}
		}

		if (error.remediation) {
			message += `\n\n💡 Suggestion: ${error.remediation}`;
		}

		return message;
	}

	if (error instanceof Error) {
		return `❌ Error: ${error.message}`;
	}

	return `❌ Unknown error: ${String(error)}`;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
	fn: () => Promise<T>,
	options: {
		maxAttempts?: number;
		initialDelay?: number;
		maxDelay?: number;
		backoffFactor?: number;
		onRetry?: (attempt: number, error: unknown) => void;
	} = {},
): Promise<T> {
	const {
		maxAttempts = 3,
		initialDelay = 1000,
		maxDelay = 10000,
		backoffFactor = 2,
		onRetry,
	} = options;

	let lastError: unknown;
	let delay = initialDelay;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			if (attempt < maxAttempts) {
				onRetry?.(attempt, error);
				await sleep(delay);
				delay = Math.min(delay * backoffFactor, maxDelay);
			}
		}
	}

	throw lastError;
}

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
	fn: () => Promise<T>,
	timeoutMs: number,
	timeoutMessage = 'Operation timed out',
): Promise<T> {
	return Promise.race([
		fn(),
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new GapError(timeoutMessage, 'TIMEOUT')), timeoutMs),
		),
	]);
}

/**
 * Safe execute that catches and logs errors
 */
export async function safeExecute<T>(
	fn: () => Promise<T>,
	fallback: T,
	context?: string,
): Promise<T> {
	try {
		return await fn();
	} catch (error) {
		if (context) {
			console.warn(`[${context}] ${formatError(error)}`);
		} else {
			console.warn(formatError(error));
		}
		return fallback;
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
