import { Box, Text, useApp, useInput } from 'ink';
import { useState } from 'react';
import { cmdInspect } from './commands.ts';

interface TUIProps {
	projectPath: string;
}

export function TUI({ projectPath }: TUIProps) {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState<string[]>([]);
	const [isExecuting, setIsExecuting] = useState(false);
	const { exit } = useApp();

	useInput((char, key) => {
		if (key.return) {
			if (input.trim()) {
				handleCommand(input.trim());
				setInput('');
			}
		} else if (key.escape) {
			exit();
		} else if (key.backspace || key.delete) {
			setInput((prev) => prev.slice(0, -1));
		} else if (char && !key.ctrl && !key.meta) {
			setInput((prev) => prev + char);
		}
	});

	const handleCommand = async (command: string) => {
		setIsExecuting(true);
		setOutput((prev) => [...prev, `> ${command}`]);

		try {
			// Capture console.log output
			const originalLog = console.log;
			const logs: string[] = [];

			console.log = (...args) => {
				logs.push(args.join(' '));
			};

			await cmdInspect(command);

			console.log = originalLog;

			setOutput((prev) => [...prev, ...logs]);
		} catch (error) {
			setOutput((prev) => [...prev, `Error: ${error}`]);
		} finally {
			setIsExecuting(false);
		}
	};

	return (
		<Box flexDirection="column" height="100%">
			<Box borderStyle="round" borderColor="blue" padding={1} marginBottom={1}>
				<Text color="blue" bold>
					The Gap - Offline AI Coding Agent
				</Text>
				<Text color="gray">Project: {projectPath}</Text>
			</Box>

			<Box flexDirection="column" flexGrow={1} marginBottom={1}>
				<Text color="yellow" bold>
					Output:
				</Text>
				<Box borderStyle="single" borderColor="gray" padding={1} height={15}>
					{output.map((line, i) => (
						<Text key={`${i}-${line.slice(0, 10)}`}>{line}</Text>
					))}
				</Box>
			</Box>

			<Box borderStyle="round" borderColor="green" padding={1}>
				<Text color="green">{isExecuting ? '🤖 Executing...' : '💬 Enter your task:'}</Text>
				<Box marginLeft={2}>
					<Text color="white" backgroundColor="blue">
						{input}
					</Text>
					<Text color="gray">_</Text>
				</Box>
				<Text color="gray" dimColor>
					Press Enter to execute, Escape to exit
				</Text>
			</Box>
		</Box>
	);
}

export async function runTUI(projectPath: string) {
	const { render } = await import('ink');

	render(<TUI projectPath={projectPath} />);
}
