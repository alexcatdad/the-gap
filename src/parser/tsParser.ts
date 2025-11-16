import ts from 'typescript';

export type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'variable';

export type ParsedSymbol = {
	name: string;
	kind: SymbolKind;
	filePath: string;
	start: number;
	end: number;
	exported?: boolean;
};

export type ImportInfo = {
	importedName: string;
	modulePath: string;
	filePath: string;
	isDefault?: boolean;
};

export type FunctionCall = {
	callerFunction: string | null; // null if top-level
	calleeName: string;
	filePath: string;
	line: number;
};

export type ParseResult = {
	symbols: ParsedSymbol[];
	imports: ImportInfo[];
	calls: FunctionCall[];
};

export function parseFileSymbols(filePath: string, sourceText: string): ParsedSymbol[] {
	const result = parseFileComplete(filePath, sourceText);
	return result.symbols;
}

export function parseFileComplete(filePath: string, sourceText: string): ParseResult {
	const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
	const symbols: ParsedSymbol[] = [];
	const imports: ImportInfo[] = [];
	const calls: FunctionCall[] = [];
	let currentFunction: string | null = null;

	function add(node: ts.Node, kind: SymbolKind, name: string, exported = false) {
		const { pos, end } = node;
		symbols.push({ name, kind, filePath, start: pos, end, exported });
	}

	function getLineNumber(pos: number): number {
		return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
	}

	function isExported(node: ts.Node): boolean {
		return node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword) ?? false;
	}

	function visit(node: ts.Node) {
		// Track current function context for call resolution
		const prevFunction = currentFunction;

		// Extract function declarations
		if (ts.isFunctionDeclaration(node) && node.name) {
			const funcName = node.name.text;
			add(node, 'function', funcName, isExported(node));
			currentFunction = funcName;
		}

		// Extract class declarations and their methods
		if (ts.isClassDeclaration(node) && node.name) {
			add(node, 'class', node.name.text, isExported(node));
			// Extract class methods
			for (const member of node.members) {
				if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) {
					const methodName = `${node.name.text}.${member.name.text}`;
					add(member, 'function', methodName, false);
					currentFunction = methodName;
					ts.forEachChild(member, visit);
					currentFunction = prevFunction;
				}
			}
		}

		// Extract interfaces
		if (ts.isInterfaceDeclaration(node)) {
			add(node, 'interface', node.name.text, isExported(node));
		}

		// Extract type aliases
		if (ts.isTypeAliasDeclaration(node)) {
			add(node, 'type', node.name.text, isExported(node));
		}

		// Extract variables (including arrow functions)
		if (ts.isVariableStatement(node)) {
			const exported = isExported(node);
			for (const decl of node.declarationList.declarations) {
				if (ts.isIdentifier(decl.name)) {
					// Check if it's an arrow function
					const isArrowFunc = decl.initializer && ts.isArrowFunction(decl.initializer);
					const kind: SymbolKind = isArrowFunc ? 'function' : 'variable';
					const varName = decl.name.text;
					add(node, kind, varName, exported);
					if (isArrowFunc) {
						currentFunction = varName;
					}
				}
			}
		}

		// Extract imports
		if (ts.isImportDeclaration(node)) {
			const moduleSpecifier = node.moduleSpecifier;
			if (ts.isStringLiteral(moduleSpecifier)) {
				const modulePath = moduleSpecifier.text;
				const importClause = node.importClause;

				if (importClause) {
					// Default import
					if (importClause.name) {
						imports.push({
							importedName: importClause.name.text,
							modulePath,
							filePath,
							isDefault: true,
						});
					}

					// Named imports
					if (importClause.namedBindings) {
						if (ts.isNamedImports(importClause.namedBindings)) {
							for (const element of importClause.namedBindings.elements) {
								imports.push({
									importedName: element.name.text,
									modulePath,
									filePath,
									isDefault: false,
								});
							}
						}
						// Namespace import (import * as name)
						else if (ts.isNamespaceImport(importClause.namedBindings)) {
							imports.push({
								importedName: importClause.namedBindings.name.text,
								modulePath,
								filePath,
								isDefault: false,
							});
						}
					}
				}
			}
		}

		// Extract function calls
		if (ts.isCallExpression(node)) {
			const expression = node.expression;
			let calleeName: string | undefined;

			// Simple function call: foo()
			if (ts.isIdentifier(expression)) {
				calleeName = expression.text;
			}
			// Method call: obj.method()
			else if (ts.isPropertyAccessExpression(expression)) {
				if (ts.isIdentifier(expression.expression)) {
					calleeName = `${expression.expression.text}.${expression.name.text}`;
				} else {
					calleeName = expression.name.text;
				}
			}

			if (calleeName) {
				calls.push({
					callerFunction: currentFunction,
					calleeName,
					filePath,
					line: getLineNumber(node.getStart()),
				});
			}
		}

		ts.forEachChild(node, visit);
		currentFunction = prevFunction;
	}

	visit(sourceFile);
	return { symbols, imports, calls };
}
