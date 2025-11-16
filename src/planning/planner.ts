import { LmStudioClient } from '../llm/lmstudioClient.ts';
import { LLMError } from '../utils/errors.ts';

export interface TaskStep {
	name: string;
	description: string;
	files_affected: string[];
	commands?: string[];
}

export interface Plan {
	steps: TaskStep[];
}

export class TaskPlanner {
	private lmClient: LmStudioClient;

	constructor(lmClient?: LmStudioClient) {
		this.lmClient = lmClient || new LmStudioClient();
	}

	async createPlan(taskDescription: string, projectContext?: string): Promise<Plan> {
		// Validate input
		if (!taskDescription || taskDescription.trim().length === 0) {
			throw new LLMError(
				'Cannot create plan for empty task description',
				'task-planner',
				'Provide a non-empty task description',
			);
		}

		if (taskDescription.length > 10000) {
			console.warn('Task description is very long, truncating to 10000 characters');
			taskDescription = taskDescription.substring(0, 10000);
		}
		const systemPrompt = `You are an expert software engineer tasked with breaking down user requests into structured, actionable steps.

Your goal is to create a clear, sequential plan that:
1. Breaks complex tasks into manageable steps
2. Identifies which files will be affected
3. Suggests specific commands when appropriate
4. Ensures steps are logical and sequential

Return your response as a JSON object with this exact structure:
{
	"steps": [
		{
			"name": "Brief step name",
			"description": "Detailed description of what this step accomplishes",
			"files_affected": ["path/to/file1", "path/to/file2"],
			"commands": ["optional command 1", "optional command 2"]
		}
	]
}

Keep steps focused and actionable. If the task is simple, fewer steps are better.`;

		const prompt = `Task: ${taskDescription}

${projectContext ? `Project context: ${projectContext}` : ''}

Create a structured plan to accomplish this task.`;

		try {
			const response = await this.lmClient.chat(prompt, systemPrompt);
			const plan = this.parsePlanResponse(response);
			return plan;
		} catch (error) {
			console.warn('LM Studio planning failed, using simple fallback:', error);
			return this.createSimplePlan(taskDescription);
		}
	}

	private parsePlanResponse(response: string): Plan {
		try {
			// Validate response input
			if (!response || response.trim().length === 0) {
				throw new Error('Empty response from LLM');
			}

			// Try to extract JSON from the response
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error('No JSON found in response');
			}

			const parsed = JSON.parse(jsonMatch[0]) as { steps: TaskStep[] };

			// Validate plan structure
			if (!parsed.steps || !Array.isArray(parsed.steps)) {
				throw new Error('Invalid plan structure: steps must be an array');
			}

			if (parsed.steps.length === 0) {
				throw new Error('Plan must contain at least one step');
			}

			// Validate each step
			for (const step of parsed.steps) {
				if (!step.name || step.name.trim().length === 0) {
					throw new Error('Step name is required');
				}
				if (!step.description || step.description.trim().length === 0) {
					throw new Error('Step description is required');
				}
				if (!Array.isArray(step.files_affected)) {
					step.files_affected = [];
				}
				if (step.commands && !Array.isArray(step.commands)) {
					step.commands = [];
				}
			}

			return { steps: parsed.steps };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.warn('Failed to parse plan response:', errorMessage);
			throw new LLMError(
				'Invalid plan format from LLM',
				'task-planner',
				'Check LLM response format and try again',
			);
		}
	}

	private createSimplePlan(taskDescription: string): Plan {
		// Fallback for when LLM is not available
		return {
			steps: [
				{
					name: 'Analyze task',
					description: `Analyze the task: ${taskDescription}`,
					files_affected: [],
				},
				{
					name: 'Implement solution',
					description: `Implement the solution for: ${taskDescription}`,
					files_affected: [],
				},
				{
					name: 'Test changes',
					description: 'Test the implemented changes',
					files_affected: [],
				},
			],
		};
	}
}
