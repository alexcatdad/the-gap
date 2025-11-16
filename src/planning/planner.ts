import { LmStudioClient } from '../llm/lmstudioClient.ts';

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
			// Try to extract JSON from the response
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error('No JSON found in response');
			}

			const parsed = JSON.parse(jsonMatch[0]) as { steps: TaskStep[] };
			return { steps: parsed.steps };
		} catch (error) {
			console.warn('Failed to parse plan response:', error);
			throw new Error('Invalid plan format from LLM');
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
