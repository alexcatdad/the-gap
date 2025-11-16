import ts from 'typescript';

export type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'variable';

export type ParsedSymbol = {
	name: string;
	kind: SymbolKind;
	filePath: string;
	start: number;
	end: number;
};

export function parseFileSymbols(filePath: string, sourceText: string): ParsedSymbol[] {
	const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
	const symbols: ParsedSymbol[] = [];

	function add(node: ts.Node, kind: SymbolKind, name: string) {
		const { pos, end } = node;
		symbols.push({ name, kind, filePath, start: pos, end });
	}

	function visit(node: ts.Node) {
		if (ts.isFunctionDeclaration(node) && node.name) {
			add(node, 'function', node.name.text);
		}
		if (ts.isClassDeclaration(node) && node.name) {
			add(node, 'class', node.name.text);
		}
		if (ts.isInterfaceDeclaration(node)) {
			add(node, 'interface', node.name.text);
		}
		if (ts.isTypeAliasDeclaration(node)) {
			add(node, 'type', node.name.text);
		}
		if (ts.isVariableStatement(node)) {
			for (const decl of node.declarationList.declarations) {
				if (ts.isIdentifier(decl.name)) {
					add(node, 'variable', decl.name.text);
				}
			}
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return symbols;
}
