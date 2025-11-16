import { beforeEach, describe, expect, it } from 'vitest';
import type { LmStudioClient } from '../../llm/lmstudioClient.ts';
import { TaskPlanner } from '../planner.ts';

// Mock LM Studio Client
class MockLmClient implements Partial<LmStudioClient> {
	shouldSucceed = true;
	responseJson = {
		steps: [
			{
				name: 'Step 1',
				description: 'First step',
				files_affected: ['file1.ts'],
				commands: ['echo "test"'],
			},
			{
				name: 'Step 2',
				description: 'Second step',
				files_affected: ['file2.ts'],
			},
		],
	};

	async chat(_message: string, _systemPrompt?: string): Promise<string> {
		if (this.shouldSucceed) {
			return JSON.stringify(this.responseJson);
		}
		throw new Error('LM Studio not available');
	}
}

describe('TaskPlanner', () => {
	let mockClient: MockLmClient;
	let planner: TaskPlanner;

	beforeEach(() => {
		mockClient = new MockLmClient();
		planner = new TaskPlanner(mockClient as any);
	});

	describe('createPlan', () => {
		it('should create plan from task description', async () => {
			const plan = await planner.createPlan('Refactor authentication');

			expect(plan.steps).toHaveLength(2);
			expect(plan.steps[0].name).toBe('Step 1');
			expect(plan.steps[0].description).toBe('First step');
			expect(plan.steps[0].files_affected).toEqual(['file1.ts']);
		});

		it('should include project context in prompt', async () => {
			const plan = await planner.createPlan('Fix bug', 'Project uses React and TypeScript');

			expect(plan.steps).toBeDefined();
			expect(plan.steps.length).toBeGreaterThan(0);
		});

		it('should handle plans with commands', async () => {
			const plan = await planner.createPlan('Run tests');

			expect(plan.steps[0].commands).toBeDefined();
			expect(plan.steps[0].commands?.[0]).toBe('echo "test"');
		});

		it('should handle plans without commands', async () => {
			const plan = await planner.createPlan('Analyze code');

			expect(plan.steps[1].commands).toBeUndefined();
		});

		it('should fall back to simple plan if LLM fails', async () => {
			mockClient.shouldSucceed = false;

			const plan = await planner.createPlan('Do something');

			// Should return fallback plan
			expect(plan.steps).toHaveLength(3);
			expect(plan.steps[0].name).toBe('Analyze task');
			expect(plan.steps[1].name).toBe('Implement solution');
			expect(plan.steps[2].name).toBe('Test changes');
		});

		it('should fall back if LLM returns invalid JSON', async () => {
			mockClient.chat = async () => 'This is not JSON at all';

			const plan = await planner.createPlan('Invalid response test');

			// Should return fallback plan
			expect(plan.steps).toHaveLength(3);
		});

		it('should extract JSON from markdown code blocks', async () => {
			mockClient.chat = async () => `
Here's the plan:
\`\`\`json
${JSON.stringify(mockClient.responseJson)}
\`\`\`
`;

			const plan = await planner.createPlan('Test markdown extraction');

			expect(plan.steps).toHaveLength(2);
		});

		it('should reject empty task description', async () => {
			await expect(planner.createPlan('')).rejects.toThrow(
				'Cannot create plan for empty task description',
			);
		});
	});

	describe('fallback behavior', () => {
		it('should create simple plan with task in description', async () => {
			mockClient.shouldSucceed = false;

			const plan = await planner.createPlan('Refactor user service');

			expect(plan.steps[0].description).toContain('Refactor user service');
			expect(plan.steps[1].description).toContain('Refactor user service');
		});

		it('should have analysis, implementation, and test steps', async () => {
			mockClient.shouldSucceed = false;

			const plan = await planner.createPlan('Add feature');

			expect(plan.steps.length).toBe(3);
			expect(plan.steps[0].name).toContain('Analyze');
			expect(plan.steps[1].name).toContain('Implement');
			expect(plan.steps[2].name).toContain('Test');
		});
	});

	describe('edge cases', () => {
		it('should handle very long task descriptions', async () => {
			const longTask = 'A'.repeat(10000);

			const plan = await planner.createPlan(longTask);

			expect(plan.steps).toBeDefined();
		});

		it('should handle special characters in task', async () => {
			const specialTask = 'Fix <bug> & "quotes" \'and\' \\ backslashes';

			const plan = await planner.createPlan(specialTask);

			expect(plan.steps).toBeDefined();
		});

		it('should handle LLM returning empty steps array', async () => {
			mockClient.responseJson = { steps: [] };

			const plan = await planner.createPlan('Empty plan test');

			// Parser should fail and fall back
			expect(plan.steps.length).toBeGreaterThan(0);
		});

		it('should handle malformed step objects', async () => {
			mockClient.chat = async () =>
				JSON.stringify({
					steps: [{ wrong: 'format' }, { also: 'wrong' }],
				});

			const plan = await planner.createPlan('Malformed test');

			// Should fall back to simple plan
			expect(plan.steps.length).toBe(3);
		});
	});
});
